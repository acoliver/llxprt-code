# Phase 09: State Machine Stub

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P09  
**Title:** Create HistoryService State Machine Stub Implementation  
**Requirements:** HS-015 to HS-017 (State Management)

## Prerequisites

- [ ] Phase 08a verification passed (History Access implementation complete)
- [ ] Core HistoryService functionality tested and working
- [ ] Message management fully operational

## Phase Overview

Create stub methods for state management within the existing HistoryService class. This phase adds state tracking capabilities by implementing stub methods that can either throw NotYetImplemented exceptions or return default values, preparing for full state machine implementation in later phases.

## Implementation Tasks

### Files to Modify

1. **Update existing HistoryService.ts**
   - Add HistoryState enum definition
   - Add state management properties
   - Add stub methods for state operations
   - Integrate state validation into existing methods

## Required Code Markers

All code additions must include appropriate markers:
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P09
// @requirement HS-015: State management initialization
```

## State Structure

### HistoryState Enum
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P09  
// @requirement HS-015: Conversation state tracking
export enum HistoryState {
  IDLE = 'IDLE',
  MODEL_RESPONDING = 'MODEL_RESPONDING',
  TOOLS_PENDING = 'TOOLS_PENDING',
  TOOLS_EXECUTING = 'TOOLS_EXECUTING'
}
```

### State Management Properties
Add to HistoryService class:
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P09
// @requirement HS-015: State tracking properties
private currentState: HistoryState;
private stateHistory: Array<{
  fromState: HistoryState;
  toState: HistoryState;
  timestamp: number;
  context?: string;
}>;
// @requirement HS-045: Concurrent operations safety
private operationQueue: Array<{
  operation: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed';
}>;
private isProcessingOperation: boolean;
```

### Stub Methods

#### getCurrentState Method
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P09
// @requirement HS-015: Get current conversation state
getCurrentState(): HistoryState {
  // STUB: Return current state or throw NotYetImplemented
  return this.currentState;
  // Alternative: throw new Error('NotYetImplemented: getCurrentState');
}
```

#### validateTransition Method
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P09
// @requirement HS-016: Validate state transitions
validateTransition(newState: HistoryState): boolean {
  // STUB: Return true (permissive) or throw NotYetImplemented
  return true;
  // Alternative: throw new Error('NotYetImplemented: validateTransition');
}
```

#### transitionTo Method
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P09
// @requirement HS-017: Execute state transitions
// @requirement HS-045: Handle concurrent operations safely
async transitionTo(newState: HistoryState, context?: string): Promise<void> {
  // STUB: Queue operation for concurrency safety
  const operationId = `transition-${Date.now()}`;
  this.operationQueue.push({
    operation: operationId,
    timestamp: Date.now(),
    status: 'pending'
  });
  
  // Wait if another operation is processing
  while (this.isProcessingOperation) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  this.isProcessingOperation = true;
  
  try {
    const transition = {
      fromState: this.currentState,
      toState: newState,
      timestamp: Date.now(),
      context
    };
    
    this.currentState = newState;
    this.stateHistory.push(transition);
    
    // Mark operation as completed
    const op = this.operationQueue.find(o => o.operation === operationId);
    if (op) op.status = 'completed';
  } finally {
    this.isProcessingOperation = false;
  }
  
  // Alternative: throw new Error('NotYetImplemented: transitionTo');
}
```

### Constructor Updates
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P09
// @requirement HS-015: Initialize state management
constructor(conversationId: string) {
  // ... existing constructor logic ...
  
  // ADD: Initialize state management
  this.currentState = HistoryState.IDLE;
  this.stateHistory = [];
  
  // ADD: Initialize concurrency handling
  // @requirement HS-045: Handle concurrent operations safely
  this.operationQueue = [];
  this.isProcessingOperation = false;
  
  // ... rest of existing constructor ...
}
```

### Integration with Existing Methods

Add state validation calls to existing methods:

#### addMessage Method Integration
```typescript
addMessage(content: string, role: MessageRole, metadata?: MessageMetadata): string {
  try {
    // ADD: State validation before processing
    if (!this.validateTransition(HistoryState.MODEL_RESPONDING)) {
      throw new Error(`Invalid state transition from ${this.currentState}`);
    }
    
    // ... existing addMessage logic unchanged ...
    
    return messageId;
  } catch (error) {
    // ... existing error handling ...
    throw error;
  }
}
```

#### clearHistory Method Integration
```typescript
clearHistory(): number {
  try {
    // ADD: State validation
    if (!this.validateTransition(HistoryState.IDLE)) {
      throw new Error(`Cannot clear history from state ${this.currentState}`);
    }
    
    // ... existing clearHistory logic ...
    
    // ADD: Reset state after clearing
    this.transitionTo(HistoryState.IDLE, 'clearHistory');
    
    return clearedCount;
  } catch (error) {
    // ... existing error handling ...
    throw error;
  }
}
```

## Implementation Options

### Option A: Permissive Stubs
- Methods return default values (true, current state, etc.)
- Allow all operations to proceed
- Minimal disruption to existing functionality

### Option B: NotYetImplemented Stubs  
- Methods throw NotYetImplemented exceptions
- Force explicit implementation in next phases
- Stricter development approach

**Recommendation:** Use Option A (permissive stubs) to maintain existing functionality while adding state tracking infrastructure.

## Success Criteria

- [ ] HistoryState enum defined with required states (IDLE, MODEL_RESPONDING, TOOLS_PENDING, TOOLS_EXECUTING)
- [ ] State management properties added to HistoryService class
- [ ] getCurrentState(), validateTransition(), and transitionTo() methods implemented as stubs
- [ ] State management initialized in constructor
- [ ] Basic state validation integrated into existing methods
- [ ] Methods either provide basic functionality OR throw NotYetImplemented consistently
- [ ] TypeScript compilation passes without errors
- [ ] Existing HistoryService functionality unchanged and working
- [ ] All code includes appropriate @plan and @requirement markers

## Verification Commands

```bash
# Check HistoryState enum definition
grep -n "enum HistoryState" /packages/core/src/services/history/HistoryService.ts

# Verify state management methods
grep -n "getCurrentState\|validateTransition\|transitionTo" /packages/core/src/services/history/HistoryService.ts

# Check state properties initialization
grep -n "currentState.*=" /packages/core/src/services/history/HistoryService.ts

# Verify state validation integration
grep -n "validateTransition" /packages/core/src/services/history/HistoryService.ts

# Ensure compilation passes
npx tsc --noEmit /packages/core/src/services/history/HistoryService.ts

# Check for required code markers
grep -n "@plan PLAN-20250128-HISTORYSERVICE.P09" /packages/core/src/services/history/HistoryService.ts
grep -n "@requirement HS-01[567]" /packages/core/src/services/history/HistoryService.ts
```

## Notes

- **NO ServiceV2**: Update existing HistoryService.ts file only
- **NO separate StateManager**: Implement state management directly in HistoryService
- **Maintain compatibility**: All existing methods must continue working
- **Prepare for TDD**: Stub methods should be easily testable in next phase
- **State names**: Use exact names specified (IDLE, MODEL_RESPONDING, TOOLS_PENDING, TOOLS_EXECUTING)

## Next Phase

Phase 09a: State Machine Stub Verification - Validate state management integration and stub functionality before proceeding to TDD phase.