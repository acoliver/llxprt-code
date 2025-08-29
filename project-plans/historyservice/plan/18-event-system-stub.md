# Phase 18: Event System Stub

**Phase ID**: PLAN-20250128-HISTORYSERVICE.P18  
**Prerequisites**: Phase 17a (tool management implementation verification) passed  
**Requirements**: HS-026 to HS-029 (Event System)  

## Overview

This phase implements stub infrastructure for the event system in HistoryService. The event system will enable external components to subscribe to and react to history modifications, turn completions, and tool executions. This stub phase lays the foundation for comprehensive event handling that will be fully implemented in subsequent phases.

## Requirements Coverage

**HS-026**: The HistoryService SHALL emit events when history is modified (add, remove, clear)  
**HS-027**: The HistoryService SHALL emit events when a conversation turn is completed  
**HS-028**: The HistoryService SHALL emit events when tool calls and responses are committed  
**HS-029**: The HistoryService SHALL allow external components to subscribe to history events  

## Implementation Tasks

### 1. EventEmitter Infrastructure Setup
- Add EventEmitter import and initialization to HistoryService
- Create event emission infrastructure with proper error handling
- Implement basic event types enumeration
- Add event metadata structure for comprehensive event data

### 2. History Modification Events (HS-026) Stubs
Create stub methods for history modification events:
- `emitMessageAdded(message: Message, metadata?: EventMetadata): void`
- `emitMessageUpdated(oldMessage: Message, newMessage: Message, metadata?: EventMetadata): void`  
- `emitMessageDeleted(deletedMessage: Message, metadata?: EventMetadata): void`
- `emitHistoryCleared(clearedCount: number, metadata?: EventMetadata): void`
- `emitStateChanged(fromState: ConversationState, toState: ConversationState, metadata?: EventMetadata): void`

### 3. Turn Completion Events (HS-027) Stubs
Create stub methods for conversation turn events:
- `emitTurnStarted(turnId: string, initiator: MessageRole, metadata?: EventMetadata): void`
- `emitTurnCompleted(turnId: string, duration: number, messageCount: number, metadata?: EventMetadata): void`
- `emitTurnAborted(turnId: string, reason: string, metadata?: EventMetadata): void`

### 4. Tool Commit Events (HS-028) Stubs  
Create stub methods for tool execution events:
- `emitToolCallsAdded(toolCalls: ToolCall[], metadata?: EventMetadata): void`
- `emitToolCallsAborted(abortedCalls: ToolCall[], reason: string, metadata?: EventMetadata): void`
- `emitToolResponsesCommitted(responses: ToolResponse[], metadata?: EventMetadata): void`
- `emitToolExecutionCompleted(completedPairs: Array<{call: ToolCall, response: ToolResponse}>, metadata?: EventMetadata): void`

### 5. Event Subscription System (HS-029) Stubs
Create stub methods for event subscription:
- `addEventListener(eventType: string, listener: EventListener): string`
- `removeEventListener(eventType: string, listenerOrId: EventListener | string): boolean`
- `removeAllEventListeners(eventType?: string): number`
- `getEventListeners(eventType: string): EventListener[]`
- `hasEventListeners(eventType: string): boolean`

### 6. EventEmitter Integration
- Add private `eventEmitter: EventEmitter` property to HistoryService constructor
- Initialize event emitter in constructor with proper error handling
- Implement `emit(eventType: string, eventData: any, metadata?: EventMetadata): string` helper method
- Add event emission calls to existing HistoryService methods (addMessage, updateMessage, etc.)

### 7. Event Type Definitions
Add to types.ts:
```typescript
export enum HistoryEventType {
  MESSAGE_ADDED = 'MessageAdded',
  MESSAGE_UPDATED = 'MessageUpdated', 
  MESSAGE_DELETED = 'MessageDeleted',
  HISTORY_CLEARED = 'HistoryCleared',
  STATE_CHANGED = 'StateChanged',
  TURN_STARTED = 'TurnStarted',
  TURN_COMPLETED = 'TurnCompleted', 
  TURN_ABORTED = 'TurnAborted',
  TOOL_CALLS_ADDED = 'ToolCallsAdded',
  TOOL_CALLS_ABORTED = 'ToolCallsAborted',
  TOOL_RESPONSES_COMMITTED = 'ToolResponsesCommitted',
  TOOL_EXECUTION_COMPLETED = 'ToolExecutionCompleted'
}

export interface EventMetadata {
  timestamp?: number;
  source?: string;
  conversationId?: string;
  userId?: string;
  correlationId?: string;
  [key: string]: any;
}

export interface EventRecord {
  id: string;
  type: HistoryEventType | string;
  data: any;
  timestamp: number;
  metadata: EventMetadata;
  source: string;
}

export type EventListener = (event: EventRecord) => void | Promise<void>;
```

## Required Code Markers

All stub implementations MUST include:
```typescript
/**
 * @plan PLAN-20250128-HISTORYSERVICE.P18
 * @phase event-system-stub
 * @requirement HS-XXX
 * @pseudocode event-system.md:XX-YY
 */
```

### Specific Method Markers
- **emitMessageAdded**: `@requirement HS-026` `@pseudocode event-system.md:118-121`
- **emitTurnCompleted**: `@requirement HS-027` `@pseudocode event-system.md:26-54`  
- **emitToolResponsesCommitted**: `@requirement HS-028` `@pseudocode event-system.md:26-54`
- **addEventListener**: `@requirement HS-029` `@pseudocode event-system.md:56-69`
- **removeEventListener**: `@requirement HS-029` `@pseudocode event-system.md:71-84`

## Implementation Guidelines

### 1. Stub Method Pattern
Each stub method should:
```typescript
emitMessageAdded(message: Message, metadata?: EventMetadata): void {
  /**
   * @plan PLAN-20250128-HISTORYSERVICE.P18
   * @phase event-system-stub  
   * @requirement HS-026
   * @pseudocode event-system.md:118-121
   */
  
  // Stub implementation - log event emission
  const eventData = {
    message,
    timestamp: Date.now(),
    conversationId: this.conversationId
  };
  
  const enrichedMetadata = {
    source: 'HistoryService',
    conversationId: this.conversationId,
    timestamp: Date.now(),
    ...metadata
  };
  
  // TODO: Phase 19 - Implement actual event emission
  console.log(`[EVENT-STUB] ${HistoryEventType.MESSAGE_ADDED}:`, eventData, enrichedMetadata);
  
  // Future: this.emit(HistoryEventType.MESSAGE_ADDED, eventData, enrichedMetadata);
}
```

### 2. EventEmitter Integration Pattern
```typescript
private eventEmitter: EventEmitter;

constructor(conversationId: string) {
  /**
   * @plan PLAN-20250128-HISTORYSERVICE.P18
   * @phase event-system-stub
   * @requirement HS-026
   */
  this.conversationId = conversationId;
  // TODO: Phase 19 - Initialize actual EventEmitter
  // this.eventEmitter = new EventEmitter();
  console.log('[EVENT-STUB] EventEmitter initialized for conversation:', conversationId);
}
```

### 3. Event Subscription Stub Pattern
```typescript
addEventListener(eventType: string, listener: EventListener): string {
  /**
   * @plan PLAN-20250128-HISTORYSERVICE.P18
   * @phase event-system-stub
   * @requirement HS-029
   * @pseudocode event-system.md:56-69
   */
  
  // Stub implementation - generate listener ID and log subscription
  const listenerId = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[EVENT-STUB] addEventListener: ${eventType}, listenerId: ${listenerId}`);
  
  // TODO: Phase 19 - Implement actual event listener registration
  // this.eventEmitter.on(eventType, listener);
  
  return listenerId;
}
```

## Success Criteria

### 1. Stub Methods Created
- [x] All 4 core event emission stub methods implemented with proper signatures
- [x] Event subscription methods (on/off/emit) implemented with proper signatures
- [x] EventEmitter property added to HistoryService class
- [x] All methods include required code markers and pseudocode references

### 2. Type Definitions Added
- [x] HistoryEventType enum with 4 essential event types defined
- [x] EventMetadata interface with extensible structure
- [x] EventRecord interface for comprehensive event data
- [x] EventListener type definition for subscription callbacks

### 3. Integration Points Prepared
- [x] EventEmitter import statement added to HistoryService
- [x] EventEmitter property initialized in constructor (stubbed)
- [x] Event emission calls prepared in existing methods (stubbed)
- [x] Metadata enrichment patterns established

### 4. Code Quality Standards
- [x] All stub methods log their invocation with event data
- [x] Consistent parameter validation patterns established
- [x] Error handling infrastructure prepared for actual implementation
- [x] TODO comments mark future implementation points clearly

### 5. TypeScript Compilation
- [x] All new types compile without errors
- [x] EventEmitter import resolves correctly
- [x] Method signatures match interface requirements
- [x] No type mismatches in stub implementations

### 6. Documentation Standards
- [x] Each method documented with purpose and parameters
- [x] Event emission patterns clearly explained
- [x] Subscription lifecycle documented
- [x] Integration points with other HistoryService methods noted

## Integration with Existing Methods

### Message Management Integration
Update existing methods to emit events:
```typescript
addMessage(content: string, role: MessageRole, metadata?: MessageMetadata): string {
  // ... existing implementation ...
  
  // Emit event after successful message addition
  this.emitMessageAdded(newMessage, {
    correlationId: metadata?.correlationId,
    source: 'addMessage'
  });
  
  return messageId;
}
```

### Tool Management Integration  
Update tool methods to emit events:
```typescript
commitToolResponses(responses: ToolResponse[]): void {
  // ... existing implementation ...
  
  // Emit event after successful commit
  this.emitToolResponsesCommitted(responses, {
    source: 'commitToolResponses',
    commitTimestamp: Date.now()
  });
}
```

## Error Handling Preparation

### Event Emission Error Patterns
```typescript
private emit(eventType: string, eventData: any, metadata?: EventMetadata): string {
  /**
   * @plan PLAN-20250128-HISTORYSERVICE.P18  
   * @phase event-system-stub
   * @requirement HS-026
   * @pseudocode event-system.md:26-54
   */
  
  try {
    // Stub implementation - validate and log
    if (!eventType || eventType.trim() === '') {
      throw new ValidationError('Event type cannot be empty');
    }
    
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[EVENT-STUB] emit: ${eventType}`, {
      eventId,
      data: eventData,
      metadata
    });
    
    // TODO: Phase 19 - Actual event emission
    // this.eventEmitter.emit(eventType, { id: eventId, type: eventType, data: eventData, metadata, timestamp: Date.now() });
    
    return eventId;
  } catch (error) {
    console.error('[EVENT-STUB] Event emission failed:', error.message);
    throw error;
  }
}
```

## Testing Preparation

Phase 18 prepares for Phase 18a testing with:
- Stub methods return predictable values for test validation
- Console logging enables test output verification  
- Event data structures match expected test patterns
- Error handling paths prepared for test coverage

## Next Phase

After successful Phase 18 completion:
**Phase 18a**: Event System Stub Verification - Verify all stub methods are properly implemented, type definitions are correct, and integration points are prepared for actual implementation.

---

**Implementation Status**: ⏳ Pending  
**Completion Date**: ___________  
**Implemented By**: ___________