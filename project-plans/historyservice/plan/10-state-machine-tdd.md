# Phase 10: State Machine TDD Implementation

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P10  
**Prerequisites:** Phase 09a (state-stub-verification.md) passed  
**Type:** Test-Driven Development Phase

## Purpose

Create comprehensive behavioral tests for the state machine implementation covering requirements HS-015 to HS-017. These tests will drive the implementation of proper state tracking, validation, and automatic transitions.

**Requirements Coverage:**
- **@requirement HS-015**: Track current conversation state (IDLE, MODEL_RESPONDING, TOOLS_PENDING, TOOLS_EXECUTING)
- **@requirement HS-016**: Prevent invalid operations based on current state
- **@requirement HS-017**: Transition states automatically based on operations performed

## Test Creation Tasks

### Task 1: Create State Tracking Tests

**File:** `src/core/history/__tests__/state-tracking.test.ts`

Create tests that verify state tracking during operations:

```typescript
describe('HistoryService State Tracking (@requirement HS-015)', () => {
  describe('Initial State', () => {
    it('should start in READY state by default')
    it('should maintain state history from initialization')
    it('should provide current state through getCurrentState()')
  });

  describe('State Persistence', () => {
    it('should persist state across multiple operations')
    it('should track state changes with timestamps')
    it('should maintain state history for auditing')
  });

  describe('State Context Tracking', () => {
    it('should track operation context in state transitions')
    it('should identify what triggered each state change')
    it('should preserve state context for debugging')
  });
});
```

**Required Test Behaviors:**
- Test actual state values from `getCurrentState()`
- Verify state persistence across operations
- Test state history accumulation
- Validate state context tracking

### Task 2: Create Invalid State Transition Prevention Tests

**File:** `src/core/history/__tests__/state-validation.test.ts`

Create tests that verify invalid state transition prevention:

```typescript
describe('HistoryService State Validation (@requirement HS-016)', () => {
  describe('Invalid Transition Prevention', () => {
    it('should reject transition from TOOLS_EXECUTING to PROCESSING')
    it('should reject transition from READY to TOOLS_EXECUTING')
    it('should reject invalid state enum values')
    it('should throw StateTransitionError for invalid transitions')
  });

  describe('Operation Validation by State', () => {
    it('should prevent message addition during TOOLS_EXECUTING')
    it('should prevent history clearing during TOOLS_PENDING')
    it('should prevent tool execution without TOOLS_PENDING state')
    it('should prevent tool response addition without TOOLS_EXECUTING')
  });

  describe('State Consistency', () => {
    it('should maintain state consistency when operations fail')
    it('should rollback state on failed transitions')
    it('should emit error events for invalid state operations')
  });
});
```

**Required Test Behaviors:**
- Test REAL state transition validation (not stubs)
- Verify error throwing for invalid operations
- Test state rollback on failures
- Validate error event emission

### Task 3: Create Automatic State Transition Tests

**File:** `src/core/history/__tests__/state-transitions.test.ts`

Create tests that verify automatic state transitions:

```typescript
describe('HistoryService State Transitions (@requirement HS-017)', () => {
  describe('Message Operation Transitions', () => {
    it('should transition to PROCESSING when adding user message')
    it('should return to READY after message addition completes')
    it('should transition to MODEL_RESPONDING when adding model message')
  });

  describe('Tool Call Transitions', () => {
    it('should transition to TOOLS_PENDING when adding pending tool calls')
    it('should transition to TOOLS_EXECUTING when executing tools')
    it('should transition to TOOLS_COMPLETED after tool responses')
    it('should return to READY after completing tool workflow')
  });

  describe('Error State Transitions', () => {
    it('should transition to ERROR on validation failures')
    it('should transition to ERROR on operation exceptions')
    it('should recover from ERROR to READY state')
  });

  describe('Complex Workflow Transitions', () => {
    it('should handle multiple tool calls with proper state transitions')
    it('should handle parallel tool execution state management')
    it('should maintain state consistency across complex workflows')
  });

  describe('Concurrent Operation Handling (@requirement HS-045)', () => {
    it('should queue concurrent state transitions safely')
    it('should handle rapid message sending during tool execution')
    it('should process operations in order when multiple are queued')
    it('should validate state before each queued operation')
    it('should handle parallel tool calls without state corruption')
    it('should maintain operation history for debugging')
  });
});
```

**Required Test Behaviors:**
- Test REAL automatic transitions based on operations
- Verify state changes follow the pseudocode logic
- Test complex multi-step workflows
- Validate event emission during transitions

### Task 4: Create State Machine Integration Tests

**File:** `src/core/history/__tests__/state-integration.test.ts`

Create integration tests that verify state behavior with actual history operations:

```typescript
describe('HistoryService State Integration', () => {
  describe('End-to-End State Workflows', () => {
    it('should maintain correct states through complete conversation turn')
    it('should handle tool call workflow with proper state transitions')
    it('should recover gracefully from error states')
  });

  describe('Concurrency Integration (@requirement HS-045)', () => {
    it('should handle multiple parallel tool executions without state corruption')
    it('should maintain queue integrity during rapid operations')
    it('should validate state consistency between operations')
    it('should rollback on failed concurrent operations')
  });

  describe('State Event Integration', () => {
    it('should emit state change events during operations')
    it('should provide state context in emitted events')
    it('should maintain event ordering with state transitions')
  });

  describe('State Statistics and Monitoring', () => {
    it('should provide accurate state statistics')
    it('should track state duration metrics')
    it('should support state transition auditing')
  });
});
```

**Required Test Behaviors:**
- Test REAL integration with HistoryService operations
- Verify event system integration
- Test state monitoring and statistics

## Implementation Requirements

### Code Markers Required

All state machine methods must include these markers:

```typescript
// @requirement HS-015: State tracking implementation
getCurrentState(): HistoryState {
  // Implementation here
}

// @requirement HS-016: State transition validation
transitionTo(newState: HistoryState, context?: StateContext): Promise<StateTransition> {
  // Implementation here
}

// @requirement HS-017: Automatic state transitions
private handleOperationStateTransition(operation: OperationType, context?: any): Promise<void> {
  // Implementation here  
}
```

### State Machine Implementation Notes

Based on the pseudocode from `state-machine.md`, implement:

1. **StateManager Class** (lines 10-233):
   - State tracking with history
   - Allowed transition validation  
   - Automatic transition logic
   - State entry/exit handlers

2. **State Validation Logic** (lines 77-121):
   - Action validation by current state
   - Operation permission checking
   - State consistency enforcement

3. **Event Integration** (lines 49, 53, 175, 187, 205):
   - State change event emission
   - Error event emission on invalid transitions
   - Integration with existing event system

### Test Data Requirements

Tests must use REAL data structures, not mocks:

```typescript
// Example test data
const mockUserMessage: UserMessage = {
  role: 'user',
  content: [{ type: 'text', text: 'Hello' }]
};

const mockToolCall: ToolCall = {
  id: 'tool-123',
  type: 'function',
  function: { name: 'test_tool', arguments: '{}' }
};

const mockToolResponse: ToolResponse = {
  tool_call_id: 'tool-123',
  content: 'Success'
};
```

## Test Execution Strategy

### Test Order Requirements

1. **Run tests in isolation** - Each test should start with fresh HistoryService instance
2. **Verify state persistence** - Tests should check state before and after operations
3. **Test real behavior** - No mocking of state machine logic, test actual implementation
4. **Validate events** - Verify state change events are emitted correctly

### Expected Test Failures

Initially, tests MUST fail with meaningful errors:

```
❌ HistoryService State Tracking
   ✗ should start in READY state by default
     Expected: 'READY', Received: 'INACTIVE'
   
❌ HistoryService State Validation  
   ✗ should reject transition from TOOLS_EXECUTING to PROCESSING
     Expected: StateTransitionError, Received: undefined

❌ HistoryService State Transitions
   ✗ should transition to PROCESSING when adding user message
     Expected: 'PROCESSING', Received: 'READY'
```

## Success Criteria

✅ **Test Creation:**
- [ ] `state-tracking.test.ts` created with 10+ behavioral tests
- [ ] `state-validation.test.ts` created with 12+ validation tests  
- [ ] `state-transitions.test.ts` created with 15+ transition tests
- [ ] `state-integration.test.ts` created with 8+ integration tests

✅ **Test Quality:**
- [ ] All tests reference appropriate `@requirement HS-015` to `HS-017`
- [ ] Tests use REAL data structures (no mocks for state logic)
- [ ] Tests verify actual behavior, not NotYetImplemented exceptions
- [ ] Tests cover both success and error scenarios

✅ **Test Coverage:**
- [ ] State tracking during all major operations
- [ ] Invalid transition prevention for all state combinations  
- [ ] Automatic transitions based on operations
- [ ] State persistence and history tracking
- [ ] Error recovery and rollback scenarios

✅ **Natural Test Failures:**
- [ ] Tests run but fail due to missing implementation (not compilation errors)
- [ ] Failure messages clearly indicate what behavior is missing
- [ ] No tests expect `NotYetImplemented` exceptions
- [ ] Test failures guide implementation requirements

✅ **Integration Readiness:**
- [ ] Tests integrate with existing HistoryService interface
- [ ] Tests work with real Content/Part types
- [ ] Tests verify event emission and integration
- [ ] Tests support future implementation phases

## Failure Recovery

### If tests won't compile:
1. Verify HistoryState enum is properly exported
2. Check StateContext and StateTransition type definitions
3. Ensure all imports are correctly resolved
4. Review TypeScript configuration

### If tests expect NotYetImplemented:
1. Rewrite tests to expect actual behavior
2. Remove any stub-checking logic
3. Focus tests on the desired end behavior
4. Ensure tests will guide implementation

### If tests don't fail meaningfully:
1. Verify tests call real methods (not mocks)
2. Ensure tests check actual state values
3. Add assertions that will fail without implementation
4. Remove any default return value dependencies

### If test coverage is insufficient:
1. Add tests for edge cases and error conditions
2. Include tests for complex multi-step workflows
3. Verify all state combinations are tested
4. Add integration tests with actual operations

## Next Phase

Upon successful test creation and verification that tests fail naturally (indicating missing implementation), proceed to **Phase 11** (State Machine Implementation) where these tests will drive the actual implementation.

## Notes

- Tests should be comprehensive enough to drive complete implementation
- Focus on BEHAVIOR testing, not internal implementation details
- State machine logic should follow the pseudocode patterns from `state-machine.md`
- Tests must integrate with existing HistoryService architecture
- Error scenarios are as important as success scenarios for state machines