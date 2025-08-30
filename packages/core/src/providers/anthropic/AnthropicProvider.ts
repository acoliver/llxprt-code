import Anthropic from '@anthropic-ai/sdk';
import type { ClientOptions } from '@anthropic-ai/sdk';
import type { Stream } from '@anthropic-ai/sdk/streaming';
import { Content } from '@google/genai';
import { DebugLogger } from '../../debug/index.js';
import { IModel } from '../IModel.js';
import { ITool } from '../ITool.js';
import { retryWithBackoff } from '../../utils/retry.js';
import { ToolFormatter } from '../../tools/ToolFormatter.js';
import type { ToolFormat } from '../../tools/IToolFormatter.js';
import { IProviderConfig } from '../types/IProviderConfig.js';
import { BaseProvider, BaseProviderConfig } from '../BaseProvider.js';
import { OAuthManager } from '../../auth/precedence.js';
import { getSettingsService } from '../../settings/settingsServiceInstance.js';
import { AnthropicContentConverter } from '../converters/AnthropicContentConverter.js';

export class AnthropicProvider extends BaseProvider {
  private logger: DebugLogger;
  private anthropic: Anthropic;
  private toolFormatter: ToolFormatter;
  private converter = new AnthropicContentConverter();
  toolFormat: ToolFormat = 'anthropic';
  private baseURL?: string;
  private _config?: IProviderConfig;
  private currentModel: string = 'claude-sonnet-4-20250514'; // Default model
  private modelParams?: Record<string, unknown>;
  private temporarySystemInstruction?: string;
  private _cachedAuthKey?: string; // Track cached auth key for client recreation

  // Model cache for latest resolution
  private modelCache: { models: IModel[]; timestamp: number } | null = null;
  private readonly modelCacheTTL = 5 * 60 * 1000; // 5 minutes

  // Retry configuration
  private readonly retryableErrorMessages = [
    'overloaded',
    'rate_limit',
    'server_error',
    'service_unavailable',
  ];

  // Model patterns for max output tokens
  private modelTokenPatterns: Array<{ pattern: RegExp; tokens: number }> = [
    { pattern: /claude-.*opus-4/i, tokens: 32000 },
    { pattern: /claude-.*sonnet-4/i, tokens: 64000 },
    { pattern: /claude-.*haiku-4/i, tokens: 200000 }, // Future-proofing for Haiku 4
    { pattern: /claude-.*3-7.*sonnet/i, tokens: 64000 },
    { pattern: /claude-.*3-5.*sonnet/i, tokens: 8192 },
    { pattern: /claude-.*3-5.*haiku/i, tokens: 8192 },
    { pattern: /claude-.*3.*opus/i, tokens: 4096 },
    { pattern: /claude-.*3.*haiku/i, tokens: 4096 },
  ];

  constructor(
    apiKey?: string,
    baseURL?: string,
    config?: IProviderConfig,
    oauthManager?: OAuthManager,
  ) {
    // Initialize base provider with auth configuration
    const baseConfig: BaseProviderConfig = {
      name: 'anthropic',
      apiKey,
      baseURL,
      envKeyNames: ['ANTHROPIC_API_KEY'],
      isOAuthEnabled: !!oauthManager,
      oauthProvider: oauthManager ? 'anthropic' : undefined,
      oauthManager,
    };

    super(baseConfig);

    this.logger = new DebugLogger('llxprt:anthropic:provider');
    this.baseURL = baseURL;
    this._config = config;

    // Config reserved for future provider customization
    void this._config;

    this.anthropic = new Anthropic({
      apiKey: apiKey || '', // Empty string if OAuth will be used
      baseURL,
      dangerouslyAllowBrowser: true,
    });

    this.toolFormatter = new ToolFormatter();
  }

  /**
   * Implementation of BaseProvider abstract method
   * Determines if this provider supports OAuth authentication
   */
  protected supportsOAuth(): boolean {
    // Anthropic supports OAuth authentication
    return true;
  }

  /**
   * @plan:PLAN-20250823-AUTHFIXES.P15
   * @requirement:REQ-004
   * Update the Anthropic client with resolved authentication if needed
   */
  private async updateClientWithResolvedAuth(): Promise<void> {
    const resolvedToken = await this.getAuthToken();
    if (!resolvedToken) {
      throw new Error(
        'No authentication available for Anthropic API calls. Use /auth anthropic to re-authenticate or /auth anthropic logout to clear any expired session.',
      );
    }

    // Only recreate client if auth changed
    if (this._cachedAuthKey !== resolvedToken) {
      // Check if this is an OAuth token (starts with sk-ant-oat)
      const isOAuthToken = resolvedToken.startsWith('sk-ant-oat');

      if (isOAuthToken) {
        // For OAuth tokens, use authToken field which sends Bearer token
        // Don't pass apiKey at all - just authToken
        const oauthConfig: Record<string, unknown> = {
          authToken: resolvedToken, // Use authToken for OAuth Bearer tokens
          baseURL: this.baseURL,
          dangerouslyAllowBrowser: true,
          defaultHeaders: {
            'anthropic-beta': 'oauth-2025-04-20', // Still need the beta header
          },
        };

        this.anthropic = new Anthropic(oauthConfig as ClientOptions);
      } else {
        // Regular API key auth
        this.anthropic = new Anthropic({
          apiKey: resolvedToken,
          baseURL: this.baseURL,
          dangerouslyAllowBrowser: true,
        });
      }

      // Track the key to avoid unnecessary client recreation
      this._cachedAuthKey = resolvedToken;
    }
  }

  /**
   * Transform a tool ID to Anthropic's expected format (toolu_ prefix)
   */
  private transformToolId(id: string): string {
    if (!id) {
      throw new Error('Tool ID is required and cannot be empty');
    }

    // If already has toolu_ prefix, return as-is
    if (id.startsWith('toolu_')) {
      return id;
    }

    // Replace any existing prefix with toolu_
    const baseId = id.replace(/^(call_|toolu_)/, '');
    return `toolu_${baseId}`;
  }

  override async getModels(): Promise<IModel[]> {
    const authToken = await this.getAuthToken();
    if (!authToken) {
      // Return empty array if no auth - models aren't critical for operation
      this.logger.debug(
        () => 'No authentication available for fetching Anthropic models',
      );
      return [];
    }

    // Update client with resolved auth (handles OAuth vs API key)
    await this.updateClientWithResolvedAuth();

    // Check if using OAuth - the models.list endpoint doesn't work with OAuth tokens
    const isOAuthToken = authToken.startsWith('sk-ant-oat');

    if (isOAuthToken) {
      // For OAuth, return only the two working models
      this.logger.debug(
        () => 'Using hardcoded model list for OAuth authentication',
      );
      return [
        {
          id: 'claude-opus-4-1-20250805',
          name: 'Claude Opus 4.1',
          provider: 'anthropic',
          supportedToolFormats: ['anthropic'],
          contextWindow: 500000,
          maxOutputTokens: 32000,
        },
        {
          id: 'claude-sonnet-4-20250514',
          name: 'Claude Sonnet 4',
          provider: 'anthropic',
          supportedToolFormats: ['anthropic'],
          contextWindow: 400000,
          maxOutputTokens: 64000,
        },
      ];
    }

    try {
      // Fetch models from Anthropic API (beta endpoint) - only for API keys
      const models: IModel[] = [];

      // Handle pagination
      for await (const model of this.anthropic.beta.models.list()) {
        models.push({
          id: model.id,
          name: model.display_name || model.id,
          provider: 'anthropic',
          supportedToolFormats: ['anthropic'],
          contextWindow: this.getContextWindowForModel(model.id),
          maxOutputTokens: this.getMaxTokensForModel(model.id),
        });
      }

      // Add "latest" aliases for Claude 4 tiers (opus, sonnet). We pick the newest
      // version of each tier based on the sorted order created above.
      const addLatestAlias = (tier: 'opus' | 'sonnet') => {
        const latest = models
          .filter((m) => m.id.startsWith(`claude-${tier}-4-`))
          .sort((a, b) => b.id.localeCompare(a.id))[0];
        if (latest) {
          models.push({
            ...latest,
            id: `claude-${tier}-4-latest`,
            name: latest.name.replace(/-\d{8}$/, '-latest'),
          });
        }
      };
      addLatestAlias('opus');
      addLatestAlias('sonnet');

      return models;
    } catch (error) {
      this.logger.debug(() => `Failed to fetch Anthropic models: ${error}`);
      return []; // Return empty array on error
    }
  }

  /**
   * @plan PLAN-20250826-RESPONSES.P05
   * @requirement REQ-001
   */
  // MARKER: HS-041-ANTHROPIC-PARAMS - Accepts Content[] arrays as method parameters
  async *generateChatCompletion(
    contents: Content[],
    tools?: ITool[],
    _toolFormat?: string,
    _sessionId?: string,
  ): AsyncIterableIterator<Content> {
    const authToken = await this.getAuthToken();
    if (!authToken) {
      throw new Error(
        'Authentication required to generate Anthropic chat completions',
      );
    }

    // Get streaming setting from ephemeral settings (default: enabled)
    const streamingSetting =
      this._config?.getEphemeralSettings?.()?.['streaming'];
    const streamingEnabled = streamingSetting !== 'disabled';

    // Update Anthropic client with resolved authentication if needed
    await this.updateClientWithResolvedAuth();

    const apiCall = async () => {
      // Resolve model if it uses -latest alias
      const resolvedModel = await this.resolveLatestModel(this.currentModel);

      // MARKER: HS-041-ANTHROPIC-CLEAN - Orphan detection removed from provider
      // HistoryService now handles orphaned tool calls centrally

      // Convert Content[] to Anthropic format using existing logic
      const anthropicMessages =
        this.convertContentsToAnthropicMessages(contents);

      // Use the resolved model for the API call
      const modelForApi = resolvedModel;

      // Check if we're in OAuth mode early
      const authToken = await this.getAuthToken();
      const isOAuth = authToken && authToken.startsWith('sk-ant-oat');

      // Use the converted messages
      let systemMessage = this.extractSystemMessage(contents);

      // If we have a temporary system instruction from GeminiCompatibleWrapper, use it
      if (this.temporarySystemInstruction) {
        systemMessage = systemMessage
          ? systemMessage + '\n\n' + this.temporarySystemInstruction
          : this.temporarySystemInstruction;
        // Clear the temporary instruction after use
        this.temporarySystemInstruction = undefined;
      }

      let finalMessages = anthropicMessages;

      if (isOAuth && systemMessage) {
        // In OAuth mode, inject system prompts as conversation content
        const contextMessage = `Important context for using llxprt tools:

Tool Parameter Reference:
- read_file uses parameter 'absolute_path' (not 'file_path')
- write_file uses parameter 'file_path' (not 'path')
- list_directory uses parameter 'path'
- replace uses 'file_path', 'old_string', 'new_string'
- search_file_content (grep) expects regex patterns, not literal text
- todo_write requires 'todos' array with {id, content, status, priority}
- All file paths must be absolute (starting with /)

${systemMessage}`;

        finalMessages = [
          {
            role: 'user' as const,
            content: contextMessage,
          },
          {
            role: 'assistant' as const,
            content:
              "I understand the llxprt tool parameters and context. I'll use the correct parameter names for each tool. Ready to help with your tasks.",
          },
          ...anthropicMessages,
        ];
      }

      // Convert ITool[] to Anthropic's tool format if tools are provided
      const anthropicTools = tools
        ? this.toolFormatter.toProviderFormat(tools, 'anthropic')
        : undefined;

      // Create the request options with proper typing
      const createOptions: Parameters<
        typeof this.anthropic.messages.create
      >[0] = {
        model: modelForApi,
        messages: finalMessages,
        max_tokens: this.getMaxTokensForModel(resolvedModel),
        ...this.modelParams, // Apply model params first
        stream: streamingEnabled, // Use ephemeral streaming setting
      };

      // Set system message based on auth mode
      if (isOAuth) {
        // OAuth mode: Use Claude Code system prompt (required for Max/Pro)
        createOptions.system =
          "You are Claude Code, Anthropic's official CLI for Claude.";
        // llxprt prompts were already injected as conversation content above
      } else if (systemMessage) {
        // Normal mode: Use full llxprt system prompt
        createOptions.system = systemMessage;
      }

      if (anthropicTools) {
        createOptions.tools = anthropicTools as Parameters<
          typeof this.anthropic.messages.create
        >[0]['tools'];
      }

      if (streamingEnabled) {
        return this.anthropic.messages.create(createOptions) as Promise<
          Stream<Anthropic.MessageStreamEvent>
        >;
      } else {
        return this.anthropic.messages.create(
          createOptions,
        ) as Promise<Anthropic.Message>;
      }
    };

    try {
      const response = await retryWithBackoff(apiCall, {
        shouldRetry: (error: Error) => this.isRetryableError(error),
      });

      if (streamingEnabled) {
        // Handle streaming response
        const stream = response as Stream<Anthropic.MessageStreamEvent>;

        // Collect all chunks to build complete response
        const chunks: Anthropic.MessageStreamEvent[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);

          // Yield text chunks as they arrive
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            yield {
              role: 'model',
              parts: [{ text: chunk.delta.text }],
            } as Content;
          }
        }

        // Build complete response from collected chunks
        const completeResponse = this.buildCompleteResponse(chunks);
        if (completeResponse) {
          const convertedResponse =
            this.converter.fromProviderFormat(completeResponse);
          yield convertedResponse;
        }
      } else {
        // Handle non-streaming response
        const message = response as Anthropic.Message;
        const convertedResponse = this.converter.fromProviderFormat(message);
        yield convertedResponse;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if it's a 400 error (bad request)
      const is400Error =
        errorMessage.includes('400') ||
        errorMessage.includes('tool_use') ||
        errorMessage.includes('tool_result');

      // Dump conversation history on error for debugging
      // Use error level for 400 errors to ensure it's always logged
      // Bind the context to preserve 'this' in the logger methods
      const logFn = is400Error
        ? this.logger.error.bind(this.logger)
        : this.logger.debug.bind(this.logger);

      logFn(() => '=== ANTHROPIC ERROR - CONVERSATION DUMP ===');
      logFn(() => `Error: ${errorMessage}`);
      logFn(() => `Total messages in conversation: ${contents.length}`);

      // Log each message in detail
      contents.forEach((content, idx) => {
        logFn(() => `\n--- Message ${idx} ---`);
        logFn(() => `Role: ${content.role}`);

        if (content.parts) {
          content.parts.forEach((part, partIdx) => {
            if (part.text) {
              const textLength = part.text.length;
              logFn(() => `  Part[${partIdx}]: text (${textLength} chars)`);
            }
            if ('functionCall' in part && part.functionCall) {
              const funcCall = part.functionCall;
              logFn(
                () =>
                  `  Part[${partIdx}]: functionCall\n` +
                  `    id: ${funcCall.id}\n` +
                  `    name: ${funcCall.name}\n` +
                  `    args: ${JSON.stringify(funcCall.args)}`,
              );
            }
            if ('functionResponse' in part && part.functionResponse) {
              const funcResponse = part.functionResponse;
              const response = funcResponse.response;
              const errorResponse = response as { error?: string };
              const isError =
                response && typeof errorResponse.error === 'string';
              const isCancelled =
                isError &&
                errorResponse.error?.includes('[Operation Cancelled]');
              const responseId = (funcResponse as { id?: string }).id;
              logFn(
                () =>
                  `  Part[${partIdx}]: functionResponse\n` +
                  `    id: ${responseId}\n` +
                  `    name: ${funcResponse.name}\n` +
                  `    isError: ${isError}\n` +
                  `    isCancelled: ${isCancelled}\n` +
                  `    response: ${JSON.stringify(response).substring(0, 200)}`,
              );
            }
          });
        }
      });

      // Also dump the converted Anthropic messages
      logFn(() => '\n=== CONVERTED ANTHROPIC MESSAGES ===');
      try {
        const anthropicMessages =
          this.convertContentsToAnthropicMessages(contents);
        logFn(
          () => `Converted to ${anthropicMessages.length} Anthropic messages`,
        );
        anthropicMessages.forEach((msg, idx) => {
          logFn(() => `Message[${idx}]: role=${msg.role}`);
          if (Array.isArray(msg.content)) {
            msg.content.forEach((block, blockIdx) => {
              if (block.type === 'tool_use') {
                logFn(
                  () =>
                    `  Block[${blockIdx}]: tool_use id=${block.id} name=${block.name}`,
                );
              } else if (block.type === 'tool_result') {
                logFn(
                  () =>
                    `  Block[${blockIdx}]: tool_result tool_use_id=${block.tool_use_id}`,
                );
              } else if (block.type === 'text') {
                logFn(
                  () =>
                    `  Block[${blockIdx}]: text (${block.text.length} chars)`,
                );
              }
            });
          }
        });
      } catch (conversionError) {
        logFn(() => `Failed to convert for logging: ${conversionError}`);
      }

      logFn(() => '=== END CONVERSATION DUMP ===\n');

      throw new Error(`Anthropic API error: ${errorMessage}`);
    }
  }

  override setApiKey(apiKey: string): void {
    // Call base provider implementation
    super.setApiKey?.(apiKey);

    // Create a new Anthropic client with the updated API key
    this.anthropic = new Anthropic({
      apiKey,
      baseURL: this.baseURL,
      dangerouslyAllowBrowser: true,
    });
  }

  override setBaseUrl(baseUrl?: string): void {
    // If no baseUrl is provided, clear to default (undefined)
    this.baseURL = baseUrl && baseUrl.trim() !== '' ? baseUrl : undefined;

    // Call base provider implementation
    super.setBaseUrl?.(baseUrl);

    // Create a new Anthropic client with the updated (or cleared) base URL
    // Will be updated with actual token in updateClientWithResolvedAuth
    this.anthropic = new Anthropic({
      apiKey: '', // Empty string, will be replaced when auth is resolved
      baseURL: this.baseURL,
      dangerouslyAllowBrowser: true,
    });
  }

  override setModel(modelId: string): void {
    // Update SettingsService as the source of truth
    try {
      const settingsService = getSettingsService();
      settingsService.setProviderSetting(this.name, 'model', modelId);
    } catch (error) {
      this.logger.debug(
        () => `Failed to persist model to SettingsService: ${error}`,
      );
    }
    // Keep local cache for performance
    this.currentModel = modelId;
  }

  override getCurrentModel(): string {
    // Try to get from SettingsService first (source of truth)
    try {
      const settingsService = getSettingsService();
      const providerSettings = settingsService.getProviderSettings(this.name);
      if (providerSettings.model) {
        return providerSettings.model as string;
      }
    } catch (error) {
      this.logger.debug(
        () => `Failed to get model from SettingsService: ${error}`,
      );
    }
    // Fall back to cached value or default
    return this.currentModel || this.getDefaultModel();
  }

  override getDefaultModel(): string {
    // Return the default model for this provider
    return 'claude-sonnet-4-20250514';
  }

  /**
   * Helper method to get the latest Claude 4 model ID for a given tier.
   * This can be used when you want to ensure you're using the latest model.
   * @param tier - The model tier: 'opus', 'sonnet', or 'haiku'
   * @returns The latest model ID for that tier
   */
  getLatestClaude4Model(tier: 'opus' | 'sonnet' | 'haiku' = 'sonnet'): string {
    switch (tier) {
      case 'opus':
        return 'claude-opus-4-latest';
      case 'sonnet':
        return 'claude-sonnet-4-latest';
      case 'haiku':
        // Haiku 4 not yet available, but future-proofed
        return 'claude-haiku-4-latest';
      default:
        return 'claude-sonnet-4-latest';
    }
  }

  /**
   * Resolves a model ID that may contain "-latest" to the actual model ID.
   * Caches the result to avoid frequent API calls.
   */
  private async resolveLatestModel(modelId: string): Promise<string> {
    // If it's not a latest alias, return as-is
    if (!modelId.endsWith('-latest')) {
      return modelId;
    }

    // Check cache
    const now = Date.now();
    if (
      this.modelCache &&
      now - this.modelCache.timestamp < this.modelCacheTTL
    ) {
      // Find the corresponding model from cache
      const model = this.modelCache.models.find((m) => m.id === modelId);
      if (model) {
        // The latest aliases are synthetic, find the real model
        const tier = modelId.includes('opus') ? 'opus' : 'sonnet';
        const realModel = this.modelCache.models
          .filter(
            (m) =>
              m.id.startsWith(`claude-${tier}-4-`) && !m.id.endsWith('-latest'),
          )
          .sort((a, b) => b.id.localeCompare(a.id))[0];
        return realModel ? realModel.id : modelId;
      }
    }

    try {
      // Ensure client has proper auth before calling getModels
      await this.updateClientWithResolvedAuth();

      // Fetch fresh models
      const models = await this.getModels();
      this.modelCache = { models, timestamp: now };

      // Find the real model for this latest alias
      const tier = modelId.includes('opus') ? 'opus' : 'sonnet';
      const realModel = models
        .filter(
          (m) =>
            m.id.startsWith(`claude-${tier}-4-`) && !m.id.endsWith('-latest'),
        )
        .sort((a, b) => b.id.localeCompare(a.id))[0];

      return realModel ? realModel.id : modelId;
    } catch (_error) {
      // If we can't fetch models, just use simple fallback like Claude Code does
      this.logger.debug(
        () => 'Failed to fetch models for latest resolution, using fallback',
      );
      if (modelId.includes('opus')) {
        return 'opus';
      } else {
        return 'sonnet'; // Default to sonnet like Claude Code
      }
    }
  }

  private getMaxTokensForModel(modelId: string): number {
    // Handle latest aliases explicitly
    if (
      modelId === 'claude-opus-4-latest' ||
      modelId.includes('claude-opus-4')
    ) {
      return 32000;
    }
    if (
      modelId === 'claude-sonnet-4-latest' ||
      modelId.includes('claude-sonnet-4')
    ) {
      return 64000;
    }

    // Try to match model patterns
    for (const { pattern, tokens } of this.modelTokenPatterns) {
      if (pattern.test(modelId)) {
        return tokens;
      }
    }

    // Default for unknown models
    return 4096;
  }

  private getContextWindowForModel(modelId: string): number {
    // Claude 4 models have larger context windows
    if (modelId.includes('claude-opus-4')) {
      return 500000;
    }
    if (modelId.includes('claude-sonnet-4')) {
      return 400000;
    }
    // Claude 3.7 models
    if (modelId.includes('claude-3-7')) {
      return 300000;
    }
    // Default for Claude 3.x models
    return 200000;
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const errorMessage = error.message.toLowerCase();

    if (error.message.includes('rate_limit_error')) return true;

    // Check for Anthropic-specific error patterns
    if (error.message.includes('Anthropic API error:')) {
      // Extract the actual error content
      const match = error.message.match(/{"type":"error","error":({.*})}/);
      if (match) {
        try {
          const errorData = JSON.parse(match[1]);
          const errorType = errorData.type?.toLowerCase() || '';
          const errorMsg = errorData.message?.toLowerCase() || '';

          return this.retryableErrorMessages.some(
            (retryable) =>
              errorType.includes(retryable) || errorMsg.includes(retryable),
          );
        } catch {
          // If parsing fails, fall back to string matching
        }
      }
    }

    // Direct error message checking
    return this.retryableErrorMessages.some((msg) =>
      errorMessage.includes(msg),
    );
  }

  /**
   * Extract system message from Content[] array
   */
  private extractSystemMessage(contents: Content[]): string | undefined {
    const systemContent = contents.find((c) => c.role === 'system');
    if (systemContent && systemContent.parts) {
      return systemContent.parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join('\n');
    }
    return undefined;
  }

  /**
   * Convert Content[] to Anthropic MessageParam format
   * Automatically fixes tool_use/tool_result mismatches
   */
  private convertContentsToAnthropicMessages(contents: Content[]): Array<{
    role: 'user' | 'assistant';
    content:
      | string
      | Array<
          | { type: 'text'; text: string }
          | { type: 'tool_use'; id: string; name: string; input: unknown }
          | { type: 'tool_result'; tool_use_id: string; content: string }
        >;
  }> {
    this.logger.debug(
      () =>
        `[convertContentsToAnthropicMessages] Converting ${contents.length} content items`,
    );

    // Log the structure of contents for debugging
    contents.forEach((content, idx) => {
      const hasFunctionCall = content.parts?.some((p) => 'functionCall' in p);
      const hasFunctionResponse = content.parts?.some(
        (p) => 'functionResponse' in p,
      );
      this.logger.debug(
        () =>
          `  Content[${idx}]: role=${content.role}, hasFunctionCall=${hasFunctionCall}, hasFunctionResponse=${hasFunctionResponse}`,
      );

      // Log details of function calls and responses
      content.parts?.forEach((part, partIdx) => {
        if ('functionCall' in part && part.functionCall) {
          this.logger.debug(
            () =>
              `    Part[${partIdx}]: functionCall id=${part.functionCall?.id} name=${part.functionCall?.name}`,
          );
        }
        if ('functionResponse' in part && part.functionResponse) {
          const response = part.functionResponse.response;
          const isCancelled =
            typeof response?.error === 'string' &&
            response.error.includes('[Operation Cancelled]');
          const responseId = (part.functionResponse as { id?: string }).id;
          this.logger.debug(
            () =>
              `    Part[${partIdx}]: functionResponse id=${responseId} name=${part.functionResponse?.name} cancelled=${isCancelled}`,
          );
        }
      });
    });

    const messages: Array<{
      role: 'user' | 'assistant';
      content:
        | string
        | Array<
            | { type: 'text'; text: string }
            | { type: 'tool_use'; id: string; name: string; input: unknown }
            | { type: 'tool_result'; tool_use_id: string; content: string }
          >;
    }> = [];

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      if (!content.role || content.role === 'system' || !content.parts)
        continue;

      const role = content.role === 'model' ? 'assistant' : content.role;
      if (role !== 'user' && role !== 'assistant') continue;

      type AnthropicContentBlock =
        | { type: 'text'; text: string }
        | { type: 'tool_use'; id: string; name: string; input: unknown }
        | { type: 'tool_result'; tool_use_id: string; content: string };

      let messageContent: string | AnthropicContentBlock[] = '';
      const contentBlocks: AnthropicContentBlock[] = [];

      for (const part of content.parts) {
        if (part.text) {
          if (typeof messageContent === 'string') {
            messageContent += part.text;
          } else {
            contentBlocks.push({ type: 'text', text: part.text });
          }
        } else if (part.functionCall) {
          // Convert to array format if not already
          if (typeof messageContent === 'string' && messageContent) {
            contentBlocks.push({ type: 'text', text: messageContent });
            messageContent = contentBlocks;
          } else if (typeof messageContent === 'string') {
            messageContent = contentBlocks;
          }

          // Transform tool ID to Anthropic format
          // The ID MUST exist - FAIL FAST
          if (!part.functionCall.id) {
            throw new Error(
              `Function call for '${part.functionCall.name}' is missing required ID`,
            );
          }
          const toolId = this.transformToolId(part.functionCall.id);

          contentBlocks.push({
            type: 'tool_use',
            id: toolId,
            name: part.functionCall.name || '',
            input: part.functionCall.args || {},
          });
        } else if (part.functionResponse) {
          // Convert to array format if not already
          if (typeof messageContent === 'string' && messageContent) {
            contentBlocks.push({ type: 'text', text: messageContent });
            messageContent = contentBlocks;
          } else if (typeof messageContent === 'string') {
            messageContent = contentBlocks;
          }

          // The function response MUST have an ID - FAIL FAST
          if (!part.functionResponse.id) {
            throw new Error(
              `Function response for '${part.functionResponse.name}' is missing required ID`,
            );
          }
          // Transform the ID to Anthropic format
          const toolUseId = this.transformToolId(part.functionResponse.id);

          contentBlocks.push({
            type: 'tool_result',
            tool_use_id: toolUseId,
            content: JSON.stringify(part.functionResponse.response),
          });
        }
      }

      if (contentBlocks.length > 0) {
        messageContent = contentBlocks;
      }

      messages.push({
        role,
        content: messageContent,
      });
    }

    // MARKER: HS-041-ANTHROPIC-CLEAN - Orphan detection removed from provider
    // HistoryService now handles orphaned tool calls centrally
    // NO synthetic handling here - should be done by HistoryService
    return messages;
  }

  /**
   * Build complete response from streaming chunks
   */
  private buildCompleteResponse(chunks: Anthropic.MessageStreamEvent[]): {
    content: Array<{
      type: 'text' | 'tool_use';
      text?: string;
      id?: string;
      name?: string;
      input?: unknown;
    }>;
  } | null {
    const contentBlocks: Array<{
      type: 'text' | 'tool_use';
      text?: string;
      id?: string;
      name?: string;
      input?: unknown;
    }> = [];
    let currentTextBlock = '';
    let currentToolCall: { id: string; name: string; input: string } | null =
      null;

    for (const chunk of chunks) {
      if (chunk.type === 'content_block_start') {
        if (chunk.content_block.type === 'tool_use') {
          currentToolCall = {
            id: chunk.content_block.id,
            name: chunk.content_block.name,
            input: '',
          };
        }
      } else if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type === 'text_delta') {
          currentTextBlock += chunk.delta.text;
        } else if (chunk.delta.type === 'input_json_delta' && currentToolCall) {
          currentToolCall.input += chunk.delta.partial_json;
        }
      } else if (chunk.type === 'content_block_stop') {
        if (currentTextBlock) {
          contentBlocks.push({ type: 'text', text: currentTextBlock });
          currentTextBlock = '';
        }
        if (currentToolCall) {
          contentBlocks.push({
            type: 'tool_use',
            id: currentToolCall.id,
            name: currentToolCall.name,
            input: currentToolCall.input
              ? JSON.parse(currentToolCall.input)
              : undefined,
          });
          currentToolCall = null;
        }
      }
    }

    // Handle any remaining text
    if (currentTextBlock) {
      contentBlocks.push({ type: 'text', text: currentTextBlock });
    }

    return contentBlocks.length > 0 ? { content: contentBlocks } : null;
  }

  // @ts-expect-error - Method may be used in future, kept for now
  private generateToolId(): string {
    return `tool_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Anthropic always requires payment (API key or OAuth)
   */
  override isPaidMode(): boolean {
    return true;
  }

  /**
   * Get the list of server tools supported by this provider
   */
  override getServerTools(): string[] {
    return [];
  }

  /**
   * Invoke a server tool (native provider tool)
   */
  override async invokeServerTool(
    _toolName: string,
    _params: unknown,
    _config?: unknown,
  ): Promise<unknown> {
    throw new Error('Server tools not supported by Anthropic provider');
  }

  /**
   * Set model parameters that will be merged into API calls
   * @param params Parameters to merge with existing, or undefined to clear all
   */
  override setModelParams(params: Record<string, unknown> | undefined): void {
    if (params === undefined) {
      this.modelParams = undefined;
    } else {
      this.modelParams = { ...this.modelParams, ...params };
    }
  }

  /**
   * Get current model parameters
   * @returns Current parameters or undefined if not set
   */
  override getModelParams(): Record<string, unknown> | undefined {
    return this.modelParams;
  }

  /**
   * Set temporary system instruction for the next generateChatCompletion call
   */
  override setTemporarySystemInstruction(
    systemInstruction: string | undefined,
  ): void {
    this.temporarySystemInstruction = systemInstruction;
  }

  /**
   * Override clearAuthCache to also clear cached auth key
   */
  override clearAuthCache(): void {
    super.clearAuthCache();
    this._cachedAuthKey = undefined;
  }

  /**
   * Check if the provider is authenticated using any available method
   * Uses the base provider's isAuthenticated implementation
   */
  override async isAuthenticated(): Promise<boolean> {
    return super.isAuthenticated();
  }
}
