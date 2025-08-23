import { DebugLogger } from '../../debug/index.js';
import { IModel } from '../IModel.js';
import { ITool } from '../ITool.js';
import { IMessage } from '../IMessage.js';
import { retryWithBackoff } from '../../utils/retry.js';
import { ToolFormatter } from '../../tools/ToolFormatter.js';
import type { ToolFormat } from '../../tools/IToolFormatter.js';
import { IProviderConfig } from '../types/IProviderConfig.js';
import { BaseProvider, BaseProviderConfig } from '../BaseProvider.js';
import { OAuthManager } from '../../auth/precedence.js';
import { getSettingsService } from '../../settings/settingsServiceInstance.js';
import { ContentGeneratorRole } from '../ContentGeneratorRole.js';

// Cerebras models configuration
export const cerebrasModels = {
  'qwen-3-coder-480b': {
    name: 'Qwen 3 Coder 480B',
    contextWindow: 131072,
    maxOutputTokens: 32768,
    costPer1kInput: 1.0,
    costPer1kOutput: 1.0,
  },
} as const;

export type CerebrasModelId = keyof typeof cerebrasModels;

const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1';
const CEREBRAS_DEFAULT_TEMPERATURE = 0;

function stripThinkingTokens(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function flattenMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (
          typeof part === 'object' &&
          part !== null &&
          'type' in part &&
          part.type === 'text' &&
          'text' in part
        ) {
          return String(part.text || '');
        }
        if (
          typeof part === 'object' &&
          part !== null &&
          'type' in part &&
          part.type === 'image_url'
        ) {
          return '[Image]';
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return String(content || '');
}

export class CerebrasProvider extends BaseProvider {
  private logger: DebugLogger;
  private toolFormatter: ToolFormatter;
  toolFormat: ToolFormat = 'openai';
  private baseURL: string;
  private _config?: IProviderConfig;
  private currentModel: CerebrasModelId = 'qwen-3-coder-480b';
  private modelParams?: Record<string, unknown>;
  private lastUsage: { inputTokens: number; outputTokens: number } = {
    inputTokens: 0,
    outputTokens: 0,
  };

  private readonly retryableErrorMessages = [
    'rate_limit',
    'server_error',
    'service_unavailable',
  ];

  constructor(
    apiKey?: string,
    baseURL?: string,
    config?: IProviderConfig,
    oauthManager?: OAuthManager,
  ) {
    const baseConfig: BaseProviderConfig = {
      name: 'cerebras',
      apiKey,
      baseURL,
      cliKey: !apiKey || apiKey === '' ? undefined : apiKey,
      envKeyNames: ['CEREBRAS_API_KEY'],
      isOAuthEnabled: false,
      oauthProvider: undefined,
      oauthManager,
    };

    super(baseConfig);

    this.logger = new DebugLogger('llxprt:cerebras:provider');
    this.baseURL = baseURL || CEREBRAS_BASE_URL;
    this._config = config;

    this.toolFormatter = new ToolFormatter();

    if (!apiKey) {
      this.logger.debug(() => 'No API key provided for Cerebras provider');
    }
  }

  protected supportsOAuth(): boolean {
    return false;
  }

  override async getModels(): Promise<IModel[]> {
    const authToken = await this.getAuthToken();
    if (!authToken) {
      this.logger.debug(
        () => 'No authentication available for Cerebras provider',
      );
      return [];
    }

    return Object.entries(cerebrasModels).map(([id, info]) => ({
      id,
      name: info.name,
      provider: 'cerebras',
      supportedToolFormats: ['openai'],
      contextWindow: info.contextWindow,
      maxOutputTokens: info.maxOutputTokens,
    }));
  }

  async *generateChatCompletion(
    messages: IMessage[],
    tools?: ITool[],
    _toolFormat?: string,
  ): AsyncIterableIterator<unknown> {
    this.logger.debug(
      () => '=== CEREBRAS: Starting generateChatCompletion ===',
    );
    this.logger.debug(() => `Input messages count: ${messages.length}`);
    this.logger.debug(() => `Tools provided: ${tools?.length || 0}`);

    const authToken = await this.getAuthToken();
    if (!authToken) {
      throw new Error('Authentication required for Cerebras API calls');
    }

    const streamingSetting =
      this._config?.getEphemeralSettings?.()?.['streaming'];
    const streamingEnabled = streamingSetting !== 'disabled';
    this.logger.debug(() => `Streaming enabled: ${streamingEnabled}`);

    const apiCall = async () => {
      let systemMessage: string | undefined;
      const cerebrasMessages: Array<{
        role: string;
        content: string;
      }> = [];

      this.logger.debug(() => '=== CEREBRAS: Converting messages ===');
      for (const msg of messages) {
        this.logger.debug(
          () =>
            `Processing message: role=${msg.role}, hasContent=${!!msg.content}, hasToolCalls=${!!msg.tool_calls}`,
        );

        if (msg.role === 'system') {
          systemMessage = msg.content;
          this.logger.debug(
            () =>
              `System message captured: ${systemMessage?.substring(0, 100)}...`,
          );
        } else if (msg.role === 'tool') {
          // Convert tool results to user messages as Cerebras doesn't have a specific tool role
          // This might need to be adjusted based on how Cerebras expects tool results
          const toolMsg = {
            role: 'user', // Changed from 'assistant' to 'user'
            content: `Tool result for ${msg.tool_call_id}: ${msg.content}`,
          };
          cerebrasMessages.push(toolMsg);
          this.logger.debug(
            () =>
              `Tool result converted to user message: ${JSON.stringify(toolMsg)}`,
          );
        } else if (msg.role === 'assistant') {
          let content = flattenMessageContent(msg.content);
          if (msg.tool_calls) {
            this.logger.debug(
              () => `Assistant has ${msg.tool_calls!.length} tool calls`,
            );
            for (const toolCall of msg.tool_calls) {
              const name = toolCall.function?.name || 'unknown';
              const args = toolCall.function?.arguments || '{}';
              this.logger.debug(() => `Tool call: ${name} with args: ${args}`);
              content += `\nCalling tool ${name} with arguments: ${args}`;
            }
          }
          content = stripThinkingTokens(content);
          cerebrasMessages.push({
            role: 'assistant',
            content,
          });
          this.logger.debug(
            () =>
              `Assistant message processed: ${content.substring(0, 100)}...`,
          );
        } else if (msg.role === 'user') {
          const userContent = flattenMessageContent(msg.content);
          cerebrasMessages.push({
            role: 'user',
            content: userContent,
          });
          this.logger.debug(
            () => `User message: ${userContent.substring(0, 100)}...`,
          );
        }
      }

      // Filter out empty messages
      const messagesToSend = cerebrasMessages.filter(
        (msg) => msg.content.trim() !== '',
      );
      this.logger.debug(
        () =>
          `Messages after filtering: ${messagesToSend.length} (was ${cerebrasMessages.length})`,
      );
      messagesToSend.forEach((msg, i) => {
        this.logger.debug(
          () =>
            `Message ${i}: role=${msg.role}, content=${msg.content.substring(0, 100)}...`,
        );
      });

      const modelInfo = cerebrasModels[this.currentModel];
      this.logger.debug(() => `Using model: ${this.currentModel}`);
      this.logger.debug(() => `Model info: ${JSON.stringify(modelInfo)}`);

      const temperature =
        (this.modelParams?.temperature as number | undefined) ??
        CEREBRAS_DEFAULT_TEMPERATURE;
      this.logger.debug(() => `Temperature: ${temperature}`);

      const actualModelId: string = this.currentModel;
      this.logger.debug(
        () => `Model params: ${JSON.stringify(this.modelParams)}`,
      );

      const requestBody: Record<string, unknown> = {
        model: actualModelId,
        messages: [
          ...(systemMessage
            ? [{ role: 'system', content: systemMessage }]
            : []),
          ...messagesToSend,
        ],
        stream: streamingEnabled,
        ...(modelInfo.maxOutputTokens > 0 && modelInfo.maxOutputTokens <= 32768
          ? { max_completion_tokens: modelInfo.maxOutputTokens }
          : {}),
        ...(temperature !== undefined &&
        temperature !== CEREBRAS_DEFAULT_TEMPERATURE
          ? { temperature: Math.max(0, Math.min(1.5, temperature)) }
          : {}),
      };

      if (tools && tools.length > 0) {
        this.logger.debug(() => '=== CEREBRAS: Formatting tools ===');
        this.logger.debug(() => `Number of tools: ${tools.length}`);
        tools.forEach((tool, i) => {
          this.logger.debug(
            () =>
              `Tool ${i}: name=${tool.function.name}, hasParams=${!!tool.function.parameters}`,
          );
          if (tool.function.parameters) {
            this.logger.debug(
              () =>
                `Tool ${i} params: ${JSON.stringify(tool.function.parameters)}`,
            );
          }
        });

        try {
          const openaiTools = this.toolFormatter.toProviderFormat(
            tools,
            'openai',
          );
          requestBody.tools = openaiTools;
          // CRITICAL: Add tool_choice to force Cerebras to use tools instead of just narrating
          requestBody.tool_choice = 'auto';
          this.logger.debug(
            () =>
              `Tools formatted successfully: ${JSON.stringify(openaiTools).substring(0, 500)}...`,
          );
          this.logger.debug(() => `Tool choice set to: auto`);
        } catch (toolError) {
          this.logger.debug(() => `Error formatting tools: ${toolError}`);
          // Continue without tools if formatting fails
        }
      }

      this.logger.debug(() => '=== CEREBRAS: Sending request ===');
      this.logger.debug(() => `URL: ${this.baseURL}/chat/completions`);
      this.logger.debug(
        () => `Request body: ${JSON.stringify(requestBody, null, 2)}`,
      );

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      this.logger.debug(
        () =>
          `Response status: ${response.status} ${response.ok ? 'OK' : 'ERROR'}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage =
            errorJson.error?.message ||
            errorJson.message ||
            JSON.stringify(errorJson, null, 2);
        } catch {
          errorMessage = errorText || `HTTP ${response.status}`;
        }

        if (response.status === 401) {
          throw new Error('Cerebras authentication failed');
        } else if (response.status === 403) {
          throw new Error('Access to Cerebras API forbidden');
        } else if (response.status === 429) {
          throw new Error('Cerebras rate limit exceeded');
        } else if (response.status >= 500) {
          throw new Error(`Cerebras server error (${response.status})`);
        } else {
          throw new Error(
            `Cerebras API error (${response.status}): ${errorMessage}`,
          );
        }
      }

      return response;
    };

    try {
      const response = await retryWithBackoff(apiCall, {
        shouldRetry: (error: Error) => this.isRetryableError(error),
      });

      if (streamingEnabled) {
        this.logger.debug(
          () => '=== CEREBRAS: Processing streaming response ===',
        );
        if (!response.body) {
          throw new Error('No response body from Cerebras API');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let inputTokens = 0;
        let outputTokens = 0;
        let currentToolCall:
          | { id: string; name: string; arguments: string }
          | undefined;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim() === '') continue;

              try {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr === '[DONE]') {
                    continue;
                  }

                  const parsed = JSON.parse(jsonStr);
                  this.logger.debug(
                    () =>
                      `Chunk: ${JSON.stringify(parsed).substring(0, 200)}...`,
                  );

                  if (parsed.choices?.[0]?.delta?.content) {
                    const content = parsed.choices[0].delta.content;
                    this.logger.debug(() => `Content chunk: "${content}"`);
                    yield {
                      role: 'assistant',
                      content,
                    } as IMessage;
                  }

                  if (parsed.choices?.[0]?.delta?.tool_calls) {
                    this.logger.debug(
                      () => `=== CEREBRAS: Tool call delta detected ===`,
                    );
                    const toolCallDelta = parsed.choices[0].delta.tool_calls[0];
                    this.logger.debug(
                      () => `Tool call delta: ${JSON.stringify(toolCallDelta)}`,
                    );

                    if (toolCallDelta && toolCallDelta.id) {
                      currentToolCall = {
                        id: toolCallDelta.id,
                        name: toolCallDelta.function?.name || '',
                        arguments: toolCallDelta.function?.arguments || '',
                      };
                      this.logger.debug(
                        () =>
                          `New tool call started: id=${currentToolCall?.id}, name=${currentToolCall?.name}`,
                      );
                    } else if (
                      currentToolCall &&
                      toolCallDelta &&
                      toolCallDelta.function?.arguments
                    ) {
                      currentToolCall.arguments +=
                        toolCallDelta.function.arguments;
                      this.logger.debug(
                        () =>
                          `Tool call arguments appended: ${toolCallDelta.function.arguments}`,
                      );
                    }
                  }

                  if (
                    parsed.choices?.[0]?.finish_reason === 'tool_calls' &&
                    currentToolCall
                  ) {
                    this.logger.debug(
                      () => `=== CEREBRAS: Tool call completed ===`,
                    );
                    this.logger.debug(() => `Tool: ${currentToolCall?.name}`);
                    this.logger.debug(
                      () => `Arguments: ${currentToolCall?.arguments}`,
                    );

                    const toolCallMessage = {
                      role: 'assistant',
                      content: '',
                      tool_calls: [
                        {
                          id: currentToolCall.id,
                          type: 'function' as const,
                          function: {
                            name: currentToolCall?.name || '',
                            arguments: currentToolCall?.arguments || '',
                          },
                        },
                      ],
                    };

                    this.logger.debug(
                      () =>
                        `Yielding tool call: ${JSON.stringify(toolCallMessage)}`,
                    );
                    yield toolCallMessage as IMessage;
                    currentToolCall = undefined;
                  }

                  if (parsed.choices?.[0]?.finish_reason) {
                    this.logger.debug(
                      () => `Finish reason: ${parsed.choices[0].finish_reason}`,
                    );
                  }

                  if (parsed.usage) {
                    inputTokens = parsed.usage.prompt_tokens || 0;
                    outputTokens = parsed.usage.completion_tokens || 0;
                  }
                }
              } catch (error) {
                this.logger.debug(
                  () => `Error parsing streaming line: ${error}`,
                );
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (inputTokens === 0 || outputTokens === 0) {
          const inputText = messages.map((m) => m.content).join('') || '';
          inputTokens = inputTokens || Math.ceil(inputText.length / 4);
          outputTokens =
            outputTokens ||
            Math.ceil(
              (cerebrasModels[this.currentModel].maxOutputTokens || 1000) / 10,
            );
        }

        this.lastUsage = { inputTokens, outputTokens };

        yield {
          role: 'assistant',
          content: '',
          usage: {
            prompt_tokens: inputTokens,
            completion_tokens: outputTokens,
            total_tokens: inputTokens + outputTokens,
          },
        } as IMessage;
      } else {
        this.logger.debug(
          () => '=== CEREBRAS: Processing non-streaming response ===',
        );
        const result = await response.json();
        this.logger.debug(
          () => `Response: ${JSON.stringify(result).substring(0, 500)}...`,
        );

        const message = result.choices?.[0]?.message;

        if (!message) {
          throw new Error('No message in Cerebras response');
        }

        const responseMessage: IMessage = {
          role: ContentGeneratorRole.ASSISTANT,
          content: message.content || '',
        };

        if (message.tool_calls) {
          this.logger.debug(
            () =>
              `=== CEREBRAS: Tool calls in response: ${message.tool_calls.length} ===`,
          );
          message.tool_calls.forEach((tc: unknown, i: number) => {
            this.logger.debug(() => `Tool call ${i}: ${JSON.stringify(tc)}`);
          });

          responseMessage.tool_calls = message.tool_calls.map(
            (tc: {
              id: string;
              function?: { name: string; arguments: string };
            }) => {
              const toolCall = {
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || '',
                },
              };
              this.logger.debug(
                () => `Mapped tool call: ${JSON.stringify(toolCall)}`,
              );
              return toolCall;
            },
          );
        }

        if (result.usage) {
          responseMessage.usage = {
            prompt_tokens: result.usage.prompt_tokens,
            completion_tokens: result.usage.completion_tokens,
            total_tokens:
              result.usage.prompt_tokens + result.usage.completion_tokens,
          };
          this.lastUsage = {
            inputTokens: result.usage.prompt_tokens,
            outputTokens: result.usage.completion_tokens,
          };
        }

        this.logger.debug(() => `=== CEREBRAS: Yielding final response ===`);
        this.logger.debug(
          () => `Final message: ${JSON.stringify(responseMessage)}`,
        );
        yield responseMessage;
      }

      this.logger.debug(
        () => '=== CEREBRAS: Request completed successfully ===',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.debug(() => `=== CEREBRAS: Error occurred ===`);
      this.logger.debug(() => `Error: ${errorMessage}`);
      throw new Error(`Cerebras API error: ${errorMessage}`);
    }
  }

  override setApiKey(apiKey: string): void {
    super.setApiKey?.(apiKey);
  }

  override setBaseUrl(baseUrl?: string): void {
    this.baseURL =
      baseUrl && baseUrl.trim() !== '' ? baseUrl : CEREBRAS_BASE_URL;
    super.setBaseUrl?.(baseUrl);
  }

  override setModel(modelId: string): void {
    try {
      const settingsService = getSettingsService();
      settingsService.setProviderSetting(this.name, 'model', modelId);
    } catch (error) {
      this.logger.debug(
        () => `Failed to persist model to SettingsService: ${error}`,
      );
    }
    this.currentModel = modelId as CerebrasModelId;
  }

  override getCurrentModel(): string {
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
    return this.currentModel || this.getDefaultModel();
  }

  override getDefaultModel(): string {
    return 'qwen-3-coder-480b';
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const errorMessage = error.message.toLowerCase();

    return this.retryableErrorMessages.some((msg) =>
      errorMessage.includes(msg),
    );
  }

  override isPaidMode(): boolean {
    return true; // All Cerebras models are paid
  }

  override getServerTools(): string[] {
    return [];
  }

  override async invokeServerTool(
    _toolName: string,
    _params: unknown,
    _config?: unknown,
  ): Promise<unknown> {
    throw new Error('Server tools not supported by Cerebras provider');
  }

  override setModelParams(params: Record<string, unknown> | undefined): void {
    if (params === undefined) {
      this.modelParams = undefined;
    } else {
      this.modelParams = { ...this.modelParams, ...params };
    }
  }

  override getModelParams(): Record<string, unknown> | undefined {
    return this.modelParams;
  }

  override async isAuthenticated(): Promise<boolean> {
    return super.isAuthenticated();
  }

  getApiCost(): number {
    const model = cerebrasModels[this.currentModel];
    const { inputTokens, outputTokens } = this.lastUsage;

    const inputCost = (inputTokens / 1000) * model.costPer1kInput;
    const outputCost = (outputTokens / 1000) * model.costPer1kOutput;

    return inputCost + outputCost;
  }
}
