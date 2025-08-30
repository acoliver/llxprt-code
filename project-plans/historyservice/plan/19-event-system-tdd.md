# DEPRECATED - UNNECESSARY HALLUCINATION

## THIS PHASE WAS REMOVED - EVENTS WERE NEVER NEEDED

The event system was completely unnecessary overengineering for imaginary future requirements that never materialized. NO production code uses the events - only tests subscribe to them. Orphan tool prevention works perfectly through direct validation in `commitToolResponses()` without needing any events.

See `EVENTS-WERE-UNNECESSARY.md` for full explanation.

---

# ~~Phase 19: Event System TDD~~ [DEPRECATED]

## Phase Information
- **Phase ID**: PLAN-20250128-HISTORYSERVICE.P19
- **Prerequisites**: ~~Phase 18a (Event System - Base) must pass~~ **[N/A - PHASE REMOVED]**
- **Type**: ~~Test-Driven Development~~ **[DEPRECATED]**
- **Requirements Coverage**: ~~HS-026 to HS-029~~ **[REMOVED - HALLUCINATED REQUIREMENTS]**

## ~~Overview~~ [DEPRECATED]
~~Create comprehensive behavioral tests for the SIMPLIFIED event system.~~ **[REMOVED: Events were unnecessary complexity]** The event system uses a single, consistent API with clear event names and no unnecessary complexity.

## CRITICAL: Event System Design
**ONE WAY TO ACCESS EVENTS**: All event methods are directly on HistoryService:
- `historyService.on(eventName, listener)` - Subscribe to events
- `historyService.off(eventName, listener)` - Unsubscribe from events
- `historyService.once(eventName, listener)` - One-time subscription

**ONE SET OF EVENT NAMES**: Use simple, descriptive event names:
- `'message:added'` - When a message is added
- `'message:updated'` - When a message is updated  
- `'message:deleted'` - When a message is deleted
- `'history:cleared'` - When history is cleared
- `'state:changed'` - When state transitions
- `'tool:completed'` - When tool execution completes

**NO SEPARATE EventManager CLASS**: Events are built directly into HistoryService.
**NO DUPLICATE EVENT TYPES**: Just the simple string names above.
**NO COMPLEX EVENT RECORDS**: Event data is passed directly as simple objects.

## Requirements Mapping
- **HS-026**: Event emission on history modifications (add, remove, clear)
- **HS-027**: Turn completion events
- **HS-028**: Tool commit events  
- **HS-029**: Event subscription/unsubscription management

## Test Creation Tasks

### Task 1: History Modification Event Tests (HS-026)
**File**: `src/__tests__/history-events.test.ts`

Create behavioral tests for:
- Event emission when messages are added to history
- Event emission when messages are updated
- Event emission when messages are removed from history
- Event emission when history is cleared
- Event data structure validation
- Multiple listener handling
- Event ordering guarantees

**Test Cases**:
```typescript
// Add message events
- "should emit 'message:added' event when adding single message"
- "should emit 'message:added' event when adding multiple messages"
- "should include correct message data in event payload"
- "should emit events in correct order for batch operations"

// Update message events
- "should emit 'message:updated' event when updating a message"
- "should include both old and new message in update event"

// Remove message events  
- "should emit 'message:deleted' event when removing single message"
- "should emit 'message:deleted' event when removing multiple messages"
- "should include removed message data in event payload"

// Clear history events
- "should emit 'history:cleared' event when clearing all messages"
- "should include previous message count in clear event payload"

// Multiple listeners
- "should notify all registered listeners for history events"
- "should handle listener removal during event emission"
```

**Event API Usage in Tests**:
```typescript
// CORRECT way to subscribe to events in tests:
const listener = vi.fn();
historyService.on('message:added', listener);

// CORRECT way to unsubscribe:
historyService.off('message:added', listener);

// Event payload structure for message:added:
{
  message: Message // The complete message object
}

// Event payload structure for message:updated:
{
  oldMessage: Message,
  newMessage: Message
}

// Event payload structure for message:deleted:
{
  message: Message
}

// Event payload structure for history:cleared:
{
  count: number // Number of messages cleared
}
```

### Task 2: State Change Event Tests (HS-027)
**File**: `src/__tests__/state-change-events.test.ts`

Create behavioral tests for:
- State transition event emission
- Event payload validation (from/to states)
- Integration with history service operations
- State history tracking

**Test Cases**:
```typescript
- "should emit 'state:changed' event when state transitions"
- "should include from and to states in event payload"
- "should emit state change when adding model messages"
- "should emit state change when executing tools"
- "should track state history correctly"
- "should handle invalid state transitions gracefully"
```

**Event API Usage**:
```typescript
// Event payload structure for state:changed:
{
  fromState: HistoryState,
  toState: HistoryState,
  context?: string // Optional context about why the transition occurred
}
```

### Task 3: Tool Completion Event Tests (HS-028)
**File**: `src/__tests__/tool-completion-events.test.ts`

Create behavioral tests for:
- Tool completion event emission
- Event payload with tool execution data
- Batch tool completion handling
- Integration with tool management

**Test Cases**:
```typescript
- "should emit 'tool:completed' event when tool execution completes"
- "should include tool call and response in event payload"
- "should emit events for batch tool completions"
- "should maintain event order for sequential tool completions"
- "should handle tool execution failures in events"
```

**Event API Usage**:
```typescript
// Event payload structure for tool:completed:
{
  toolCall: ToolCall,
  toolResponse: ToolResponse
}
```

### Task 4: Event Subscription Management Tests (HS-029)
**File**: `src/__tests__/event-subscription.test.ts`

Create behavioral tests for:
- Event listener registration/unregistration using `on()` and `off()`
- One-time listeners using `once()`
- Listener lifecycle management
- Memory leak prevention
- Error handling in listeners

**Test Cases**:
```typescript
- "should register event listeners with on() successfully"
- "should unregister event listeners with off() successfully"
- "should prevent memory leaks from orphaned listeners"
- "should handle errors in event listeners gracefully"
- "should support multiple listeners for same event type"
- "should allow listener removal during event emission"
- "should validate listener function types"
- "should support once() for one-time event listeners"
```

**API Usage Examples**:
```typescript
// Register a listener
historyService.on('message:added', myListener);

// Remove a listener
historyService.off('message:added', myListener);

// One-time listener
historyService.once('history:cleared', oneTimeListener);

// Multiple listeners for same event
historyService.on('state:changed', listener1);
historyService.on('state:changed', listener2);
```

### Task 5: Event System Integration Tests
**File**: `src/__tests__/event-system-integration.test.ts`

Create behavioral tests for:
- End-to-end event flow scenarios
- Event system performance under load
- Cross-operation event sequences
- Error propagation and recovery

**Test Cases**:
```typescript
- "should handle complete conversation lifecycle events"
- "should maintain event order across multiple operations"
- "should handle high-frequency event emissions"
- "should recover from listener errors without breaking system"
- "should emit correct sequence: message:added -> state:changed -> tool:completed"
```

**Complete Event Flow Example**:
```typescript
const events: string[] = [];
historyService.on('message:added', () => events.push('message:added'));
historyService.on('state:changed', () => events.push('state:changed'));
historyService.on('tool:completed', () => events.push('tool:completed'));

// Operations trigger events in correct order
historyService.addMessage('test', 'user');
// Expect: ['message:added']

historyService.transitionTo(HistoryState.TOOLS_EXECUTING);
// Expect: ['message:added', 'state:changed']
```

## Implementation Requirements

### Test Structure
All tests must:
- Use `describe` blocks for logical grouping
- Include `beforeEach`/`afterEach` for test isolation
- Mock external dependencies appropriately
- Validate actual event data structures
- Use the DIRECT event API on HistoryService (no eventManager property)
- Use ONLY the simple event names listed above

### Event Data Validation
Tests must verify:
- Event payload structure matches specifications
- Data passed directly (no wrapper EventRecord)
- Simple, flat event payload objects
- Required fields are present
- No unnecessary complexity

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
- [ ] Message events fully tested using `on('message:added', ...)` etc. (HS-026)
- [ ] State change events fully tested using `on('state:changed', ...)` (HS-027)  
- [ ] Tool completion events fully tested using `on('tool:completed', ...)` (HS-028)
- [ ] Event subscription management fully tested with `on()`, `off()`, `once()` (HS-029)
- [ ] Integration scenarios covered
- [ ] Edge cases and error handling tested
- [ ] Performance and memory usage considerations tested
- [ ] All code markers present
- [ ] ALL tests use direct HistoryService event methods (NO eventManager property)

## Next Phase
Phase 20: Event System Implementation - implement the actual event system to make these tests pass.

## Notes
- Tests must use ONLY the direct event API: `historyService.on()`, `historyService.off()`, `historyService.once()`
- Tests must use ONLY the simple event names: 'message:added', 'message:updated', 'message:deleted', 'history:cleared', 'state:changed', 'tool:completed'
- NO EventManager class or eventManager property
- NO complex EventRecord types - just simple event data objects
- Focus on simplicity and consistency