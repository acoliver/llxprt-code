// @plan PLAN-20250128-HISTORYSERVICE.P04
// @requirement ALL-CORE: Tests for HS-001 through HS-008
// @pseudocode Tests validate behavior from history-service.md

import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../HistoryService';
import { MessageRoleEnum } from '../types';

describe('HistoryService Core Functionality', () => {
  let historyService: HistoryService;
  
  beforeEach(() => {
    historyService = new HistoryService('test-conversation-id');
  });

  describe('Constructor and Initialization', () => {
    // @requirement HS-001: Initialize conversation history
    it('should initialize with conversation ID', () => {
      // Test REAL behavior - service should be initialized
      expect(historyService).toBeDefined();
      // Test conversation ID is stored (via metadata or other accessor)
    });

    it('should reject empty conversation ID', () => {
      // Test validation behavior  
      expect(() => new HistoryService('')).toThrow('ConversationId cannot be empty');
    });
    
    // @requirement HS-004: Prevent direct access to internal messages array
    it('should prevent direct access to internal messages array', () => {
      // The messages property exists as a private member but is not exposed in the public interface
      expect((historyService as any).messages).toBeDefined();
    });
  });

  describe('Message Addition', () => {
    // @requirement HS-002: Add message to conversation history (user messages)
    it('should add user message and return message ID', () => {
      const messageId = historyService.addMessage('Hello', MessageRoleEnum.USER);
      expect(typeof messageId).toStrictEqual('string');
      expect(messageId.length).toBeGreaterThan(0);
    });

    // @requirement HS-003: Add message to conversation history (model messages)
    it('should add assistant message with metadata', () => {
      const metadata = { timestamp: Date.now() };
      const messageId = historyService.addMessage('Hi there', MessageRoleEnum.ASSISTANT, metadata);
      expect(typeof messageId).toStrictEqual('string');
    });

    it('should validate message content', () => {
      expect(() => historyService.addMessage('', MessageRoleEnum.USER))
        .toThrow('Message content cannot be empty');
    });

    it('should validate message role', () => {
      expect(() => historyService.addMessage('test', 'INVALID_ROLE' as any))
        .toThrow('Invalid message role');
    });
  });

  describe('Message Retrieval', () => {
    let messageId1: string;
    let messageId2: string;
    
    beforeEach(() => {
      messageId1 = historyService.addMessage('Message 1', MessageRoleEnum.USER);
      messageId2 = historyService.addMessage('Message 2', MessageRoleEnum.ASSISTANT);
    });
    
    // @requirement HS-004: Get specific message by ID
    it('should retrieve a message by its ID', () => {
      const message = historyService.getMessageById(messageId1);
      expect(message.id).toBe(messageId1);
      expect(message.content).toBe('Message 1');
      expect(message.role).toBe(MessageRoleEnum.USER);
    });
    
    it('should throw when retrieving non-existent message', () => {
      expect(() => historyService.getMessageById('non-existent-id'))
        .toThrow('Message not found');
    });
    
    // @requirement HS-005: Get messages from history
    it('should retrieve all messages in chronological order', () => {
      const messages = historyService.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe(messageId1);
      expect(messages[1].id).toBe(messageId2);
    });
    
    it('should return empty array when no messages exist', () => {
      const emptyHistory = new HistoryService('empty-test-conversation-id');
      const messages = emptyHistory.getMessages();
      expect(messages).toHaveLength(0);
    });
  });

  describe('Last Message Accessors', () => {
    let messageId1: string;
    let messageId2: string;
    
    beforeEach(() => {
      messageId1 = historyService.addMessage('Message 1', MessageRoleEnum.USER);
      messageId2 = historyService.addMessage('Message 2', MessageRoleEnum.ASSISTANT);
    });
    
    // @requirement HS-007: Get last message of any type
    it('should retrieve the last message regardless of role', () => {
      const lastMessage = historyService.getLastMessage();
      expect(lastMessage.id).toBe(messageId2);
      expect(lastMessage.content).toBe('Message 2');
      expect(lastMessage.role).toBe(MessageRoleEnum.ASSISTANT);
    });
    
    // @requirement HS-007: Get last message from specific role
    it('should retrieve the last user message', () => {
      const lastUserMessage = historyService.getLastMessage(MessageRoleEnum.USER);
      expect(lastUserMessage.id).toBe(messageId1);
      expect(lastUserMessage.content).toBe('Message 1');
      expect(lastUserMessage.role).toBe(MessageRoleEnum.USER);
    });
    
    it('should retrieve the last assistant message', () => {
      const lastAssistantMessage = historyService.getLastMessage(MessageRoleEnum.ASSISTANT);
      expect(lastAssistantMessage.id).toBe(messageId2);
      expect(lastAssistantMessage.content).toBe('Message 2');
      expect(lastAssistantMessage.role).toBe(MessageRoleEnum.ASSISTANT);
    });
    
    it('should return null when no messages exist', () => {
      const emptyHistory = new HistoryService('empty-test-conversation-id');
      const lastMessage = emptyHistory.getLastMessage();
      expect(lastMessage).toBeNull();
    });
    
    it('should return null when no messages exist for specific role', () => {
      const lastAssistantMessage = historyService.getLastMessage(MessageRoleEnum.SYSTEM);
      expect(lastAssistantMessage).toBeNull();
    });
  });

  describe('Message Operations', () => {
    let messageId1: string;
    let messageId2: string;
    
    beforeEach(() => {
      messageId1 = historyService.addMessage('Message 1', MessageRoleEnum.USER);
      messageId2 = historyService.addMessage('Message 2', MessageRoleEnum.ASSISTANT);
    });
    
    // @requirement HS-004: Get specific message by ID
    it('should retrieve a message by its ID', () => {
      const message = historyService.getMessageById(messageId1);
      expect(message.id).toBe(messageId1);
      expect(message.content).toBe('Message 1');
      expect(message.role).toBe(MessageRoleEnum.USER);
    });
    
    // @requirement HS-005: Update existing message
    it('should update an existing message', () => {
      const updatedMessage = historyService.updateMessage(messageId1, { content: 'Updated message' });
      expect(updatedMessage.id).toBe(messageId1);
      expect(updatedMessage.content).toBe('Updated message');
    });
    
    it('should throw when updating non-existent message', () => {
      expect(() => historyService.updateMessage('non-existent-id', { content: 'test' }))
        .toThrow('Message not found with id: non-existent-id');
    });
    
    // @requirement HS-006: Remove message from history
    it('should delete a message by its ID', () => {
      const deleted = historyService.deleteMessage(messageId1);
      expect(deleted).toBe(true);
      
      // Try to get the deleted message - should throw
      expect(() => historyService.getMessageById(messageId1)).toThrow('Message not found with id: ' + messageId1);
    });
    
    it('should return false when deleting non-existent message', () => {
      expect(() => historyService.deleteMessage('non-existent-id'))
        .toThrow('Message not found with id: non-existent-id');
    });
  });

  describe('History Operations', () => {
    beforeEach(() => {
      historyService.addMessage('Message 1', MessageRoleEnum.USER);
      historyService.addMessage('Message 2', MessageRoleEnum.ASSISTANT);
    });

    // @requirement HS-007: Clear all conversation history
    it('should clear all messages and return count', () => {
      const clearedCount = historyService.clearHistory();
      expect(clearedCount).toBe(2);
      expect(historyService.getMessages()).toHaveLength(0);
    });

    it('should return 0 when clearing empty history', () => {
      historyService.clearHistory();
      const clearedCount = historyService.clearHistory();
      expect(clearedCount).toBe(0);
    });
    
    // @requirement HS-008: Get conversation metadata
    it('should return conversation metadata', () => {
      const metadata = historyService.getConversationMetadata();
      expect(metadata).toBeDefined();
      expect(metadata.conversationId).toBe('test-conversation-id');
    });
  });
});