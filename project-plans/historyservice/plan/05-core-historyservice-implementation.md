# Phase 05: Core HistoryService Implementation

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P05  
**Title:** Implement Core HistoryService Methods Following Pseudocode  
**Requirements:** HS-001 to HS-008 (Core History Management)

## Prerequisites

- [ ] Phase 04a completed successfully (TDD verification passed)
- [ ] All tests are failing due to incomplete stub implementation
- [ ] Pseudocode lines 10-378 in history-service.md validated

## Phase Overview

Implement the core HistoryService methods by following the numbered pseudocode line-by-line. Each method implementation MUST reference specific pseudocode line numbers and make the failing tests pass.

## Implementation Tasks

### Files to Modify

1. **Update `/packages/core/src/services/history/HistoryService.ts`**
   - Replace stub methods with real implementations
   - Follow pseudocode line numbers exactly
   - Make all Phase 04 tests pass

### Files to Create

1. **Create `/packages/core/src/services/history/MessageValidator.ts`**
   - Validation logic from validation.md pseudocode
   - Referenced from HistoryService implementation

## Required Implementation Structure

### Constructor Implementation
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P05
// @requirement HS-001: Single authoritative history array
// @pseudocode history-service.md:21-36
constructor(conversationId: string) {
  // Line 23: VALIDATE conversationId is not empty
  if (!conversationId || conversationId.trim().length === 0) {
    // Line 25: THROW ValidationError("ConversationId cannot be empty")
    throw new Error('ConversationId cannot be empty');
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
  this.state = HistoryState.READY;
  // Line 32: INITIALIZE this.eventEmitter
  this.eventEmitter = new EventEmitter();
  // Line 33: INITIALIZE this.validator
  this.validator = new MessageValidator();
  // Line 34: INITIALIZE this.stateManager
  this.stateManager = new StateManager();
  // Line 35: EMIT ConversationStarted event
  this.eventEmitter.emit('ConversationStarted', { conversationId });
}
```

### addMessage Implementation
```typescript
// @requirement HS-002: Add user messages
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
    // Line 46-52: CREATE message object with properties
    const message: Message = {
      id: this.generateUUID(),
      content: content,
      role: role,
      timestamp: Date.now(),
      metadata: metadata || {},
      conversationId: this.conversationId
    };
    // Line 53: ADD message to this.messages array
    this.messages.push(message);
    // Line 54: UPDATE state if needed
    // Line 55: EMIT MessageAdded event with message
    this.eventEmitter.emit('MessageAdded', { message });
    // Line 56: COMMIT TRANSACTION
    // Line 57: RETURN message.id
    return message.id;
  } catch (error) {
    // Line 59: ROLLBACK TRANSACTION
    // Line 60: EMIT MessageAddError event with error
    this.eventEmitter.emit('MessageAddError', { error });
    // Line 61: THROW error
    throw error;
  }
}
```

### getMessages Implementation
```typescript
// @requirement HS-005: Retrieve complete history
// @pseudocode history-service.md:65-77
getMessages(startIndex?: number, count?: number): Message[] {
  // Line 67: VALIDATE startIndex and count if provided
  if (startIndex !== undefined && startIndex < 0) {
    // Line 69: THROW ValidationError("StartIndex must be non-negative")
    throw new Error('StartIndex must be non-negative');
  }
  if (count !== undefined && count <= 0) {
    // Line 72: THROW ValidationError("Count must be positive")
    throw new Error('Count must be positive');
  }
  // Line 74: CALCULATE actualStartIndex = startIndex or 0
  const actualStartIndex = startIndex || 0;
  // Line 75: CALCULATE actualCount = count or (messages.length - actualStartIndex)
  const actualCount = count || (this.messages.length - actualStartIndex);
  // Line 76: RETURN this.messages.slice(actualStartIndex, actualStartIndex + actualCount)
  return this.messages.slice(actualStartIndex, actualStartIndex + actualCount);
}
```

## Critical Implementation Rules

### ✅ REQUIRED
1. **Follow pseudocode line numbers**: Each implementation line must reference pseudocode
2. **Make tests pass**: All Phase 04 tests must pass after implementation
3. **Include error handling**: Implement try/catch blocks as per pseudocode
4. **Emit events**: Follow event emission patterns from pseudocode
5. **Validate inputs**: Use validator for all input validation

### ❌ FORBIDDEN
1. **No shortcuts**: Must follow pseudocode step-by-step
2. **No additional features**: Only implement what's required for HS-001 to HS-008
3. **No performance optimizations**: Keep implementation simple and clear
4. **No direct replacement**: Direct implementation only

## Required Methods to Implement

1. **Constructor** (pseudocode lines 21-36)
2. **addMessage** (pseudocode lines 38-63)
3. **getMessages** (pseudocode lines 65-77)
4. **getCuratedHistory** (filter empty messages from getMessages)
5. **getLastMessage** (return last message or null)
6. **getLastUserMessage** (return last user message or null)
7. **getLastModelMessage** (return last assistant message or null)
8. **clearHistory** (pseudocode lines 142-167)

## Verification Commands

```bash
# Verify implementation follows pseudocode structure
grep -n "Line [0-9]\+:" /packages/core/src/services/history/HistoryService.ts | head -20

# Check all required methods are implemented (not stubs)
grep -A 10 "addMessage.*{" /packages/core/src/services/history/HistoryService.ts
grep -A 10 "getMessages.*{" /packages/core/src/services/history/HistoryService.ts
grep -A 10 "clearHistory.*{" /packages/core/src/services/history/HistoryService.ts

# Verify MessageValidator is created and imported
test -f /packages/core/src/services/history/MessageValidator.ts
grep "MessageValidator" /packages/core/src/services/history/HistoryService.ts

# Run tests - they should now PASS
npm test -- --testPathPattern="HistoryService.test.ts"
echo "Tests should pass, exit code: $?"

# Verify TypeScript compilation
npx tsc --noEmit /packages/core/src/services/history/HistoryService.ts
```

## Success Criteria

- [ ] All stub methods replaced with real implementations
- [ ] Each method references specific pseudocode line numbers
- [ ] MessageValidator created and integrated
- [ ] All Phase 04 tests now PASS
- [ ] TypeScript compilation passes without errors
- [ ] Implementation follows pseudocode structure exactly
- [ ] Error handling and validation implemented as per pseudocode
- [ ] Event emission follows pseudocode patterns

## Failure Recovery

If verification fails:
1. **Tests still failing**: Check implementation matches pseudocode exactly
2. **Compilation errors**: Fix TypeScript syntax and type issues
3. **Missing pseudocode references**: Add line number comments to implementation
4. **Validation errors**: Ensure MessageValidator is properly implemented
5. **Event emission issues**: Check event names match test expectations

## Next Phase

Phase 05a: Core Implementation Verification - Validate implementation quality and test passage