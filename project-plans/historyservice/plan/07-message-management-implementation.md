# Phase 07: Message Management Implementation

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P07  
**Title:** Implement Advanced Message Management Following Pseudocode  
**Requirements:** HS-004, HS-033 to HS-035 (Message Operations & Audit)

## Prerequisites

- [ ] Phase 06a completed successfully (Message Management TDD verification passed)
- [ ] All message management tests failing due to missing implementation
- [ ] Core HistoryService implementation complete and tested

## Phase Overview

Implement advanced message management methods by following numbered pseudocode line-by-line. Each method must reference specific pseudocode lines and make the failing Phase 06 tests pass.

## Implementation Tasks

### Files to Modify

1. **Update `/packages/core/src/services/history/HistoryService.ts`**
   - Add message update/delete methods
   - Add audit and debug features
   - Add undo functionality
   - Follow pseudocode lines 79-377 exactly

## Required Implementation Structure

### updateMessage Implementation
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P07
// @requirement HS-035: Update existing message
// @pseudocode history-service.md:88-119
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
        editHistory: [
          ...(existingMessage.metadata.editHistory || []),
          {
            timestamp: Date.now(),
            previousContent: existingMessage.content,
            editor: 'system'
          }
        ]
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
```

### deleteMessage Implementation
```typescript
// @requirement HS-035: Remove message from history
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
    if (message.metadata.protected) {
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
```

### getMessageById Implementation
```typescript
// @requirement HS-004: Get specific message by ID
// @pseudocode history-service.md:75-90
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
```

### dumpHistory Implementation
```typescript
// @requirement HS-034: Complete history dump for debugging
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
```

### undoLastMessage Implementation  
```typescript
// @requirement HS-035: Undo last message addition
// @pseudocode history-service.md:352-377
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
    if (lastMessage.metadata.protected) {
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
```

### getMessageHistory Implementation
```typescript
// @requirement HS-035: Get edit history of a message
// @pseudocode history-service.md:339-354
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
```

## Additional Required Methods

### Enhanced getMessages (prevent direct access)
```typescript
// @requirement HS-004: Prevent direct external access
// Update existing getMessages to return copies
getMessages(startIndex?: number, count?: number): Message[] {
  // ... existing validation logic ...
  const messages = this.messages.slice(actualStartIndex, actualStartIndex + actualCount);
  // Return deep copies to prevent direct access modification
  return messages.map(message => ({ ...message }));
}
```

## Success Criteria

- [ ] All message management methods implemented following pseudocode
- [ ] Each method references specific pseudocode line numbers
- [ ] All Phase 06 tests now PASS
- [ ] Direct access prevention enforced (methods return copies)
- [ ] Event emission follows pseudocode patterns exactly
- [ ] Error handling and validation implemented per pseudocode
- [ ] Edit history tracking working correctly
- [ ] Audit logging integrated throughout

## Verification Commands

```bash
# Verify all methods implemented
grep -n "updateMessage\|deleteMessage\|getMessageById\|dumpHistory\|undoLastMessage\|getMessageHistory" /packages/core/src/services/history/HistoryService.ts

# Check pseudocode compliance
grep -c "Line [0-9]\+:" /packages/core/src/services/history/HistoryService.ts

# Run message management tests - should PASS
npm test -- --testPathPattern="MessageManagement.test.ts"

# Verify no direct access possible
grep -A 5 "getMessages.*{" /packages/core/src/services/history/HistoryService.ts | grep "map.*=>"
```

## Next Phase

Phase 07a: Message Implementation Verification - Validate implementation quality and test passage