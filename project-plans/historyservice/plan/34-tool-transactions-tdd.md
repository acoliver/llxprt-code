# Phase 34: Tool Transaction TDD - Behavioral Tests

## Overview
Write comprehensive behavioral tests that demonstrate the desired transaction behavior. These tests will initially fail against the stub implementation and guide Phase 35 development.

## Test Categories

### 1. Orphan Prevention Tests (pseudocode lines 160-179)

#### Test: User Interruption Creates Cancellation Response
```typescript
describe('Orphan Prevention', () => {
  it('should create cancellation responses when user interrupts tools', async () => {
    const service = new HistoryService('test', { enableTransactions: true });
    
    // Start transaction with tool calls
    const txId = service.beginToolTransaction();
    service.addAssistantMessageToTransaction("Using tools", [
      { id: 'call1', name: 'getTodo', arguments: {} }
    ]);
    
    // User interrupts before tool completes
    service.rollbackTransaction("User sent new message");
    service.addMessage("Stop!", 'user');
    
    // Verify history structure
    const history = service.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0].role).toBe('assistant');
    expect(history[1].role).toBe('tool');
    expect(history[1].toolResponses[0].error).toContain("User sent new message");
    expect(history[2].role).toBe('user');
    expect(history[2].content).toBe("Stop!");
  });
});
```

### 2. Parallel Tool Tests (pseudocode lines 181-200)

#### Test: Handle Multiple Parallel Tool Responses
```typescript
it('should handle parallel tool execution correctly', async () => {
  const service = new HistoryService('test', { enableTransactions: true });
  
  const txId = service.beginToolTransaction();
  service.addAssistantMessageToTransaction("Running tools", [
    { id: 'call1', name: 'tool1', arguments: {} },
    { id: 'call2', name: 'tool2', arguments: {} }
  ]);
  
  // Responses arrive out of order
  service.addToolResponseToTransaction('call2', { result: 'result2' });
  service.addToolResponseToTransaction('call1', { result: 'result1' });
  
  service.commitTransaction();
  
  const history = service.getHistory();
  expect(history[0].role).toBe('assistant');
  expect(history[1].role).toBe('tool');
  expect(history[1].toolResponses).toHaveLength(2);
  // Verify order preserved despite out-of-order responses
  expect(history[1].toolCalls[0].id).toBe('call1');
  expect(history[1].toolCalls[1].id).toBe('call2');
});
```

### 3. Transaction Atomicity Tests (pseudocode lines 202-213)

#### Test: Prevent Message Addition During Transaction
```typescript
it('should prevent direct message addition during active transaction', () => {
  const service = new HistoryService('test', { enableTransactions: true });
  
  service.beginToolTransaction();
  service.addAssistantMessageToTransaction("Tools", [
    { id: 'c1', name: 't1', arguments: {} }
  ]);
  
  // Should throw when trying to add message directly
  expect(() => {
    service.addMessage("test", 'user');
  }).toThrow(/transaction in progress/);
});
```

### 4. Complete Flow Tests

#### Test: Full Tool Execution Cycle
```typescript
it('should handle complete tool execution cycle', async () => {
  const service = new HistoryService('test', { enableTransactions: true });
  
  // Assistant message with tools
  const txId = service.beginToolTransaction();
  service.addAssistantMessageToTransaction(
    "I'll help you with that. Let me check your todos.",
    [
      { id: 'get_todos_1', name: 'getTodos', arguments: { filter: 'active' } }
    ]
  );
  
  // Tool execution
  service.addToolResponseToTransaction('get_todos_1', {
    result: { todos: ['Task 1', 'Task 2'] }
  });
  
  // Commit transaction
  service.commitTransaction();
  
  // Verify atomic addition
  const history = service.getHistory();
  expect(history).toHaveLength(2);
  expect(history[0].role).toBe('assistant');
  expect(history[0].content).toContain("help you with that");
  expect(history[1].role).toBe('tool');
  expect(history[1].toolCalls[0].name).toBe('getTodos');
  expect(history[1].toolResponses[0].result.todos).toEqual(['Task 1', 'Task 2']);
});
```

### 5. Error Recovery Tests

#### Test: Partial Tool Failure
```typescript
it('should handle partial tool failures', async () => {
  const service = new HistoryService('test', { enableTransactions: true });
  
  const txId = service.beginToolTransaction();
  service.addAssistantMessageToTransaction("Running multiple tools", [
    { id: 'call1', name: 'tool1', arguments: {} },
    { id: 'call2', name: 'tool2', arguments: {} }
  ]);
  
  // One succeeds, one fails
  service.addToolResponseToTransaction('call1', { result: 'success' });
  service.addToolResponseToTransaction('call2', { 
    error: 'Network timeout' 
  });
  
  service.commitTransaction();
  
  const history = service.getHistory();
  expect(history[1].toolResponses[0].result).toBe('success');
  expect(history[1].toolResponses[1].error).toBe('Network timeout');
});
```

### 6. State Validation Tests

#### Test: State Transitions During Transaction
```typescript
it('should enforce correct state transitions', () => {
  const service = new HistoryService('test', { enableTransactions: true });
  
  expect(service.getState()).toBe(HistoryState.IDLE);
  
  service.beginToolTransaction();
  expect(service.getState()).toBe(HistoryState.TRANSACTION_ACTIVE);
  
  service.addAssistantMessageToTransaction("test", []);
  expect(service.getState()).toBe(HistoryState.TRANSACTION_ACTIVE);
  
  service.commitTransaction();
  expect(service.getState()).toBe(HistoryState.IDLE);
});
```

### 7. Edge Case Tests

#### Test: Empty Transaction Handling
```typescript
it('should handle empty transactions gracefully', () => {
  const service = new HistoryService('test', { enableTransactions: true });
  
  service.beginToolTransaction();
  // No assistant message or tool calls added
  service.commitTransaction();
  
  const history = service.getHistory();
  expect(history).toHaveLength(0); // Nothing added
});
```

#### Test: Transaction Rollback After Partial Responses
```typescript
it('should rollback transaction with partial responses', () => {
  const service = new HistoryService('test', { enableTransactions: true });
  
  service.beginToolTransaction();
  service.addAssistantMessageToTransaction("Running tools", [
    { id: 'call1', name: 'tool1', arguments: {} },
    { id: 'call2', name: 'tool2', arguments: {} }
  ]);
  
  // Only one response received
  service.addToolResponseToTransaction('call1', { result: 'data' });
  
  // Rollback should create cancellation for call2
  service.rollbackTransaction("Timeout");
  
  const history = service.getHistory();
  expect(history[1].toolResponses).toHaveLength(2);
  expect(history[1].toolResponses[0].result).toBe('data');
  expect(history[1].toolResponses[1].error).toContain('Timeout');
});
```

## Test Execution Strategy

### Phase 34 Execution
1. Write all tests in `HistoryService.transaction.test.ts`
2. Mark tests with `@failing` tag initially
3. Run tests to confirm they fail with stub implementation
4. Document expected vs actual behavior for each test

### Phase 35 Validation
1. Implement transaction logic
2. Remove `@failing` tags as tests pass
3. All tests must pass before moving to Phase 36

## Success Criteria
- [ ] All test cases written and documented
- [ ] Tests fail predictably with stub implementation
- [ ] Test coverage includes all pseudocode scenarios
- [ ] Edge cases identified and tested
- [ ] Performance benchmarks established