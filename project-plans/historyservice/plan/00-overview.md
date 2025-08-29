# Plan: HistoryService Implementation

Plan ID: PLAN-20250128-HISTORYSERVICE
Generated: 2025-01-28
Total Phases: 32
Requirements: HS-001 through HS-060

## Executive Summary

This plan implements a centralized HistoryService to replace the scattered and inconsistent conversation history management across the codebase. Currently, history operations are fragmented across multiple components including:

- **GeminiChat.ts**: Complex 130+ line recordHistory method, direct array manipulation, orphaned tool call fixing
- **Provider Layer**: Inconsistent synthetic response handling (only OpenAI has it)
- **Tool Execution**: Callback-based history updates with no centralized tracking

The HistoryService will provide:
- **Single Source of Truth**: Centralized history management with atomic operations
- **Tool Call Safety**: Prevent orphaned tool calls and lost tool responses
- **Provider Consistency**: Standardized history behavior across all providers
- **Event-Driven Architecture**: Real-time updates for UI components
- **State Management**: Robust conversation state tracking

This is a **direct replacement** implementation with NO direct replacement shims, following requirements-driven development where every test maps to HS-XXX requirements.

## Architecture Overview

### Current Architecture (Problems)
```
GeminiChat.ts (Scattered Logic)
├── recordHistory() [lines 1034-1165] - 130+ lines of complex logic
├── extractCuratedHistory() [lines 232-276] - filtering logic
├── shouldMergeToolResponses() [lines 1198-1253] - merging logic
└── Direct history[] manipulation [line 306, 745, 561, 1160]

Provider Layer (Inconsistent)
├── AnthropicProvider - no synthetic handling
├── OpenAIProvider - HAS synthetic handling (_synthetic field)
└── GeminiProvider - direct pass-through

Tool Execution (Fragmented)
├── CoreToolScheduler - callback pattern
├── Turn.ts - handleFunctionCalls
└── NonInteractiveToolExecutor - external callbacks
```

### Proposed Architecture (Solution)
```
HistoryService (Centralized)
├── IHistoryService interface
├── State Machine (IDLE → ADDING → MERGING → READY)
├── Event System (EntryAdded, ToolMerged, SyntheticAdded)
├── Validation Engine (orphan detection, consistency checks)
└── Tool Management (pending → commit atomic pattern)

Integration Points
├── GeminiChat.ts - constructor injection, method delegation
├── Turn.ts - tool execution wrapping
├── Providers - receive validated history only
└── UI Components - event subscription for real-time updates
```

## Phase Structure Summary

### Foundation (Phases 01-02)
- **Phase 01**: Current state analysis - verify exact integration points
- **Phase 02**: Pseudocode generation - numbered algorithms for line-by-line implementation

### Core Implementation (Phases 03-08)
**Requirements**: HS-001 to HS-008 (Core History Management)
- **Phases 03-05**: IHistoryService interface (stub → TDD → implementation)
- **Phases 06-08**: HistoryService core operations (stub → TDD → implementation)

### State Management (Phases 09-11)
**Requirements**: HS-015 to HS-017 (State Management)
- **Phases 09-11**: State machine implementation (IDLE/ADDING/MERGING/READY states)

### Validation System (Phases 12-14)
**Requirements**: HS-018 to HS-022 (Validation)
- **Phases 12-14**: Orphan detection, consistency validation, structure validation

### Tool Management (Phases 15-17)
**Requirements**: HS-009 to HS-014 (Tool Call/Response Management)
- **Phases 15-17**: Pending → commit atomic pattern, parallel tool support

### Event System (Phases 18-20)
**Requirements**: HS-026 to HS-029 (Event System)
- **Phases 18-20**: Event emission, subscription management, UI integration

### GeminiChat Integration (Phases 21-23)
**Requirements**: HS-049, HS-055 (GeminiChat Integration)
- **Phases 21-23**: Replace recordHistory, extractCuratedHistory, shouldMergeToolResponses

### Turn Integration (Phases 24-26)
**Requirements**: HS-050, HS-051 (Tool Execution Integration)
- **Phases 24-26**: Wrap handleFunctionCalls with pending/commit pattern

### Provider Updates (Phases 27-29)
**Requirements**: HS-041 (Provider Compatibility)
- **Phases 27-29**: Remove provider-specific orphan handling, standardize synthetic responses

### Final Integration (Phases 30-32)
**Requirements**: HS-054 to HS-056 (Integration Requirements)
- **Phase 30**: Integration tests for end-to-end flows
- **Phase 31**: Migration script for existing conversations
- **Phase 32**: Remove deprecated code, cleanup

## Critical Constraints from Memo

### NO direct replacement SHIMS
- Direct replacement only - rip out old, put in new
- No dual-mode operation or compatibility layers
- Constructor injection pattern: `new GeminiChat(historyService)`

### REQUIREMENTS-DRIVEN DEVELOPMENT
- Every test MUST reference HS-XXX requirement
- No features beyond the 60 specified requirements
- No performance optimization beyond HS-036/037/038 limits
- Test behavior, not implementation details

### PSEUDOCODE ENFORCEMENT
- Phase 02 creates numbered pseudocode for all algorithms
- TDD phases reference specific pseudocode line numbers
- Implementation must follow pseudocode line-by-line
- Verification phases check pseudocode compliance

### TDD STRICTLY
- Test FIRST, then implement (stub → TDD → impl pattern)
- No mock theater - test real behavior
- No reverse testing (testing for NotYetImplemented)
- Behavioral testing with actual data flows

## Integration Points from Existing Code

### Files That Will USE HistoryService
```typescript
/packages/core/src/core/geminiChat.ts
  - Constructor: Add historyService parameter
  - recordHistory(): Delegate to historyService.addUserMessage/addModelResponse
  - extractCuratedHistory(): Use historyService.getCuratedHistory()
  - shouldMergeToolResponses(): Use historyService.mergeToolResponses()

/packages/core/src/core/turn.ts  
  - handleFunctionCalls(): Wrap with historyService.addPendingToolCalls()
  - Tool execution: Use historyService.commitToolTurn()
  - Error handling: Use historyService.abortPendingToolCalls()

/packages/core/src/client.ts
  - Compression: Use historyService.compressHistory()

/packages/cli/src/tools/ui-components/chat-interaction.tsx
  - Event subscription: historyService.on('EntryAdded', updateUI)

/packages/core/src/core/geminiCompatibleWrapper.ts
  - History tracking: Use historyService for session management
```

### Code To Be REPLACED (No Compatibility)
```typescript
// DELETE: geminiChat.recordHistory() [lines 1034-1165]
// DELETE: geminiChat.extractCuratedHistory() [lines 232-276] 
// DELETE: geminiChat.shouldMergeToolResponses() [lines 1198-1253]
// DELETE: Direct this.history manipulations [lines 306, 745, 561, 1160]
// DELETE: Orphaned tool fixing logic [lines 468-571]
// DELETE: OpenAI's _synthetic response handling [lines 978-1061]
```

## Success Criteria

### Functional Requirements
- **Zero Orphaned Tool Calls**: HS-042 - History service prevents orphaned tool calls
- **Tool Response Preservation**: HS-043 - Tool responses never lost, even on errors  
- **Provider Consistency**: HS-041 - Identical behavior across Anthropic, OpenAI, Gemini
- **State Safety**: HS-044 - History consistency maintained even when operations fail

### Performance Requirements
- **Scale**: HS-036 - Handle 1000+ messages without degradation
- **Responsiveness**: HS-037 - O(1) time for recent message retrieval
- **Validation Speed**: HS-038 - O(n) time for validation operations

### Integration Requirements
- **Interface Consistency**: HS-040 - Maintain Content/Part interfaces
- **Provider Integration**: HS-041 - Providers receive validated history only
- **UI Integration**: HS-056 - UI components receive event-driven updates
- **Integration Support**: Clean integration without migration (existing conversations will be cleared)

### Testing Requirements
- **Coverage**: HS-048 - 100% test coverage for all public methods
- **Requirements Mapping**: Every test maps to specific HS-XXX requirement
- **Behavioral Testing**: Test actual behavior, not implementation
- **Property-Based**: Minimum 30% property-based tests

## Critical Implementation Details

### Service Location
```typescript
// packages/core/src/services/history/HistoryService.ts
export class HistoryService implements IHistoryService {
  private history: HistoryEntry[] = [];
  private state: HistoryState = HistoryState.IDLE; 
  private pendingToolCalls: Map<string, PendingToolCall> = new Map();
  private eventEmitter: EventEmitter;
  
  // @plan PLAN-20250128-HISTORYSERVICE
  // @requirement HS-001 through HS-060
}
```

### GeminiChat Constructor Change
```typescript
// BEFORE (geminiChat.ts:306)
private history: Content[] = [];

// AFTER
constructor(private historyService: IHistoryService) {
  // No direct history access
}
```

### Tool Execution Pattern
```typescript
// Pending → Execute → Commit (Atomic)
const toolIds = await historyService.addPendingToolCalls(calls);
try {
  const responses = await executeTools(calls);
  await historyService.commitToolTurn(toolIds, responses);
} catch (error) {
  await historyService.abortPendingToolCalls(toolIds);
  throw error;
}
```

## Risk Mitigation Strategy

### Risk: Breaking Existing Conversations
- **Mitigation**: Comprehensive integration tests covering all conversation patterns
- **Detection**: Automated regression tests for provider switching, tool execution
- **Recovery**: Migration script to preserve conversation state

### Risk: Race Conditions
- **Mitigation**: Atomic operations with state machine guards
- **Detection**: Concurrent operation stress tests
- **Recovery**: State validation and automatic error recovery

### Risk: Performance Degradation
- **Mitigation**: O(1)/O(n) complexity guarantees per requirements
- **Detection**: Performance benchmarks in CI/CD
- **Recovery**: Optimization within requirement constraints

## Execution Timeline

- **Week 1**: Foundation + Core (Phases 01-08)
- **Week 2**: State + Validation (Phases 09-14)  
- **Week 3**: Tools + Events (Phases 15-20)
- **Week 4**: Integration (Phases 21-29)
- **Week 5**: Testing + Migration (Phases 30-32)

## Verification Strategy

Each phase follows the pattern:
1. **Stub Phase**: Create interfaces and empty implementations
2. **TDD Phase**: Write behavioral tests referencing HS-XXX requirements
3. **Implementation Phase**: Implement following pseudocode line-by-line
4. **Verification Phase**: Confirm pseudocode compliance and requirement coverage

### Automated Verification Commands
```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250128-HISTORYSERVICE" . | wc -l

# Check requirements coverage  
grep -r "@requirement:HS-" . | wc -l

# Run phase-specific tests
npm test -- --grep "@plan:.*P[NN]"

# Verify no direct replacement code
grep -r "compatibility\|shim\|legacy" packages/core/src/services/history/
```

This plan ensures complete replacement of the fragmented history management with a robust, centralized solution that prevents orphaned tool calls, ensures tool response preservation, and provides consistent behavior across all providers.