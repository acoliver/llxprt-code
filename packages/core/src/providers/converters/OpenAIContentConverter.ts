/**
 * @plan PLAN-20250113-SIMPLIFICATION.P05
 * @requirement REQ-002.2
 * @pseudocode lines 12-74
 */
import { Content, Part, FunctionCall } from '@google/genai';
import { IContentConverter } from './IContentConverter.js';
import { safeJsonStringify, safeJsonParse } from '../../utils/jsonUtils.js';

// OpenAI message format types
export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content?: string;
      tool_calls?: OpenAIToolCall[];
    };
  }>;
}

export class OpenAIContentConverter implements IContentConverter {
  toProviderFormat(contents: Content[]): OpenAIMessage[] {
    // Log input for debugging
    console.debug(
      `[OpenAIContentConverter] Converting ${contents.length} Gemini contents to OpenAI format`,
    );
    contents.forEach((content, idx) => {
      const partTypes =
        content.parts
          ?.map((p) => {
            if ('text' in p) return 'text';
            if ('functionCall' in p) return 'functionCall';
            if ('functionResponse' in p) return 'functionResponse';
            return 'unknown';
          })
          .join(',') || 'no-parts';
      console.debug(`  [${idx}] ${content.role}: ${partTypes}`);
    });

    // Pseudocode line 13: INITIALIZE messages as empty array
    const messages: OpenAIMessage[] = [];
    // Pseudocode line 14: INITIALIZE pendingToolCalls
    const pendingToolCalls = new Map<string, string>();

    // Pseudocode line 16-50: Process each content
    for (const content of contents) {
      if (!content.parts) continue;
      // Handle system messages
      if (content.role === 'system') {
        // Combine all text parts from system message
        const textParts: string[] = [];
        for (const part of content.parts) {
          if (part.text) {
            textParts.push(part.text);
          }
        }
        if (textParts.length > 0) {
          messages.push({
            role: 'system',
            content: textParts.join(''),
          });
        }
      }
      // Pseudocode line 17: IF content.role equals "user"
      else if (content.role === 'user') {
        // Pseudocode line 18-24: FOR each part in content.parts
        for (const part of content.parts) {
          // Pseudocode line 19-20: IF part has text
          if (part.text) {
            // Pseudocode line 20: ADD OpenAIMessage with role="user", content=part.text to messages
            messages.push({
              role: 'user',
              content: part.text,
            });
          }
          // Pseudocode line 21-22: ELSE IF part has functionResponse
          else if (part.functionResponse) {
            // Use the ID from the functionResponse - it should already exist!
            let responseId = (part.functionResponse as { id?: string }).id;
            if (!responseId) {
              // Try to find matching call ID from pendingToolCalls
              responseId =
                pendingToolCalls.get(part.functionResponse.name || 'unknown') ||
                `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              console.warn(
                `[OpenAIContentConverter] Missing function response ID for '${part.functionResponse.name}', using: ${responseId}`,
              );
            }
            // Pseudocode line 22: ADD OpenAI message with role="tool", tool_call_id
            messages.push({
              role: 'tool',
              content: safeJsonStringify(part.functionResponse.response),
              tool_call_id: responseId,
            });
          }
        }
      }
      // Pseudocode line 25: ELSE IF content.role equals "model"
      else if (content.role === 'model') {
        // Pseudocode line 26-27: INITIALIZE textParts, toolCalls
        const textParts: string[] = [];
        const toolCalls: OpenAIToolCall[] = [];

        // Pseudocode line 29-37: FOR each part in content.parts
        for (const part of content.parts) {
          // Pseudocode line 30-31: IF part has text
          if (part.text) {
            // Pseudocode line 31: APPEND part.text to textParts
            textParts.push(part.text);
          }
          // Pseudocode line 32-35: ELSE IF part has functionCall
          else if (part.functionCall) {
            // Pseudocode line 33: CREATE toolCall with id, name, arguments
            let callId = (part.functionCall as { id?: string }).id;
            if (!callId) {
              callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              console.warn(
                `[OpenAIContentConverter] Missing function call ID for '${part.functionCall.name}', generated: ${callId}`,
              );
            }
            const toolCall: OpenAIToolCall = {
              id: callId,
              type: 'function',
              function: {
                name: part.functionCall.name || 'unknown',
                arguments: safeJsonStringify(part.functionCall.args),
              },
            };
            // Pseudocode line 34: ADD toolCall to toolCalls
            toolCalls.push(toolCall);
            // Pseudocode line 35: STORE in pendingToolCalls map
            pendingToolCalls.set(part.functionCall.name || 'unknown', callId);
          }
        }

        // Pseudocode line 39-48: IF textParts not empty OR toolCalls not empty
        if (textParts.length > 0 || toolCalls.length > 0) {
          // Pseudocode line 40: CREATE message with role="assistant"
          const message: OpenAIMessage = { role: 'assistant' };

          // Pseudocode line 41-43: IF textParts not empty
          if (textParts.length > 0) {
            // Pseudocode line 42: SET message.content = JOIN textParts
            message.content = textParts.join('');
          }

          // Pseudocode line 44-46: IF toolCalls not empty
          if (toolCalls.length > 0) {
            // Pseudocode line 45: SET message.tool_calls = toolCalls
            message.tool_calls = toolCalls;
          }

          // Pseudocode line 47: ADD message to messages
          messages.push(message);
        }
      }
    }

    // Don't fix orphaned tool responses here - handled centrally in useGeminiStream
    // const fixedMessages = this.fixOrphanedToolResponses(messages);

    // Log output for debugging
    console.debug(
      `[OpenAIContentConverter] Converted to ${messages.length} OpenAI messages`,
    );
    messages.forEach((msg, idx) => {
      let details = msg.role;
      if (msg.tool_call_id) details += ` (tool_response: ${msg.tool_call_id})`;
      if (msg.tool_calls) details += ` (${msg.tool_calls.length} tool_calls)`;
      if (msg.content && msg.role === 'system')
        details += ` (length: ${msg.content.length})`;
      console.debug(`  [${idx}] ${details}`);
    });

    // Pseudocode line 52: RETURN messages
    return messages;
  }

  fromProviderFormat(response: unknown): Content {
    // Check if it's an OpenAI message (has role and content at top level)
    const msg = response as {
      role?: string;
      content?: unknown;
      tool_calls?: unknown;
    };
    if (msg.role && (msg.content !== undefined || msg.tool_calls)) {
      // It's an OpenAI message, convert directly
      const parts: Part[] = [];

      if (msg.content && typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      }

      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        for (const toolCall of msg.tool_calls) {
          const tc = toolCall as {
            id?: string;
            function: { name: string; arguments: string };
          };
          if (tc.function && tc.function.name && tc.function.arguments) {
            // Ensure we always set the ID
            const functionCall: FunctionCall = {
              id:
                tc.id ||
                `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: tc.function.name,
              args: safeJsonParse(tc.function.arguments, {}) as Record<
                string,
                unknown
              >,
            };
            parts.push({ functionCall });
          }
        }
      }

      // Map OpenAI message roles to Content roles
      let role: 'user' | 'model' = 'model';
      if (msg.role === 'user') {
        role = 'user';
      }

      return { role, parts };
    }

    // Otherwise, it's an OpenAI API response
    const openAIResponse = response as OpenAIResponse;
    // Pseudocode line 56: INITIALIZE parts as empty array
    const parts: Part[] = [];

    // Pseudocode line 58-59: IF response.choices exists and not empty
    if (openAIResponse.choices && openAIResponse.choices.length > 0) {
      // Pseudocode line 59: SET choice = response.choices[0]
      const choice = openAIResponse.choices[0];

      // Pseudocode line 61-63: IF choice.message.content exists
      if (choice.message?.content) {
        // Pseudocode line 62: ADD text part with choice.message.content to parts
        parts.push({ text: choice.message.content });
      }

      // Pseudocode line 65-70: IF choice.message.tool_calls exists
      if (choice.message?.tool_calls) {
        // Pseudocode line 66-69: FOR each toolCall in choice.message.tool_calls
        for (const toolCall of choice.message.tool_calls) {
          // Pseudocode line 67-68: CREATE functionCall part with name and args
          const functionCall: FunctionCall = {
            name: toolCall.function.name,
            args: safeJsonParse(toolCall.function.arguments, {}) as Record<
              string,
              unknown
            >,
          };
          parts.push({ functionCall });
        }
      }
    }

    // Pseudocode line 73: RETURN Content with role="model" and parts
    return { role: 'model', parts };
  }
}
