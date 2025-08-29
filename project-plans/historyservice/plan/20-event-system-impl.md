# Phase 20: Event System Implementation

## Phase Information
- **Phase ID**: PLAN-20250128-HISTORYSERVICE.P20
- **Prerequisites**: Phase 19a (Event System TDD Verification) must pass completely
- **Type**: Implementation
- **Requirements Coverage**: HS-026 to HS-029
- **Target**: Existing HistoryService.ts

## Overview
Implementation phase for the simplified event system functionality to make all Phase 19 tests pass. This phase adds event emission capabilities directly to the existing HistoryService class, implementing the 4 core events, subscription management with proper cleanup, and error handling in event listeners.

## Implementation Tasks

### Task 1: Event System Setup in HistoryService
**Target**: `/src/services/history/HistoryService.ts`
**Pseudocode Reference**: Lines 10-24 from `analysis/pseudocode/event-system.md`

Add event emission capabilities directly to existing HistoryService class:

```typescript
// MARKER: HS-026-MESSAGE-EVENTS
// MARKER: BEHAVIORAL-EVENT-TESTS
import { EventEmitter } from 'events';

// Add to HistoryService class properties (after line 13):
private eventEmitter: EventEmitter = new EventEmitter();

// Update constructor to initialize event system (after line 20):
// Event system is ready to use
```

**Code Markers Required**:
- `MARKER: HS-026-MESSAGE-EVENTS`
- `MARKER: BEHAVIORAL-EVENT-TESTS`

### Task 2: Core Event Methods Implementation
**Target**: `/src/services/history/HistoryService.ts`
**Pseudocode Reference**: Lines 26-54 (emit), Lines 56-69 (addEventListener), Lines 71-84 (removeEventListener)

Implement the core event methods:

```typescript
// MARKER: HS-027-STATE-EVENTS
// MARKER: EVENT-LISTENER-LIFECYCLE
private emit(eventType: string, eventData: any, metadata?: EventMetadata): void {
  // Emit event using EventEmitter
  this.eventEmitter.emit(eventType, { type: eventType, data: eventData, metadata, timestamp: Date.now() });
}

on(eventType: string, listener: Function): void {
  // Add listener using EventEmitter
  this.eventEmitter.on(eventType, listener);
}

off(eventType: string, listener: Function): void {
  // Remove listener using EventEmitter
  this.eventEmitter.off(eventType, listener);
}
```

**Code Markers Required**:
- `MARKER: HS-027-STATE-EVENTS`
- `MARKER: EVENT-LISTENER-LIFECYCLE`

### Task 3: Core Event Emission Methods
**Target**: `/src/services/history/HistoryService.ts`

Implement the 4 core event emission methods:

```typescript
// MARKER: HS-028-TOOL-EVENTS
private emitMessageAdded(message: Message, metadata?: EventMetadata): void {
  this.emit(HistoryEventType.MESSAGE_ADDED, { message }, metadata);
}

private emitStateChanged(fromState: ConversationState, toState: ConversationState, metadata?: EventMetadata): void {
  this.emit(HistoryEventType.STATE_CHANGED, { fromState, toState }, metadata);
}

private emitToolExecutionCompleted(completedPairs: Array<{call: ToolCall, response: ToolResponse}>, metadata?: EventMetadata): void {
  this.emit(HistoryEventType.TOOL_EXECUTION_COMPLETED, { completedPairs }, metadata);
}

private emitHistoryCleared(clearedCount: number, metadata?: EventMetadata): void {
  this.emit(HistoryEventType.HISTORY_CLEARED, { clearedCount }, metadata);
}
```

**Code Markers Required**:
- `MARKER: HS-028-TOOL-EVENTS`

### Task 4: Event Integration into Existing Methods
**Target**: `/src/services/history/HistoryService.ts`
**Requirements**: HS-026, HS-027, HS-028, HS-029

Update existing history modification methods to emit appropriate events:

```typescript
// In addMessage method:
this.emitMessageAdded(newMessage);

// In state transition methods:
this.emitStateChanged(previousState, newState);

// In commitToolResponses method:
this.emitToolExecutionCompleted(completedPairs);

// In clearHistory method:
this.emitHistoryCleared(clearedCount);
```

**Code Markers Required**:
- `MARKER: HS-029-EVENT-SUBSCRIPTION`
- `MARKER: EVENT-INTEGRATION-SCENARIOS`




### Task 5: Type Definitions
**Target**: `/src/services/history/types.ts`

Add simplified type definitions:

```typescript
export enum HistoryEventType {
  MESSAGE_ADDED = 'MessageAdded',
  STATE_CHANGED = 'StateChanged',
  TOOL_EXECUTION_COMPLETED = 'ToolExecutionCompleted',
  HISTORY_CLEARED = 'HistoryCleared'
}

export interface EventMetadata {
  conversationId?: string;
  source?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface EventRecord {
  type: string;
  data: any;
  timestamp: number;
  metadata?: EventMetadata;
}
```

## Success Criteria

### Test Execution Requirements
✅ **All Phase 19 tests must pass**
- Run: `npm test -- --testNamePattern="event" --verbose`
- All event system tests should pass without modification
- No test failures related to event functionality
- Proper event data validation in all tests

✅ **Behavioral requirements met**
- MESSAGE_ADDED events emitted for all message additions (HS-026)
- STATE_CHANGED events work correctly (HS-027) 
- TOOL_EXECUTION_COMPLETED events function properly (HS-028)
- HISTORY_CLEARED events emitted when clearing (HS-026)
- Event subscription (on/off) operates correctly (HS-029)

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
- Add comprehensive JSDoc comments for all new public methods
- Include pseudocode line references in comments

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
- All new methods must be compatible with existing test structure
- Event emissions should be observable and testable
- Mock-friendly design for event emitter functionality
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
grep -r "MARKER: BEHAVIORAL-EVENT-TESTS" src/services/history/
grep -r "MARKER: EVENT-" src/services/history/
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

- This phase implements a simplified event system with only 4 essential events
- Event emission is built directly into HistoryService, not a separate EventManager
- Uses Node.js EventEmitter for proven, simple event handling
- Focuses on critical events that solve real problems (orphaned tools, state tracking)
- Proper cleanup and error handling are critical for production stability