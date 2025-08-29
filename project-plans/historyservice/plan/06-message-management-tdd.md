# Phase 06: Message Management TDD

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P06  
**Title:** Test-Driven Development for Advanced Message Management  
**Requirements:** HS-004, HS-033 to HS-035 (Message Operations & Audit)

## Prerequisites

- [ ] Phase 05a completed successfully (Core implementation verified)
- [ ] All core tests passing
- [ ] MessageValidator integrated and working

## Phase Overview

Create comprehensive tests for advanced message management features including message updates, deletion, audit trails, and undo functionality. Tests focus on behavior and requirement compliance.

## Implementation Tasks

### Files to Create

1. **Create `/packages/core/src/services/history/__tests__/MessageManagement.test.ts`**
   - Advanced message operations tests
   - Audit and metadata tracking tests
   - Undo and history manipulation tests

### Files to Modify

None (pure test creation phase)

## Required Test Structure

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P06
// @requirement MESSAGE-MGMT: Tests for HS-004, HS-033 to HS-035
// @pseudocode Tests validate behavior from history-service.md:79-377

describe('HistoryService Message Management', () => {
  let historyService: HistoryService;
  
  beforeEach(() => {
    historyService = new HistoryService('test-conversation-mgmt');
  });

  describe('Direct Access Prevention', () => {
    // @requirement HS-004: Prevent direct external access to internal history array
    it('should not expose internal messages array directly', () => {
      // Test that internal array is not accessible
      expect(historyService.messages).toBeUndefined();
      expect(historyService['messages']).toBeDefined(); // Private property exists
    });

    it('should provide controlled access only through methods', () => {
      historyService.addMessage('Test', MessageRole.USER);
      const messages = historyService.getMessages();
      
      // Modifying returned array should not affect internal state
      messages.push({ id: 'fake', content: 'fake', role: MessageRole.USER } as any);
      expect(historyService.getMessages()).toHaveLength(1);
    });

    it('should return copies not references', () => {
      historyService.addMessage('Original', MessageRole.USER);
      const messages1 = historyService.getMessages();
      const messages2 = historyService.getMessages();
      
      expect(messages1).not.toBe(messages2); // Different references
      expect(messages1).toEqual(messages2);   // Same content
    });
  });

  describe('Message Updates', () => {
    // @requirement HS-035: Message modification with audit trail
    it('should update message content and track changes', () => {
      const messageId = historyService.addMessage('Original content', MessageRole.USER);
      
      const updatedMessage = historyService.updateMessage(messageId, {
        content: 'Updated content'
      });
      
      expect(updatedMessage.content).toBe('Updated content');
      expect(updatedMessage.metadata.lastModified).toBeDefined();
      expect(updatedMessage.metadata.editHistory).toHaveLength(1);
    });

    it('should preserve original content in edit history', () => {
      const messageId = historyService.addMessage('Original', MessageRole.USER);
      
      historyService.updateMessage(messageId, { content: 'Updated' });
      
      const message = historyService.getMessageById(messageId);
      expect(message.metadata.editHistory[0].previousContent).toBe('Original');
    });

    it('should reject updates to non-existent messages', () => {
      expect(() => historyService.updateMessage('fake-id', { content: 'test' }))
        .toThrow('Message not found with id: fake-id');
    });

    it('should prevent updating locked messages', () => {
      const messageId = historyService.addMessage('Locked', MessageRole.SYSTEM, {
        locked: true
      });
      
      expect(() => historyService.updateMessage(messageId, { content: 'Updated' }))
        .toThrow('Cannot update locked message');
    });

    it('should validate update data', () => {
      const messageId = historyService.addMessage('Test', MessageRole.USER);
      
      expect(() => historyService.updateMessage(messageId, { content: '' }))
        .toThrow('Message content cannot be empty');
      
      expect(() => historyService.updateMessage(messageId, { role: MessageRole.ASSISTANT } as any))
        .toThrow('Cannot update message role');
    });
  });

  describe('Message Deletion', () => {
    // @requirement HS-035: Message deletion with protection
    it('should delete message and return true', () => {
      const messageId = historyService.addMessage('To delete', MessageRole.USER);
      
      const deleted = historyService.deleteMessage(messageId);
      
      expect(deleted).toBe(true);
      expect(() => historyService.getMessageById(messageId))
        .toThrow('Message not found');
    });

    it('should prevent deleting protected messages', () => {
      const messageId = historyService.addMessage('Protected', MessageRole.SYSTEM, {
        protected: true
      });
      
      expect(() => historyService.deleteMessage(messageId))
        .toThrow('Cannot delete protected message');
    });

    it('should handle deletion of non-existent messages', () => {
      expect(() => historyService.deleteMessage('fake-id'))
        .toThrow('Message not found with id: fake-id');
    });

    it('should maintain conversation order after deletion', () => {
      const id1 = historyService.addMessage('Message 1', MessageRole.USER);
      const id2 = historyService.addMessage('Message 2', MessageRole.ASSISTANT);
      const id3 = historyService.addMessage('Message 3', MessageRole.USER);
      
      historyService.deleteMessage(id2);
      
      const messages = historyService.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 3');
    });
  });

  describe('Message Retrieval by ID', () => {
    // @requirement HS-004: Controlled message access
    it('should retrieve specific message by ID', () => {
      const messageId = historyService.addMessage('Specific message', MessageRole.USER);
      
      const message = historyService.getMessageById(messageId);
      
      expect(message.id).toBe(messageId);
      expect(message.content).toBe('Specific message');
    });

    it('should handle invalid message IDs', () => {
      expect(() => historyService.getMessageById(''))
        .toThrow('MessageId cannot be empty');
      
      expect(() => historyService.getMessageById('non-existent'))
        .toThrow('Message not found with id: non-existent');
    });
  });

  describe('Debug and Audit Features', () => {
    // @requirement HS-033: Debug logging with context
    it('should log all message operations', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const messageId = historyService.addMessage('Test message', MessageRole.USER);
      historyService.updateMessage(messageId, { content: 'Updated' });
      historyService.deleteMessage(messageId);
      
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Message added'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Message updated'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Message deleted'));
      
      logSpy.mockRestore();
    });

    // @requirement HS-034: Complete history dump for debugging  
    it('should provide debug dump of complete history', () => {
      historyService.addMessage('Message 1', MessageRole.USER);
      historyService.addMessage('Message 2', MessageRole.ASSISTANT);
      
      const dump = historyService.dumpHistory();
      
      expect(dump.messages).toHaveLength(2);
      expect(dump.conversationId).toBe('test-conversation-mgmt');
      expect(dump.timestamp).toBeDefined();
      expect(dump.metadata).toBeDefined();
    });

    // @requirement HS-035: Metadata tracking for audit
    it('should include creation and modification metadata', () => {
      const messageId = historyService.addMessage('Test', MessageRole.USER, {
        source: 'test-suite'
      });
      
      const message = historyService.getMessageById(messageId);
      
      expect(message.metadata.timestamp).toBeDefined();
      expect(message.metadata.source).toBe('test-suite');
      expect(message.conversationId).toBe('test-conversation-mgmt');
    });
  });

  describe('Undo Functionality', () => {
    // @requirement HS-035: Undo last message addition
    it('should undo last message and return it', () => {
      historyService.addMessage('Message 1', MessageRole.USER);
      const lastMessageId = historyService.addMessage('Message 2', MessageRole.ASSISTANT);
      
      const undoneMessage = historyService.undoLastMessage();
      
      expect(undoneMessage.id).toBe(lastMessageId);
      expect(undoneMessage.content).toBe('Message 2');
      expect(historyService.getMessages()).toHaveLength(1);
    });

    it('should handle undo on empty history', () => {
      expect(() => historyService.undoLastMessage())
        .toThrow('No messages to undo');
    });

    it('should prevent undoing protected messages', () => {
      historyService.addMessage('Protected', MessageRole.SYSTEM, { protected: true });
      
      expect(() => historyService.undoLastMessage())
        .toThrow('Cannot undo protected message');
    });
  });

  describe('Message History Tracking', () => {
    // @requirement HS-035: Message edit history
    it('should track edit history for messages', () => {
      const messageId = historyService.addMessage('Original', MessageRole.USER);
      
      historyService.updateMessage(messageId, { content: 'Edit 1' });
      historyService.updateMessage(messageId, { content: 'Edit 2' });
      
      const history = historyService.getMessageHistory(messageId);
      
      expect(history).toHaveLength(2);
      expect(history[0].previousContent).toBe('Original');
      expect(history[1].previousContent).toBe('Edit 1');
    });

    it('should return empty array for messages without edits', () => {
      const messageId = historyService.addMessage('Unchanged', MessageRole.USER);
      
      const history = historyService.getMessageHistory(messageId);
      
      expect(history).toEqual([]);
    });
  });
});
```

## Success Criteria

- [ ] All message management operations have comprehensive test coverage
- [ ] Tests validate direct access prevention (HS-004)
- [ ] Update/delete operations tested with edge cases and validation
- [ ] Audit and debug features tested (HS-033, HS-034)
- [ ] Undo functionality tested (HS-035)
- [ ] Edit history tracking validated
- [ ] All tests focus on behavior, not implementation
- [ ] Error conditions and edge cases covered
- [ ] Tests FAIL when run (implementation not yet complete)

## Verification Commands

```bash
# Verify test file structure
grep -n "describe.*Message Management" /packages/core/src/services/history/__tests__/MessageManagement.test.ts

# Count requirement coverage
grep -c "@requirement HS-" /packages/core/src/services/history/__tests__/MessageManagement.test.ts

# Verify comprehensive test scenarios
grep -c "it('should" /packages/core/src/services/history/__tests__/MessageManagement.test.ts

# Run tests to verify they fail (expected)
npm test -- --testPathPattern="MessageManagement.test.ts"
```

## Next Phase

Phase 06a: Message Management TDD Verification - Validate test quality before implementation