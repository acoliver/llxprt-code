# Event System Architecture Fix - Implementation Guide

## Summary of the Problem
The current event system implementation is a mess with multiple conflicting patterns, duplicate event types, and inconsistent APIs. Tests expect one pattern while the implementation provides another.

## The ONE Correct Event System Design

### Event Access Pattern
**ONLY ONE WAY** to access events - directly on HistoryService:
```typescript
historyService.on('event:name', listener);
historyService.off('event:name', listener);
historyService.once('event:name', listener);
```

**NO** `eventManager` property  
**NO** EventManager class  
**NO** access to raw EventEmitter

### Event Names
**ONLY THESE** event names (using colon separator for clarity):
- `'message:added'` - When a message is added
- `'message:updated'` - When a message is updated
- `'message:deleted'` - When a message is deleted
- `'history:cleared'` - When history is cleared
- `'state:changed'` - When state transitions
- `'tool:completed'` - When tool execution completes

**NO** HistoryEventType enum  
**NO** SimpleHistoryEventType enum  
**NO** duplicate event names

### Event Payloads
**SIMPLE** data objects passed directly:
```typescript
// message:added
{ message: Message }

// message:updated
{ oldMessage: Message, newMessage: Message }

// message:deleted
{ message: Message }

// history:cleared
{ count: number }

// state:changed
{ fromState: HistoryState, toState: HistoryState, context?: string }

// tool:completed
{ toolCall: ToolCall, toolResponse: ToolResponse }
```

**NO** EventRecord wrapper  
**NO** complex metadata objects  
**NO** unnecessary nesting

## Required Changes to Fix Current Implementation

### 1. Update HistoryService.ts

#### Remove:
- The hack that creates `this.eventManager = this.eventEmitter`
- All references to SimpleHistoryEventType enum
- All references to HistoryEventType enum
- The complex EventRecord-style emissions
- Duplicate event emissions (should emit only ONE event per action)

#### Update Event Emission Methods:
```typescript
// REPLACE current complex emissions with simple ones:
private emitMessageAdded(message: Message): void {
  this.eventEmitter.emit('message:added', { message });
}

private emitMessageUpdated(oldMessage: Message, newMessage: Message): void {
  this.eventEmitter.emit('message:updated', { oldMessage, newMessage });
}

private emitMessageDeleted(message: Message): void {
  this.eventEmitter.emit('message:deleted', { message });
}

private emitHistoryCleared(count: number): void {
  this.eventEmitter.emit('history:cleared', { count });
}

private emitStateChanged(fromState: HistoryState, toState: HistoryState, context?: string): void {
  this.eventEmitter.emit('state:changed', { fromState, toState, context });
}

private emitToolCompleted(toolCall: ToolCall, toolResponse: ToolResponse): void {
  this.eventEmitter.emit('tool:completed', { toolCall, toolResponse });
}
```

#### Keep/Add Public Event Methods:
```typescript
public on(eventName: string, listener: (...args: any[]) => void): void {
  this.eventEmitter.on(eventName, listener);
}

public off(eventName: string, listener: (...args: any[]) => void): void {
  this.eventEmitter.off(eventName, listener);
}

public once(eventName: string, listener: (...args: any[]) => void): void {
  this.eventEmitter.once(eventName, listener);
}
```

### 2. Update types.ts

#### Remove:
- `HistoryEventType` enum (all of it)
- `SimpleHistoryEventType` enum (all of it)
- `EventMetadata` interface (if only used for events)
- `EventRecord` interface
- `EventListener` type (if it expects EventRecord)

### 3. Update index.ts

#### Remove:
```typescript
// REMOVE this line - EventManager doesn't exist
export { EventManager } from './EventManager.js';
```

### 4. Update ALL Tests

#### Change all test event subscriptions from:
```typescript
historyService.eventManager.on('entryAdded', listener);
```

#### To:
```typescript
historyService.on('message:added', listener);
```

#### Update event names in tests:
- `'entryAdded'` → `'message:added'`
- `'entryUpdated'` → `'message:updated'`
- `'entryRemoved'` → `'message:deleted'`
- `'historyCleared'` → `'history:cleared'`
- `'stateUpdated'` → `'state:changed'`
- `'toolCommitted'` → `'tool:completed'`

#### Update event payload expectations:
Tests should expect the simple payloads described above, not complex nested structures.

### 5. Verification Steps

After making changes:

1. **Check no EventManager references remain:**
   ```bash
   grep -r "EventManager" src/services/history/
   grep -r "eventManager" src/services/history/
   ```

2. **Check no enum usage remains:**
   ```bash
   grep -r "HistoryEventType\." src/services/history/
   grep -r "SimpleHistoryEventType\." src/services/history/
   ```

3. **Run tests to verify:**
   ```bash
   npm test -- --testNamePattern="event"
   ```

## Benefits of This Design

1. **Simplicity**: One way to do things, no confusion
2. **Consistency**: All events follow the same pattern
3. **Testability**: Simple API is easy to test
4. **Maintainability**: Less code, fewer abstractions
5. **Performance**: Direct EventEmitter usage, no overhead
6. **Clarity**: Event names clearly indicate what happened

## Migration Strategy

1. **Phase 1**: Update HistoryService implementation
   - Add new simple emission methods
   - Add public on/off/once methods
   - Keep old emissions temporarily for backward compatibility

2. **Phase 2**: Update all tests
   - Change from eventManager.on to direct on
   - Update event names
   - Update payload expectations

3. **Phase 3**: Clean up
   - Remove old event emissions
   - Remove unused types and enums
   - Remove EventManager export

4. **Phase 4**: Verify
   - Run all tests
   - Check for any remaining old patterns
   - Update documentation

## DO NOT:
- Create an EventManager class
- Add an eventManager property
- Use multiple event naming schemes
- Create complex EventRecord types
- Emit the same logical event with multiple names
- Make the API more complex than needed

## DO:
- Keep it simple
- Use one consistent pattern
- Make the right thing easy
- Make the wrong thing impossible
- Focus on what developers actually need