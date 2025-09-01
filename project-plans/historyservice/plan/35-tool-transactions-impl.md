# Phase 35: Tool Transaction Implementation

## Overview
Implement the complete transaction logic to make all Phase 34 tests pass. This phase transforms the stub implementation into a working atomic transaction system.

## Implementation Tasks

### 1. Complete ToolTransaction Class (pseudocode lines 1-9)

```typescript
// packages/core/src/services/history/ToolTransaction.ts
export class ToolTransactionImpl implements ToolTransaction {
  readonly id: string;
  assistantMessage: Message | null = null;
  readonly toolCalls: Map<string, ToolCall>;
  readonly toolResponses: Map<string, ToolResponse>;
  state: 'pending' | 'committed' | 'rolledback';
  readonly createdAt: number;
  
  constructor(id: string) {
    this.id = id;
    this.toolCalls = new Map();
    this.toolResponses = new Map();
    this.state = 'pending';
    this.createdAt = Date.now();
  }
}
```

### 2. Implement Transaction Methods in HistoryService

#### beginToolTransaction (pseudocode lines 16-23)
```typescript
beginToolTransaction(): string {
  if (this.activeTransaction !== null) {
    throw new StateError('Transaction already in progress');
  }
  
  const txId = this.generateUUID();
  this.activeTransaction = new ToolTransactionImpl(txId);
  this.transitionTo(HistoryState.TRANSACTION_ACTIVE);
  
  this.logger.debug(`Started transaction ${txId}`);
  return txId;
}
```

#### addAssistantMessageToTransaction (pseudocode lines 24-37)
```typescript
addAssistantMessageToTransaction(
  content: string, 
  toolCalls: ToolCall[]
): void {
  if (!this.activeTransaction) {
    throw new StateError('No active transaction');
  }
  if (this.activeTransaction.assistantMessage) {
    throw new StateError('Assistant message already set');
  }
  
  // Create message but DON'T add to history yet
  const message: Message = {
    id: this.generateUUID(),
    content,
    role: MessageRoleEnum.MODEL,
    timestamp: Date.now(),
    conversationId: this.conversationId,
    metadata: {}
  };
  
  this.activeTransaction.assistantMessage = message;
  
  // Track tool calls
  for (const call of toolCalls) {
    this.activeTransaction.toolCalls.set(call.id, call);
  }
}
```

#### addToolResponseToTransaction (pseudocode lines 38-47)
```typescript
addToolResponseToTransaction(
  toolCallId: string,
  response: ToolResponse
): void {
  if (!this.activeTransaction) {
    throw new StateError('No active transaction');
  }
  if (!this.activeTransaction.toolCalls.has(toolCallId)) {
    throw new ValidationError(`Tool call ${toolCallId} not found`);
  }
  if (this.activeTransaction.toolResponses.has(toolCallId)) {
    throw new StateError(`Response already recorded for ${toolCallId}`);
  }
  
  this.activeTransaction.toolResponses.set(toolCallId, response);
  this.logger.debug(`Added response for tool ${toolCallId}`);
}
```

#### commitTransaction (pseudocode lines 48-70)
```typescript
commitTransaction(): void {
  if (!this.activeTransaction) {
    throw new StateError('No active transaction');
  }
  
  this.transitionTo(HistoryState.TRANSACTION_COMMITTING);
  
  // Validate completeness
  for (const [callId, call] of this.activeTransaction.toolCalls) {
    if (!this.activeTransaction.toolResponses.has(callId)) {
      throw new ValidationError(`Missing response for ${callId}`);
    }
  }
  
  // ATOMIC: Add assistant message if present
  if (this.activeTransaction.assistantMessage) {
    this.messages.push(this.activeTransaction.assistantMessage);
  }
  
  // Create tool message with all responses if present
  if (this.activeTransaction.toolResponses.size > 0) {
    const toolMessage: Message = {
      id: this.generateUUID(),
      role: MessageRoleEnum.TOOL,
      content: '',
      toolCalls: Array.from(this.activeTransaction.toolCalls.values()),
      toolResponses: Array.from(this.activeTransaction.toolResponses.values()),
      timestamp: Date.now(),
      conversationId: this.conversationId,
      metadata: {}
    };
    this.messages.push(toolMessage);
  }
  
  // Archive and clear
  this.activeTransaction.state = 'committed';
  this.transactionHistory.push(this.activeTransaction);
  this.activeTransaction = null;
  
  this.transitionTo(HistoryState.IDLE);
  this.logger.debug('Transaction committed');
}
```

#### rollbackTransaction (pseudocode lines 71-82)
```typescript
rollbackTransaction(reason: string): void {
  if (!this.activeTransaction) {
    return; // Nothing to rollback
  }
  
  // Create cancellation responses for pending calls
  for (const [callId, call] of this.activeTransaction.toolCalls) {
    if (!this.activeTransaction.toolResponses.has(callId)) {
      const cancelResponse: ToolResponse = {
        toolCallId: callId,
        result: {
          error: `[Operation Cancelled] ${reason}`
        }
      };
      this.activeTransaction.toolResponses.set(callId, cancelResponse);
    }
  }
  
  // Commit the cancelled state
  this.commitTransaction();
}
```

### 3. Modify addMessage to Check for Active Transaction (pseudocode lines 150-157)

```typescript
addMessage(content: string, role: MessageRole, metadata?: MessageMetadata): string {
  // Check for active transaction
  if (this.activeTransaction && this.enableTransactions) {
    if (role === MessageRoleEnum.USER) {
      // User interrupted - rollback with reason
      this.rollbackTransaction('User sent new message');
    } else {
      throw new StateError('Cannot add messages during active transaction');
    }
  }
  
  // Continue with existing addMessage logic...
}
```

### 4. Integration with Turn.ts (pseudocode lines 85-120)

#### Modify Turn.handlePendingFunctionCall
```typescript
private handlePendingFunctionCall(fnCall: FunctionCall): ServerGeminiStreamEvent | null {
  const callId = fnCall.id ?? generateToolCallId();
  
  // Start transaction if not started
  if (this.historyService && !this.currentTransaction) {
    this.currentTransaction = this.historyService.beginToolTransaction();
  }
  
  // Add to transaction
  if (this.historyService && this.currentTransaction) {
    const toolCall: ToolCall = {
      id: callId,
      name: fnCall.name,
      arguments: fnCall.args
    };
    
    // Collect tool calls, add to transaction later with assistant message
    this.pendingTransactionCalls.push(toolCall);
  }
  
  // Continue existing logic...
}
```

#### Add Transaction Completion
```typescript
async handleToolExecutionComplete(toolCallId: string, result: ToolResult): Promise<void> {
  if (this.historyService && this.currentTransaction) {
    const toolResponse: ToolResponse = {
      toolCallId,
      result: result.summary ?? result.llmContent ?? result
    };
    
    this.historyService.addToolResponseToTransaction(toolCallId, toolResponse);
    
    // Check if all tools completed
    if (this.allToolsCompleted()) {
      this.historyService.commitTransaction();
      this.currentTransaction = null;
    }
  }
}
```

### 5. Handle Cancellation (pseudocode lines 117-120)

```typescript
handleCancellation(): void {
  if (this.historyService && this.currentTransaction) {
    this.historyService.rollbackTransaction('User cancelled operation');
    this.currentTransaction = null;
  }
}
```

## Migration Strategy

### Phase 1: Dual Mode Operation
1. Keep `pendingToolCalls` Map for backwards compatibility
2. When `enableTransactions: true`, use transaction system
3. When `false`, use existing pendingToolCalls mechanism

### Phase 2: Feature Flag Testing
```typescript
if (this.enableTransactions) {
  // New transaction path
  this.beginToolTransaction();
} else {
  // Existing pendingToolCalls path
  this.pendingToolCalls.set(toolCall.id, toolCall);
}
```

### Phase 3: Gradual Migration
1. Enable transactions in development
2. Run parallel validation
3. Enable in production with monitoring
4. Remove old code in Phase 36

## Testing Requirements

### Unit Tests
All Phase 34 tests must pass:
- [ ] Orphan prevention tests
- [ ] Parallel tool tests
- [ ] Transaction atomicity tests
- [ ] Complete flow tests
- [ ] Error recovery tests
- [ ] State validation tests
- [ ] Edge case tests

### Integration Tests
- [ ] Turn.ts integration with transactions
- [ ] useGeminiStream hook compatibility
- [ ] Multiple concurrent transactions prevented
- [ ] Rollback creates proper history

### Performance Tests
- [ ] Transaction overhead < 5ms
- [ ] No memory leaks with transaction history
- [ ] Rollback performance acceptable

## Success Criteria
- [ ] All Phase 34 tests passing
- [ ] No regression in existing tests
- [ ] Feature flag works correctly
- [ ] Transaction atomicity guaranteed
- [ ] Proper cancellation handling
- [ ] Clear error messages
- [ ] Performance within bounds