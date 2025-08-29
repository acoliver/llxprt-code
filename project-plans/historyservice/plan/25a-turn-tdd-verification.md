# Phase 25A: Turn.ts Integration TDD Verification

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P25A  
**Prerequisites:** Phase 25 completed  
**Type:** Verification Phase  

## Overview

This verification phase ensures that the Turn.ts integration TDD tests have been correctly implemented, covering all tool execution flows with real tool execution, proper requirement references, and comprehensive error/cancellation scenarios.

## Verification Commands

### 1. Test File Structure Check
```bash
# Verify turn.test.ts exists and contains new integration tests
ls -la packages/core/src/core/turn.test.ts

# Check file size and recent modifications
stat packages/core/src/core/turn.test.ts
```

### 2. Test Discovery and Structure
```bash
# List all tests to verify new integration tests are present
cd packages/core
npm test -- --testPathPattern="turn.test.ts" --listTests

# Check test structure without execution
npm test -- --testPathPattern="turn.test.ts" --dry-run --verbose
```

### 3. Requirement Coverage Check
```bash
# Verify HS-050 requirement references
grep -n "HS-050" packages/core/src/core/turn.test.ts

# Check for other history service requirements
grep -n "HS-011\|HS-012" packages/core/src/core/turn.test.ts

# Verify plan phase markers
grep -n "PLAN-20250128-HISTORYSERVICE.P25" packages/core/src/core/turn.test.ts
```

### 4. Real Tool Execution Coverage
```bash
# Check for real tool usage (not mocks)
grep -A 5 -B 5 "Real Tool Execution" packages/core/src/core/turn.test.ts

# Verify no mock-only tests in critical flows
grep -n "\.mockImplementation\|jest\.mock" packages/core/src/core/turn.test.ts | wc -l

# Check for actual tool execution patterns
grep -n "shell.*tool\|file.*tool\|actual.*tool" packages/core/src/core/turn.test.ts
```

### 5. Error and Cancellation Scenario Coverage
```bash
# Check error handling test coverage
grep -A 3 -B 3 "Error Handling\|error.*scenario\|failure" packages/core/src/core/turn.test.ts

# Verify cancellation scenario tests
grep -A 3 -B 3 "cancellation\|abort.*pending" packages/core/src/core/turn.test.ts

# Check for comprehensive failure paths
grep -n "should.*fail\|should.*error\|should.*abort" packages/core/src/core/turn.test.ts
```

### 6. Integration Points Verification
```bash
# Check HistoryService integration test patterns
grep -A 10 -B 5 "pendingHistoryItem\|commitHistoryItem\|abortPendingItem" packages/core/src/core/turn.test.ts

# Verify CoreToolScheduler callback preservation
grep -A 5 -B 5 "CoreToolScheduler.*Integration" packages/core/src/core/turn.test.ts

# Check TurnEmitter event preservation
grep -A 5 -B 5 "TurnEmitter.*Event.*Preservation" packages/core/src/core/turn.test.ts
```

### 7. Test Execution Validation
```bash
# Run tests with verbose output to check for natural failures with stubs
npm test -- --testPathPattern="turn.test.ts" --verbose

# Check for NotYetImplemented expectations (should NOT be present)
grep -n "NotYetImplemented" packages/core/src/core/turn.test.ts && echo "❌ Found NotYetImplemented - should not be in real execution tests" || echo "✅ No NotYetImplemented found"

# Verify test isolation and independence  
npm test -- --testPathPattern="turn.test.ts" --runInBand --verbose
```

## Success Criteria

### ✅ Test Coverage Requirements
1. **Tool Execution Flow Tests Present** - Tests for pending, executing, success, failure, cancelled states
2. **HS-050 Requirement References** - All integration tests reference requirement HS-050
3. **Real Tool Execution Focus** - Tests use actual tool execution, minimal mocking
4. **Error Scenario Coverage** - Tests cover tool execution failures and user cancellations
5. **Multi-tool Scenarios** - Tests handle parallel tool execution correctly

### ✅ Test Structure Requirements
1. **Proper Test Organization** - Tests organized in logical describe blocks
2. **Meaningful Test Names** - Test descriptions clearly explain behavior being verified
3. **Integration Test Sections** - Specific sections for HistoryService integration tests
4. **Callback Preservation Tests** - Tests verify CoreToolScheduler callbacks work correctly
5. **Event System Tests** - Tests verify TurnEmitter events are preserved and enhanced

### ✅ Test Quality Requirements
1. **No NotYetImplemented Patterns** - Tests don't expect or catch NotYetImplemented errors
2. **Natural Failure with Stubs** - Tests fail naturally when run against stub implementation
3. **Real Execution Patterns** - Tests execute actual tools (shell, file operations, etc.)
4. **Proper Error Handling** - Tests verify error propagation and recovery
5. **Comprehensive Scenarios** - Tests cover both success and failure paths

### ✅ Integration Verification Requirements
1. **HistoryService Mock Setup** - Proper mock HistoryService utilities present
2. **Real Tool Helpers** - Utilities for creating actual tool instances for testing
3. **Callback Integration** - Tests verify callback timing and error handling
4. **Event Integration** - Tests verify event emission with history metadata
5. **Performance Considerations** - Tests complete within reasonable time limits

## Expected Test Structure

### Required Test Sections
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

### Required Code Markers
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P25
// @requirement HS-050: Turn.ts integration with CoreToolScheduler
// @requirement HS-011: Tool calls and responses committed atomically
// @requirement HS-012: Abort pending tool calls capability
```

### Mock Utilities Required
```typescript
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

## Failure Recovery

### Common Issues and Solutions

#### 1. Tests Not Discovered
**Issue:** New integration tests not found by test runner
**Recovery:**
```bash
# Clear test cache and retry
npm test -- --clearCache
npm test -- --testPathPattern="turn.test.ts" --listTests

# Check file syntax
npm test -- --testPathPattern="turn.test.ts" --dry-run --verbose

# Verify test file structure
grep -n "describe\|test\|it" packages/core/src/core/turn.test.ts
```

#### 2. Missing Requirement References
**Issue:** HS-050 or other requirements not referenced
**Recovery:**
```bash
# Add requirement markers to test file
# Ensure @requirement comments are present in relevant test sections
# Verify plan phase markers are included

# Pattern to add:
# // @plan PLAN-20250128-HISTORYSERVICE.P25
# // @requirement HS-050
```

#### 3. Mock-Heavy Implementation
**Issue:** Tests rely too heavily on mocks instead of real execution
**Recovery:**
```bash
# Identify mock patterns
grep -n "mock\|Mock" packages/core/src/core/turn.test.ts

# Replace mocks with real tool execution where appropriate
# Focus on integration scenarios using actual tools
# Keep mocks only for HistoryService dependency
```

#### 4. Tests Don't Fail Naturally
**Issue:** Tests pass even with stub implementations
**Recovery:**
```bash
# Run tests against stub implementation - they should fail
npm test -- --testPathPattern="turn.test.ts" --verbose

# If tests pass incorrectly:
# - Make tests more specific about expected behavior
# - Remove NotYetImplemented catching patterns
# - Ensure tests verify actual integration points
```

#### 5. Missing Error/Cancellation Scenarios
**Issue:** Error and cancellation paths not adequately tested
**Recovery:**
```bash
# Add specific error scenario tests
# Include user cancellation simulation
# Test tool execution failures
# Verify history rollback on errors

# Check current error test coverage:
grep -A 5 -B 5 "error\|fail\|cancel\|abort" packages/core/src/core/turn.test.ts
```

## Verification Scripts

### Comprehensive Verification Script
```bash
#!/bin/bash
echo "=== Turn.ts Integration TDD Verification ==="

# 1. Check test file exists
if [ ! -f "packages/core/src/core/turn.test.ts" ]; then
    echo "❌ turn.test.ts not found"
    exit 1
fi

# 2. Check requirement references
if ! grep -q "HS-050" packages/core/src/core/turn.test.ts; then
    echo "❌ HS-050 requirement reference not found"
    exit 1
fi

# 3. Check for real tool execution patterns
if ! grep -q -i "real.*tool\|actual.*tool" packages/core/src/core/turn.test.ts; then
    echo "❌ Real tool execution tests not found"
    exit 1
fi

# 4. Check for integration test sections
if ! grep -q "HistoryService Integration" packages/core/src/core/turn.test.ts; then
    echo "❌ HistoryService integration test section not found"
    exit 1
fi

# 5. Check for error scenario coverage
if ! grep -q -i "error.*handling\|abort.*pending" packages/core/src/core/turn.test.ts; then
    echo "❌ Error and cancellation scenario tests not found"
    exit 1
fi

# 6. Verify no NotYetImplemented patterns
if grep -q "NotYetImplemented" packages/core/src/core/turn.test.ts; then
    echo "❌ Found NotYetImplemented patterns - should not be in real execution tests"
    exit 1
fi

# 7. Check test structure
cd packages/core
if ! npm test -- --testPathPattern="turn.test.ts" --dry-run --verbose > /dev/null 2>&1; then
    echo "❌ Test structure validation failed"
    exit 1
fi

echo "✅ All TDD verification checks passed"
```

### Test Coverage Analysis Script
```bash
#!/bin/bash
echo "=== Turn.ts TDD Test Coverage Analysis ==="

# Count test sections
echo "Test sections found:"
grep -c "describe(" packages/core/src/core/turn.test.ts

# Count individual tests
echo "Individual tests found:"
grep -c "test(\|it(" packages/core/src/core/turn.test.ts

# Check specific integration patterns
echo "Integration test patterns:"
grep -c "HistoryService.*Integration\|Tool.*Execution.*Flow\|Error.*Handling" packages/core/src/core/turn.test.ts

# Real execution coverage
echo "Real tool execution tests:"
grep -c -i "real.*tool\|actual.*tool\|shell.*tool\|file.*tool" packages/core/src/core/turn.test.ts

# Error scenario coverage
echo "Error/cancellation tests:"
grep -c -i "error\|fail\|cancel\|abort" packages/core/src/core/turn.test.ts
```

## Next Steps

Upon successful verification:
1. **Proceed to Phase 25 Implementation:** Turn.ts Integration Implementation
2. **Document test patterns** established for future integration phases
3. **Update integration testing guidelines** based on discovered patterns
4. **Prepare for implementation phase** with confidence in test coverage

Upon failure:
1. **Address specific verification failures** using recovery procedures
2. **Re-implement missing test sections** according to Phase 25 specification
3. **Re-run verification** after corrections
4. **Consider Phase 25 TDD re-execution** if fundamental issues found

## Notes

- Tests should fail naturally when run against stub implementation - this proves they're testing real integration
- Focus on real tool execution scenarios, not just mock interactions
- Requirement HS-050 must be explicitly referenced in integration tests
- Error and cancellation scenarios are critical for robust history service integration
- Tests should demonstrate that HistoryService integration doesn't break existing Turn functionality
- Comprehensive coverage includes both success and failure paths for all tool execution flows