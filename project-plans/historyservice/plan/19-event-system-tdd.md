# Phase 19: Event System TDD

## Phase Information
- **Phase ID**: PLAN-20250128-HISTORYSERVICE.P19
- **Prerequisites**: Phase 18a (Event System - Base) must pass
- **Type**: Test-Driven Development
- **Requirements Coverage**: HS-026 to HS-029

## Overview
Create comprehensive behavioral tests for the event system before implementation. Tests must validate real behavior with actual event data and cover edge cases for production readiness.

## Requirements Mapping
- **HS-026**: Event emission on history modifications (add, remove, clear)
- **HS-027**: Turn completion events
- **HS-028**: Tool commit events  
- **HS-029**: Event subscription/unsubscription management

## Test Creation Tasks

### Task 1: History Modification Event Tests (HS-026)
**File**: `src/__tests__/history-events.test.ts`

Create behavioral tests for:
- Event emission when entries are added to history
- Event emission when entries are removed from history
- Event emission when history is cleared
- Event data structure validation
- Multiple listener handling
- Event ordering guarantees

**Test Cases**:
```typescript
// Add entry events
- "should emit 'entryAdded' event when adding single entry"
- "should emit 'entryAdded' event when adding multiple entries"
- "should include correct entry data in event payload"
- "should emit events in correct order for batch operations"

// Remove entry events  
- "should emit 'entryRemoved' event when removing single entry"
- "should emit 'entryRemoved' event when removing multiple entries"
- "should include removed entry data in event payload"

// Clear history events
- "should emit 'historyCleared' event when clearing all entries"
- "should include previous entry count in clear event payload"

// Multiple listeners
- "should notify all registered listeners for history events"
- "should handle listener removal during event emission"
```

### Task 2: Turn Completion Event Tests (HS-027)
**File**: `src/__tests__/turn-completion-events.test.ts`

Create behavioral tests for:
- Turn completion event emission
- Event payload validation (turn data, metrics, timing)
- Integration with history service state
- Error handling during turn completion

**Test Cases**:
```typescript
- "should emit 'turnCompleted' event when turn is finished"
- "should include turn metadata in event payload"
- "should include performance metrics in event payload"
- "should include timing information in event payload"
- "should emit event after history state is updated"
- "should handle turn completion with errors gracefully"
```

### Task 3: Tool Commit Event Tests (HS-028)
**File**: `src/__tests__/tool-commit-events.test.ts`

Create behavioral tests for:
- Tool commit event emission
- Event payload with tool execution data
- Batch tool commit handling
- Integration with turn lifecycle

**Test Cases**:
```typescript
- "should emit 'toolCommitted' event when tool execution completes"
- "should include tool execution results in event payload"
- "should include tool metadata (name, duration, status) in event"
- "should emit events for batch tool commits"
- "should maintain event order for sequential tool commits"
- "should handle tool execution failures in events"
```

### Task 4: Event Subscription Management Tests (HS-029)
**File**: `src/__tests__/event-subscription.test.ts`

Create behavioral tests for:
- Event listener registration/unregistration
- Listener lifecycle management
- Memory leak prevention
- Error handling in listeners

**Test Cases**:
```typescript
- "should register event listeners successfully"
- "should unregister event listeners successfully"
- "should prevent memory leaks from orphaned listeners"
- "should handle errors in event listeners gracefully"
- "should support multiple listeners for same event type"
- "should allow listener removal during event emission"
- "should validate listener function types"
- "should support once-only event listeners"
```

### Task 5: Event System Integration Tests
**File**: `src/__tests__/event-system-integration.test.ts`

Create behavioral tests for:
- End-to-end event flow scenarios
- Event system performance under load
- Cross-component event interactions
- Error propagation and recovery

**Test Cases**:
```typescript
- "should handle complete conversation lifecycle events"
- "should maintain event order across multiple operations"
- "should handle high-frequency event emissions"
- "should recover from listener errors without breaking system"
- "should support event filtering and conditional emission"
```

## Implementation Requirements

### Test Structure
All tests must:
- Use `describe` blocks for logical grouping
- Include `beforeEach`/`afterEach` for test isolation
- Mock external dependencies appropriately
- Validate actual event data structures
- NOT expect `NotYetImplemented` errors

### Event Data Validation
Tests must verify:
- Event payload structure matches specifications
- Timestamp accuracy and format
- Data type correctness
- Required vs optional fields
- Event metadata completeness

### Edge Case Coverage
Tests must handle:
- Rapid successive events
- Listener removal during emission
- Error handling in listeners
- Memory usage with many listeners
- Concurrent event emissions

## Code Markers Required

### Test Files
```typescript
// MARKER: HS-026-MESSAGE-EVENTS
// MARKER: HS-027-STATE-EVENTS  
// MARKER: HS-028-TOOL-EVENTS
// MARKER: HS-029-EVENT-SUBSCRIPTION
```

### Test Categories
```typescript
// MARKER: BEHAVIORAL-EVENT-TESTS
// MARKER: EVENT-PAYLOAD-VALIDATION
// MARKER: EVENT-LISTENER-LIFECYCLE
// MARKER: EVENT-ERROR-HANDLING
// MARKER: EVENT-INTEGRATION-SCENARIOS
```

## Success Criteria

### Phase Completion Requirements
1. **All test files created** with comprehensive test cases
2. **Event payload structures defined** and validated in tests
3. **Edge cases covered** including error scenarios
4. **Integration tests** for end-to-end event flows
5. **Performance considerations** tested (listener limits, memory usage)

### Test Quality Standards
- Each requirement has minimum 5 behavioral test cases
- All tests use realistic event data (no mocks for event payloads)
- Error scenarios explicitly tested
- Memory leak prevention validated
- Concurrent access patterns tested

### Validation Checklist
- [ ] History modification events fully tested (HS-026)
- [ ] Turn completion events fully tested (HS-027)  
- [ ] Tool commit events fully tested (HS-028)
- [ ] Event subscription management fully tested (HS-029)
- [ ] Integration scenarios covered
- [ ] Edge cases and error handling tested
- [ ] Performance and memory usage considerations tested
- [ ] All code markers present
- [ ] Tests reference event-system.md pseudocode appropriately

## Next Phase
Phase 20: Event System Implementation - implement the actual event system to make these tests pass.

## Notes
- Tests must be written to expect real behavior, not placeholder implementations
- Reference the pseudocode from `event-system.md` for expected behavior patterns
- Focus on observable behavior and event data accuracy
- Consider real-world usage patterns in test scenarios