# Phase 16: Tool Management TDD Implementation

**Phase ID**: PLAN-20250128-HISTORYSERVICE.P16  
**Prerequisites**: Phase 15a (tool management stub verification) passed  
**Requirements**: HS-009 to HS-014  

## Overview

This phase implements Test-Driven Development for tool management methods that are integrated directly into the HistoryService class. Tool tracking is NOT a separate concern - it's a core part of history management. The tests will cover adding pending tool calls, atomic commit operations for tool responses, aborting pending operations, tool call/response pairing validation, and multiple parallel tool call scenarios. Tests must validate real behavior with actual tool call/response data and not expect NotYetImplemented errors.

## Requirements Coverage

- **HS-009**: addPendingToolCalls() - Add tool calls to pending state with validation
- **HS-010**: commitToolResponses() - Atomically commit tool responses and pair with calls  
- **HS-011**: Atomic operations - Ensure all tool operations maintain data consistency
- **HS-012**: abortPendingToolCalls() - Clean up and abort failed tool operations
- **HS-013**: Tool call/response ID pairing validation and matching
- **HS-014**: Multiple parallel tool calls with proper state management

## Test Implementation Tasks

### Task 1: Core Tool Management Tests
Create comprehensive tests in `/src/history/HistoryService.tool-management.test.ts` for HistoryService's integrated tool methods:

- **Adding Pending Tool Calls (HS-009)**:
  - Test adding valid tool calls to pending state
  - Test validation of tool call structure and IDs  
  - Test duplicate ID prevention
  - Test maximum pending calls limit enforcement
  - Test empty/invalid tool call arrays
  - Test atomic failure rollback on validation errors

- **Tool Response Commitment (HS-010)**:
  - Test atomic commitment of tool responses
  - Test pairing tool responses with pending calls
  - Test validation of response structure
  - Test rollback on pairing failures
  - Test multiple response batch processing

### Task 2: Atomic Operations Tests (HS-011)
- Test transaction integrity during tool operations
- Test rollback scenarios when operations fail mid-process
- Test state consistency during concurrent operations
- Test recovery from partial failures
- Test proper cleanup after successful operations

### Task 3: Tool Call Abortion Tests (HS-012)
- Test aborting all pending tool calls
- Test cleanup of partial tool states
- Test proper state transitions during abortion
- Test event emission during abort operations
- Test abortion during active tool execution

### Task 4: ID Pairing Validation Tests (HS-013)
- Test matching tool call IDs with response IDs
- Test mismatched ID error handling
- Test orphaned tool calls (calls without responses)
- Test orphaned responses (responses without calls)
- Test duplicate response prevention for same call ID
- Test proper pairing order maintenance

### Task 5: Multiple Parallel Tool Calls Tests (HS-014)
- Test handling multiple tool calls in single batch
- Test parallel execution state management
- Test proper ordering of tool calls and responses
- Test concurrent tool call addition and response commitment
- Test state consistency with multiple parallel operations
- Test execution timeout handling for parallel calls

### Task 6: Edge Case and Error Handling Tests
- Test invalid tool call/response data structures
- Test network/execution failures during tool operations
- Test state machine transition failures
- Test concurrent access to pending tool state
- Test memory limits with large tool call batches
- Test proper error propagation and event emission

## Required Test Data Structures

### Sample Tool Calls
```typescript
const sampleToolCalls: ToolCall[] = [
  {
    id: "tool_call_1",
    function: {
      name: "search_web",
      arguments: JSON.stringify({ query: "test query" })
    },
    type: "function"
  },
  {
    id: "tool_call_2", 
    function: {
      name: "read_file",
      arguments: JSON.stringify({ path: "/test/file.txt" })
    },
    type: "function"
  }
];
```

### Sample Tool Responses
```typescript
const sampleToolResponses: ToolResponse[] = [
  {
    toolCallId: "tool_call_1",
    content: "Search results: ...",
    timestamp: Date.now()
  },
  {
    toolCallId: "tool_call_2",
    content: "File content: ...",
    timestamp: Date.now()
  }
];
```

### Mismatched/Invalid Data
```typescript
const mismatchedResponses: ToolResponse[] = [
  {
    toolCallId: "nonexistent_call_id",
    content: "This should fail pairing",
    timestamp: Date.now()
  }
];

const invalidToolCall = {
  // Missing required fields
  function: { name: "test" }
};
```

## Test Structure Reference (from pseudocode/tool-management.md)

Tests must validate behavior based on the pseudocode implementation, noting that these are now HistoryService methods, NOT separate ToolManager methods:

1. **Line 29-61**: `HistoryService.addPendingToolCalls()` - Validation, transaction handling, state management
2. **Line 107-134**: `HistoryService.commitToolResponses()` - Response validation, pairing logic, atomic operations  
3. **Line 177-208**: `HistoryService.abortPendingToolCalls()` - State cleanup and abortion logic
4. **Line 241-262**: `HistoryService.validateToolCall()` - Tool call structure validation (private)
5. **Line 264-282**: `HistoryService.validateToolResponse()` - Tool response structure validation (private)

## Required Code Markers

All test methods must include:
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P16
// @requirement HS-XXX (specific requirement number)
// @phase tool-management-tdd
```

## Test Implementation Pattern

```typescript
describe('HistoryService Tool Management (Integrated)', () => {
  // @plan PLAN-20250128-HISTORYSERVICE.P16
  // @requirement HS-009
  // @phase tool-management-tdd
  describe('addPendingToolCalls', () => {
    test('should add valid tool calls to pending state', async () => {
      // Test real behavior - NO NotYetImplemented expected
      const toolCalls = [/* sample tool calls */];
      const result = await historyService.addPendingToolCalls(toolCalls);
      
      expect(result).toBe(toolCalls.length);
      expect(historyService.getPendingToolCallsCount()).toBe(toolCalls.length);
    });

    test('should prevent duplicate tool call IDs', async () => {
      const duplicateIdCalls = [/* calls with same ID */];
      
      await expect(
        historyService.addPendingToolCalls(duplicateIdCalls)
      ).rejects.toThrow('Tool call ID already exists');
    });
  });

  // @plan PLAN-20250128-HISTORYSERVICE.P16  
  // @requirement HS-010
  // @phase tool-management-tdd
  describe('commitToolResponses', () => {
    test('should atomically commit tool responses with proper pairing', async () => {
      // Setup pending calls first
      const toolCalls = [/* sample calls */];
      await historyService.addPendingToolCalls(toolCalls);
      
      const toolResponses = [/* matching responses */];
      const result = await historyService.commitToolResponses(toolResponses);
      
      expect(result).toBe(toolResponses.length);
      // Verify proper pairing and history addition
    });
  });

  // Additional test suites for HS-011, HS-012, HS-013, HS-014...
});
```

## Success Criteria

1. **Complete Test Coverage**: All tool management methods have comprehensive tests
2. **Real Behavior Testing**: Tests validate actual implementation, not stub behavior
3. **Edge Case Coverage**: All edge cases and error conditions are tested
4. **Atomic Operation Testing**: Transaction integrity and rollback scenarios covered
5. **Pairing Validation**: Tool call/response ID matching thoroughly tested
6. **Parallel Operations**: Multiple concurrent tool call scenarios tested
7. **State Consistency**: All tests verify proper state machine transitions
8. **Error Handling**: All error conditions properly tested and validated

## Test Data Requirements

- **Valid tool calls** with proper structure and unique IDs
- **Valid tool responses** matching pending call IDs  
- **Invalid data structures** for error testing
- **Mismatched ID pairs** for validation testing
- **Large data sets** for performance and limit testing
- **Concurrent operation scenarios** for race condition testing

## Next Phase

Phase 16a: Tool Management TDD Verification - Verify all tests are created and validate test coverage before implementation phase.

## Notes

- Tests must NOT expect `NotYetImplemented` errors - they test real implementation behavior
- All tests must use actual `ToolCall` and `ToolResponse` data structures
- Focus on behavioral validation rather than internal implementation details
- Ensure tests cover both success and failure scenarios comprehensively
- Test atomicity by verifying state rollback on partial failures
- **IMPORTANT**: Tool management is NOT a separate class - these are HistoryService methods
- Tests validate that tool tracking integrates seamlessly with history management