# DEPRECATED - UNNECESSARY HALLUCINATION

## THIS PHASE WAS REMOVED - EVENTS WERE NEVER NEEDED

The event system was completely unnecessary overengineering for imaginary future requirements that never materialized. NO production code uses the events - only tests subscribe to them. Orphan tool prevention works perfectly through direct validation in `commitToolResponses()` without needing any events.

See `EVENTS-WERE-UNNECESSARY.md` for full explanation.

---

# ~~Phase 20: Event System Implementation~~ [DEPRECATED]

## Phase Information
- **Phase ID**: PLAN-20250128-HISTORYSERVICE.P20
- **Prerequisites**: Phase 19a (Event System TDD Verification) must pass completely
- **Type**: Implementation
- **Requirements Coverage**: HS-026 to HS-029
- **Target**: Existing HistoryService.ts

## Overview
Implementation phase for the SIMPLIFIED event system. This phase implements a clean, consistent event API directly on HistoryService with ONE set of event names and ONE way to access events.

## CRITICAL: Implementation Approach
**NO EventManager CLASS**: Events are built directly into HistoryService using Node.js EventEmitter internally.
**NO eventManager PROPERTY**: All event methods are directly on HistoryService instance.
**ONE SET OF EVENT NAMES**: Use ONLY these simple event names:
- `'message:added'`
- `'message:updated'`
- `'message:deleted'`
- `'history:cleared'`
- `'state:changed'`
- `'tool:completed'`

**SIMPLE EVENT DATA**: Pass event data directly, no complex EventRecord wrappers.

## Implementation Tasks

### Task 1: Event System Setup in HistoryService
**Target**: `/src/services/history/HistoryService.ts`

Add event emission capabilities directly to existing HistoryService class:

```typescript
import { EventEmitter } from 'events';

// Add to HistoryService class properties:
private eventEmitter: EventEmitter;

// In constructor:
constructor(conversationId: string) {
  // ... existing validation ...
  
  // Initialize event system
  this.eventEmitter = new EventEmitter();
  this.eventEmitter.setMaxListeners(50); // Reasonable limit for tests
  
  // ... rest of constructor ...
}
```

**Important**: 
- NO eventManager property - events are accessed directly via HistoryService methods
- NO EventManager class import or usage
- Simple EventEmitter setup

### Task 2: Core Event Methods Implementation
**Target**: `/src/services/history/HistoryService.ts`

Implement the PUBLIC event subscription methods directly on HistoryService:

```typescript
// MARKER: HS-029-EVENT-SUBSCRIPTION
/**
 * Subscribe to an event
 * @param eventName The event name ('message:added', 'state:changed', etc.)
 * @param listener The callback function
 */
public on(eventName: string, listener: (...args: any[]) => void): void {
  this.eventEmitter.on(eventName, listener);
}

/**
 * Unsubscribe from an event
 * @param eventName The event name
 * @param listener The callback function to remove
 */
public off(eventName: string, listener: (...args: any[]) => void): void {
  this.eventEmitter.off(eventName, listener);
}

/**
 * Subscribe to an event once
 * @param eventName The event name
 * @param listener The callback function
 */
public once(eventName: string, listener: (...args: any[]) => void): void {
  this.eventEmitter.once(eventName, listener);
}
```

**Important**:
- These are PUBLIC methods directly on HistoryService
- Simple function signatures - no complex types
- Direct pass-through to EventEmitter

### Task 3: Private Event Emission Helpers
**Target**: `/src/services/history/HistoryService.ts`

Implement private helper methods for emitting events with consistent structure:

```typescript
// MARKER: HS-026-MESSAGE-EVENTS
private emitMessageAdded(message: Message): void {
  this.eventEmitter.emit('message:added', { message });
}

private emitMessageUpdated(oldMessage: Message, newMessage: Message): void {
  this.eventEmitter.emit('message:updated', { oldMessage, newMessage });
}

private emitMessageDeleted(message: Message): void {
  this.eventEmitter.emit('message:deleted', { message });
}

// MARKER: HS-026-MESSAGE-EVENTS
private emitHistoryCleared(count: number): void {
  this.eventEmitter.emit('history:cleared', { count });
}

// MARKER: HS-027-STATE-EVENTS
private emitStateChanged(fromState: HistoryState, toState: HistoryState, context?: string): void {
  this.eventEmitter.emit('state:changed', { fromState, toState, context });
}

// MARKER: HS-028-TOOL-EVENTS
private emitToolCompleted(toolCall: ToolCall, toolResponse: ToolResponse): void {
  this.eventEmitter.emit('tool:completed', { toolCall, toolResponse });
}
```

**Important**:
- Simple event names with colon separator
- Direct data objects, no wrapper
- Clean, minimal payloads

### Task 4: Event Integration into Existing Methods
**Target**: `/src/services/history/HistoryService.ts`

Update existing methods to emit the appropriate events:

```typescript
// In addMessage method:
const message: Message = {
  // ... create message ...
};
this.messages.push(message);
this.emitMessageAdded(message);
return message.id;

// In updateMessage method:
const oldMessage = { ...this.messages[messageIndex] };
// ... perform update ...
this.messages[messageIndex] = updatedMessage;
this.emitMessageUpdated(oldMessage, updatedMessage);

// In deleteMessage method:
const message = this.messages[messageIndex];
this.messages.splice(messageIndex, 1);
this.emitMessageDeleted(message);

// In clearHistory method:
const count = this.messages.length;
this.messages = [];
// ... clear other state ...
this.emitHistoryCleared(count);

// In transitionTo method (state management):
const fromState = this.currentState;
// ... perform transition ...
this.currentState = toState;
this.emitStateChanged(fromState, toState, context);

// In commitToolResponses method:
for (const response of toolResponses) {
  const toolCall = this.pendingToolCalls.get(response.id);
  if (toolCall) {
    this.emitToolCompleted(toolCall, response);
  }
}
```




### Task 5: Clean Up Type Definitions
**Target**: `/src/services/history/types.ts`

REMOVE all unnecessary event type definitions. We only need:

```typescript
// REMOVE these enums - we don't need them:
// - HistoryEventType
// - SimpleHistoryEventType

// REMOVE these interfaces - we don't need them:
// - EventMetadata (if only used for events)
// - EventRecord
// - EventListener (if it expects EventRecord)

// Keep only what's needed for core functionality
```

**Target**: `/src/services/history/index.ts`

REMOVE the EventManager export:

```typescript
// REMOVE this line:
// export { EventManager } from './EventManager.js';

// The file should NOT export EventManager since it doesn't exist
```

## Success Criteria

### Test Execution Requirements
✅ **All Phase 19 tests must pass**
- Run: `npm test -- --testNamePattern="event" --verbose`
- All event system tests should pass without modification
- No test failures related to event functionality
- Proper event data validation in all tests

✅ **Behavioral requirements met**
- `'message:added'` events emitted for all message additions (HS-026)
- `'message:updated'` events emitted for message updates (HS-026)
- `'message:deleted'` events emitted for message deletions (HS-026)
- `'history:cleared'` events emitted when clearing (HS-026)
- `'state:changed'` events work correctly (HS-027) 
- `'tool:completed'` events function properly (HS-028)
- Event subscription (`on`/`off`/`once`) operates correctly (HS-029)

### Integration Requirements
✅ **Existing functionality preserved**
- All existing HistoryService methods continue to work
- No breaking changes to public API
- Event emissions don't interfere with core operations
- Memory usage remains acceptable

✅ **Error handling robust**
- Event listener errors don't crash the service
- Invalid event types handled gracefully
- Subscription cleanup prevents memory leaks
- EventEmitter manages listener limits

### Code Quality Standards
✅ **Required markers present**
- All requirement markers (HS-026 to HS-029) in place
- All category markers properly positioned
- Implementation follows pseudocode line references
- Proper TypeScript typing throughout

## Implementation Guidelines

### Code Style
- Follow existing HistoryService patterns and naming conventions
- Use proper TypeScript types for all parameters and return values
- Add comprehensive JSDoc comments for all PUBLIC event methods (`on`, `off`, `once`)
- Keep event names consistent with colon separator pattern

### Error Handling
- Validate all inputs thoroughly before processing
- Use try-catch blocks for event listener execution
- Log errors appropriately without exposing sensitive data
- Ensure partial failures don't corrupt the event system

### Performance Considerations
- Minimize memory allocation during frequent event emissions
- Implement efficient listener lookup and notification
- Use appropriate data structures for event storage
- Consider batching for high-frequency events

### Testing Integration
- Tests access events DIRECTLY via `historyService.on()`, NOT `historyService.eventManager.on()`
- Event names in tests must match implementation exactly
- Simple event payloads that tests can easily verify
- Support for test cleanup and isolation

## Verification Commands

```bash
# Kill any running vitest instances
ps -ef | grep -i vitest | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Run specific event system tests
npm test -- --testNamePattern="event" --verbose

# Run all tests to verify no regressions
npm test

# Kill vitest instances after testing
ps -ef | grep -i vitest | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Verify implementation completeness
grep -r "MARKER: HS-02[6-9]" src/services/history/

# Verify NO EventManager references remain
grep -r "EventManager" src/services/history/ # Should only appear in comments about what NOT to do
grep -r "eventManager" src/services/history/ # Should NOT appear as a property
```

## Post-Implementation Tasks

### Documentation Updates
1. Update HistoryService class documentation to include event system
2. Add event usage examples to technical documentation
3. Document event types and payload structures
4. Update integration guides for event subscribers

### Integration Preparation
1. Verify compatibility with existing GeminiChat integration
2. Test event system with Turn class operations
3. Validate integration with tool execution workflows
4. Ensure proper cleanup in application shutdown

### Performance Validation
1. Test event system under high message volume
2. Verify memory usage patterns with large event history
3. Validate event emission performance impact
4. Test concurrent event subscription scenarios

## Notes

- This phase implements a SIMPLE event system with consistent naming
- Event methods are PUBLIC and directly on HistoryService (no eventManager property)
- Uses Node.js EventEmitter internally but exposes a clean API
- Event names use colon separator for clarity: 'message:added', 'state:changed', etc.
- NO EventManager class, NO eventManager property, NO complex EventRecord types
- Focus on simplicity, consistency, and ease of use