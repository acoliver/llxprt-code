# Phase 17: Tool Management Implementation

**Phase ID**: PLAN-20250128-HISTORYSERVICE.P17  
**Prerequisites**: Phase 16a (tool management TDD verification) passed  
**Requirements**: HS-009 to HS-014  

## Overview

This phase implements tool management methods directly within the HistoryService class to make Phase 16 TDD tests pass. Tool management is NOT a separate class - it's an integral part of HistoryService because tool calls ARE history events. The implementation will adapt the pseudocode from `analysis/pseudocode/tool-management.md` (which originally described ToolManager) to be HistoryService methods.

## Requirements Coverage

- **HS-009**: `addPendingToolCalls()` - Add tool calls to pending state with validation
- **HS-010**: `commitToolResponses()` - Atomically commit tool responses and pair with calls  
- **HS-011**: Atomic operations - Ensure all tool operations maintain data consistency
- **HS-012**: `abortPendingToolCalls()` - Clean up and abort failed tool operations
- **HS-013**: Tool call/response ID pairing validation and matching
- **HS-014**: Multiple parallel tool calls with proper state management

## Implementation Tasks

### Task 1: Core Tool Management Properties (Integrated into HistoryService)

Add tool tracking properties directly to the HistoryService class:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P17
// @requirement HS-009 to HS-014
// @phase tool-management-impl
export class HistoryService {
  private history: HistoryEntry[] = [];
  private conversationId: string;
  
  // Tool management properties (integrated into HistoryService)
  // Tools ARE history - not a separate concern
  private pendingToolCalls: Map<string, ToolCall> = new Map();
  private toolResponses: Map<string, ToolResponse> = new Map();
  private executionOrder: string[] = [];
  private readonly maxPendingCalls: number = 50;
  private readonly executionTimeout: number = 300000; // 5 minutes
  
  // State management (stubbed for now, will be implemented in state phase)
  private currentState: ConversationState = ConversationState.IDLE;
  private stateTransitions: Map<string, ConversationState[]> = new Map();
  
  // Event emission (stubbed for now, will be implemented in event phase)
  private eventEmitter: EventEmitter | null = null;
```

### Task 2: Implement addPendingToolCalls() Method

**Reference**: Lines 25-61 from `tool-management.md` pseudocode

```typescript
/**
 * Adds tool calls to pending state for later response pairing
 * This is a HistoryService method, NOT a separate ToolManager method
 * @requirement HS-009: Add pending tool calls with validation
 * @plan PLAN-20250128-HISTORYSERVICE.P17
 * @phase tool-management-impl
 * @pseudocode tool-management.md:25-61 (adapted from ToolManager to HistoryService)
 */
public addPendingToolCalls(toolCalls: ToolCall[]): number {
  // Begin transaction (pseudocode line 27)
  const previousState = this.copyCurrentState();
  
  try {
    // Validate state transition (pseudocode line 29)
    this.validateStateTransition('ADD_TOOL_CALLS');
    
    // Validate input array (pseudocode lines 30-37)
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      throw new ValidationError("Tool calls must be a non-empty array");
    }
    
    // Check pending calls limit (pseudocode lines 34-36)
    if (this.pendingToolCalls.size + toolCalls.length > this.maxPendingCalls) {
      throw new ValidationError(`Too many pending tool calls (max: ${this.maxPendingCalls})`);
    }
    
    // Validate each tool call and check for duplicates (pseudocode lines 37-48)
    for (const call of toolCalls) {
      this.validateToolCall(call);
      if (this.pendingToolCalls.has(call.id)) {
        throw new ValidationError(`Tool call ID already exists: ${call.id}`);
      }
      this.pendingToolCalls.set(call.id, call);
      this.executionOrder.push(call.id);
    }
    
    // Transition state (pseudocode lines 45-52)
    this.transitionTo(ConversationState.TOOLS_PENDING, {
      toolCalls: toolCalls,
      triggeredBy: "addPendingToolCalls"
    });
    
    // Emit event (pseudocode line 49)
    this.emitEvent('ToolCallsAdded', { calls: toolCalls });
    
    // Commit transaction (pseudocode line 50)
    return toolCalls.length;
    
  } catch (error) {
    // Rollback transaction (pseudocode lines 52-56)
    this.restoreState(previousState);
    this.emitEvent('ToolCallsAddError', { error });
    throw error;
  }
}
```

### Task 3: Implement commitToolResponses() Method  

**Reference**: Lines 103-134 from `tool-management.md` pseudocode

```typescript
/**
 * Commits tool responses, pairs with pending calls, adds to history
 * This is a HistoryService method, NOT a separate ToolManager method
 * Implements atomic operation for tool call/response consistency
 * @requirement HS-010, HS-011: Atomic commitment with pairing
 * @plan PLAN-20250128-HISTORYSERVICE.P17  
 * @phase tool-management-impl
 * @pseudocode tool-management.md:103-134 (adapted from ToolManager to HistoryService)
 */
public commitToolResponses(toolResponses: ToolResponse[]): number {
  // Begin transaction (pseudocode line 105)
  const previousState = this.copyCurrentState();
  
  try {
    // Validate state transition (pseudocode line 107)
    this.validateStateTransition('ADD_TOOL_RESPONSES');
    
    // Validate responses array (pseudocode lines 108-115)
    if (!Array.isArray(toolResponses) || toolResponses.length === 0) {
      throw new ValidationError("Tool responses must be a non-empty array");
    }
    
    // Validate each response and check pairing (pseudocode lines 112-125)
    for (const response of toolResponses) {
      this.validateToolResponse(response);
      
      // Check for matching pending call (pseudocode lines 114-116)
      if (!this.pendingToolCalls.has(response.toolCallId)) {
        throw new ValidationError(`Tool response has no matching call: ${response.toolCallId}`);
      }
      
      // Check for duplicate response (pseudocode lines 117-119)
      if (this.toolResponses.has(response.toolCallId)) {
        throw new ValidationError(`Tool response already exists for call: ${response.toolCallId}`);
      }
      
      this.toolResponses.set(response.toolCallId, response);
    }
    
    // Emit event (pseudocode line 122)
    this.emitEvent('ToolResponsesAdded', { responses: toolResponses });
    
    // Commit transaction (pseudocode line 123)  
    return toolResponses.length;
    
  } catch (error) {
    // Rollback transaction (pseudocode lines 125-128)
    this.restoreState(previousState);
    this.emitEvent('ToolResponsesAddError', { error });
    throw error;
  }
}
```

### Task 4: Implement abortPendingToolCalls() Method

**Reference**: Lines 173-208 from `tool-management.md` pseudocode (clearToolState method)

```typescript
/**
 * Aborts pending tool calls and cleans up state
 * @requirement HS-012: Clean up and abort failed tool operations
 * @plan PLAN-20250128-HISTORYSERVICE.P17
 * @phase tool-management-impl  
 * @pseudocode tool-management.md:173-208
 */
public abortPendingToolCalls(): { pendingCleared: number; responsesCleared: number } {
  // Begin transaction (pseudocode line 175)
  const previousState = this.copyCurrentState();
  
  try {
    // Check current state (pseudocode lines 177-179)
    if (this.currentState === ConversationState.TOOLS_EXECUTING) {
      throw new StateError("Cannot abort tool calls during execution");
    }
    
    // Store counts for return (pseudocode lines 180-181)
    const pendingCount = this.pendingToolCalls.size;
    const responseCount = this.toolResponses.size;
    
    // Clear tool state (pseudocode lines 182-184)
    this.pendingToolCalls.clear();
    this.toolResponses.clear();
    this.executionOrder = [];
    
    // Transition state (pseudocode lines 185-189)
    this.transitionTo(ConversationState.READY, {
      clearedPending: pendingCount,
      clearedResponses: responseCount,
      triggeredBy: "abortPendingToolCalls"
    });
    
    // Emit event (pseudocode lines 190-193)
    this.emitEvent('ToolStateCleared', {
      pendingCount: pendingCount,
      responseCount: responseCount
    });
    
    // Commit transaction (pseudocode line 194)
    return {
      pendingCleared: pendingCount,
      responsesCleared: responseCount
    };
    
  } catch (error) {
    // Rollback transaction (pseudocode lines 199-202)
    this.restoreState(previousState);
    this.emitEvent('ToolStateClearError', { error });
    throw error;
  }
}
```

### Task 5: Implement Tool Validation Methods

**Reference**: Lines 237-282 from `tool-management.md` pseudocode

```typescript
/**
 * Validates tool call structure and requirements
 * @requirement HS-013: Tool call validation
 * @plan PLAN-20250128-HISTORYSERVICE.P17
 * @phase tool-management-impl
 * @pseudocode tool-management.md:237-262
 */
private validateToolCall(toolCall: ToolCall): boolean {
  // Null/undefined check (pseudocode lines 239-241)
  if (toolCall == null) {
    throw new ValidationError("Tool call cannot be null or undefined");
  }
  
  // ID validation (pseudocode lines 242-247)
  if (!toolCall.id) {
    throw new ValidationError("Tool call must have an ID");
  }
  
  if (typeof toolCall.id !== 'string') {
    throw new ValidationError("Tool call ID must be a string");
  }
  
  // Function validation (pseudocode lines 248-253)
  if (!toolCall.function) {
    throw new ValidationError("Tool call must have a function");
  }
  
  if (!toolCall.function.name) {
    throw new ValidationError("Tool call function must have a name");
  }
  
  // Arguments validation (pseudocode lines 254-256)
  if (toolCall.function.arguments && typeof toolCall.function.arguments !== 'string') {
    throw new ValidationError("Tool call function arguments must be a string");
  }
  
  return true;
}

/**
 * Validates tool response structure and requirements  
 * @requirement HS-013: Tool response validation
 * @plan PLAN-20250128-HISTORYSERVICE.P17
 * @phase tool-management-impl
 * @pseudocode tool-management.md:260-282
 */
private validateToolResponse(toolResponse: ToolResponse): boolean {
  // Null/undefined check (pseudocode lines 262-264)
  if (toolResponse == null) {
    throw new ValidationError("Tool response cannot be null or undefined");
  }
  
  // Tool call ID validation (pseudocode lines 265-270)
  if (!toolResponse.toolCallId) {
    throw new ValidationError("Tool response must have a tool call ID");
  }
  
  if (typeof toolResponse.toolCallId !== 'string') {
    throw new ValidationError("Tool response tool call ID must be a string");
  }
  
  // Content/error validation (pseudocode lines 271-276)
  if (!toolResponse.content && !toolResponse.error) {
    throw new ValidationError("Tool response must have either content or error");
  }
  
  if (toolResponse.content && toolResponse.error) {
    throw new ValidationError("Tool response cannot have both content and error");
  }
  
  return true;
}
```

### Task 6: Implement Tool Call/Response Pairing Validation

```typescript
/**
 * Validates tool call/response ID pairing consistency
 * @requirement HS-013, HS-014: ID pairing and parallel tool calls
 * @plan PLAN-20250128-HISTORYSERVICE.P17
 * @phase tool-management-impl
 */
private validateToolCallResponsePairs(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for orphaned tool calls
  for (const [callId, toolCall] of this.pendingToolCalls) {
    if (!this.toolResponses.has(callId)) {
      warnings.push(`Orphaned tool call: ${callId} (${toolCall.function.name})`);
    }
  }
  
  // Check for orphaned responses
  for (const [responseId, toolResponse] of this.toolResponses) {
    if (!this.pendingToolCalls.has(responseId)) {
      errors.push(`Orphaned tool response: ${responseId}`);
    }
  }
  
  // Validate execution order consistency
  for (const callId of this.executionOrder) {
    if (!this.pendingToolCalls.has(callId)) {
      errors.push(`Execution order contains unknown call ID: ${callId}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}
```

### Task 7: Implement Utility Methods for Tool Management

```typescript
/**
 * Gets count of pending tool calls
 * @requirement HS-014: Multiple parallel tool calls support  
 * @plan PLAN-20250128-HISTORYSERVICE.P17
 * @phase tool-management-impl
 */
public getPendingToolCallsCount(): number {
  return this.pendingToolCalls.size;
}

/**
 * Gets tool call status information  
 * @requirement HS-014: Tool call status tracking
 * @plan PLAN-20250128-HISTORYSERVICE.P17
 * @phase tool-management-impl
 * @pseudocode tool-management.md:206-238
 */
public getToolCallStatus(): ToolCallStatus {
  const status = {
    pendingCalls: this.pendingToolCalls.size,
    responseCount: this.toolResponses.size,
    currentState: this.currentState,
    completedCalls: 0,
    failedCalls: 0,
    executionOrder: [...this.executionOrder],
    details: [] as ToolCallDetail[]
  };
  
  // Count completed and failed calls (pseudocode lines 214-224)
  for (const [callId, response] of this.toolResponses) {
    if (response.error) {
      status.failedCalls++;
    } else {
      status.completedCalls++;
    }
  }
  
  // Build details array (pseudocode lines 223-233)
  for (const callId of this.executionOrder) {
    const toolCall = this.pendingToolCalls.get(callId);
    const toolResponse = this.toolResponses.get(callId);
    
    status.details.push({
      callId: callId,
      functionName: toolCall?.function?.name,
      hasResponse: toolResponse != null,
      responseStatus: toolResponse?.error ? "error" : "success",
      timestamp: toolCall?.timestamp
    });
  }
  
  return status;
}

/**
 * Gets all pending tool calls in execution order
 * @requirement HS-014: Ordered tool call access
 * @plan PLAN-20250128-HISTORYSERVICE.P17  
 * @phase tool-management-impl
 * @pseudocode tool-management.md:325-339
 */
public getAllPendingToolCalls(): ToolCall[] {
  const results: ToolCall[] = [];
  for (const callId of this.executionOrder) {
    const toolCall = this.pendingToolCalls.get(callId);
    if (toolCall) {
      results.push(toolCall);
    }
  }
  return results;
}

/**
 * Gets all tool responses in execution order  
 * @requirement HS-014: Ordered tool response access
 * @plan PLAN-20250128-HISTORYSERVICE.P17
 * @phase tool-management-impl
 * @pseudocode tool-management.md:337-351
 */
public getAllToolResponses(): ToolResponse[] {
  const results: ToolResponse[] = [];
  for (const callId of this.executionOrder) {
    const toolResponse = this.toolResponses.get(callId);
    if (toolResponse) {
      results.push(toolResponse);
    }
  }
  return results;
}
```

### Task 8: Implement State Management Stubs

```typescript
/**
 * State management helpers (stubbed for now, full implementation in state phase)
 * @plan PLAN-20250128-HISTORYSERVICE.P17
 * @phase tool-management-impl
 */
private validateStateTransition(operation: string): void {
  // Stub implementation - always allow for now
  // Full implementation will be in state management phase
}

private transitionTo(newState: ConversationState, context: any): void {
  // Stub implementation - just set state for now  
  // Full implementation will be in state management phase
  this.currentState = newState;
}

private copyCurrentState(): any {
  // Stub implementation - copy tool state for transactions
  return {
    pendingToolCalls: new Map(this.pendingToolCalls),
    toolResponses: new Map(this.toolResponses),
    executionOrder: [...this.executionOrder],
    currentState: this.currentState
  };
}

private restoreState(previousState: any): void {
  // Stub implementation - restore from backup
  this.pendingToolCalls = previousState.pendingToolCalls;
  this.toolResponses = previousState.toolResponses;
  this.executionOrder = previousState.executionOrder;
  this.currentState = previousState.currentState;
}

private emitEvent(eventName: string, data: any): void {
  // Stub implementation - log for now
  // Full implementation will be in event system phase
  console.log(`[HistoryService] ${eventName}:`, data);
}
```

### Task 9: Add Required Type Definitions

Update the types file to include necessary interfaces:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P17
// @phase tool-management-impl

export interface ToolCallStatus {
  pendingCalls: number;
  responseCount: number;  
  currentState: ConversationState;
  completedCalls: number;
  failedCalls: number;
  executionOrder: string[];
  details: ToolCallDetail[];
}

export interface ToolCallDetail {
  callId: string;
  functionName?: string;
  hasResponse: boolean;
  responseStatus: "success" | "error";
  timestamp?: number;
}

export enum ConversationState {
  IDLE = 'IDLE',
  MODEL_RESPONDING = 'MODEL_RESPONDING', 
  TOOLS_PENDING = 'TOOLS_PENDING',
  TOOLS_EXECUTING = 'TOOLS_EXECUTING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}
```

## Required Code Markers

All implemented methods must include:
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P17
// @requirement HS-XXX (specific requirement number)
// @phase tool-management-impl
// @pseudocode tool-management.md:line-range (where applicable)
```

## Implementation Pattern

1. **Remove NotYetImplemented Throws**: Replace all `throw new NotYetImplemented()` statements in HistoryService tool methods
2. **Adapt Pseudocode**: Implement according to specific line references from `tool-management.md`, adapting ToolManager references to HistoryService
3. **Add Transaction Safety**: Use try-catch with state backup/restore for atomic operations
4. **Comprehensive Validation**: Validate all inputs according to pseudocode validation methods
5. **Proper Error Handling**: Throw appropriate validation and state errors with descriptive messages
6. **State Consistency**: Ensure tool state remains consistent even during failures
7. **Architecture Note**: Remember these are HistoryService methods, NOT separate ToolManager methods

## Success Criteria

1. **All Tool Management Tests Pass**: Phase 16 TDD tests must pass completely
2. **No NotYetImplemented Exceptions**: All tool management methods fully implemented  
3. **Atomic Operations**: Tool operations maintain consistency with proper rollback
4. **Validation Coverage**: All tool calls and responses properly validated
5. **ID Pairing Logic**: Tool call/response matching works correctly
6. **Parallel Tool Support**: Multiple tool calls handled properly with execution order
7. **State Management**: Proper state transitions during tool operations
8. **Error Handling**: Comprehensive error scenarios handled with proper exceptions

## Test Command for Verification

```bash
# Kill any running test processes
ps -ef | grep -i vitest | grep -v grep
pkill -f vitest

# Run tool management tests specifically
cd packages/core && npm test -- --run HistoryService.tool-management.test.ts

# Verify all tests pass
echo "Expected: All tool management tests passing"

# Kill any remaining test processes  
ps -ef | grep -i vitest | grep -v grep
pkill -f vitest
```

## Files to Modify

1. **HistoryService.ts**: Implement all tool management methods
2. **types.ts**: Add ToolCallStatus, ToolCallDetail, ConversationState, ValidationError, StateError
3. **HistoryService.tool-management.test.ts**: Should pass after implementation

## Next Phase

After successful implementation:
**Phase 18**: State Machine Implementation - Implement proper state management for conversation states and transitions.

## Notes

- Implementation must follow the exact pseudocode line references provided, adapting ToolManager to HistoryService
- All methods must handle edge cases and provide comprehensive validation
- Transaction safety is critical - operations must be atomic
- State management is stubbed initially but will be fully implemented in the state phase
- Event emission is stubbed initially but will be fully implemented in the event phase
- Focus on making TDD tests pass while maintaining code quality and proper error handling
- **ARCHITECTURAL DECISION**: Tool management is integrated into HistoryService, NOT a separate class
- This simplifies the architecture: CoreToolScheduler executes → Turn orchestrates → HistoryService records