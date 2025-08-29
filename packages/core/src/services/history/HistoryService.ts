import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  Message, 
  MessageRole, 
  MessageMetadata, 
  HistoryState, 
  ToolCall, 
  ToolResponse,
  HistoryDump,
  EditHistoryEntry,
  MessageRoleEnum
} from './types';
import { MessageValidator, ValidationError } from './MessageValidator';
import { StateManager } from './StateManager';

// @plan PLAN-20250128-HISTORYSERVICE.P07
export class HistoryService {
  private conversationId: string;
  private messages: Message[] = [];
  private pendingToolCalls: Map<string, ToolCall> = new Map();
  private toolResponses: Map<string, ToolResponse> = new Map();
  private state: HistoryState = 'READY';
  private eventEmitter: EventEmitter;
  private validator: MessageValidator;
  private stateManager: StateManager;

  // @requirement HS-001: Single authoritative history array
  // @pseudocode history-service.md:21-36
  constructor(conversationId: string) {
    // Line 23: VALIDATE conversationId is not empty
    if (!conversationId || conversationId.trim().length === 0) {
      // Line 25: THROW ValidationError("ConversationId cannot be empty")
      throw new ValidationError('ConversationId cannot be empty');
    }
    // Line 27: SET this.conversationId = conversationId
    this.conversationId = conversationId;
    // Line 28: SET this.messages = empty array
    this.messages = [];
    // Line 29: SET this.pendingToolCalls = empty map
    this.pendingToolCalls = new Map();
    // Line 30: SET this.toolResponses = empty map
    this.toolResponses = new Map();
    // Line 31: SET this.state = READY
    this.state = 'READY';
    // Line 32: INITIALIZE this.eventEmitter
    this.eventEmitter = new EventEmitter();
    // Line 33: INITIALIZE this.validator
    this.validator = new MessageValidator();
    // Line 34: INITIALIZE this.stateManager
    this.stateManager = new StateManager();
    // Line 35: EMIT ConversationStarted event
    this.eventEmitter.emit('ConversationStarted', { conversationId });
  }

  // @requirement HS-002: Add message to conversation history
  // @pseudocode history-service.md:38-63
  addMessage(content: string, role: MessageRole, metadata?: MessageMetadata): string {
    // Line 40: BEGIN TRANSACTION
    try {
      // Line 42: VALIDATE state allows message addition
      // Line 43: CALL this.stateManager.validateStateTransition(ADD_MESSAGE)
      this.stateManager.validateStateTransition('ADD_MESSAGE');
      // Line 44: VALIDATE message content and role
      // Line 45: CALL this.validator.validateMessage(content, role, metadata)
      this.validator.validateMessage(content, role, metadata);
      // Line 46-53: CREATE message object with properties
      const message: Message = {
        id: this.generateUUID(),
        content: content,
        role: role,
        timestamp: Date.now(),
        metadata: metadata || {},
        conversationId: this.conversationId
      };
      // Line 54: ADD message to this.messages array
      this.messages.push(message);
      // Line 55: EMIT MessageAdded event with message
      this.eventEmitter.emit('MessageAdded', { message });
      // Line 57: RETURN message.id
      return message.id;
    } catch (error) {
      // Line 60: EMIT MessageAddError event with error
      this.eventEmitter.emit('MessageAddError', { error });
      // Line 61: THROW error
      throw error;
    }
  }

  // @requirement HS-003: Retrieve conversation history
  // @pseudocode history-service.md:65-77
  getMessages(startIndex?: number, count?: number): Message[] {
    // Line 67: VALIDATE startIndex and count if provided
    if (startIndex !== undefined && startIndex < 0) {
      // Line 69: THROW ValidationError("StartIndex must be non-negative")
      throw new ValidationError('StartIndex must be non-negative');
    }
    if (count !== undefined && count <= 0) {
      // Line 72: THROW ValidationError("Count must be positive")
      throw new ValidationError('Count must be positive');
    }
    // Line 74: CALCULATE actualStartIndex = startIndex or 0
    const actualStartIndex = startIndex || 0;
    // Line 75: CALCULATE actualCount = count or (messages.length - actualStartIndex)
    const actualCount = count || (this.messages.length - actualStartIndex);
    // Line 76: RETURN this.messages.slice(actualStartIndex, actualStartIndex + actualCount)
    return this.messages.slice(actualStartIndex, actualStartIndex + actualCount).map(m => ({ ...m }));
  }

  // @requirement HS-004: Get specific message by ID
  // @pseudocode history-service.md:79-90
  getMessageById(messageId: string): Message {
    // Line 77-80: VALIDATE messageId
    if (!messageId || messageId.trim().length === 0) {
      // Line 79: THROW ValidationError
      throw new Error('MessageId cannot be empty');
    }
    
    // Line 81-84: FIND message
    const message = this.messages.find(m => m.id === messageId);
    if (!message) {
      // Line 83: THROW NotFoundError
      throw new Error(`Message not found with id: ${messageId}`);
    }
    
    // Line 85: RETURN message (copy to prevent direct access)
    return { ...message };
  }

  // @requirement HS-005: Update existing message
  // @pseudocode history-service.md:92-119 and 07-message-management-implementation.md
  updateMessage(messageId: string, updates: MessageUpdate): Message {
    // Line 90: BEGIN TRANSACTION
    try {
      // Line 92-94: VALIDATE messageId and updates
      if (!messageId || messageId.trim().length === 0) {
        throw new Error('MessageId cannot be empty');
      }
      this.validator.validateMessageUpdate(updates);
      
      // Line 95-98: FIND message index
      const messageIndex = this.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        // Line 97: THROW NotFoundError
        throw new Error(`Message not found with id: ${messageId}`);
      }
      
      // Line 99-103: GET existing message and validate
      const existingMessage = this.messages[messageIndex];
      if (existingMessage.metadata.locked) {
        // Line 102: THROW StateError
        throw new Error('Cannot update locked message');
      }
      
      // Line 104-111: CREATE updated message
      const updatedMessage: Message = {
        ...existingMessage,
        content: updates.content !== undefined ? updates.content : existingMessage.content,
        metadata: {
          ...existingMessage.metadata,
          ...updates.metadata,
          lastModified: Date.now(),
          editHistory: updates.content !== undefined ? [
            ...(existingMessage.metadata.editHistory || []),
            {
              timestamp: Date.now(),
              previousContent: existingMessage.content,
              editor: 'system'
            }
          ] : existingMessage.metadata.editHistory
        }
      };
      
      // Line 106: SET this.messages[messageIndex] = updated message
      this.messages[messageIndex] = updatedMessage;
      
      // Line 107: EMIT MessageUpdated event
      this.eventEmitter.emit('MessageUpdated', { 
        oldMessage: existingMessage, 
        newMessage: updatedMessage 
      });
      
      // Line 108: COMMIT TRANSACTION
      // Line 109: RETURN updated message
      return updatedMessage;
    } catch (error) {
      // Line 111: ROLLBACK TRANSACTION
      // Line 112: EMIT MessageUpdateError event
      this.eventEmitter.emit('MessageUpdateError', { error });
      // Line 113: THROW error
      throw error;
    }
  }

  // @requirement HS-006: Remove message from history
  // @pseudocode history-service.md:117-144
  deleteMessage(messageId: string): boolean {
    // Line 119: BEGIN TRANSACTION
    try {
      // Line 121-122: VALIDATE messageId
      if (!messageId || messageId.trim().length === 0) {
        throw new Error('MessageId cannot be empty');
      }
      
      // Line 122-125: FIND message index
      const messageIndex = this.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        // Line 124: THROW NotFoundError
        throw new Error(`Message not found with id: ${messageId}`);
      }
      
      // Line 126-130: GET message and validate
      const message = this.messages[messageIndex];
      if (message.metadata && message.metadata.protected) {
        // Line 129: THROW StateError
        throw new Error('Cannot delete protected message');
      }
      
      // Line 131: REMOVE message from array
      this.messages.splice(messageIndex, 1);
      
      // Line 132: EMIT MessageDeleted event
      this.eventEmitter.emit('MessageDeleted', { deletedMessage: message });
      
      // Line 133: COMMIT TRANSACTION
      // Line 134: RETURN true
      return true;
    } catch (error) {
      // Line 136: ROLLBACK TRANSACTION
      // Line 137: EMIT MessageDeleteError event
      this.eventEmitter.emit('MessageDeleteError', { error });
      // Line 138: THROW error
      throw error;
    }
  }

  // @requirement HS-007: Clear all conversation history
  // @pseudocode history-service.md:146-167
  clearHistory(): number {
    // Line 148: BEGIN TRANSACTION
    try {
      // Line 150: VALIDATE state allows clearing
      // Line 151: IF state is TOOLS_EXECUTING
      if (this.state === 'TOOLS_EXECUTING') {
        // Line 152: THROW StateError("Cannot clear history during tool execution")
        throw new Error('Cannot clear history during tool execution');
      }
      // Line 154: STORE messageCount = this.messages.length
      const messageCount = this.messages.length;
      // Line 155: SET this.messages = empty array
      this.messages = [];
      // Line 156: SET this.pendingToolCalls = empty map
      this.pendingToolCalls = new Map();
      // Line 157: SET this.toolResponses = empty map
      this.toolResponses = new Map();
      // Line 158: SET this.state = READY
      this.state = 'READY';
      // Line 159: EMIT HistoryCleared event with messageCount
      this.eventEmitter.emit('HistoryCleared', { messageCount });
      // Line 161: RETURN messageCount
      return messageCount;
    } catch (error) {
      // Line 164: EMIT HistoryClearError event with error
      this.eventEmitter.emit('HistoryClearError', { error });
      // Line 165: THROW error
      throw error;
    }
  }
  
  // @requirement HS-007: Get last message of any type
  // @pseudocode history-service.md:183-190
  getLastMessage(role?: MessageRole): Message | null {
    // Line 185: IF this.messages.length is 0
    if (this.messages.length === 0) {
      // Line 186: RETURN null
      return null;
    }
    
    // Line 188: IF role is provided
    if (role) {
      // Line 189: FIND last message where role equals role param
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].role === role) {
          return { ...this.messages[i] };
        }
      }
      // Line 190: RETURN null
      return null;
    } else {
      // Line 192: RETURN last message in this.messages array (copy)
      return this.messages.length > 0 ? { ...this.messages[this.messages.length - 1] } : null;
    }
  }
  
  // @requirement HS-007: Get last user message
  // @pseudocode history-service.md:192-199
  getLastUserMessage(): Message | null {
    // Line 194: RETURN CALL this.getLastMessage(USER)
    return this.getLastMessage('user');
  }
  
  // @requirement HS-007: Get last assistant message
  // @pseudocode history-service.md:201-208
  getLastModelMessage(): Message | null {
    // Line 203: RETURN CALL this.getLastMessage(ASSISTANT)
    return this.getLastMessage('model');
  }
  
  // @requirement HS-007: Get filtered messages (no empty content)
  // @pseudocode history-service.md:210-217
  getCuratedHistory(): Message[] {
    // Line 212: GET all messages
    const allMessages = this.getMessages();
    // Line 213: FILTER out messages with empty content
    const filteredMessages = allMessages.filter(
      msg => msg.content && msg.content.trim().length > 0
    );
    // Line 214: RETURN filtered messages
    return filteredMessages;
  }

  // @requirement HS-033: Complete history dump for debugging
  dumpHistory(): HistoryDump {
    return {
      conversationId: this.conversationId,
      timestamp: Date.now(),
      messages: this.messages.map(m => ({ ...m })), // Deep copy
      pendingToolCalls: new Map(this.pendingToolCalls),
      toolResponses: new Map(this.toolResponses),
      state: this.state,
      metadata: this.getConversationMetadata()
    };
  }

  // @requirement HS-035: Undo last message addition
  // @pseudocode history-service.md:352-377 and 07-message-management-implementation.md
  undoLastMessage(): Message {
    // Line 354: BEGIN TRANSACTION
    try {
      // Line 356-358: Check if messages exist
      if (this.messages.length === 0) {
        // Line 357: THROW StateError
        throw new Error('No messages to undo');
      }
      
      // Line 359-363: GET last message and validate
      const lastMessage = this.messages[this.messages.length - 1];
      if (lastMessage.metadata && lastMessage.metadata.protected) {
        // Line 362: THROW StateError
        throw new Error('Cannot undo protected message');
      }
      
      // Line 364: REMOVE last message
      this.messages.pop();
      
      // Line 365: EMIT MessageUndone event
      this.eventEmitter.emit('MessageUndone', { undoneMessage: lastMessage });
      
      // Line 366: COMMIT TRANSACTION
      // Line 367: RETURN lastMessage
      return lastMessage;
    } catch (error) {
      // Line 369: ROLLBACK TRANSACTION
      // Line 370: EMIT MessageUndoError event
      this.eventEmitter.emit('MessageUndoError', { error });
      // Line 371: THROW error
      throw error;
    }
  }

  // @requirement HS-034: Get edit history of a message
  // @pseudocode history-service.md:339-354 and 07-message-management-implementation.md
  getMessageHistory(messageId: string): EditHistoryEntry[] {
    // Line 341: VALIDATE messageId
    if (!messageId || messageId.trim().length === 0) {
      throw new Error('MessageId cannot be empty');
    }
    
    // Line 342-345: FIND message
    const message = this.messages.find(m => m.id === messageId);
    if (!message) {
      // Line 344: THROW NotFoundError
      throw new Error(`Message not found with id: ${messageId}`);
    }
    
    // Line 346-349: Return edit history or empty array
    if (!message.metadata.editHistory || message.metadata.editHistory.length === 0) {
      // Line 347: RETURN empty array
      return [];
    }
    
    // Line 349: RETURN message.metadata.editHistory
    return [...message.metadata.editHistory]; // Return copy
  }

  // @requirement HS-008: Get conversation metadata
  // @pseudocode history-service.md:169-181
  getConversationMetadata(): any {
    // Line 171: RETURN object with:
    return {
      // Line 172: conversationId: this.conversationId
      conversationId: this.conversationId,
      // Line 173: messageCount: this.messages.length
      messageCount: this.messages.length,
      // Line 174: state: this.state
      state: this.state,
      // Line 175: createdAt: this.messages[0]?.timestamp or null
      createdAt: this.messages.length > 0 ? this.messages[0].timestamp : null,
      // Line 176: lastModified: last message timestamp or null
      lastModified: this.messages.length > 0 ? this.messages[this.messages.length - 1].timestamp : null,
      // Line 177: pendingToolCalls: this.pendingToolCalls.size
      pendingToolCalls: this.pendingToolCalls.size,
      // Line 178: toolResponses: this.toolResponses.size
      toolResponses: this.toolResponses.size,
      // Line 179: hasErrors: check for error messages in history
      hasErrors: this.messages.some(msg => msg.metadata && msg.metadata.validationState === 'invalid')
    };
  }
  
  // Helper method to generate UUID
  private generateUUID(): string {
    return uuidv4();
  }
}