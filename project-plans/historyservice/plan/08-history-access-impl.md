# Phase 08: History Access Implementation

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P08  
**Title:** Implement History Access Methods  
**Prerequisites:** Phase 07 tests exist and fail for history access methods

## Overview

This phase implements the core history access methods in HistoryService to satisfy requirements HS-005 to HS-008. Each method follows the specific pseudocode lines and makes the Phase 07 failing tests pass.

## Requirements Coverage

- **HS-005**: Method to retrieve the complete history
- **HS-006**: Method to retrieve curated history (filtered for invalid/empty content)  
- **HS-007**: Methods to retrieve last message, last user message, and last model message
- **HS-008**: Method to clear all history

## Implementation Tasks

### File to Update

**Target:** `/packages/core/src/services/history/HistoryService.ts`

UPDATE existing HistoryService.ts file with history access method implementations.

### Method Implementations

#### 1. getHistory() Method

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P08
// @requirement HS-005: Method to retrieve the complete history
// @pseudocode history-service.md:65-77
public getHistory(startIndex?: number, count?: number): Message[] {
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

#### 2. getCuratedHistory() Method

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P08
// @requirement HS-006: Method to retrieve curated history (filtered for invalid/empty content)
public getCuratedHistory(startIndex?: number, count?: number): Message[] {
  // Get complete history first
  const allMessages = this.getHistory(startIndex, count);
  
  // Filter out messages with empty or invalid content
  return allMessages.filter(message => {
    // Remove messages with empty content
    if (!message.content || message.content.trim().length === 0) {
      return false;
    }
    
    // Remove messages with invalid structure
    if (!message.id || !message.role || !message.timestamp) {
      return false;
    }
    
    return true;
  });
}
```

#### 3. getLastMessage() Method

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P08
// @requirement HS-007: Methods to retrieve last message, last user message, and last model message
public getLastMessage(): Message | null {
  if (this.messages.length === 0) {
    return null;
  }
  return this.messages[this.messages.length - 1];
}
```

#### 4. getLastUserMessage() Method

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P08
// @requirement HS-007: Methods to retrieve last message, last user message, and last model message
public getLastUserMessage(): Message | null {
  // Search from end to beginning for efficiency
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (message.role === MessageRole.USER) {
      return message;
    }
  }
  return null;
}
```

#### 5. getLastModelMessage() Method

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P08
// @requirement HS-007: Methods to retrieve last message, last user message, and last model message
public getLastModelMessage(): Message | null {
  // Search from end to beginning for efficiency
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (message.role === MessageRole.ASSISTANT) {
      return message;
    }
  }
  return null;
}
```

#### 6. clear() Method

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P08
// @requirement HS-008: Method to clear all history
// @pseudocode history-service.md:142-167
public clear(): number {
  // Line 144: BEGIN TRANSACTION
  try {
    // Line 146: VALIDATE state allows clearing
    // Line 147: IF state is TOOLS_EXECUTING
    if (this.state === HistoryState.TOOLS_EXECUTING) {
      // Line 148: THROW StateError("Cannot clear history during tool execution")
      throw new Error('Cannot clear history during tool execution');
    }
    // Line 150: STORE messageCount = this.messages.length
    const messageCount = this.messages.length;
    // Line 151: SET this.messages = empty array
    this.messages = [];
    // Line 152: SET this.pendingToolCalls = empty map
    this.pendingToolCalls = new Map();
    // Line 153: SET this.toolResponses = empty map
    this.toolResponses = new Map();
    // Line 154: SET this.state = READY
    this.state = HistoryState.READY;
    // Line 155: EMIT HistoryCleared event with messageCount
    this.eventEmitter.emit('HistoryCleared', { messageCount });
    // Line 156: COMMIT TRANSACTION
    // Line 157: RETURN messageCount
    return messageCount;
  } catch (error) {
    // Line 159: ROLLBACK TRANSACTION
    // Line 160: EMIT HistoryClearError event with error
    this.eventEmitter.emit('HistoryClearError', { error });
    // Line 161: THROW error
    throw error;
  }
}
```

## Implementation Rules

### ✅ REQUIRED
1. **Update existing file**: Modify `/packages/core/src/services/history/HistoryService.ts`
2. **Reference pseudocode lines**: Each method must include pseudocode line references
3. **Include code markers**: All methods must have @plan, @requirement, @pseudocode markers
4. **Make tests pass**: All Phase 07 tests must pass after implementation
5. **Follow error handling**: Implement proper error handling as per pseudocode
6. **Emit events**: Follow event emission patterns from pseudocode

### ❌ FORBIDDEN
1. **No new files**: Only update existing HistoryService.ts
2. **No additional methods**: Only implement the 6 required methods
3. **No performance optimizations**: Keep implementation simple and clear
4. **No breaking changes**: Maintain existing method signatures

## Verification Commands

```bash
# Verify HistoryService.ts file exists and is updated
test -f /packages/core/src/services/history/HistoryService.ts
echo "HistoryService.ts exists: $?"

# Verify all required methods are implemented (not stubs)
echo "Checking getHistory implementation:"
grep -A 15 "getHistory.*{" /packages/core/src/services/history/HistoryService.ts

echo "Checking getCuratedHistory implementation:"
grep -A 20 "getCuratedHistory.*{" /packages/core/src/services/history/HistoryService.ts

echo "Checking getLastMessage implementation:"
grep -A 10 "getLastMessage.*{" /packages/core/src/services/history/HistoryService.ts

echo "Checking getLastUserMessage implementation:"
grep -A 15 "getLastUserMessage.*{" /packages/core/src/services/history/HistoryService.ts

echo "Checking getLastModelMessage implementation:"
grep -A 15 "getLastModelMessage.*{" /packages/core/src/services/history/HistoryService.ts

echo "Checking clear implementation:"
grep -A 25 "clear.*{" /packages/core/src/services/history/HistoryService.ts

# Verify code markers are present
echo "Checking for @plan markers:"
grep -c "@plan PLAN-20250128-HISTORYSERVICE.P08" /packages/core/src/services/history/HistoryService.ts

echo "Checking for @requirement markers:"
grep -c "@requirement HS-00[5-8]" /packages/core/src/services/history/HistoryService.ts

echo "Checking for @pseudocode markers:"
grep -c "@pseudocode history-service.md" /packages/core/src/services/history/HistoryService.ts

# Run tests - they should now PASS
echo "Running Phase 07 tests:"
npm test -- --testPathPattern="HistoryService.test.ts" --testNamePattern="History Access|History Retrieval|getMessages|getCuratedHistory|getLastMessage|getLastUserMessage|getLastModelMessage|clear"
echo "Phase 07 tests exit code: $?"

# Verify TypeScript compilation
echo "Verifying TypeScript compilation:"
npx tsc --noEmit /packages/core/src/services/history/HistoryService.ts
echo "TypeScript compilation exit code: $?"
```

## Success Criteria

The implementation is successful when:

- [ ] HistoryService.ts file exists and contains all 6 method implementations
- [ ] Each method includes proper @plan, @requirement, @pseudocode markers  
- [ ] All methods reference specific pseudocode line numbers in comments
- [ ] getHistory() method validates parameters and returns message slice
- [ ] getCuratedHistory() method filters out invalid/empty content
- [ ] getLastMessage() returns last message or null
- [ ] getLastUserMessage() returns last user message or null  
- [ ] getLastModelMessage() returns last assistant message or null
- [ ] clear() method clears history and returns message count
- [ ] All Phase 07 tests pass (exit code 0)
- [ ] TypeScript compilation passes without errors
- [ ] Error handling implemented as per pseudocode
- [ ] Event emissions follow pseudocode patterns

## Failure Recovery

If verification fails:

### Tests Still Failing
1. **Issue**: Phase 07 tests not passing
2. **Action**: Check method signatures match test expectations
3. **Commands**: 
   ```bash
   # Check test expectations vs implementation
   grep -A 5 -B 5 "getHistory\|getCuratedHistory\|getLastMessage\|clear" /packages/core/src/services/history/__tests__/HistoryService.test.ts
   ```

### TypeScript Compilation Errors
1. **Issue**: Type errors in implementation
2. **Action**: Fix type annotations and imports
3. **Commands**:
   ```bash
   # Check imports and type declarations
   grep -n "import\|interface\|type\|enum" /packages/core/src/services/history/HistoryService.ts
   ```

### Missing Code Markers
1. **Issue**: Missing @plan, @requirement, or @pseudocode markers
2. **Action**: Add missing markers to all methods
3. **Commands**:
   ```bash
   # Find methods without markers
   grep -B 5 -A 1 "public.*{" /packages/core/src/services/history/HistoryService.ts | grep -v "@"
   ```

### Event Emission Issues
1. **Issue**: Event names don't match test expectations
2. **Action**: Check test files for expected event names
3. **Commands**:
   ```bash
   # Find expected event names in tests
   grep -n "emit\|on\|once" /packages/core/src/services/history/__tests__/HistoryService.test.ts
   ```

## Next Phase

Upon successful completion: **Phase 08a** - History Access Implementation Verification

This phase validates that all history access methods work correctly and all Phase 07 tests pass consistently.