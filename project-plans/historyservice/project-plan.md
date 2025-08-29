# HistoryService Implementation Project Plan

**Plan ID**: PLAN-20250828-HISTORYSERVICE
**Created**: 2025-08-28
**Status**: READY FOR REVIEW

## Executive Summary

This plan implements a centralized HistoryService to manage conversation history, addressing critical issues with orphaned tool calls, lost tool responses, and inconsistent history management across providers.

## Critical Integration Requirements ✅

### 1. Existing Code That Will USE This Feature
- `/packages/core/src/core/geminiChat.ts` - Will delegate all history operations to HistoryService
- `/packages/core/src/client.ts` - Will use HistoryService for compression operations
- `/packages/cli/src/tools/ui-components/chat-interaction.tsx` - Will subscribe to history events
- `/packages/core/src/core/turn.ts` - Will use HistoryService for tool response management
- `/packages/core/src/providers/anthropic/AnthropicProvider.ts` - Will receive validated history
- `/packages/core/src/providers/openai/OpenAIProvider.ts` - Will receive validated history
- `/packages/core/src/core/geminiCompatibleWrapper.ts` - Will use for history tracking

### 2. Existing Code To Be REPLACED
- `geminiChat.recordHistory()` (lines 1034-1165) - Complex history recording logic
- `geminiChat.extractCuratedHistory()` (lines 232-276) - History filtering logic
- `geminiChat.shouldMergeToolResponses()` (lines 1198-1253) - Tool merging logic
- Direct `this.history` array manipulation throughout geminiChat.ts
- Orphaned tool call fixing logic in sendMessage (lines 468-571)
- Provider-specific synthetic response handling in OpenAIProvider

### 3. User Access Points
- **Interactive Mode**: Through Turn.ts tool execution callbacks
- **Non-Interactive Mode**: Through NonInteractiveToolExecutor
- **Streaming**: Through geminiChat sendMessageStream
- **Provider Switching**: Automatic history preservation

### 4. Migration Requirements
- Existing conversations in progress must continue working
- Tool execution flow must remain unchanged from user perspective
- Provider switching must preserve history

## Phase Structure

### Foundation Phases (01-02)
```
01-analysis.md                    # Current state analysis
01a-analysis-verification.md
02-pseudocode.md                  # Detailed algorithms
02a-pseudocode-verification.md
```

### Core Implementation (03-08)
```
03-historyservice-interface-stub.md
03a-historyservice-interface-stub-verification.md
04-historyservice-interface-tdd.md
04a-historyservice-interface-tdd-verification.md
05-historyservice-interface-impl.md
05a-historyservice-interface-impl-verification.md
06-historyservice-core-stub.md
06a-historyservice-core-stub-verification.md
07-historyservice-core-tdd.md
07a-historyservice-core-tdd-verification.md
08-historyservice-core-impl.md
08a-historyservice-core-impl-verification.md
```

### State Machine (09-11)
```
09-state-machine-stub.md
09a-state-machine-stub-verification.md
10-state-machine-tdd.md
10a-state-machine-tdd-verification.md
11-state-machine-impl.md
11a-state-machine-impl-verification.md
```

### Validation System (12-14)
```
12-validation-stub.md
12a-validation-stub-verification.md
13-validation-tdd.md
13a-validation-tdd-verification.md
14-validation-impl.md
14a-validation-impl-verification.md
```

### Tool Management (15-17)
```
15-tool-management-stub.md
15a-tool-management-stub-verification.md
16-tool-management-tdd.md
16a-tool-management-tdd-verification.md
17-tool-management-impl.md
17a-tool-management-impl-verification.md
```

### Event System (18-20)
```
18-event-system-stub.md
18a-event-system-stub-verification.md
19-event-system-tdd.md
19a-event-system-tdd-verification.md  
20-event-system-impl.md
20a-event-system-impl-verification.md
```

### GeminiChat Integration (21-23)
```
21-geminichat-integration-stub.md
21a-geminichat-integration-stub-verification.md
22-geminichat-integration-tdd.md
22a-geminichat-integration-tdd-verification.md
23-geminichat-integration-impl.md
23a-geminichat-integration-impl-verification.md
```

### Turn Integration (24-26)
```
24-turn-integration-stub.md
24a-turn-integration-stub-verification.md
25-turn-integration-tdd.md
25a-turn-integration-tdd-verification.md
26-turn-integration-impl.md
26a-turn-integration-impl-verification.md
```

### Provider Updates (27-29)
```
27-provider-updates-stub.md
27a-provider-updates-stub-verification.md
28-provider-updates-tdd.md
28a-provider-updates-tdd-verification.md
29-provider-updates-impl.md
29a-provider-updates-impl-verification.md
```

### Final Integration (30-32)
```
30-integration-tests.md
30a-integration-tests-verification.md
31-migration-script.md
31a-migration-script-verification.md
32-deprecation-cleanup.md
32a-deprecation-cleanup-verification.md
```

## Concrete Implementation Details

### 1. HistoryService Location
```typescript
// packages/core/src/services/history/HistoryService.ts
export class HistoryService implements IHistoryService {
  private history: HistoryEntry[] = [];
  private state: HistoryState = HistoryState.IDLE;
  private pendingToolCalls: Map<string, PendingToolCall> = new Map();
  private eventEmitter: EventEmitter;
}
```

### 2. GeminiChat Integration Points

**Current** (geminiChat.ts:745):
```typescript
this.history.push(userContent);
```

**After Integration**:
```typescript
await this.historyService.addUserMessage(userContent);
```

**Current** (geminiChat.ts:1034-1165):
```typescript
private recordHistory(
  userInput: Content,
  modelOutput: Content[],
  automaticFunctionCallingHistory?: Content[],
) {
  // 130+ lines of complex logic
}
```

**After Integration**:
```typescript
private async recordHistory(
  userInput: Content,
  modelOutput: Content[],
  automaticFunctionCallingHistory?: Content[],
) {
  // Delegate to service
  if (automaticFunctionCallingHistory) {
    await this.historyService.addAutomaticFunctionCallingHistory(
      automaticFunctionCallingHistory
    );
  } else {
    await this.historyService.addUserMessage(userInput);
    await this.historyService.addModelResponse(modelOutput);
  }
}
```

### 3. Tool Execution Integration

**Current** (turn.ts:~620):
```typescript
private async handleFunctionCalls(
  availableTools: Tool[],
  functionCalls: FunctionCall[],
  turnEmitter: TurnEmitter,
  toolCallStates: ToolCallState[]
): Promise<ToolResponse[]>
```

**After Integration**:
```typescript
private async handleFunctionCalls(
  availableTools: Tool[],
  functionCalls: FunctionCall[],
  turnEmitter: TurnEmitter,
  toolCallStates: ToolCallState[]
): Promise<ToolResponse[]> {
  // Add pending tool calls to history service
  const toolCallIds = await this.historyService.addPendingToolCalls(
    functionCalls
  );
  
  try {
    // Execute tools...
    const responses = await this.executeTools(functionCalls);
    
    // Commit atomically
    await this.historyService.commitToolTurn(toolCallIds, responses);
    
    return responses;
  } catch (error) {
    // On error, abort pending calls
    await this.historyService.abortPendingToolCalls(toolCallIds);
    throw error;
  }
}
```

### 4. Provider Validation

**Current** (AnthropicProvider.ts:754-897):
```typescript
private convertContentsToAnthropicMessages(contents: Content[]) {
  // Manual orphan detection and error throwing
}
```

**After Integration**:
```typescript
private convertContentsToAnthropicMessages(contents: Content[]) {
  // History already validated by HistoryService
  // Just convert format, no orphan checking needed
}
```

## Risk Mitigation

### Risk 1: Breaking Existing Conversations
**Mitigation**: 
- Dual-mode operation during migration
- Feature flag to enable/disable HistoryService
- Backward compatibility layer

### Risk 2: Race Conditions in Concurrent Updates
**Mitigation**:
- Atomic operations with proper locking
- State machine prevents invalid transitions
- Event ordering guarantees

### Risk 3: Performance Impact
**Mitigation**:
- Async operations where possible
- Efficient immutable updates
- Lazy validation

## Success Criteria

1. **Zero Orphaned Tool Calls**: Validated by integration tests
2. **Tool Responses Never Lost**: Even after errors
3. **Provider Consistency**: Same history behavior across all providers
4. **Performance**: <50ms for typical operations
5. **Test Coverage**: >95% for HistoryService
6. **Mutation Score**: >80% for core logic

## Verification Strategy

### Unit Tests (Per Phase)
- Behavioral tests with real data
- Property-based testing (30% minimum)
- No mock theater or reverse testing

### Integration Tests (Phase 30)
- End-to-end conversation flows
- Provider switching scenarios
- Tool cancellation handling
- Error recovery

### Performance Tests
- Large history arrays (1000+ messages)
- Concurrent operations
- Memory usage monitoring

## Timeline

- **Week 1**: Foundation + Core Implementation (Phases 01-08)
- **Week 2**: State Machine + Validation (Phases 09-14)
- **Week 3**: Tool Management + Events (Phases 15-20)
- **Week 4**: Integration (Phases 21-29)
- **Week 5**: Testing + Migration (Phases 30-32)

## Concrete Next Steps

1. Create `/packages/core/src/services/history/` directory
2. Implement IHistoryService interface
3. Add HistoryService to GeminiChat constructor
4. Update Turn.ts to use HistoryService
5. Remove orphan fixing logic from providers
6. Add comprehensive integration tests

## Plan Validation Checklist

- [x] Lists specific existing files that will use the feature
- [x] Identifies exact code to be replaced/removed (with line numbers)
- [x] Shows how users will access the feature
- [x] Includes migration plan for existing conversations
- [x] Has integration test phases (Phase 30)
- [x] Feature CANNOT work without modifying existing files
- [x] Concrete implementation details with code snippets
- [x] Risk mitigation strategies
- [x] Performance considerations
- [x] Timeline with weekly milestones