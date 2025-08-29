# Phase 25: Turn.ts Integration TDD

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P25  
**Prerequisites:** Phase 24a passed  
**Type:** TDD Phase  

## Overview

This TDD phase creates comprehensive behavioral tests for Turn.ts integration with HistoryService. The tests focus on REAL tool execution flows with proper pending/commit patterns, ensuring integration works correctly with CoreToolScheduler callbacks and TurnEmitter events.

## Target Implementation

### File: `/packages/core/src/core/turn.test.ts`
- **Location**: Modify existing test file
- **Integration Points**: Add HistoryService integration tests to existing test suite

### Key Behavioral Tests Required

## Test Creation Tasks

### Task 1: Tool Call Pending/Commit Flow Tests
**File**: `/packages/core/src/core/turn.test.ts`
**Location**: After existing Turn tests

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P25
// @requirement HS-050, HS-011, HS-012
describe('Turn.ts HistoryService Integration', () => {
  describe('Tool Call Pending/Commit Flow', () => {
    test('should add tool call as pending before execution', async () => {
      // Real tool execution test - verify pending state
    });

    test('should commit tool call and response after successful execution', async () => {
      // Real tool execution test - verify commit state
    });

    test('should handle multiple parallel tool calls correctly', async () => {
      // Real multi-tool execution test
    });
  });
});
```

### Task 2: Tool Execution Error/Cancellation Tests  
**File**: `/packages/core/src/core/turn.test.ts`
**Location**: After Task 1 tests

```typescript
describe('Tool Execution Error Handling', () => {
  test('should abort pending tool calls on execution failure', async () => {
    // Real tool failure scenario test
  });

  test('should abort pending tool calls on user cancellation', async () => {
    // Real cancellation scenario test  
  });

  test('should not commit failed tool executions to history', async () => {
    // Verify failed tools don't pollute history
  });
});
```

### Task 3: CoreToolScheduler Callback Preservation Tests
**File**: `/packages/core/src/core/turn.test.ts**  
**Location**: After Task 2 tests

```typescript
describe('CoreToolScheduler Integration', () => {
  test('should preserve existing CoreToolScheduler callbacks', async () => {
    // Verify callback functionality remains intact
  });

  test('should execute callbacks in correct order with history operations', async () => {
    // Verify callback timing with history integration
  });

  test('should handle callback errors without breaking history tracking', async () => {
    // Test callback error resilience
  });
});
```

### Task 4: TurnEmitter Events Preservation Tests
**File**: `/packages/core/src/core/turn.test.ts`
**Location**: After Task 3 tests

```typescript
describe('TurnEmitter Event Preservation', () => {
  test('should emit all existing turn events with history integration', async () => {
    // Verify all event types are still emitted
  });

  test('should emit events in correct sequence with history operations', async () => {
    // Verify event timing and ordering
  });

  test('should include history metadata in turn completion events', async () => {
    // Verify enhanced event payloads
  });
});
```

### Task 5: Real Tool Execution Integration Tests
**File**: `/packages/core/src/core/turn.test.ts`
**Location**: After Task 4 tests

```typescript
describe('Real Tool Execution Flows', () => {
  test('should integrate with actual shell tool execution', async () => {
    // Use real shell tool for integration testing
  });

  test('should integrate with actual file read tool execution', async () => {
    // Use real file tool for integration testing
  });

  test('should handle tool output with history service correctly', async () => {
    // Verify tool output is properly historied
  });
});
```

## Required Test Utilities

### Mock HistoryService Setup
**File**: `/packages/core/src/core/turn.test.ts`
**Location**: Test setup section

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P25
// @requirement HS-050
const createMockHistoryService = () => {
  const mockService = {
    pendingHistoryItem: jest.fn(),
    commitHistoryItem: jest.fn(),
    abortPendingItem: jest.fn(),
    getLastMessage: jest.fn(),
    // Other required methods
  };
  return mockService;
};
```

### Real Tool Execution Helpers
**File**: `/packages/core/src/core/turn.test.ts**
**Location**: Test utilities section

```typescript
const createRealToolForTesting = () => {
  // Return actual tool instance for real execution tests
  return {
    name: 'test-tool',
    execute: async (params) => {
      // Real execution logic that can succeed/fail
    },
    // Other tool properties
  };
};
```

## Test Scenarios Coverage

### ✅ Critical Integration Scenarios
1. **Tool Pending Before Execution** - Verify tools are marked pending before execution starts
2. **Tool Commit After Success** - Verify successful tool execution results are committed  
3. **Tool Abort on Failure** - Verify failed tools are aborted, not committed
4. **Tool Abort on Cancellation** - Verify cancelled tools are properly aborted
5. **Multiple Tool Handling** - Verify parallel tool execution with proper history tracking

### ✅ Callback Preservation Scenarios  
1. **CoreToolScheduler Callbacks Work** - Verify existing callback functionality preserved
2. **Callback Order with History** - Verify callbacks execute in correct sequence
3. **Callback Error Resilience** - Verify callback errors don't break history

### ✅ Event System Scenarios
1. **TurnEmitter Events Preserved** - Verify all existing events still emit
2. **Event Sequence Correct** - Verify event ordering with history integration
3. **Enhanced Event Metadata** - Verify events include relevant history info

### ✅ Real Execution Scenarios
1. **Shell Tool Integration** - Test with actual shell tool execution
2. **File Tool Integration** - Test with actual file manipulation tools
3. **Error Propagation** - Test error handling through full execution stack

## Required Code Markers

### In Test File
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P25
// @requirement HS-050: Turn.ts integration with CoreToolScheduler
// @requirement HS-011: Tool calls and responses committed atomically
// @requirement HS-012: Abort pending tool calls capability
```

### Test Structure Requirements
- Use `describe()` blocks for logical grouping
- Use meaningful test names that describe behavior
- Include both positive and negative test cases  
- Test real execution flows, not just mocks
- Verify integration points explicitly

## Success Criteria

### ✅ Test Coverage Requirements
1. **Tool Execution Flow Coverage** - All tool execution states tested (pending, executing, success, failure, cancelled)
2. **Callback Integration Coverage** - All CoreToolScheduler callback scenarios tested
3. **Event System Coverage** - All TurnEmitter events tested with history integration
4. **Real Tool Coverage** - At least 2 real tools tested for integration
5. **Error Scenario Coverage** - All failure and cancellation paths tested

### ✅ Test Quality Requirements
1. **No NotYetImplemented Expectations** - Tests must not expect or catch NotYetImplemented
2. **Real Execution Focus** - Tests use actual tool execution, not just mocks
3. **Integration Verification** - Tests verify HistoryService integration points
4. **Behavioral Focus** - Tests describe what should happen, not implementation details
5. **Comprehensive Coverage** - Tests cover both success and failure scenarios

### ✅ Test Performance Requirements
1. **Fast Execution** - Individual tests complete within 5 seconds
2. **Isolated Tests** - Each test is independent and can run alone
3. **Clean Setup/Teardown** - Proper test isolation with clean state
4. **Resource Cleanup** - Tests clean up any created resources

## Implementation Commands

### Step 1: Create Test Infrastructure
```bash
# Navigate to core directory
cd packages/core

# Verify existing turn test file
ls -la src/core/turn.test.ts
```

### Step 2: Add HistoryService Integration Tests
```bash
# Edit the existing test file to add integration tests
# Location: Add new describe blocks after existing tests
```

### Step 3: Create Test Utilities
```bash
# Add mock HistoryService utilities
# Add real tool execution helpers  
# Add integration test helpers
```

### Step 4: Verify Test Structure
```bash
# Run tests to verify they're properly structured
npm test -- --testPathPattern="turn.test.ts" --verbose
```

## Validation Commands

### Test Discovery
```bash
# Verify new tests are discovered
npm test -- --listTests | grep turn.test.ts
```

### Test Structure Check
```bash
# Check test structure
npm test -- --testPathPattern="turn.test.ts" --verbose --passWithNoTests
```

### Coverage Verification
```bash
# Verify test coverage
npm test -- --testPathPattern="turn.test.ts" --coverage --coverageReporters=text
```

## Expected Test Structure

### Test File Organization
```
turn.test.ts
├── (Existing Turn tests)
├── Turn.ts HistoryService Integration
│   ├── Tool Call Pending/Commit Flow
│   │   ├── should add tool call as pending before execution
│   │   ├── should commit tool call and response after successful execution
│   │   └── should handle multiple parallel tool calls correctly
│   ├── Tool Execution Error Handling  
│   │   ├── should abort pending tool calls on execution failure
│   │   ├── should abort pending tool calls on user cancellation
│   │   └── should not commit failed tool executions to history
│   ├── CoreToolScheduler Integration
│   │   ├── should preserve existing CoreToolScheduler callbacks
│   │   ├── should execute callbacks in correct order with history operations
│   │   └── should handle callback errors without breaking history tracking
│   ├── TurnEmitter Event Preservation
│   │   ├── should emit all existing turn events with history integration
│   │   ├── should emit events in correct sequence with history operations
│   │   └── should include history metadata in turn completion events
│   └── Real Tool Execution Flows
│       ├── should integrate with actual shell tool execution
│       ├── should integrate with actual file read tool execution
│       └── should handle tool output with history service correctly
```

## Failure Recovery

### Common Issues and Solutions

#### 1. Test Discovery Issues
**Issue:** New tests not found by test runner
**Recovery:**
```bash
# Clear test cache
npm test -- --clearCache

# Verify file naming
ls -la src/core/turn.test.ts

# Check test syntax
npm test -- --testPathPattern="turn.test.ts" --verbose --passWithNoTests
```

#### 2. HistoryService Mock Issues
**Issue:** Mock HistoryService not properly integrated
**Recovery:**
```bash
# Verify mock setup
# Check mock method signatures match real service
# Ensure mock is properly injected into Turn instance
```

#### 3. Real Tool Execution Issues  
**Issue:** Real tool tests failing unexpectedly
**Recovery:**
```bash
# Test real tools in isolation first
# Verify tool dependencies are available
# Check tool execution environment setup
```

#### 4. Test Performance Issues
**Issue:** Tests running too slowly
**Recovery:**
```bash
# Profile test execution
npm test -- --testPathPattern="turn.test.ts" --verbose --runInBand

# Identify slow tests and optimize
# Consider using lighter mock objects
```

## Next Steps

Upon successful completion:
1. **Proceed to Phase 25a:** Turn.ts Integration TDD Verification
2. **Document test patterns** for use in subsequent integration phases
3. **Update integration guidelines** based on discovered patterns

Upon failure:
1. **Address specific test issues** using recovery procedures
2. **Re-run validation commands** after fixes
3. **Consider Phase 24 stub modifications** if integration points are insufficient

## Notes

- Focus on REAL tool execution flows, not just mocked interactions
- Tests should demonstrate actual HistoryService integration benefits
- Maintain direct replacement with existing Turn functionality
- Ensure tests provide confidence for Phase 26 implementation
- Test both success and failure scenarios comprehensively