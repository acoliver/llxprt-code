/**
 * @plan PLAN-20250120-DEBUGLOGGING.P15
 * @requirement REQ-INT-001.1
 */
import { Content } from '@google/genai';
import { ITool } from '../ITool.js';
import {
  OpenAIMessage,
  OpenAIContentConverter,
} from '../converters/OpenAIContentConverter.js';
import { ResponsesTool } from '../../tools/IToolFormatter.js';
import { ensureJsonSafe } from '../../utils/unicodeUtils.js';

// Type to handle both Content format and legacy OpenAI-style format
type MessageFormat = Content | (OpenAIMessage & { parts?: undefined });

export interface ResponsesRequestParams {
  messages?: MessageFormat[];
  // For internal use - already converted messages
  _convertedMessages?: OpenAIMessage[];
  prompt?: string;
  tools?: ITool[] | ResponsesTool[];
  stream?: boolean;
  conversationId?: string;
  parentId?: string;
  tool_choice?: string | object;
  stateful?: boolean;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  n?: number;
  logprobs?: boolean;
  top_logprobs?: number;
  response_format?: object;
  seed?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

// Responses API message format
type ResponsesMessage =
  | {
      role: 'assistant' | 'system' | 'developer' | 'user';
      content: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    }
  | FunctionCallOutput
  | FunctionCall;

type FunctionCallOutput = {
  type: 'function_call_output';
  call_id: string;
  output: string;
};

type FunctionCall = {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
};

export interface ResponsesRequest {
  model: string;
  input?: ResponsesMessage[]; // Changed from messages to input, uses cleaned format
  prompt?: string;
  tools?: ResponsesTool[];
  stream?: boolean;
  previous_response_id?: string;
  store?: boolean;
  tool_choice?: string | object;
  stateful?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  n?: number;
  logprobs?: boolean;
  top_logprobs?: number;
  response_format?: object;
  seed?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

const MAX_TOOLS = 16;
const MAX_JSON_SIZE_KB = 32;

export function buildResponsesRequest(
  params: ResponsesRequestParams,
): ResponsesRequest {
  const {
    messages,
    prompt,
    tools,
    conversationId,
    parentId,
    tool_choice,
    stateful,
    model,
    _convertedMessages,
    ...otherParams
  } = params;

  // Validate prompt/messages ambiguity
  if (prompt && messages && messages.length > 0) {
    throw new Error(
      'Cannot specify both "prompt" and "messages". Use either prompt (for simple queries) or messages (for conversation history).',
    );
  }

  // Validate required fields
  if (!prompt && (!messages || messages.length === 0)) {
    throw new Error('Either "prompt" or "messages" must be provided.');
  }

  if (!model) {
    throw new Error('Model is required for Responses API.');
  }

  // Validate tools limit
  if (tools && tools.length > MAX_TOOLS) {
    throw new Error(
      `Too many tools provided. Maximum allowed is ${MAX_TOOLS}, but ${tools.length} were provided.`,
    );
  }

  // Validate JSON size for tools
  if (tools) {
    const toolsJson = JSON.stringify(tools);
    const sizeKb = new TextEncoder().encode(toolsJson).length / 1024;
    if (sizeKb > MAX_JSON_SIZE_KB) {
      throw new Error(
        `Tools JSON size exceeds ${MAX_JSON_SIZE_KB}KB limit. Current size: ${sizeKb.toFixed(2)}KB`,
      );
    }
  }

  // For now, use all messages - trimming logic will be handled post-conversion

  // Convert Content[] to OpenAIMessage[] if needed
  let openAIMessages: OpenAIMessage[] | undefined;
  if (messages) {
    // Filter out undefined/null messages first
    let validMessages = messages.filter((msg) => msg != null);

    // Apply message trimming based on context
    if (parentId && validMessages.length > 0) {
      // For stateful mode with parent_id, the server already has the conversation history
      // Find the message that generated the parentId and send only messages after it

      // Find the index of the message with responseId matching parentId
      const parentIndex = validMessages.findIndex((msg) => {
        const msgWithMetadata = msg as Content & {
          metadata?: { responseId?: string };
        };
        return msgWithMetadata.metadata?.responseId === parentId;
      });

      if (parentIndex >= 0) {
        // Everything after the parent message is new
        validMessages = validMessages.slice(parentIndex + 1);
        console.debug(
          `[buildResponsesRequest] Stateful mode: found parentId at index ${parentIndex}, sending ${validMessages.length} new messages`,
        );
      } else {
        // Parent not found - this might be the first message after getting a parentId
        // In this case, we should send everything as it's all new
        console.debug(
          `[buildResponsesRequest] Stateful mode: parentId not found in messages, sending all ${validMessages.length} messages`,
        );
      }
    } else if (conversationId && validMessages.length > 2) {
      // When conversationId is present (but no parentId), trim to keep context manageable
      // Note: conversationId is not sent to Responses API, only used for trimming

      // Find the second-to-last user message
      const userIndices: number[] = [];
      for (let i = 0; i < validMessages.length; i++) {
        if (validMessages[i] && validMessages[i].role === 'user') {
          userIndices.push(i);
        }
      }

      if (userIndices.length >= 2) {
        // Start from the second-to-last user message
        const startIndex = userIndices[userIndices.length - 2];
        validMessages = validMessages.slice(startIndex);
      }
    }

    // Check if messages are already in OpenAI format (have role/content but no parts)
    const firstMessage = validMessages[0];
    const isOpenAIFormat =
      firstMessage &&
      'role' in firstMessage &&
      'content' in firstMessage &&
      !('parts' in firstMessage);

    if (isOpenAIFormat) {
      // These are already OpenAI-style messages, cast them directly (filtered)
      openAIMessages = validMessages as OpenAIMessage[];
    } else {
      // These are proper Google Content format, use converter
      const converter = new OpenAIContentConverter();
      openAIMessages = converter.toProviderFormat(validMessages as Content[]);
    }
  } else if (params._convertedMessages) {
    // Use already converted messages if available
    openAIMessages = params._convertedMessages;
  }

  // Transform messages for Responses API format
  const transformedMessages: ResponsesMessage[] = [];

  if (openAIMessages) {
    // Build input array in conversational order
    for (let i = 0; i < openAIMessages.length; i++) {
      const msg = openAIMessages[i];

      if (!msg) continue;

      // Handle different message types in order
      if (msg.role === 'assistant') {
        // Always add assistant message (Responses API requires content field to exist)
        transformedMessages.push({
          role: 'assistant',
          content: ensureJsonSafe(msg.content || ''),
          ...(msg.usage ? { usage: msg.usage } : {}),
        });

        // Add function calls immediately after assistant message
        if (msg.tool_calls) {
          for (const toolCall of msg.tool_calls) {
            if (toolCall.type === 'function') {
              transformedMessages.push({
                type: 'function_call' as const,
                call_id: toolCall.id,
                name: toolCall.function.name,
                arguments: ensureJsonSafe(toolCall.function.arguments), // Apply sanitization
              });
            }
          }
        }
      } else if (msg.role === 'tool') {
        // Add function output in order
        if (msg.tool_call_id && msg.content) {
          transformedMessages.push({
            type: 'function_call_output' as const,
            call_id: msg.tool_call_id,
            output: ensureJsonSafe(msg.content),
          });
        }
      } else if (msg.role === 'user' || msg.role === 'system') {
        // Add user/system messages in order
        transformedMessages.push({
          role: msg.role,
          content: ensureJsonSafe(msg.content || ''),
        });
      }
    }
  }

  // Build the request object with conditional fields
  const request: ResponsesRequest = {
    model,
    ...otherParams,
    ...(prompt ? { prompt } : {}),
  };

  // Only include input field if we have messages (not for prompt-only requests)
  if (!prompt && transformedMessages.length >= 0) {
    request.input = transformedMessages;
  }

  // Map conversation fields for stateful mode
  // Note: conversationId is not used by Responses API (can't be passed)
  if (parentId) {
    request.store = true; // Store this response for future continuation
    request.previous_response_id = parentId;
  }

  // Add tools if provided
  if (tools && tools.length > 0) {
    request.tools = tools as ResponsesTool[];
    if (tool_choice) {
      request.tool_choice = tool_choice;
    }
  }

  // Add stateful flag if provided
  if (stateful !== undefined) {
    request.stateful = stateful;
  }

  // Add stream flag if provided
  if (params.stream !== undefined) {
    request.stream = params.stream;
  }

  return request;
}
