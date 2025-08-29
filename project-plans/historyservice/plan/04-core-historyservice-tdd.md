# Phase 04: Core HistoryService TDD

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P04  
**Title:** Test-Driven Development for Core HistoryService Methods  
**Requirements:** HS-001 to HS-008 (Core History Management)

## Prerequisites

- [ ] Phase 03a completed successfully (Interface verification passed)
- [ ] HistoryService stub exists with all required methods
- [ ] All required markers present in stub methods

## Phase Overview

Create comprehensive tests for core HistoryService functionality using Test-Driven Development. Tests MUST focus on behavior, not implementation, and MUST NOT test for NotYetImplemented exceptions (no reverse testing).

## Implementation Tasks

### Files to Create

1. **Create `/packages/core/src/services/history/__tests__/HistoryService.test.ts`**
   - Core functionality tests for HS-001 through HS-008
   - NO reverse testing (testing for NotYetImplemented)
   - Each test maps to specific requirement

### Files to Modify

None (pure test creation phase)

## Required Test Structure

### Test Organization
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P04
// @requirement ALL-CORE: Tests for HS-001 through HS-008
// @pseudocode Tests validate behavior from history-service.md

describe('HistoryService Core Functionality', () => {
  let historyService: HistoryService;
  
  beforeEach(() => {
    historyService = new HistoryService('test-conversation-id');
  });

  describe('Constructor and Initialization', () => {
    // @requirement HS-001: Single authoritative history array
    it('should initialize with conversation ID', () => {
      // Test REAL behavior - service should be initialized
      expect(historyService).toBeDefined();
      // Test conversation ID is stored (via metadata or other accessor)
    });

    it('should reject empty conversation ID', () => {
      // Test validation behavior  
      expect(() => new HistoryService('')).toThrow('ConversationId cannot be empty');
    });
  });

  describe('Message Addition', () => {
    // @requirement HS-002: Add user messages
    it('should add user message and return message ID', () => {
      const messageId = historyService.addMessage('Hello', MessageRole.USER);
      expect(messageId).toBe(expect.any(String));
      expect(messageId.length).toBeGreaterThan(0);
    });

    // @requirement HS-003: Add model messages  
    it('should add assistant message with metadata', () => {
      const metadata = { timestamp: Date.now() };
      const messageId = historyService.addMessage('Hi there', MessageRole.ASSISTANT, metadata);
      expect(messageId).toBe(expect.any(String));
    });

    it('should validate message content', () => {
      expect(() => historyService.addMessage('', MessageRole.USER))
        .toThrow('Message content cannot be empty');
    });

    it('should validate message role', () => {
      expect(() => historyService.addMessage('test', 'INVALID_ROLE' as any))
        .toThrow('Invalid message role');
    });
  });

  describe('Message Retrieval', () => {
    beforeEach(() => {
      // Setup test messages
      historyService.addMessage('Message 1', MessageRole.USER);
      historyService.addMessage('Response 1', MessageRole.ASSISTANT);
      historyService.addMessage('Message 2', MessageRole.USER);
    });

    // @requirement HS-005: Retrieve complete history
    it('should return all messages when no parameters', () => {
      const messages = historyService.getMessages();
      expect(messages).toHaveLength(3);
    });

    it('should return subset with startIndex', () => {
      const messages = historyService.getMessages(1);
      expect(messages).toHaveLength(2);
    });

    it('should return limited count', () => {
      const messages = historyService.getMessages(0, 2);
      expect(messages).toHaveLength(2);
    });

    it('should validate startIndex parameter', () => {
      expect(() => historyService.getMessages(-1))
        .toThrow('StartIndex must be non-negative');
    });

    // @requirement HS-006: Curated history (filtered)
    it('should return curated history without empty messages', () => {
      const messages = historyService.getCuratedHistory();
      expect(messages.every(m => m.content.length > 0)).toBe(true);
    });
  });

  describe('Last Message Accessors', () => {
    beforeEach(() => {
      historyService.addMessage('User message', MessageRole.USER);
      historyService.addMessage('Assistant response', MessageRole.ASSISTANT);
    });

    // @requirement HS-007: Last message accessors
    it('should return last message', () => {
      const lastMessage = historyService.getLastMessage();
      expect(lastMessage?.content).toBe('Assistant response');
      expect(lastMessage?.role).toBe(MessageRole.ASSISTANT);
    });

    it('should return last user message', () => {
      const lastUserMessage = historyService.getLastUserMessage();
      expect(lastUserMessage?.content).toBe('User message');
      expect(lastUserMessage?.role).toBe(MessageRole.USER);
    });

    it('should return last model message', () => {
      const lastModelMessage = historyService.getLastModelMessage();
      expect(lastModelMessage?.content).toBe('Assistant response');
      expect(lastModelMessage?.role).toBe(MessageRole.ASSISTANT);
    });

    it('should return null when no messages exist', () => {
      const emptyService = new HistoryService('empty');
      expect(emptyService.getLastMessage()).toBeNull();
      expect(emptyService.getLastUserMessage()).toBeNull();
      expect(emptyService.getLastModelMessage()).toBeNull();
    });
  });

  describe('History Operations', () => {
    beforeEach(() => {
      historyService.addMessage('Message 1', MessageRole.USER);
      historyService.addMessage('Message 2', MessageRole.ASSISTANT);
    });

    // @requirement HS-008: Clear history
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
  });
});
```

## Critical TDD Rules

### ❌ FORBIDDEN (No Reverse Testing)
```typescript
// DO NOT write tests like this:
it('should throw NotYetImplemented', () => {
  expect(() => historyService.addMessage('test', MessageRole.USER))
    .toThrow('NotYetImplemented');
});
```

### ✅ REQUIRED (Behavior Testing) 
```typescript
// DO write tests like this:
it('should add message and return valid ID', () => {
  const messageId = historyService.addMessage('test', MessageRole.USER);
  expect(messageId).toBe(expect.any(String));
  expect(messageId.length).toBeGreaterThan(0);
});
```

## Required Test Coverage

Each requirement MUST have tests:
- **HS-001**: Constructor initialization and conversation ID storage
- **HS-002**: User message addition with validation
- **HS-003**: Model message addition with metadata
- **HS-004**: Direct access prevention (internal array not exposed)
- **HS-005**: Complete history retrieval with parameters
- **HS-006**: Curated history filtering
- **HS-007**: Last message accessors (all three variants)
- **HS-008**: History clearing with count return

## Verification Commands

```bash
# Check test file exists
ls -la /packages/core/src/services/history/__tests__/HistoryService.test.ts

# Verify test structure
grep -n "describe.*HistoryService Core Functionality" /packages/core/src/services/history/__tests__/HistoryService.test.ts
grep -n "@requirement HS-" /packages/core/src/services/history/__tests__/HistoryService.test.ts

# Count requirement coverage (should be 8+)
grep -c "@requirement HS-" /packages/core/src/services/history/__tests__/HistoryService.test.ts

# Verify no reverse testing
! grep -n "NotYetImplemented" /packages/core/src/services/history/__tests__/HistoryService.test.ts
echo "Exit code should be 1 (no reverse testing found): $?"

# Run tests to verify they FAIL (expected at this stage)
npm test -- --testPathPattern="HistoryService.test.ts"
```

## Success Criteria

- [ ] Test file created with comprehensive test structure
- [ ] All requirements HS-001 through HS-008 have test coverage
- [ ] NO tests for NotYetImplemented (reverse testing forbidden)
- [ ] Tests focus on BEHAVIOR, not implementation details
- [ ] Each test clearly maps to a specific requirement via @requirement marker
- [ ] Tests FAIL when run (expected since implementation is stub)
- [ ] Tests are properly organized in describe blocks
- [ ] All test methods have meaningful assertions

## Failure Recovery

If verification fails:
1. **Missing tests**: Add tests for uncovered requirements HS-001 through HS-008
2. **Reverse testing found**: Remove any tests expecting NotYetImplemented
3. **Poor test structure**: Reorganize tests with proper describe blocks
4. **Missing requirement mapping**: Add @requirement markers to each test
5. **Tests passing**: Verify stub implementation isn't accidentally complete

## Next Phase

Phase 04a: Core TDD Verification - Validate test quality and coverage before implementation