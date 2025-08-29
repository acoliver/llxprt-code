# StateManager Integration with HistoryService

## Overview
StateManager is the central coordinator for HistoryService state transitions, ensuring operations are atomic, consistent, and traceable.

## Core Responsibilities

### 1. State Management
```typescript
enum HistoryState {
  READY = 'READY',
  ADDING_ENTRY = 'ADDING_ENTRY',
  MERGING_TOOLS = 'MERGING_TOOLS',
  FIXING_ORPHANS = 'FIXING_ORPHANS'
}

interface StateTransition {
  from: HistoryState;
  to: HistoryState;
  trigger: string;
  timestamp: number;
  metadata?: any;
}
```

### 2. Transition Rules
```typescript
const VALID_TRANSITIONS = {
  READY: ['ADDING_ENTRY', 'MERGING_TOOLS'],
  ADDING_ENTRY: ['READY'],
  MERGING_TOOLS: ['FIXING_ORPHANS', 'READY'],
  FIXING_ORPHANS: ['READY']
};
```

## Integration Points

### HistoryService → StateManager

#### Before Operations
```typescript
// In HistoryService.addMessage()
async addMessage(message: Message): Promise<void> {
  // Request state change
  await this.stateManager.transition('ADDING_ENTRY', {
    operation: 'addMessage',
    messageId: message.id
  });
  
  try {
    // Perform operation
    this.validateMessage(message);
    this.history.push(message);
    
    // Success - return to ready
    await this.stateManager.transition('READY');
  } catch (error) {
    // Failure - rollback state
    await this.stateManager.rollback();
    throw error;
  }
}
```

#### During Tool Merging
```typescript
// In HistoryService.mergeToolResponses()
async mergeToolResponses(): Promise<void> {
  await this.stateManager.transition('MERGING_TOOLS');
  
  const orphans = this.toolManager.findOrphans();
  
  if (orphans.length > 0) {
    // Transition to fixing state
    await this.stateManager.transition('FIXING_ORPHANS', {
      orphanCount: orphans.length
    });
    
    await this.handleOrphans(orphans);
  }
  
  await this.stateManager.transition('READY');
}
```

### StateManager → HistoryService

#### State Queries
```typescript
// Check if operation allowed
if (!this.stateManager.canTransition('MERGING_TOOLS')) {
  throw new Error('Cannot merge tools in current state');
}

// Get current state
const currentState = this.stateManager.getState();
```

#### State Events
```typescript
// StateManager emits events
this.stateManager.on('stateChanged', (transition: StateTransition) => {
  this.eventSystem.emit('history:stateChanged', transition);
  this.logger.debug('State transition', transition);
});
```

## Synchronization Mechanisms

### 1. Lock Acquisition
```typescript
class StateManager {
  private stateLock = new AsyncLock();
  
  async transition(newState: HistoryState, metadata?: any): Promise<void> {
    await this.stateLock.acquire();
    try {
      this.validateTransition(newState);
      this.setState(newState, metadata);
    } finally {
      this.stateLock.release();
    }
  }
}
```

### 2. Operation Queuing
```typescript
class StateManager {
  private operationQueue: Operation[] = [];
  
  async queueOperation(op: Operation): Promise<void> {
    if (this.state !== 'READY') {
      this.operationQueue.push(op);
      await this.waitForReady();
    }
    return op.execute();
  }
}
```

### 3. Rollback Support
```typescript
class StateManager {
  private stateHistory: StateTransition[] = [];
  
  async rollback(): Promise<void> {
    const previous = this.stateHistory[this.stateHistory.length - 2];
    if (previous) {
      await this.transition(previous.from, { 
        reason: 'rollback',
        originalState: this.state 
      });
    }
  }
}
```

## Error Recovery

### 1. State Recovery Patterns
```typescript
// Automatic recovery from stuck states
class StateManager {
  private stateTimeout = 30000; // 30 seconds
  
  private startStateTimer(): void {
    this.stateTimer = setTimeout(() => {
      if (this.state !== 'READY') {
        this.forceReset('State timeout exceeded');
      }
    }, this.stateTimeout);
  }
}
```

### 2. Orphan State Handling
```typescript
// Special handling for FIXING_ORPHANS state
if (this.state === 'FIXING_ORPHANS') {
  // Allow extended timeout for orphan resolution
  this.extendTimeout(60000);
  
  // Track orphan resolution progress
  this.trackOrphanResolution();
}
```

## Event Flow

### State Change Events
```
StateManager.transition()
    ↓
Validate Transition
    ↓
Update Internal State
    ↓
Emit 'stateChanging' (cancellable)
    ↓
Apply State Change
    ↓
Emit 'stateChanged'
    ↓
Update History
    ↓
Process Queued Operations
```

### Event Subscribers
```typescript
// HistoryService subscribes to state events
this.stateManager.on('stateChanged', this.handleStateChange.bind(this));

// EventSystem forwards to external listeners
this.stateManager.on('stateChanged', (transition) => {
  this.eventSystem.emit('history:state', transition);
});

// Logger tracks all transitions
this.stateManager.on('stateChanged', (transition) => {
  this.logger.info(`State: ${transition.from} → ${transition.to}`, transition.metadata);
});
```

## Testing Integration

### Mock StateManager for Tests
```typescript
class MockStateManager implements IStateManager {
  private state = 'READY';
  
  async transition(newState: string): Promise<void> {
    this.state = newState;
    return Promise.resolve();
  }
  
  canTransition(state: string): boolean {
    return true; // Allow all transitions in tests
  }
}
```

### Integration Test Scenarios
1. Concurrent operation handling
2. State timeout recovery
3. Rollback on validation failure
4. Queue processing after state recovery
5. Event emission verification

## Performance Considerations

### 1. State Transition Overhead
- Keep transitions lightweight (~1ms)
- Avoid heavy computation in transition handlers
- Use async operations where possible

### 2. Queue Management
- Limit queue size to prevent memory issues
- Implement queue overflow handling
- Priority queue for critical operations

### 3. Event Handling
- Use event batching for high-frequency changes
- Implement event throttling for UI updates
- Async event handlers to prevent blocking