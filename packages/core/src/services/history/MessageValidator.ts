import { MessageRole, MessageMetadata, ToolCall, ToolResponse } from './types.js';

export class MessageValidator {
  validateMessage(content: string, role: MessageRole, metadata?: MessageMetadata): boolean {
    return content && role && typeof content === 'string';
  }

  validateMessageUpdate(updates: any): boolean {
    return updates && typeof updates === 'object';
  }

  validateToolCall(toolCall: ToolCall): boolean {
    return toolCall && toolCall.id && toolCall.function;
  }

  validateToolResponse(toolResponse: ToolResponse): boolean {
    return toolResponse && toolResponse.id && toolResponse.result !== undefined;
  }
}