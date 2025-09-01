/**
 * OpenAIHistoryAdapter
 *
 * Converts between HistoryService format and OpenAI API format.
 * Preserves tool call IDs exactly through the conversion cycle.
 */

import type OpenAI from 'openai';

type ChatCompletionMessageParam = OpenAI.Chat.ChatCompletionMessageParam;
type ChatCompletionChunk = OpenAI.Chat.ChatCompletionChunk;
import type { Message, ToolCall } from '../../services/history/types.js';

export class OpenAIHistoryAdapter {
  // Accumulator for streaming responses
  private streamAccumulator = {
    content: '',
    toolCalls: new Map<
      number,
      {
        id?: string;
        name?: string;
        arguments: string;
        complete: boolean;
      }
    >(),
    finishReason: null as string | null,
  };

  /**
   * Convert Message array to OpenAI API format
   * CRITICAL: Preserves tool call IDs exactly
   */
  toOpenAIFormat(messages: Message[]): ChatCompletionMessageParam[] {
    const openAIMessages: ChatCompletionMessageParam[] = [];

    for (const message of messages) {
      // Check for OpenAI-specific fields that shouldn't be here
      if ('tool_calls' in message || 'tool_call_id' in message) {
        throw new Error(
          'Invalid format: message contains OpenAI-specific fields (tool_calls or tool_call_id)',
        );
      }

      switch (message.role) {
        case 'system':
          openAIMessages.push({
            role: 'system',
            content: message.content,
          });
          break;

        case 'user':
          openAIMessages.push({
            role: 'user',
            content: message.content,
          });
          break;

        case 'assistant':
        case 'model': {
          const assistantMessage: ChatCompletionMessageParam = {
            role: 'assistant',
            content: message.content || null,
          };

          // Convert toolCalls to OpenAI format
          if (message.toolCalls && message.toolCalls.length > 0) {
            assistantMessage.tool_calls = message.toolCalls.map((toolCall) => ({
              id: toolCall.id, // PRESERVE EXACT ID
              type: 'function' as const,
              function: {
                name: toolCall.name,
                arguments:
                  typeof toolCall.arguments === 'string'
                    ? toolCall.arguments
                    : JSON.stringify(toolCall.arguments),
              },
            }));
          }

          openAIMessages.push(assistantMessage);
          break;
        }

        case 'tool':
          // Convert toolResponses to separate OpenAI tool messages
          if (message.toolResponses) {
            for (const toolResponse of message.toolResponses) {
              openAIMessages.push({
                role: 'tool',
                tool_call_id: toolResponse.toolCallId, // PRESERVE EXACT ID
                content:
                  typeof toolResponse.result === 'string'
                    ? toolResponse.result
                    : JSON.stringify(toolResponse.result),
              });
            }
          }
          break;

        default:
          throw new Error(`Unknown message role: ${message.role}`);
      }
    }

    return openAIMessages;
  }

  /**
   * Process streaming chunk from OpenAI and accumulate into Message
   * Returns null until a complete message is ready
   */
  fromOpenAIStream(chunk: ChatCompletionChunk): Message | null {
    const delta = chunk.choices[0]?.delta;
    const finishReason = chunk.choices[0]?.finish_reason;

    if (!delta && !finishReason) {
      return null;
    }

    // Accumulate content
    if (delta?.content) {
      this.streamAccumulator.content += delta.content;
    }

    // Accumulate tool calls
    if (delta?.tool_calls) {
      for (const toolCallDelta of delta.tool_calls) {
        const index = toolCallDelta.index;

        if (!this.streamAccumulator.toolCalls.has(index)) {
          this.streamAccumulator.toolCalls.set(index, {
            id: undefined,
            name: undefined,
            arguments: '',
            complete: false,
          });
        }

        const accumulator = this.streamAccumulator.toolCalls.get(index)!;

        if (toolCallDelta.id) {
          accumulator.id = toolCallDelta.id;
        }

        if (toolCallDelta.function?.name) {
          accumulator.name = toolCallDelta.function.name;
        }

        if (toolCallDelta.function?.arguments) {
          accumulator.arguments += toolCallDelta.function.arguments;
        }
      }
    }

    // Update finish reason
    if (finishReason) {
      this.streamAccumulator.finishReason = finishReason;
    }

    // Check if we should emit a message
    if (finishReason) {
      return this.createMessage();
    }

    return null;
  }

  /**
   * Convert non-streaming OpenAI response to Message
   */
  fromOpenAIComplete(response: any): Message {
    const message = response.choices[0].message;
    const finishReason = response.choices[0].finish_reason;
    const usage = response.usage;

    const historyMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: message.content || '',
      timestamp: Date.now(),
      conversationId: '',
      metadata: {},
    };

    // Add usage to metadata if available
    if (usage) {
      historyMessage.metadata!.usage = {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
      };
    }

    // Add finish reason to metadata
    if (finishReason) {
      historyMessage.metadata!.finishReason = finishReason;
    }

    // Convert tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      historyMessage.toolCalls = message.tool_calls.map((toolCall: any) => {
        let args: any;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch (error) {
          // Check if this is incomplete JSON (common pattern: starts with { but doesn't end with })
          const argString = toolCall.function.arguments;
          if (
            typeof argString === 'string' &&
            argString.trim().startsWith('{') &&
            !argString.trim().endsWith('}')
          ) {
            throw new Error(
              `Invalid JSON in tool call arguments for ${toolCall.function.name}: ${argString}`,
            );
          }
          // For other parsing errors, fall back to raw string
          args = argString;
        }

        return {
          id: toolCall.id, // PRESERVE EXACT ID
          name: toolCall.function.name,
          arguments: args,
        };
      });
    }

    return historyMessage;
  }

  /**
   * Reset the stream accumulator for a new streaming session
   */
  resetStream(): void {
    this.streamAccumulator = {
      content: '',
      toolCalls: new Map(),
      finishReason: null,
    };
  }

  private createMessage(): Message {
    const message: Message = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: this.streamAccumulator.content,
      timestamp: Date.now(),
      conversationId: '',
      metadata: {},
    };

    // Add finish reason to metadata
    if (this.streamAccumulator.finishReason) {
      message.metadata!.finishReason = this.streamAccumulator.finishReason;
    }

    // Process accumulated tool calls
    const toolCalls: ToolCall[] = [];
    for (const [_index, toolCall] of this.streamAccumulator.toolCalls) {
      if (!toolCall.id || !toolCall.name) {
        console.warn('Incomplete tool call detected, skipping:', toolCall);
        continue;
      }

      // Try to parse arguments as JSON
      let args: any;
      try {
        args = JSON.parse(toolCall.arguments);
      } catch (e) {
        // If we have a finish reason but invalid JSON, this is an error
        if (this.streamAccumulator.finishReason) {
          throw new Error(
            `Incomplete tool call: Invalid JSON in arguments for tool ${toolCall.name}`,
          );
        }
        // Otherwise, we're still accumulating
        continue;
      }

      toolCalls.push({
        id: toolCall.id, // PRESERVE EXACT ID
        name: toolCall.name,
        arguments: args,
      });
    }

    if (toolCalls.length > 0) {
      message.toolCalls = toolCalls;
    }

    return message;
  }
}
