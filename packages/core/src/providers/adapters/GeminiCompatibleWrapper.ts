/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IProvider as Provider } from '../IProvider.js';
import type { ITool as ProviderTool } from '../ITool.js';
import { ContentGeneratorRole } from '../ContentGeneratorRole.js';
import {
  Content,
  GenerateContentResponse,
  GenerateContentConfig,
  Part,
  ContentListUnion,
} from '@google/genai';

// Legacy message format for compatibility - will be removed in future cleanup
interface LegacyProviderMessage {
  id?: string;
  role: ContentGeneratorRole | 'system';
  content: string;
  parts?: Part[];
  tool_call_id?: string;
  tool_name?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
import {
  GeminiEventType,
  ToolCallRequestInfo,
  ServerGeminiStreamEvent,
  ServerGeminiContentEvent,
  ServerGeminiToolCallRequestEvent,
  ServerGeminiUsageMetadataEvent,
} from '../../core/turn.js';
import { DebugLogger } from '../../debug/index.js';

/**
 * Wrapper that makes any IProvider compatible with Gemini's ContentGenerator interface
 */

export class GeminiCompatibleWrapper {
  private readonly provider: Provider;
  private readonly logger = new DebugLogger('llxprt:wrapper');

  constructor(provider: Provider) {
    this.provider = provider;
  }

  /**
   * Converts Gemini schema format to standard JSON Schema format
   * Handles uppercase type enums and string numeric values
   */
  private convertGeminiSchemaToStandard(schema: unknown): unknown {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const newSchema: Record<string, unknown> = { ...schema };

    // Handle schema composition keywords
    if (newSchema.anyOf && Array.isArray(newSchema.anyOf)) {
      newSchema.anyOf = newSchema.anyOf.map((v) =>
        this.convertGeminiSchemaToStandard(v),
      );
    }
    if (newSchema.allOf && Array.isArray(newSchema.allOf)) {
      newSchema.allOf = newSchema.allOf.map((v) =>
        this.convertGeminiSchemaToStandard(v),
      );
    }
    if (newSchema.oneOf && Array.isArray(newSchema.oneOf)) {
      newSchema.oneOf = newSchema.oneOf.map((v) =>
        this.convertGeminiSchemaToStandard(v),
      );
    }

    // Handle items (can be a schema or array of schemas for tuples)
    if (newSchema.items) {
      if (Array.isArray(newSchema.items)) {
        newSchema.items = newSchema.items.map((item) =>
          this.convertGeminiSchemaToStandard(item),
        );
      } else {
        newSchema.items = this.convertGeminiSchemaToStandard(newSchema.items);
      }
    }

    // Handle properties
    if (newSchema.properties && typeof newSchema.properties === 'object') {
      const newProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(newSchema.properties)) {
        newProperties[key] = this.convertGeminiSchemaToStandard(value);
      }
      newSchema.properties = newProperties;
    }

    // Handle additionalProperties if it's a schema
    if (
      newSchema.additionalProperties &&
      typeof newSchema.additionalProperties === 'object'
    ) {
      newSchema.additionalProperties = this.convertGeminiSchemaToStandard(
        newSchema.additionalProperties,
      );
    }

    // Handle patternProperties
    if (
      newSchema.patternProperties &&
      typeof newSchema.patternProperties === 'object'
    ) {
      const newPatternProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(newSchema.patternProperties)) {
        newPatternProperties[key] = this.convertGeminiSchemaToStandard(value);
      }
      newSchema.patternProperties = newPatternProperties;
    }

    // Handle dependencies (can be array of property names or schema)
    if (newSchema.dependencies && typeof newSchema.dependencies === 'object') {
      const newDependencies: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(newSchema.dependencies)) {
        if (Array.isArray(value)) {
          // Property dependencies (array of property names)
          newDependencies[key] = value;
        } else {
          // Schema dependencies
          newDependencies[key] = this.convertGeminiSchemaToStandard(value);
        }
      }
      newSchema.dependencies = newDependencies;
    }

    // Handle if/then/else
    if (newSchema.if) {
      newSchema.if = this.convertGeminiSchemaToStandard(newSchema.if);
    }
    if (newSchema.then) {
      newSchema.then = this.convertGeminiSchemaToStandard(newSchema.then);
    }
    if (newSchema.else) {
      newSchema.else = this.convertGeminiSchemaToStandard(newSchema.else);
    }

    // Handle not
    if (newSchema.not) {
      newSchema.not = this.convertGeminiSchemaToStandard(newSchema.not);
    }

    // Convert type from UPPERCASE enum to lowercase string
    if (newSchema.type) {
      newSchema.type = String(newSchema.type).toLowerCase();
    }

    // Convert all numeric properties from strings to numbers
    const numericProperties = [
      'minItems',
      'maxItems',
      'minLength',
      'maxLength',
      'minimum',
      'maximum',
      'minProperties',
      'maxProperties',
      'multipleOf',
    ];

    for (const prop of numericProperties) {
      if (newSchema[prop] !== undefined) {
        newSchema[prop] = Number(newSchema[prop]);
      }
    }

    return newSchema;
  }

  /**
   * Convert Gemini tools format to provider tools format
   */
  private convertGeminiToolsToProviderTools(
    geminiTools: Array<{
      functionDeclarations?: Array<{
        name: string;
        description?: string;
        parametersJsonSchema?: unknown;
      }>;
    }>,
  ): ProviderTool[] {
    const providerTools: ProviderTool[] = [];

    for (const tool of geminiTools) {
      if (tool.functionDeclarations) {
        // Gemini format has functionDeclarations array
        for (const func of tool.functionDeclarations) {
          // FunctionDeclaration from @google/genai uses parametersJsonSchema
          const schema = func.parametersJsonSchema;

          if (process.env.DEBUG) {
            console.log(
              `[GeminiCompatibleWrapper] Converting tool ${func.name}:`,
            );
            console.log(`  Schema:`, JSON.stringify(schema, null, 2));
          }

          providerTools.push({
            type: 'function' as const,
            function: {
              name: func.name,
              description: func.description || '',
              parameters: (this.convertGeminiSchemaToStandard(schema) as Record<
                string,
                unknown
              >) ?? {
                type: 'object',
                properties: {},
                required: [],
              },
            },
          });
        }
      }
    }

    return providerTools;
  }

  /**
   * Generate content using the wrapped provider (non-streaming)
   * @param params Parameters for content generation
   * @returns A promise resolving to a Gemini-formatted response
   */
  /**
   * @plan PLAN-20250113-SIMPLIFICATION.P13
   * @requirement REQ-INT-001.1
   */
  async generateContent(params: {
    model: string;
    contents: ContentListUnion;
    config?: GenerateContentConfig;
    sessionId?: string;
  }): Promise<GenerateContentResponse> {
    // Convert ContentListUnion to Content[] format
    let contents: Content[];
    if (typeof params.contents === 'string') {
      // Convert string to Content[]
      contents = [{ role: 'user', parts: [{ text: params.contents }] }];
    } else if (Array.isArray(params.contents)) {
      // Check if it's Content[] or PartUnion[]
      if (
        params.contents.length > 0 &&
        typeof params.contents[0] === 'object' &&
        'role' in params.contents[0]
      ) {
        // It's Content[]
        contents = params.contents as Content[];
      } else {
        // It's PartUnion[] - convert to Content[]
        const parts: Part[] = params.contents.map((item) =>
          typeof item === 'string' ? { text: item } : (item as Part),
        );
        contents = [{ role: 'user', parts }];
      }
    } else {
      // It's a single Content or Part - normalize to Content[]
      if ('role' in params.contents) {
        // It's a Content
        contents = [params.contents as Content];
      } else {
        // It's a Part - wrap in Content
        contents = [{ role: 'user', parts: [params.contents as Part] }];
      }
    }

    // Handle system messages based on provider capabilities
    // Extract system messages from contents array and systemInstruction config
    const systemMessages: string[] = [];

    // Get system messages from contents
    const systemContents = contents.filter((c) => c.role === 'system');
    for (const systemContent of systemContents) {
      const systemText =
        systemContent.parts?.map((p) => p.text || '').join('') || '';
      if (systemText) {
        systemMessages.push(systemText);
      }
    }

    // Get system instruction from config
    if (params.config?.systemInstruction) {
      let systemContent: string;
      if (typeof params.config.systemInstruction === 'string') {
        systemContent = params.config.systemInstruction;
      } else {
        const systemInst = params.config.systemInstruction as Content;
        systemContent =
          systemInst.parts?.map((p: Part) => p.text || '').join('\n') || '';
      }
      if (systemContent) {
        systemMessages.push(systemContent);
      }
    }

    // Handle system messages - NO provider supports system role in Content[]
    // Gemini API expects system instructions via systemInstruction parameter, not in contents
    if (systemMessages.length > 0) {
      // Remove system messages from contents for ALL providers
      contents = contents.filter((c) => c.role !== 'system');

      // Pass system messages to provider using temporary system instruction
      const combinedSystemMessage = systemMessages.join('\n\n');
      if (this.provider.setTemporarySystemInstruction) {
        this.provider.setTemporarySystemInstruction(combinedSystemMessage);
      }
    }

    // Fix orphaned tool calls for providers that require strict pairing
    if (this.provider.name === 'anthropic' || this.provider.name === 'openai') {
      contents = this.fixOrphanedToolCalls(contents);
    }

    /**
     * @plan PLAN-20250826-RESPONSES.P05
     * @requirement REQ-001.2
     */
    // Collect full response from provider stream using Content[] directly
    const responseContents: Content[] = [];
    const stream = this.provider.generateChatCompletion(
      contents,
      undefined, // tools
      undefined, // toolFormat
      params.sessionId, // sessionId - now implemented
    );

    for await (const chunk of stream) {
      responseContents.push(chunk);
    }

    // Convert provider response to Gemini format
    return this.convertContentsToResponse(responseContents);
  }

  /**
   * Fix orphaned tool calls and responses in the conversation
   * Handles both:
   * 1. Orphaned tool calls (functionCall without matching functionResponse)
   * 2. Orphaned tool responses (functionResponse without matching functionCall)
   *
   * This is critical for Anthropic and OpenAI providers which require strict pairing
   */

  /**
   * Generate content using the wrapped provider (streaming)
   * @param params Parameters for content generation
   * @returns An async generator yielding Gemini-formatted responses
   */
  /**
   * @plan PLAN-20250113-SIMPLIFICATION.P13
   * @requirement REQ-INT-001.1
   */
  async *generateContentStream(params: {
    model: string;
    contents: ContentListUnion;
    config?: GenerateContentConfig;
    sessionId?: string;
  }): AsyncGenerator<GenerateContentResponse> {
    this.logger.debug(() => '[WRAPPER] generateContentStream called');
    this.logger.debug(() => `[WRAPPER] Provider type: ${this.provider.name}`);
    this.logger.debug(() => `[WRAPPER] Model: ${params.model}`);

    // Convert ContentListUnion to Content[] format
    let contents: Content[];
    if (typeof params.contents === 'string') {
      // Convert string to Content[]
      contents = [{ role: 'user', parts: [{ text: params.contents }] }];
    } else if (Array.isArray(params.contents)) {
      // Check if it's Content[] or PartUnion[]
      if (
        params.contents.length > 0 &&
        typeof params.contents[0] === 'object' &&
        'role' in params.contents[0]
      ) {
        // It's Content[]
        contents = params.contents as Content[];
      } else {
        // It's PartUnion[] - convert to Content[]
        const parts: Part[] = params.contents.map((item) =>
          typeof item === 'string' ? { text: item } : (item as Part),
        );
        contents = [{ role: 'user', parts }];
      }
    } else {
      // It's a single Content or Part - normalize to Content[]
      if ('role' in params.contents) {
        // It's a Content
        contents = [params.contents as Content];
      } else {
        // It's a Part - wrap in Content
        contents = [{ role: 'user', parts: [params.contents as Part] }];
      }
    }

    // Handle system messages based on provider capabilities
    // Extract system messages from contents array and systemInstruction config
    const systemMessages: string[] = [];

    // Get system messages from contents
    const systemContents = contents.filter((c) => c.role === 'system');
    for (const systemContent of systemContents) {
      const systemText =
        systemContent.parts?.map((p) => p.text || '').join('') || '';
      if (systemText) {
        systemMessages.push(systemText);
      }
    }

    // Get system instruction from config
    if (params.config?.systemInstruction) {
      let systemContent: string;
      if (typeof params.config.systemInstruction === 'string') {
        systemContent = params.config.systemInstruction;
      } else {
        const systemInst = params.config.systemInstruction as Content;
        systemContent =
          systemInst.parts?.map((p: Part) => p.text || '').join('\n') || '';
      }
      if (systemContent) {
        systemMessages.push(systemContent);
      }
    }

    // Log the contents being sent
    this.logger.debug(
      () => `[WRAPPER] Contents to send (${contents.length} messages):`,
    );
    contents.forEach((content, idx) => {
      const hasFunctionCall = content.parts?.some(
        (p: Part) => 'functionCall' in p,
      );
      const hasFunctionResponse = content.parts?.some(
        (p: Part) => 'functionResponse' in p,
      );
      this.logger.debug(
        () =>
          `[WRAPPER]   Message[${idx}]: role=${content.role}, hasFunctionCall=${hasFunctionCall}, hasFunctionResponse=${hasFunctionResponse}`,
      );

      // Log function call/response details
      content.parts?.forEach((part: Part, partIdx: number) => {
        if ('functionCall' in part && part.functionCall) {
          this.logger.debug(
            () =>
              `[WRAPPER]     Part[${partIdx}]: functionCall id=${part.functionCall?.id} name=${part.functionCall?.name}`,
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
              `[WRAPPER]     Part[${partIdx}]: functionResponse id=${responseId} name=${part.functionResponse?.name} cancelled=${isCancelled}`,
          );
        }
      });
    });

    // Handle system messages - NO provider supports system role in Content[]
    // Gemini API expects system instructions via systemInstruction parameter, not in contents
    if (systemMessages.length > 0) {
      // Remove system messages from contents for ALL providers
      contents = contents.filter((c) => c.role !== 'system');

      // Pass system messages to provider using temporary system instruction
      const combinedSystemMessage = systemMessages.join('\n\n');
      if (this.provider.setTemporarySystemInstruction) {
        this.provider.setTemporarySystemInstruction(combinedSystemMessage);
      }
    }

    // Fix orphaned tool calls for providers that require strict pairing
    if (this.provider.name === 'anthropic' || this.provider.name === 'openai') {
      contents = this.fixOrphanedToolCalls(contents);
    }

    // Extract and convert tools from config if available
    let providerTools: ProviderTool[] | undefined;
    const geminiTools = (params.config as { tools?: unknown })?.tools;
    if (geminiTools && Array.isArray(geminiTools)) {
      providerTools = this.convertGeminiToolsToProviderTools(geminiTools);
    }

    /**
     * @plan PLAN-20250826-RESPONSES.P05
     * @requirement REQ-001.2
     */
    // Stream from provider using Content[] directly - no conversion needed!
    const stream = this.provider.generateChatCompletion(
      contents,
      providerTools,
      undefined, // toolFormat
      params.sessionId, // sessionId - now implemented
    );

    // Collect all chunks to batch telemetry events
    const collectedChunks: GenerateContentResponse[] = [];
    let hasUsageMetadata = false;

    for await (const chunk of stream) {
      const response = this.convertContentToStreamResponse(chunk);
      collectedChunks.push(response);

      // Check if this chunk has usage metadata (now checking Content format)
      if ('usage' in chunk) {
        hasUsageMetadata = true;
      }

      // Yield the response chunk immediately for UI updates
      yield response;
    }

    // After streaming is complete, yield a final response with usage metadata if we collected any
    if (hasUsageMetadata && collectedChunks.length > 0) {
      // Find the last chunk with usage metadata
      const lastChunkWithUsage = [...collectedChunks]
        .reverse()
        .find((chunk) =>
          chunk.candidates?.some((candidate) =>
            candidate.content?.parts?.some((part: Part) => 'usage' in part),
          ),
        );

      // The telemetry will be logged by the consuming code when it sees the usage metadata
      if (lastChunkWithUsage) {
        // Usage data is included in the stream for telemetry purposes
        void lastChunkWithUsage; // Mark as intentionally unused
      }
    }
  }

  /**
   * Adapts a provider's stream to Gemini event format
   * @param providerStream The provider-specific stream
   * @returns An async iterator of Gemini events
   */
  async *adaptStream(
    providerStream: AsyncIterableIterator<LegacyProviderMessage>,
  ): AsyncIterableIterator<ServerGeminiStreamEvent> {
    yield* this.adaptProviderStream(providerStream);
  }

  /**
   * Adapts the provider's stream format to Gemini's expected format
   * @param providerStream Stream from the provider
   * @returns Async iterator of Gemini events
   */
  private async *adaptProviderStream(
    providerStream: AsyncIterableIterator<LegacyProviderMessage>,
  ): AsyncIterableIterator<ServerGeminiStreamEvent> {
    for await (const message of providerStream) {
      // Emit content event if message has non-empty content
      if (message.content && message.content.length > 0) {
        const contentValue =
          typeof message.content === 'string'
            ? message.content
            : String(message.content);
        const contentEvent: ServerGeminiContentEvent = {
          type: GeminiEventType.Content,
          value: contentValue,
        };
        yield contentEvent;
      }

      // Emit tool call events if message has tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (_e) {
            // Use empty object as fallback
          }

          const toolEvent: ServerGeminiToolCallRequestEvent = {
            type: GeminiEventType.ToolCallRequest,
            value: {
              callId: toolCall.id,
              name: toolCall.function.name,
              args,
              isClientInitiated: false,
            } as ToolCallRequestInfo,
          };
          yield toolEvent;
        }
      }

      // Emit usage metadata event if message has usage data
      if (message.usage) {
        const usageEvent: ServerGeminiUsageMetadataEvent = {
          type: GeminiEventType.UsageMetadata,
          value: {
            promptTokenCount: message.usage.prompt_tokens,
            candidatesTokenCount: message.usage.completion_tokens,
            totalTokenCount: message.usage.total_tokens,
          },
        };
        yield usageEvent;
      }
    }
  }

  /**
   * Convert Gemini ContentListUnion to provider ProviderMessage array
   * @deprecated This method is no longer used after Phase 13 simplification
   */
  // @ts-expect-error - Method kept for tests, will be removed in future cleanup
  private convertContentsToMessages(
    contents: ContentListUnion,
  ): LegacyProviderMessage[] {
    // Debug logging for OpenRouter issue
    if (process.env.DEBUG) {
      console.log(
        '[GeminiCompatibleWrapper] convertContentsToMessages input:',
        {
          type: Array.isArray(contents) ? 'array' : typeof contents,
          length: Array.isArray(contents) ? contents.length : 'N/A',
          contents: JSON.stringify(contents).substring(0, 500),
        },
      );
    }

    // Normalize ContentListUnion to Content[]
    let contentArray: Content[];

    // Check if contents is undefined or null
    if (!contents) {
      return [];
    }

    if (Array.isArray(contents)) {
      // Filter out any undefined/null elements
      const validContents = contents.filter(
        (item) => item !== undefined && item !== null,
      );

      // If it's already an array, check if it's Content[] or PartUnion[]
      if (validContents.length === 0) {
        contentArray = [];
      } else if (
        validContents[0] &&
        typeof validContents[0] === 'object' &&
        'role' in validContents[0]
      ) {
        // It's Content[]
        contentArray = validContents as Content[];
      } else {
        // It's PartUnion[] - convert to Part[] and wrap in a single Content with user role
        const parts: Part[] = validContents.map((item) =>
          typeof item === 'string' ? { text: item } : (item as Part),
        );

        // Special handling: check if all parts are functionResponses
        // Note: this check was computed but not used in the current implementation

        contentArray = [
          {
            role: 'user',
            parts,
          },
        ];
      }
    } else if (typeof contents === 'string') {
      // It's a string - wrap in Part and Content
      contentArray = [
        {
          role: 'user',
          parts: [{ text: contents }],
        },
      ];
    } else if (
      typeof contents === 'object' &&
      contents !== null &&
      'role' in contents
    ) {
      // It's a single Content
      contentArray = [contents as Content];
    } else {
      // It's a single Part - wrap in Content with user role
      contentArray = [
        {
          role: 'user',
          parts: [contents as Part],
        },
      ];
    }

    const messages: LegacyProviderMessage[] = [];

    for (const content of contentArray) {
      // Validate content object
      if (!content || typeof content !== 'object') {
        continue;
      }

      if (!content.role) {
        continue;
      }
      // Check for function responses (tool results)
      const functionResponses = (content.parts || []).filter(
        (
          part,
        ): part is
          | (Part & {
              functionResponse: {
                id: string;
                name: string;
                response: {
                  error?: string;
                  llmContent?: string;
                  output?: string;
                };
              };
            })
          | (Part & {
              functionResponse: {
                name: string;
                response: {
                  error?: string;
                  llmContent?: string;
                  output?: string;
                };
              };
            }) => 'functionResponse' in part,
      );

      if (functionResponses.length > 0) {
        // Check for other parts that need to be preserved (like PDFs)
        const nonFunctionResponseParts = (content.parts || []).filter(
          (part) => !('functionResponse' in part),
        );

        // Collect any binary content from function responses
        const binaryParts: Part[] = [];

        // Convert each function response to a tool message
        for (const part of functionResponses) {
          const response = part.functionResponse.response;
          let content: string;
          let isCancelled = false;

          // Check if response contains binary content
          if (
            response &&
            typeof response === 'object' &&
            'binaryContent' in response
          ) {
            // Extract the binary content
            const binaryContent = response.binaryContent as Part;
            if (binaryContent) {
              binaryParts.push(binaryContent);
            }
            content = response.output || `Processed binary content`;
          } else if (typeof response === 'string') {
            content = response;
          } else if (response?.error) {
            content = `Error: ${response.error}`;
            // Check if this is a cancelled tool response
            if (response.error.includes('[Operation Cancelled]')) {
              isCancelled = true;
            }
          } else if (response?.llmContent) {
            content = String(response.llmContent);
          } else if (response?.output) {
            content = String(response.output);
          } else {
            content = JSON.stringify(response);
          }

          const toolCallId = (part.functionResponse as { id?: string }).id;
          if (!toolCallId) {
            throw new Error(
              `Tool response for '${part.functionResponse.name}' is missing required tool_call_id. This ID must match the original tool call ID from the model.`,
            );
          }

          // For cancelled tools, we might need to handle them specially for Anthropic/OpenAI
          // Store the cancellation status in the message for later processing
          const toolMessage: LegacyProviderMessage & { _cancelled?: boolean } =
            {
              role: 'tool' as ContentGeneratorRole, // Tool role is needed for tool responses
              content,
              tool_call_id: toolCallId,
              tool_name: part.functionResponse.name,
            };

          if (isCancelled) {
            toolMessage._cancelled = true;
          }

          messages.push(toolMessage);
        }

        // If there are binary parts from function responses or non-functionResponse parts, add them as user messages
        const allBinaryParts = [...binaryParts, ...nonFunctionResponseParts];
        if (allBinaryParts.length > 0) {
          const binaryMessage: LegacyProviderMessage = {
            role: ContentGeneratorRole.USER,
            content: '',
          };

          // Only include parts field for Gemini provider
          if (this.provider.name === 'gemini') {
            binaryMessage.parts = allBinaryParts;
          }

          messages.push(binaryMessage);
        }
      } else {
        // Check for function calls (tool calls from the model)
        const functionCalls = (content.parts || []).filter(
          (
            part,
          ): part is Part & {
            functionCall: {
              id?: string;
              name: string;
              args?: Record<string, unknown>;
            };
          } => 'functionCall' in part,
        );

        // Get all parts
        const allParts = content.parts || [];

        // Extract text content
        const textParts = allParts
          .filter((part): part is Part & { text: string } => 'text' in part)
          .map((part) => part.text);
        const combinedText = textParts.join('');

        // Map Gemini roles to provider roles
        let role: ContentGeneratorRole | 'system';
        if (content.role === 'model') {
          role = ContentGeneratorRole.ASSISTANT;
        } else if (content.role === 'user') {
          role = ContentGeneratorRole.USER;
        } else if (content.role === 'system') {
          role = 'system';
        } else {
          role = content.role as ContentGeneratorRole | 'system';
        }

        const message: LegacyProviderMessage = {
          role,
          content: combinedText,
        };

        // Only include parts field for Gemini provider
        // OpenAI and Anthropic don't support the parts field
        if (this.provider.name === 'gemini') {
          // Preserve all parts including non-text content (PDFs, images, etc.)
          message.parts = allParts;
        }

        // If this is an assistant message with function calls, add them
        if (role === 'assistant' && functionCalls.length > 0) {
          message.tool_calls = functionCalls.map((part) => {
            if (!part.functionCall.id) {
              throw new Error('Function call ID is required but missing');
            }
            return {
              id: part.functionCall.id,
              type: 'function' as const,
              function: {
                name: part.functionCall.name,
                arguments: JSON.stringify(part.functionCall.args || {}),
              },
            };
          });
        }

        messages.push(message);
      }
    }

    return messages;
  }

  /**
   * Convert provider messages to a single Gemini response
   * @deprecated Replaced by convertContentsToResponse after Phase 13 simplification
   */
  // @ts-expect-error - Method kept for backward compatibility, will be removed in future cleanup
  private convertMessagesToResponse(
    messages: LegacyProviderMessage[],
  ): GenerateContentResponse {
    // Combine all messages into a single response
    const combinedContent = messages.map((m) => m.content || '').join('');
    const parts: Part[] = [];

    // Add text content
    if (combinedContent) {
      parts.push({ text: combinedContent });
    }

    // Add tool calls as function calls
    for (const message of messages) {
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (_e) {
            // Use empty object as fallback
          }

          parts.push({
            functionCall: {
              name: toolCall.function.name,
              args,
            },
          } as Part);
        }
      }

      // CRITICAL FIX: Preserve parts from the message (PDFs, images, etc.)
      if (message.parts && message.parts.length > 0) {
        parts.push(...message.parts);
      }
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
        },
      ],
    } as GenerateContentResponse;
  }

  /**
   * Convert Content[] array to GenerateContentResponse (for non-streaming)
   * @param contents Array of Content from provider
   * @returns GenerateContentResponse for Gemini compatibility
   */
  private convertContentsToResponse(
    contents: Content[],
  ): GenerateContentResponse {
    // Combine all content into a single response
    const parts: Part[] = [];

    // Process each content item
    for (const content of contents) {
      if (content.parts) {
        // Content format already has parts - just include them directly
        parts.push(...content.parts);
      }
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
        },
      ],
    } as GenerateContentResponse;
  }

  /**
   * Convert a single provider message to a streaming Gemini response
   * @deprecated Replaced by convertContentToStreamResponse after Phase 13 simplification
   */
  // @ts-expect-error - Method kept for backward compatibility, will be removed in future cleanup
  private convertMessageToStreamResponse(
    message: LegacyProviderMessage,
  ): GenerateContentResponse {
    const parts: Part[] = [];

    // Add text content if present
    if (message.content) {
      parts.push({ text: message.content });
    }

    // Add tool calls as function calls
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (_e) {
          // Use empty object as fallback
        }

        parts.push({
          functionCall: {
            name: toolCall.function.name,
            args,
            // Store the tool call ID in the functionCall for later retrieval
            id: toolCall.id,
          },
        } as Part);
      }
    }

    // CRITICAL FIX: Preserve parts from the message (PDFs, images, etc.)
    if (message.parts && message.parts.length > 0) {
      parts.push(...message.parts);
    }

    const response: GenerateContentResponse = {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
        },
      ],
    } as GenerateContentResponse;

    // Include usage metadata if present in the message
    // This ensures telemetry is only triggered when we have complete usage data
    if (message.usage) {
      response.usageMetadata = {
        promptTokenCount: message.usage.prompt_tokens || 0,
        candidatesTokenCount: message.usage.completion_tokens || 0,
        totalTokenCount: message.usage.total_tokens || 0,
      };
    }

    return response;
  }

  /**
   * Fix orphaned tool calls by adding synthetic responses
   * This ensures OpenAI and Anthropic APIs receive matching call/response pairs
   * @param contents The conversation history
   * @returns Fixed conversation history with synthetic responses appended
   */
  private fixOrphanedToolCalls(contents: Content[]): Content[] {
    this.logger.debug(() => '[WRAPPER] Checking for orphaned tool calls');

    // Track all tool calls and responses
    const toolCalls = new Map<string, { name: string; modelIndex: number }>();
    const toolResponses = new Set<string>();

    // First pass: identify all tool calls and responses
    contents.forEach((content, idx) => {
      if (content.role === 'model' && content.parts) {
        content.parts.forEach((part: Part) => {
          if (
            'functionCall' in part &&
            part.functionCall?.id &&
            part.functionCall?.name
          ) {
            toolCalls.set(part.functionCall.id, {
              name: part.functionCall.name,
              modelIndex: idx,
            });
          }
        });
      }

      if (content.role === 'user' && content.parts) {
        content.parts.forEach((part: Part) => {
          if ('functionResponse' in part) {
            const responseId = (part.functionResponse as { id?: string }).id;
            if (responseId) {
              toolResponses.add(responseId);
            }
          }
        });
      }
    });

    // Identify orphaned tool calls (calls without responses)
    const orphanedCalls: Array<{ id: string; name: string }> = [];
    for (const [id, info] of toolCalls) {
      if (!toolResponses.has(id)) {
        orphanedCalls.push({ id, name: info.name });
        this.logger.debug(
          () =>
            `[WRAPPER] Found orphaned tool call: id=${id}, name=${info.name}`,
        );
      }
    }

    // If no orphaned calls, return contents as-is
    if (orphanedCalls.length === 0) {
      return contents;
    }

    // Create a single user message with all synthetic responses
    // This avoids index shifting issues
    const syntheticParts: Part[] = orphanedCalls.map((call) => ({
      functionResponse: {
        id: call.id,
        name: call.name,
        response: {
          error: '[Operation Cancelled] Tool call was interrupted by user',
        },
      },
    }));

    const syntheticResponse: Content = {
      role: 'user',
      parts: syntheticParts,
    };

    this.logger.debug(
      () =>
        `[WRAPPER] Adding synthetic responses for ${orphanedCalls.length} orphaned tool calls`,
    );

    // Return contents with synthetic response appended at the end
    // This maintains the original order and doesn't break indices
    return [...contents, syntheticResponse];
  }

  /**
   * Convert Content to GenerateContentResponse format
   * @param content Content from provider (new format)
   * @returns GenerateContentResponse for Gemini compatibility
   */
  private convertContentToStreamResponse(
    content: Content,
  ): GenerateContentResponse {
    const response: GenerateContentResponse = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: content.parts || [],
          },
        },
      ],
    } as GenerateContentResponse;

    // Include usage metadata if present in the content
    if ('usage' in content) {
      const usage = (content as Content & { usage: unknown }).usage as {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };

      response.usageMetadata = {
        promptTokenCount: usage.prompt_tokens || 0,
        candidatesTokenCount: usage.completion_tokens || 0,
        totalTokenCount: usage.total_tokens || 0,
      };
    }

    return response;
  }
}
