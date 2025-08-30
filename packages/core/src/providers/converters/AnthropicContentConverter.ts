/**
 * @plan PLAN-20250113-SIMPLIFICATION.P06
 * @requirement REQ-002.3
 * @pseudocode lines 82-133
 */
import { Content, Part, FunctionCall } from '@google/genai';
import { IContentConverter } from './IContentConverter.js';
import { ToolIdGenerator } from '../../utils/toolIdGenerator.js';

// Anthropic message format types
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

export interface AnthropicContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: unknown;
}

export interface AnthropicResponse {
  content: AnthropicContent[];
}

export class AnthropicContentConverter implements IContentConverter {
  // Track tool IDs to prevent duplicates
  private processedToolIds = new Set<string>();

  toProviderFormat(contents: Content[]): AnthropicMessage[] {
    // Clear processed IDs for each new conversion
    this.processedToolIds.clear();

    // Pseudocode line 83: INITIALIZE messages as empty array
    const messages: AnthropicMessage[] = [];
    // Pseudocode line 84: INITIALIZE lastRole as null
    let lastRole: string | null = null;
    // Pseudocode line 85: INITIALIZE currentMessage as null
    let currentMessage: AnthropicMessage | null = null;

    // Pseudocode line 87-109: FOR each content in contents
    for (const content of contents) {
      if (!content.role || !content.parts) continue;

      // Skip system messages - they are handled separately by the provider
      if (content.role === 'system') continue;

      // Pseudocode line 88: SET anthropicRole = MAP content.role to Anthropic role
      const anthropicRole = this.mapRole(content.role as 'user' | 'model');

      // Pseudocode line 90-96: IF anthropicRole not equals lastRole
      if (anthropicRole !== lastRole) {
        // Pseudocode line 91-93: IF currentMessage exists
        if (currentMessage !== null) {
          // Pseudocode line 92: ADD currentMessage to messages
          messages.push(currentMessage);
        }
        // Pseudocode line 94: CREATE new currentMessage with role=anthropicRole
        currentMessage = { role: anthropicRole, content: '' };
        // Pseudocode line 95: SET lastRole = anthropicRole
        lastRole = anthropicRole;
      }

      // Pseudocode line 98-108: FOR each part in content.parts
      for (const part of content.parts) {
        // Pseudocode line 99-101: IF part has text
        if (part.text) {
          // Pseudocode line 100: APPEND text to currentMessage.content
          this.appendTextToMessage(currentMessage!, part.text);
        }
        // Pseudocode line 102-104: ELSE IF part has functionCall
        else if (part.functionCall) {
          // Pseudocode line 103: CREATE tool_use block
          // CRITICAL: Preserve the existing ID from the functionCall if it exists
          // This ensures tool_use and tool_result IDs match
          const toolId = ToolIdGenerator.ensureId(
            part.functionCall.id,
            'toolu',
          );
          const transformedId = ToolIdGenerator.transformId(
            toolId,
            'anthropic',
          );

          // Check for duplicate tool IDs
          if (this.processedToolIds.has(transformedId)) {
            console.warn(
              `Duplicate tool ID detected: ${transformedId}, skipping`,
            );
            continue;
          }
          this.processedToolIds.add(transformedId);

          const toolUse: AnthropicContent = {
            type: 'tool_use',
            id: transformedId,
            name: part.functionCall.name,
            input: part.functionCall.args,
          };
          // Pseudocode line 104: APPEND tool_use to currentMessage.content
          this.appendContentToMessage(currentMessage!, toolUse);
        }
        // Pseudocode line 105-107: ELSE IF part has functionResponse
        else if (part.functionResponse) {
          // Fast fail if ID is missing
          const responseId = (part.functionResponse as { id?: string }).id;
          if (!responseId) {
            throw new Error('Function response ID is required but missing');
          }

          // Transform to Anthropic format to ensure consistency
          const transformedId = ToolIdGenerator.transformId(
            responseId,
            'anthropic',
          );

          // Check if we've already processed a response for this tool
          const responseKey = `response_${transformedId}`;
          if (this.processedToolIds.has(responseKey)) {
            console.warn(
              `Duplicate tool response detected for ID: ${transformedId}, skipping`,
            );
            continue;
          }
          this.processedToolIds.add(responseKey);

          // Pseudocode line 106: CREATE tool_result block with existing ID
          const toolResult: AnthropicContent = {
            type: 'tool_result',
            tool_use_id: transformedId,
            content: part.functionResponse.response,
          };
          // Pseudocode line 107: APPEND tool_result to currentMessage.content
          this.appendContentToMessage(currentMessage!, toolResult);
        }
      }
    }

    // Pseudocode line 111-113: IF currentMessage exists
    if (currentMessage !== null) {
      // Pseudocode line 112: ADD currentMessage to messages
      messages.push(currentMessage);
    }

    // Pseudocode line 115: RETURN messages
    return messages;
  }

  fromProviderFormat(response: unknown): Content {
    const anthropicResponse = response as AnthropicResponse;
    // Pseudocode line 119: INITIALIZE parts as empty array
    const parts: Part[] = [];

    // Pseudocode line 121-130: IF response.content exists
    if (anthropicResponse.content) {
      // Pseudocode line 122: FOR each block in response.content
      for (const block of anthropicResponse.content) {
        // Pseudocode line 123-125: IF block.type equals "text"
        if (block.type === 'text' && block.text) {
          // Pseudocode line 124: ADD text part with block.text to parts
          parts.push({ text: block.text });
        }
        // Pseudocode line 126-128: ELSE IF block.type equals "tool_use"
        else if (block.type === 'tool_use') {
          // Pseudocode line 127: CREATE functionCall part with ID
          // CRITICAL: The ID from Anthropic has toolu_ prefix, and we MUST preserve it
          // exactly as-is so that tool_result blocks can reference the same ID
          const functionCall: FunctionCall = {
            id: block.id, // PRESERVE THE EXACT ID FROM ANTHROPIC INCLUDING PREFIX!
            name: block.name!,
            args: block.input as Record<string, unknown>,
          };
          parts.push({ functionCall });
        }
      }
    }

    // Pseudocode line 132: RETURN Content with role="model" and parts
    return { role: 'model', parts };
  }

  private mapRole(role: 'user' | 'model'): 'user' | 'assistant' {
    return role === 'model' ? 'assistant' : 'user';
  }

  private appendTextToMessage(message: AnthropicMessage, text: string): void {
    if (typeof message.content === 'string') {
      message.content += text;
    } else {
      // If content is already an array, append as text block
      message.content.push({ type: 'text', text });
    }
  }

  private appendContentToMessage(
    message: AnthropicMessage,
    content: AnthropicContent,
  ): void {
    if (typeof message.content === 'string') {
      // Convert string content to array format
      const textContent = message.content;
      message.content = [];
      if (textContent) {
        message.content.push({ type: 'text', text: textContent });
      }
    }
    message.content.push(content);
  }
}
