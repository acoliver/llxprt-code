# Phase 11: State Machine Implementation

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P11  
**Title:** State Machine Implementation for HistoryService  
**Prerequisites:** Phase 10a verification passed

## Purpose

Implement the state machine functionality in the existing HistoryService to make all Phase 10 TDD tests pass. This phase implements the core state tracking and transition logic based on the pseudocode from `analysis/pseudocode/state-machine.md` (lines 10-233).

**Requirements Coverage:**
- **@requirement HS-015**: Track current conversation state (READY, PROCESSING, TOOLS_PENDING, TOOLS_EXECUTING, ERROR)  
- **@requirement HS-016**: Prevent invalid operations based on current state
- **@requirement HS-017**: Transition states automatically based on operations performed

## Implementation Tasks

### Task 1: Update HistoryService State Management Core

**File:** `packages/core/src/services/HistoryService.ts` (or appropriate location)

#### State Tracking Implementation

Replace existing stub methods with full implementation based on pseudocode lines 17-30:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-015: State management initialization
// @pseudocode lines 17-30: Constructor implementation
constructor(conversationId: string) {
  // ... existing constructor logic ...
  
  // Initialize state management
  this.currentState = HistoryState.READY;
  this.stateHistory = [];
  this.allowedTransitions = new Map([
    [HistoryState.READY, [HistoryState.PROCESSING, HistoryState.TOOLS_PENDING, HistoryState.ERROR]],
    [HistoryState.PROCESSING, [HistoryState.READY, HistoryState.TOOLS_PENDING, HistoryState.ERROR]],
    [HistoryState.TOOLS_PENDING, [HistoryState.TOOLS_EXECUTING, HistoryState.READY, HistoryState.ERROR]],
    [HistoryState.TOOLS_EXECUTING, [HistoryState.TOOLS_COMPLETED, HistoryState.ERROR]],
    [HistoryState.TOOLS_COMPLETED, [HistoryState.READY, HistoryState.TOOLS_PENDING, HistoryState.ERROR]],
    [HistoryState.ERROR, [HistoryState.READY]]
  ]);
  this.eventEmitter = new EventEmitter(); // Assuming EventEmitter is available
  this.recordInitialStateTransition();
  
  // ... rest of existing constructor ...
}

private recordInitialStateTransition(): void {
  // @plan PLAN-20250128-HISTORYSERVICE.P11
  // @requirement HS-015: Initial state transition recording
  // @pseudocode lines 25-26: Record initial state transition
  const initialTransition: StateTransition = {
    fromState: undefined, // No previous state for initialization
    toState: HistoryState.READY,
    timestamp: Date.now(),
    context: { triggeredBy: 'initialization' },
    triggeredBy: 'system'
  };
  this.stateHistory.push(initialTransition);
}
```

#### State Transition Implementation

Replace stub `transitionTo` method with full implementation based on pseudocode lines 32-62:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-016: Handle state transitions
// @requirement HS-045: Handle concurrent operations safely
// @pseudocode lines 32-62: Full transition implementation
async transitionTo(newState: HistoryState, context?: StateContext): Promise<StateTransition> {
  // Queue operation for concurrency safety
  const operationId = `transition-${Date.now()}-${Math.random()}`;
  this.operationQueue.push({
    operation: operationId,
    timestamp: Date.now(),
    status: 'pending'
  });
  
  // Wait for any in-progress operations to complete
  while (this.isProcessingOperation) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  this.isProcessingOperation = true;
  
  // Create backup for rollback
  const backup = this.createStateBackup();
  const previousState = this.currentState;
  
  try {
    // Mark operation as processing
    const op = this.operationQueue.find(o => o.operation === operationId);
    if (op) op.status = 'processing';
    
    // Validate newState is valid enum value
    if (!Object.values(HistoryState).includes(newState)) {
      throw new ValidationError(`Invalid state: ${newState}`);
    }
    
    // Get allowed states for current state
    const allowedStates = this.allowedTransitions.get(this.currentState);
    if (!allowedStates || !allowedStates.includes(newState)) {
      throw new StateTransitionError(`Invalid transition from ${this.currentState} to ${newState}`);
    }
    
    // Create transition record
    const transition: StateTransition = {
      fromState: previousState,
      toState: newState,
      timestamp: Date.now(),
      context: context || null,
      triggeredBy: context?.triggeredBy || 'system'
    };
    
    // Update state and history
    this.stateHistory.push(transition);
    this.currentState = newState;
    
    // Emit state change event
    this.eventEmitter.emit('StateChanged', transition);
    
    // Handle state entry logic
    await this.onStateEnter(newState, previousState, context);
    
    // Mark operation as completed
    if (op) op.status = 'completed';
    
    return transition;
  } catch (error) {
    // Rollback on error using backup
    this.restoreFromBackup(backup);
    this.eventEmitter.emit('StateTransitionError', error);
    
    // Mark operation as failed
    const op = this.operationQueue.find(o => o.operation === operationId);
    if (op) op.status = 'failed';
    
    throw error;
  } finally {
    this.isProcessingOperation = false;
  }
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-044: Maintain history consistency on failure
private createStateBackup(): StateBackup {
  return {
    currentState: this.currentState,
    stateHistory: [...this.stateHistory],
    operationQueue: [...this.operationQueue]
  };
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-044: Maintain history consistency on failure
private restoreFromBackup(backup: StateBackup): void {
  this.currentState = backup.currentState;
  this.stateHistory = backup.stateHistory;
  this.operationQueue = backup.operationQueue;
}
```

#### State Query Methods Implementation

Implement state query methods based on pseudocode lines 64-79:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-016: Get current state
// @pseudocode lines 64-67: Get current state
getCurrentState(): HistoryState {
  return this.currentState;
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-016: Get state transition history
// @pseudocode lines 69-72: Get state history
getStateHistory(): StateTransition[] {
  // Return deep copy to prevent external modification
  return JSON.parse(JSON.stringify(this.stateHistory));
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-016: Check if transition is allowed
// @pseudocode lines 74-79: Check transition validity
canTransitionTo(targetState: HistoryState): boolean {
  // Validate targetState is valid enum value
  if (!Object.values(HistoryState).includes(targetState)) {
    return false;
  }
  
  const allowedStates = this.allowedTransitions.get(this.currentState);
  return allowedStates ? allowedStates.includes(targetState) : false;
}
```

### Task 2: Action Validation Implementation

Implement state-based operation validation based on pseudocode lines 81-121:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Validate state allows specific actions
// @pseudocode lines 81-121: Action validation by state
validateStateTransition(action: ActionType): boolean {
  switch (action) {
    case ActionType.ADD_MESSAGE:
      if (this.currentState === HistoryState.TOOLS_EXECUTING) {
        throw new StateError('Cannot add message during tool execution');
      }
      break;
      
    case ActionType.UPDATE_MESSAGE:
      if (this.currentState === HistoryState.TOOLS_EXECUTING) {
        throw new StateError('Cannot update message during tool execution');
      }
      break;
      
    case ActionType.DELETE_MESSAGE:
      if (this.currentState === HistoryState.TOOLS_EXECUTING) {
        throw new StateError('Cannot delete message during tool execution');
      }
      break;
      
    case ActionType.CLEAR_HISTORY:
      if ([HistoryState.TOOLS_EXECUTING, HistoryState.TOOLS_PENDING].includes(this.currentState)) {
        throw new StateError('Cannot clear history with pending or executing tools');
      }
      break;
      
    case ActionType.ADD_TOOL_CALLS:
      if (this.currentState === HistoryState.TOOLS_EXECUTING) {
        throw new StateError('Cannot add tool calls during execution');
      }
      break;
      
    case ActionType.EXECUTE_TOOLS:
      if (this.currentState !== HistoryState.TOOLS_PENDING) {
        throw new StateError('Cannot execute tools without pending calls');
      }
      break;
      
    case ActionType.ADD_TOOL_RESPONSES:
      if (this.currentState !== HistoryState.TOOLS_EXECUTING) {
        throw new StateError('Cannot add responses without executing tools');
      }
      break;
      
    case ActionType.COMPLETE_TOOLS:
      if (this.currentState !== HistoryState.TOOLS_EXECUTING) {
        throw new StateError('Cannot complete tools without execution');
      }
      break;
      
    default:
      // Action allowed in current state
      return true;
  }
  return true;
}
```

### Task 3: State Entry Logic Implementation

Implement state entry handlers based on pseudocode lines 123-197:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Handle state entry logic
// @pseudocode lines 123-142: State entry handler
private async onStateEnter(newState: HistoryState, previousState: HistoryState, context?: StateContext): Promise<void> {
  switch (newState) {
    case HistoryState.READY:
      if (previousState === HistoryState.ERROR) {
        await this.handleErrorRecovery(context);
      }
      await this.cleanupPendingOperations();
      break;
      
    case HistoryState.PROCESSING:
      await this.initializeProcessing(context);
      break;
      
    case HistoryState.TOOLS_PENDING:
      await this.preparePendingTools(context);
      break;
      
    case HistoryState.TOOLS_EXECUTING:
      await this.initializeToolExecution(context);
      break;
      
    case HistoryState.TOOLS_COMPLETED:
      await this.finalizeToolExecution(context);
      break;
      
    case HistoryState.ERROR:
      await this.handleError(context);
      break;
  }
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Error recovery handling
// @pseudocode lines 144-151: Error recovery implementation
private async handleErrorRecovery(context?: StateContext): Promise<void> {
  geminiChatLogger.info('Recovering from error state');
  if (context?.error) {
    geminiChatLogger.info(`Previous error: ${context.error.message}`);
  }
  this.eventEmitter.emit('ErrorRecoveryStarted');
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Cleanup operations
// @pseudocode lines 153-157: Cleanup implementation  
private async cleanupPendingOperations(): Promise<void> {
  geminiChatLogger.info('Cleaning up pending operations');
  // Additional cleanup logic as needed
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Processing initialization
// @pseudocode lines 159-165: Processing state entry
private async initializeProcessing(context?: StateContext): Promise<void> {
  geminiChatLogger.info('Initializing processing');
  if (context?.operation) {
    geminiChatLogger.info(`Processing operation: ${context.operation}`);
  }
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Tool preparation
// @pseudocode lines 167-173: Tools pending state entry
private async preparePendingTools(context?: StateContext): Promise<void> {
  geminiChatLogger.info('Preparing pending tool calls');
  if (context?.toolCalls) {
    geminiChatLogger.info(`Tool calls count: ${context.toolCalls.length}`);
  }
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Tool execution initialization
// @pseudocode lines 175-179: Tool execution state entry
private async initializeToolExecution(context?: StateContext): Promise<void> {
  geminiChatLogger.info('Initializing tool execution');
  this.eventEmitter.emit('ToolExecutionStarted');
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Tool execution finalization
// @pseudocode lines 181-188: Tool completion state entry
private async finalizeToolExecution(context?: StateContext): Promise<void> {
  geminiChatLogger.info('Finalizing tool execution');
  if (context?.results) {
    geminiChatLogger.info(`Tool execution results: ${context.results.length}`);
  }
  this.eventEmitter.emit('ToolExecutionCompleted');
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Error state handling
// @pseudocode lines 190-197: Error state entry
private async handleError(context?: StateContext): Promise<void> {
  geminiChatLogger.info('Entering error state');
  if (context?.error) {
    geminiChatLogger.info(`Error details: ${context.error.message}`);
    this.eventEmitter.emit('ErrorOccurred', { error: context.error });
  }
}
```

### Task 4: Utility Methods Implementation

Implement utility methods based on pseudocode lines 199-231:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: State reset capability
// @pseudocode lines 199-211: Reset state implementation
resetState(): boolean {
  const previousState = this.currentState;
  this.currentState = HistoryState.READY;
  
  const resetTransition: StateTransition = {
    fromState: previousState,
    toState: HistoryState.READY,
    timestamp: Date.now(),
    context: { triggeredBy: 'reset' },
    triggeredBy: 'reset'
  };
  
  this.stateHistory.push(resetTransition);
  this.eventEmitter.emit('StateReset');
  return true;
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-016: State statistics and monitoring
// @pseudocode lines 213-231: Statistics implementation
getStateStatistics(): StateStatistics {
  const stateCount = new Map<HistoryState, number>();
  const transitionCount = new Map<string, number>();
  
  // Count state occurrences and transitions
  for (const transition of this.stateHistory) {
    // Count destination states
    const currentCount = stateCount.get(transition.toState) || 0;
    stateCount.set(transition.toState, currentCount + 1);
    
    // Count transition patterns
    const transitionKey = `${transition.fromState || 'INIT'}->${transition.toState}`;
    const currentTransitionCount = transitionCount.get(transitionKey) || 0;
    transitionCount.set(transitionKey, currentTransitionCount + 1);
  }
  
  // Calculate current state duration
  const lastTransition = this.stateHistory[this.stateHistory.length - 1];
  const currentStateDuration = lastTransition ? Date.now() - lastTransition.timestamp : 0;
  
  return {
    currentState: this.currentState,
    totalTransitions: this.stateHistory.length,
    stateCount: Object.fromEntries(stateCount),
    transitionCount: Object.fromEntries(transitionCount),
    currentStateDuration,
    stateHistory: this.getStateHistory()
  };
}
```

### Task 5: Integration with Existing Methods

Update existing HistoryService methods to use state validation and automatic transitions:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Automatic state transitions in addMessage
async addMessage(content: string, role: MessageRole, metadata?: MessageMetadata): Promise<string> {
  try {
    // Validate state allows message addition
    this.validateStateTransition(ActionType.ADD_MESSAGE);
    
    // Transition to PROCESSING state
    await this.transitionTo(HistoryState.PROCESSING, {
      operation: 'addMessage',
      triggeredBy: 'user_action'
    });
    
    // ... existing addMessage logic unchanged ...
    
    // Return to READY state after successful completion
    await this.transitionTo(HistoryState.READY, {
      operation: 'addMessage_complete',
      triggeredBy: 'system'
    });
    
    return messageId;
  } catch (error) {
    // Transition to ERROR state on failure
    await this.transitionTo(HistoryState.ERROR, {
      error: error as Error,
      triggeredBy: 'error'
    });
    throw error;
  }
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Automatic state transitions in addPendingToolCalls
async addPendingToolCalls(toolCalls: ToolCall[]): Promise<void> {
  try {
    // Validate state allows adding tool calls
    this.validateStateTransition(ActionType.ADD_TOOL_CALLS);
    
    // Transition to TOOLS_PENDING state
    await this.transitionTo(HistoryState.TOOLS_PENDING, {
      toolCalls,
      operation: 'addPendingToolCalls',
      triggeredBy: 'system'
    });
    
    // ... existing addPendingToolCalls logic unchanged ...
    
  } catch (error) {
    await this.transitionTo(HistoryState.ERROR, {
      error: error as Error,
      triggeredBy: 'error'
    });
    throw error;
  }
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Automatic state transitions in executeTools
async executeTools(): Promise<void> {
  try {
    // Validate state allows tool execution
    this.validateStateTransition(ActionType.EXECUTE_TOOLS);
    
    // Transition to TOOLS_EXECUTING state
    await this.transitionTo(HistoryState.TOOLS_EXECUTING, {
      operation: 'executeTools',
      triggeredBy: 'system'
    });
    
    // ... existing executeTools logic unchanged ...
    
  } catch (error) {
    await this.transitionTo(HistoryState.ERROR, {
      error: error as Error,
      triggeredBy: 'error'
    });
    throw error;
  }
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Automatic state transitions in completeTools
async completeTools(toolResponses: ToolResponse[]): Promise<void> {
  try {
    // Validate state allows tool completion
    this.validateStateTransition(ActionType.COMPLETE_TOOLS);
    
    // ... existing completeTools logic unchanged ...
    
    // Transition to TOOLS_COMPLETED then to READY
    await this.transitionTo(HistoryState.TOOLS_COMPLETED, {
      results: toolResponses,
      operation: 'completeTools',
      triggeredBy: 'system'
    });
    
    await this.transitionTo(HistoryState.READY, {
      operation: 'tools_workflow_complete',
      triggeredBy: 'system'
    });
    
  } catch (error) {
    await this.transitionTo(HistoryState.ERROR, {
      error: error as Error,
      triggeredBy: 'error'
    });
    throw error;
  }
}
```

### Task 6: Type Definitions

Add required type definitions:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-015: State enumeration
export enum HistoryState {
  READY = 'READY',
  PROCESSING = 'PROCESSING', 
  TOOLS_PENDING = 'TOOLS_PENDING',
  TOOLS_EXECUTING = 'TOOLS_EXECUTING',
  TOOLS_COMPLETED = 'TOOLS_COMPLETED',
  ERROR = 'ERROR'
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-016: State transition tracking
export interface StateTransition {
  fromState: HistoryState | undefined;
  toState: HistoryState;
  timestamp: number;
  context?: StateContext | null;
  triggeredBy: string;
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-016: State context information
export interface StateContext {
  operation?: string;
  toolCalls?: ToolCall[];
  results?: ToolResponse[];
  error?: Error;
  triggeredBy?: string;
  [key: string]: any;
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-017: Action type validation
export enum ActionType {
  ADD_MESSAGE = 'ADD_MESSAGE',
  UPDATE_MESSAGE = 'UPDATE_MESSAGE',
  DELETE_MESSAGE = 'DELETE_MESSAGE',
  CLEAR_HISTORY = 'CLEAR_HISTORY',
  ADD_TOOL_CALLS = 'ADD_TOOL_CALLS',
  EXECUTE_TOOLS = 'EXECUTE_TOOLS',
  ADD_TOOL_RESPONSES = 'ADD_TOOL_RESPONSES',
  COMPLETE_TOOLS = 'COMPLETE_TOOLS'
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-016: State statistics interface
export interface StateStatistics {
  currentState: HistoryState;
  totalTransitions: number;
  stateCount: Record<string, number>;
  transitionCount: Record<string, number>;
  currentStateDuration: number;
  stateHistory: StateTransition[];
}

// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-016: Error types
export class StateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

## Required Properties to Add

Add these properties to the HistoryService class:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P11
// @requirement HS-015: State management properties
private currentState: HistoryState;
private stateHistory: StateTransition[];
private allowedTransitions: Map<HistoryState, HistoryState[]>;
private eventEmitter: EventEmitter;
// @requirement HS-045: Concurrent operations safety
private operationQueue: OperationQueueEntry[];
private isProcessingOperation: boolean;

interface OperationQueueEntry {
  operation: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface StateBackup {
  currentState: HistoryState;
  stateHistory: StateTransition[];
  operationQueue: OperationQueueEntry[];
}
```

## Success Criteria

✅ **State Machine Core:**
- [ ] All state management properties properly initialized in constructor
- [ ] `transitionTo()` method implements full validation and error handling from pseudocode lines 32-62
- [ ] `getCurrentState()` and `getStateHistory()` methods work correctly
- [ ] `canTransitionTo()` method validates transitions properly

✅ **Action Validation:**
- [ ] `validateStateTransition()` method implements all action validations from pseudocode lines 81-121
- [ ] State-based operation blocking works correctly
- [ ] Appropriate errors thrown for invalid operations

✅ **State Entry Logic:**
- [ ] `onStateEnter()` method handles all state transitions from pseudocode lines 123-142
- [ ] All helper methods (handleErrorRecovery, cleanupPendingOperations, etc.) implemented
- [ ] Proper logging and event emission in place

✅ **Integration:**
- [ ] Existing HistoryService methods updated with state validation and automatic transitions
- [ ] Tool call workflow properly manages state transitions
- [ ] Message operations respect state constraints
- [ ] Error handling transitions to ERROR state appropriately

✅ **Phase 10 Tests Pass:**
- [ ] All tests from `state-tracking.test.ts` pass
- [ ] All tests from `state-validation.test.ts` pass  
- [ ] All tests from `state-transitions.test.ts` pass
- [ ] All tests from `state-integration.test.ts` pass

## Test Execution Strategy

Run the Phase 10 tests to verify implementation:

```bash
# Kill any existing vitest processes
ps -ef | grep -i vitest
pkill -f vitest

# Run state machine tests specifically
npm test src/core/state/__tests__/ 

# Verify all tests pass
echo "All Phase 10 state machine tests should now pass"

# Kill remaining vitest processes
ps -ef | grep -i vitest
pkill -f vitest
```

## Verification Commands

```bash
# Check state management implementation
grep -n "transitionTo.*HistoryState" packages/core/src/services/HistoryService.ts

# Verify action validation
grep -n "validateStateTransition" packages/core/src/services/HistoryService.ts

# Check state entry logic
grep -n "onStateEnter" packages/core/src/services/HistoryService.ts

# Ensure all required markers present
grep -n "@plan PLAN-20250128-HISTORYSERVICE.P11" packages/core/src/services/HistoryService.ts
grep -n "@pseudocode lines" packages/core/src/services/HistoryService.ts

# Verify TypeScript compilation
npx tsc --noEmit packages/core/src/services/HistoryService.ts
```

## Notes

- **Complete Implementation**: Replace ALL stub methods with full working implementations
- **Pseudocode Reference**: Each major method should reference specific pseudocode line numbers
- **Event Integration**: Ensure proper event emission for state changes and errors
- **direct replacement**: Maintain all existing HistoryService functionality
- **Test-Driven**: Implementation should make all Phase 10 TDD tests pass

## Next Phase

Upon successful implementation and all Phase 10 tests passing, proceed to **Phase 21** (GeminiChat Integration Stub) to begin integrating the completed HistoryService with existing components.

## Failure Recovery

### If tests still fail after implementation:
1. Check that all pseudocode line references are correctly implemented
2. Verify state transition logic matches allowedTransitions map
3. Ensure all ActionType validations are correctly implemented
4. Check that existing method integration doesn't break functionality

### If TypeScript compilation fails:
1. Verify all type definitions are properly exported
2. Check import statements for EventEmitter and other dependencies
3. Ensure StateContext and related interfaces are defined
4. Fix any missing or incorrect type annotations

### If integration with existing methods breaks:
1. Ensure existing method signatures unchanged
2. Check that async/await is properly handled in state transitions
3. Verify error handling doesn't disrupt existing flows
4. Test that direct replacement is maintained