// @plan PLAN-20250128-HISTORYSERVICE.P04
// @requirement ALL-CORE: Tests for HS-001 through HS-008
// @pseudocode Tests validate behavior from history-service.md

import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../HistoryService';
import { MessageRoleEnum, MessageRole } from '../types';

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
      expect(() => new HistoryService('')).toThrow(
        'ConversationId cannot be empty',
      );
    });

    // @requirement HS-004: Prevent direct access to internal messages array
    it('should start with empty message history', () => {
      // Test behavior through public API - new service should have no messages
      expect(historyService.getMessages()).toHaveLength(0);
      expect(historyService.isEmpty()).toBe(true);
    });
  });

  describe('Message Addition', () => {
    // @requirement HS-002: Add message to conversation history (user messages)
    it('should add user message and return message ID', () => {
      const messageId = historyService.addMessage(
        'Hello',
        MessageRoleEnum.USER,
      );
      expect(typeof messageId).toStrictEqual('string');
      expect(messageId.length).toBeGreaterThan(0);
    });

    // @requirement HS-003: Add message to conversation history (model messages)
    it('should add assistant message with metadata', () => {
      const metadata = { timestamp: Date.now() };
      const messageId = historyService.addMessage(
        'Hi there',
        MessageRoleEnum.ASSISTANT,
        metadata,
      );
      expect(typeof messageId).toStrictEqual('string');
    });

    it('should validate message content', () => {
      expect(() => historyService.addMessage('', MessageRoleEnum.USER)).toThrow(
        'Message content cannot be empty',
      );
    });

    it('should validate message role', () => {
      expect(() =>
        historyService.addMessage('test', 'INVALID_ROLE' as MessageRole),
      ).toThrow('Invalid message role');
    });
  });

  describe('Message Retrieval', () => {
    let messageId1: string;
    let _messageId2: string;

    beforeEach(() => {
      messageId1 = historyService.addMessage('Message 1', MessageRoleEnum.USER);
      _messageId2 = historyService.addMessage(
        'Message 2',
        MessageRoleEnum.ASSISTANT,
      );
    });

    // @requirement HS-004: Get specific message by ID
    it('should retrieve a message by its ID', () => {
      const message = historyService.getMessageById(messageId1);
      expect(message.id).toBe(messageId1);
      expect(message.content).toBe('Message 1');
      expect(message.role).toBe(MessageRoleEnum.USER);
    });

    it('should throw when retrieving non-existent message', () => {
      expect(() => historyService.getMessageById('non-existent-id')).toThrow(
        'Message not found',
      );
    });

    // @requirement HS-005: Get messages from history
    it('should retrieve all messages in chronological order', () => {
      const messages = historyService.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe(messageId1);
      expect(messages[1].id).toBe(_messageId2);
    });

    it('should return empty array when no messages exist', () => {
      const emptyHistory = new HistoryService('empty-test-conversation-id');
      const messages = emptyHistory.getMessages();
      expect(messages).toHaveLength(0);
    });
  });

  describe('Last Message Accessors', () => {
    let messageId1: string;
    let _messageId2: string;

    beforeEach(() => {
      messageId1 = historyService.addMessage('Message 1', MessageRoleEnum.USER);
      _messageId2 = historyService.addMessage(
        'Message 2',
        MessageRoleEnum.ASSISTANT,
      );
    });

    // @requirement HS-007: Get last message of any type
    it('should retrieve the last message regardless of role', () => {
      const lastMessage = historyService.getLastMessage();
      expect(lastMessage.id).toBe(_messageId2);
      expect(lastMessage.content).toBe('Message 2');
      expect(lastMessage.role).toBe(MessageRoleEnum.ASSISTANT);
    });

    // @requirement HS-007: Get last message from specific role
    it('should retrieve the last user message', () => {
      const lastUserMessage = historyService.getLastMessage(
        MessageRoleEnum.USER,
      );
      expect(lastUserMessage.id).toBe(messageId1);
      expect(lastUserMessage.content).toBe('Message 1');
      expect(lastUserMessage.role).toBe(MessageRoleEnum.USER);
    });

    it('should retrieve the last assistant message', () => {
      const lastAssistantMessage = historyService.getLastMessage(
        MessageRoleEnum.ASSISTANT,
      );
      expect(lastAssistantMessage.id).toBe(_messageId2);
      expect(lastAssistantMessage.content).toBe('Message 2');
      expect(lastAssistantMessage.role).toBe(MessageRoleEnum.ASSISTANT);
    });

    it('should return null when no messages exist', () => {
      const emptyHistory = new HistoryService('empty-test-conversation-id');
      const lastMessage = emptyHistory.getLastMessage();
      expect(lastMessage).toBeNull();
    });

    it('should return null when no messages exist for specific role', () => {
      const lastAssistantMessage = historyService.getLastMessage(
        MessageRoleEnum.SYSTEM,
      );
      expect(lastAssistantMessage).toBeNull();
    });
  });

  describe('Message Operations', () => {
    let messageId1: string;
    let _messageId2: string;

    beforeEach(() => {
      messageId1 = historyService.addMessage('Message 1', MessageRoleEnum.USER);
      _messageId2 = historyService.addMessage(
        'Message 2',
        MessageRoleEnum.ASSISTANT,
      );
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
      const updatedMessage = historyService.updateMessage(messageId1, {
        content: 'Updated message',
      });
      expect(updatedMessage.id).toBe(messageId1);
      expect(updatedMessage.content).toBe('Updated message');
    });

    it('should throw when updating non-existent message', () => {
      expect(() =>
        historyService.updateMessage('non-existent-id', { content: 'test' }),
      ).toThrow('Message not found with id: non-existent-id');
    });

    // @requirement HS-006: Remove message from history
    it('should delete a message by its ID', () => {
      const deleted = historyService.deleteMessage(messageId1);
      expect(deleted).toBe(true);

      // Try to get the deleted message - should throw
      expect(() => historyService.getMessageById(messageId1)).toThrow(
        'Message not found with id: ' + messageId1,
      );
    });

    it('should return false when deleting non-existent message', () => {
      expect(() => historyService.deleteMessage('non-existent-id')).toThrow(
        'Message not found with id: non-existent-id',
      );
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

  describe('History Access Methods', () => {
    let messageId1: string;
    let _messageId2: string;
    let messageId3: string;

    beforeEach(() => {
      messageId1 = historyService.addMessage(
        'Hello user message',
        MessageRoleEnum.USER,
      );
      _messageId2 = historyService.addMessage(
        'Hello assistant message',
        MessageRoleEnum.MODEL,
      );
      messageId3 = historyService.addMessage(
        'Another user message',
        MessageRoleEnum.USER,
      );
    });

    it('should retrieve curated history containing valid messages only', () => {
      // Test that getCuratedHistory returns the valid messages that were added through the public API
      const curatedMessages = historyService.getCuratedHistory();
      expect(curatedMessages).toHaveLength(3);
      expect(curatedMessages[0].id).toBe(messageId1);
      expect(curatedMessages[0].content).toBe('Hello user message');
      expect(curatedMessages[1].id).toBe(_messageId2);
      expect(curatedMessages[1].content).toBe('Hello assistant message');
      expect(curatedMessages[2].id).toBe(messageId3);
      expect(curatedMessages[2].content).toBe('Another user message');
    });

    it('should retrieve the last user message', () => {
      const lastUserMessage = historyService.getLastUserMessage();
      expect(lastUserMessage).not.toBeNull();
      expect(lastUserMessage!.id).toBe(messageId3);
      expect(lastUserMessage!.content).toBe('Another user message');
      expect(lastUserMessage!.role).toBe(MessageRoleEnum.USER);
    });

    it('should retrieve the last model message', () => {
      const lastModelMessage = historyService.getLastModelMessage();
      expect(lastModelMessage).not.toBeNull();
      expect(lastModelMessage!.id).toBe(_messageId2);
      expect(lastModelMessage!.content).toBe('Hello assistant message');
      expect(lastModelMessage!.role).toBe(MessageRoleEnum.MODEL);
    });
  });

  describe('Tool Response vs User Message Detection', () => {
    // This test demonstrates the current bug where tool responses are incorrectly
    // triggering orphan prevention, creating duplicate synthetic responses
    it.skip('should NOT create synthetic responses when receiving tool responses - ORPHAN HANDLING REMOVED', () => {
      // Setup: Add a model message with a tool call
      const modelMessageId = historyService.addMessage(
        'I will search for files',
        MessageRoleEnum.MODEL,
        {
          originalContent: {
            role: 'model',
            parts: [
              { text: 'I will search for files' },
              {
                functionCall: {
                  id: 'tool123',
                  name: 'glob',
                  args: { pattern: '**/*.ts' },
                },
              },
            ],
          },
        },
      );

      // The model message should have been added and tool call should be tracked
      expect(historyService.getMessages()).toHaveLength(1);
      expect(historyService.hasPendingToolCalls()).toBe(true);

      // Now simulate a tool response coming from geminiChat.recordHistory
      // This is what currently triggers the bug - it's marked as role: 'user'
      // but it's actually a tool response, not real user input
      const toolResponseId = historyService.addMessage(
        '[Tool response]',
        MessageRoleEnum.USER,
        {
          source: 'geminiChat.toolResponse', // Source indicates this is a tool response
          originalContent: {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  id: 'tool123',
                  name: 'glob',
                  response: {
                    output: 'Found 100 files',
                  },
                },
              },
            ],
          },
        },
      );

      // Check the messages
      const messages = historyService.getMessages();

      // BUG: Currently this will FAIL because the orphan prevention logic
      // incorrectly creates a synthetic response when it sees a "user" message
      // while tool calls are pending, even though this is actually a tool response

      // We should have exactly 2 messages: the model message and the tool response
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe(modelMessageId);
      expect(messages[1].id).toBe(toolResponseId);

      // There should NOT be a synthetic response message
      const syntheticMessages = messages.filter(
        (m) => m.metadata?.synthetic === true,
      );
      expect(syntheticMessages).toHaveLength(0);

      // The pending tool calls should have been cleared by the tool response
      expect(historyService.hasPendingToolCalls()).toBe(false);
    });

    // NEW TEST: This test verifies the fix for the duplicate tool response bug
    it.skip('should NOT create synthetic responses even when source is userInput if functionResponse parts exist - ORPHAN HANDLING REMOVED', () => {
      // Setup: Add a model message with a tool call
      const modelMessageId = historyService.addMessage(
        'I will search for files',
        MessageRoleEnum.MODEL,
        {
          originalContent: {
            role: 'model',
            parts: [
              { text: 'I will search for files' },
              {
                functionCall: {
                  id: 'tool123',
                  name: 'search_file_content',
                  args: { pattern: 'tool call.*LLM' },
                },
              },
            ],
          },
        },
      );

      // The model message should have been added and tool call should be tracked
      expect(historyService.getMessages()).toHaveLength(1);
      expect(historyService.hasPendingToolCalls()).toBe(true);

      // This simulates the BUG scenario: tool response with wrong source metadata
      // BUT with our fix, it should NOT create a synthetic response because
      // we now also check for the presence of functionResponse parts
      const toolResponseId = historyService.addMessage(
        '[Tool response]',
        MessageRoleEnum.USER,
        {
          source: 'geminiChat.userInput', // WRONG SOURCE (bug scenario)
          originalContent: {
            role: 'user',
            parts: [
              {
                functionResponse: {
                  id: 'tool123',
                  name: 'search_file_content',
                  response: {
                    output: 'Found 5 matches',
                  },
                },
              },
            ],
          },
        },
      );

      // Check the messages
      const messages = historyService.getMessages();

      // WITH THE FIX: We should have exactly 2 messages (no synthetic response)
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe(modelMessageId);
      expect(messages[1].id).toBe(toolResponseId);

      // There should be NO synthetic response message
      const syntheticMessages = messages.filter(
        (m) => m.metadata?.synthetic === true,
      );
      expect(syntheticMessages).toHaveLength(0);

      // The pending tool calls should have been cleared by the tool response
      expect(historyService.hasPendingToolCalls()).toBe(false);
    });

    it.skip('should create synthetic responses when receiving real user input during pending tool calls - ORPHAN HANDLING REMOVED', () => {
      // Setup: Add a model message with a tool call
      historyService.addMessage(
        'I will search for files',
        MessageRoleEnum.MODEL,
        {
          originalContent: {
            role: 'model',
            parts: [
              { text: 'I will search for files' },
              {
                functionCall: {
                  id: 'tool456',
                  name: 'read_file',
                  args: { path: '/test.ts' },
                },
              },
            ],
          },
        },
      );

      expect(historyService.hasPendingToolCalls()).toBe(true);

      // Now simulate REAL user input (not a tool response)
      // This SHOULD trigger orphan prevention
      historyService.addMessage(
        'Actually, never mind, do something else',
        MessageRoleEnum.USER,
        {
          source: 'geminiChat.userInput', // This is the source for real user input
          originalContent: {
            role: 'user',
            parts: [{ text: 'Actually, never mind, do something else' }],
          },
        },
      );

      // Check that synthetic response was created
      const messages = historyService.getMessages();

      // We should have: model message, synthetic response, user message
      expect(messages.length).toBeGreaterThanOrEqual(3);

      // Find the synthetic response
      const syntheticMessages = messages.filter(
        (m) => m.metadata?.synthetic === true,
      );
      expect(syntheticMessages).toHaveLength(1);
      expect(syntheticMessages[0].metadata?.fixedOrphans).toContain('tool456');

      // Pending tool calls should be cleared
      expect(historyService.hasPendingToolCalls()).toBe(false);
    });
  });
});
