import {
  MessageRole,
  MessageMetadata,
  ToolCall,
  ToolResponse,
} from './types.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class MessageValidator {
  validateMessage(
    content: string,
    role: MessageRole,
    _metadata?: MessageMetadata,
  ): boolean {
    return !!(content && role && typeof content === 'string');
  }

  validateMessageUpdate(updates: unknown): boolean {
    return !!(updates && typeof updates === 'object');
  }

  validateToolCall(toolCall: ToolCall): boolean {
    return !!(toolCall && toolCall.id && toolCall.name);
  }

  validateToolResponse(toolResponse: ToolResponse): boolean {
    return !!(
      toolResponse &&
      toolResponse.toolCallId &&
      toolResponse.result !== undefined
    );
  }
}
