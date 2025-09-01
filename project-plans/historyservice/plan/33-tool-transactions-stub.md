# Phase 33: Tool Transaction Stub Implementation

## Overview
Implement the basic structure for atomic tool transactions without full functionality. This phase creates the foundation for proper tool call/response management.

## Requirements
- Create ToolTransaction class with basic properties (pseudocode lines 1-9)
- Add transaction management methods to HistoryService (lines 16-23, 48-70)
- Implement state validation for transactions (lines 226-236)
- Keep existing pendingToolCalls mechanism working in parallel

## Files to Create/Modify

### 1. Create `packages/core/src/services/history/ToolTransaction.ts`
```typescript
export interface ToolTransaction {
  id: string;
  assistantMessage: Message | null;
  toolCalls: Map<string, ToolCall>;
  toolResponses: Map<string, ToolResponse>;
  state: 'pending' | 'committed' | 'rolledback';
  createdAt: number;
}

export class ToolTransactionImpl implements ToolTransaction {
  // Stub implementation
}
```

### 2. Modify `packages/core/src/services/history/types.ts`
- Add `TRANSACTION_ACTIVE` and `TRANSACTION_COMMITTING` states (lines 223-224)
- Export ToolTransaction types

### 3. Modify `packages/core/src/services/history/HistoryService.ts`
- Add `activeTransaction: ToolTransaction | null` property (line 13)
- Add `transactionHistory: ToolTransaction[]` property (line 14)
- Implement stub methods:
  - `beginToolTransaction()` (lines 16-23)
  - `commitTransaction()` (lines 48-70) - stub only
  - `rollbackTransaction()` (lines 71-82) - stub only
  - `hasActiveTransaction()` - helper method

### 4. Update `packages/core/src/services/history/StateManager.ts`
- Add new state transitions for TRANSACTION_ACTIVE and TRANSACTION_COMMITTING (lines 227-235)

## Implementation Notes

### Stub Behaviors
1. `beginToolTransaction()`: Creates transaction object, sets state to TRANSACTION_ACTIVE
2. `commitTransaction()`: Logs warning "Not implemented", clears activeTransaction
3. `rollbackTransaction()`: Logs warning "Not implemented", clears activeTransaction
4. State validation: Prevents addMessage during TRANSACTION_ACTIVE

### Compatibility Requirements
- Must NOT break existing pendingToolCalls functionality
- Must NOT change existing public API
- Must pass all existing tests
- Add feature flag: `enableTransactions: false` by default

## Test Requirements
1. Test transaction creation
2. Test state transitions with transactions
3. Test that existing pendingToolCalls still work
4. Test feature flag enables/disables transactions

## Success Criteria
- [ ] ToolTransaction class exists with all properties
- [ ] HistoryService has transaction methods (stubs)
- [ ] State machine includes transaction states
- [ ] All existing tests pass
- [ ] New transaction tests pass (basic structure only)

## Dependencies
- Phase 32a must be complete (all existing tests passing)

## Migration Path
This stub implementation runs alongside existing pendingToolCalls. In Phase 35, we'll implement the actual transaction logic and Phase 36 will remove the old mechanism.