# Tool Transaction Implementation Plan

## Executive Summary

This plan addresses the critical architectural flaw in the current tool call handling system where tool calls and responses are not managed atomically, leading to orphaned tool calls when users interrupt or cancel operations. The solution implements a proper transaction system that ensures tool calls and their responses are always kept together.

## Problem Statement

### Current Issues
1. **Orphaned Tool Calls**: When a user sends a message while tools are executing, the tool calls become orphaned without responses
2. **Race Conditions**: Parallel tool execution can create inconsistent history states
3. **Complex Workarounds**: The `fixOrphans()` method is a band-aid that scans and patches history after the fact
4. **State Inconsistency**: Tool calls and responses can be added at different times, violating atomicity

### Root Cause
The current architecture tracks `pendingToolCalls` in a Map and attempts to match them with responses later. This two-phase approach is fundamentally flawed because:
- No atomic guarantee between calls and responses
- User interruption breaks the pairing
- Parallel execution complicates tracking
- Post-processing with `fixOrphans()` is error-prone

## Solution Architecture

### Core Concept: Tool Transactions
Implement a transaction system that:
1. Groups assistant messages with their tool calls
2. Collects all tool responses before committing
3. Provides atomic commit/rollback semantics
4. Creates explicit cancellation messages on rollback

### Key Components

#### 1. ToolTransaction Class
- Holds assistant message and tool calls together
- Tracks responses as they arrive
- Maintains transaction state (pending/committed/rolledback)

#### 2. Transaction Lifecycle
```
BEGIN → ADD_ASSISTANT → ADD_TOOLS → EXECUTE → ADD_RESPONSES → COMMIT
                                        ↓
                                    ROLLBACK (on cancellation)
```

#### 3. Integration Points
- **HistoryService**: Manages transactions, prevents direct modifications during active transaction
- **Turn.ts**: Initiates transactions, adds responses, handles completion
- **useGeminiStream**: Triggers cancellation/rollback on user interruption

## Implementation Phases

### Phase 33: Transaction Stub (Foundation)
**Goal**: Create the transaction infrastructure without breaking existing functionality

**Key Tasks**:
- Create ToolTransaction class with basic structure
- Add transaction methods to HistoryService (stubs)
- Update state machine with transaction states
- Maintain backwards compatibility with feature flag

**Verification**: All existing tests pass, new structure in place

### Phase 34: Behavioral TDD (Test-Driven Development)
**Goal**: Define desired behavior through comprehensive tests

**Test Categories**:
1. Orphan prevention scenarios
2. Parallel tool execution
3. Transaction atomicity
4. Error recovery
5. State validation
6. Edge cases

**Verification**: 30+ failing tests that define the complete behavior

### Phase 35: Transaction Implementation (Core Logic)
**Goal**: Implement the complete transaction system to pass all tests

**Key Implementation**:
- `beginToolTransaction()`: Start atomic operation
- `addAssistantMessageToTransaction()`: Buffer assistant message
- `addToolResponseToTransaction()`: Collect responses
- `commitTransaction()`: Atomically add to history
- `rollbackTransaction()`: Create cancellation responses

**Verification**: All Phase 34 tests passing, integration working

### Phase 36: Cleanup and Migration (Final Integration)
**Goal**: Remove old mechanism and fully adopt transactions

**Cleanup Tasks**:
- Remove `pendingToolCalls` Map
- Delete `fixOrphans()` method
- Remove inline orphan prevention
- Simplify state machine
- Update all integration points

**Verification**: Cleaner code, better performance, no orphans possible

## Technical Details

### Transaction Atomicity Guarantee
```typescript
// Either both assistant message AND tool responses are added together
// OR neither is added (rollback creates cancellation responses)
if (transaction.isComplete()) {
  history.push(transaction.assistantMessage);
  history.push(transaction.createToolMessage());
} else {
  transaction.createCancellationResponses();
  history.push(transaction.createCancelledToolMessage());
}
```

### Cancellation Handling
When a user interrupts:
1. Transaction detects interruption
2. Creates synthetic cancellation responses for pending calls
3. Commits the cancelled state (no orphans)
4. Adds user message normally

### Parallel Tool Support
```typescript
// All tools tracked in single transaction
transaction.addToolCalls([call1, call2, call3]);

// Responses can arrive in any order
transaction.addResponse(call2Response);  // Out of order OK
transaction.addResponse(call1Response);
transaction.addResponse(call3Response);

// Commit when all complete
transaction.commit();  // Atomic addition
```

## Migration Strategy

### Phase 1: Dual Mode (Phase 33-35)
- Feature flag controls old vs new behavior
- Both systems run in parallel for testing
- Gradual rollout possible

### Phase 2: Full Migration (Phase 36)
- Remove feature flag
- Delete old code
- Transaction system only

### Rollback Plan
- Git branch before cleanup
- Feature flag allows instant rollback
- Old code remains until Phase 36

## Success Metrics

### Functional Metrics
- **Zero orphaned tool calls** in production
- **100% atomic operations** for tool execution
- **Proper cancellation messages** for all interruptions

### Performance Metrics
- Transaction overhead < 5ms
- No memory leaks
- Better performance than `fixOrphans()` scanning

### Code Quality Metrics
- Reduced complexity (remove ~500 lines)
- Cleaner architecture
- Better testability

## Risk Mitigation

### Risks
1. **Breaking existing functionality**: Mitigated by feature flag and extensive testing
2. **Performance regression**: Mitigated by benchmarking at each phase
3. **Complex migration**: Mitigated by gradual rollout with dual mode

### Testing Strategy
- Phase 34 creates comprehensive test suite
- Each phase has verification checklist
- Integration tests at every level
- Manual testing scenarios defined

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 33 (Stub) | 1 day | Phase 32a complete |
| Phase 34 (TDD) | 1 day | Phase 33 complete |
| Phase 35 (Implementation) | 2 days | Phase 34 complete |
| Phase 36 (Cleanup) | 1 day | Phase 35 complete |

**Total Duration**: 5 days

## Conclusion

This plan provides a systematic approach to fixing the fundamental architectural flaw in tool call handling. By implementing proper transactions, we ensure that tool calls and responses are always managed atomically, preventing orphans and simplifying the codebase.

The phased approach with comprehensive testing ensures a safe migration path while the feature flag provides an instant rollback option if needed. The end result will be a more robust, maintainable, and correct implementation of tool call handling.