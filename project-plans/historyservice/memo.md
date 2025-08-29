# HistoryService Implementation Memo

## Critical Context for Plan Creation

### Key Constraints from User

1. **NO BACKWARD COMPATIBILITY SHIMS**
   - Direct replacement only
   - No dual-mode operation
   - No compatibility layers
   - Just rip out old, put in new

2. **Requirements-Driven Development**
   - Every test must reference a requirement (HS-XXX)
   - No features beyond requirements
   - No performance optimization beyond HS-036/037/038 (1000 messages, O(1) recent, O(n) validation)
   - Don't go nuts on performance

3. **Pseudocode Must Be Used**
   - Phase 02 creates numbered pseudocode
   - TDD phases reference pseudocode lines
   - Implementation must follow pseudocode line-by-line
   - Verification checks pseudocode compliance

4. **TDD Strictly (from RULES.md)**
   - Test FIRST, then implement
   - Test behavior, not implementation
   - No mock theater
   - No reverse testing (testing for NotYetImplemented)

### Current Code Reality (Verified)

#### GeminiChat.ts
- **Line 306**: `private history: Content[] = []` - direct array
- **Lines 1034-1165**: `recordHistory()` - 130+ lines of complex logic
- **Lines 232-276**: `extractCuratedHistory()` - filtering logic
- **Lines 1198-1253**: `shouldMergeToolResponses()` - merging logic
- **Lines 468-571**: Orphaned tool call fixing in sendMessage
- **Line 745**: Direct history.push in sendMessageStream

#### Turn.ts
- **Line ~620**: `handleFunctionCalls()` method exists (not handlePendingFunctionCalls)
- Uses event-driven architecture with TurnEmitter
- Tool execution through CoreToolScheduler callbacks

#### Providers
- **AnthropicProvider**: Lines 754-897 `convertContentsToAnthropicMessages` - no synthetic handling
- **OpenAIProvider**: Lines 978-1061 - HAS synthetic response handling (_synthetic field)
- **GeminiProvider**: Direct pass-through, no conversion
- All receive Content[] arrays, don't access history directly

#### Infrastructure Gaps
- NO conversation tracking infrastructure (sessionId exists but not used consistently)
- NO history interception mechanism
- Tool IDs generated ad-hoc in each provider
- Synthetic response handling inconsistent (only OpenAI has it)

### Integration Points (Concrete)

#### Files That Will USE HistoryService
- `/packages/core/src/core/geminiChat.ts` - main integration
- `/packages/core/src/client.ts` - compression operations
- `/packages/cli/src/tools/ui-components/chat-interaction.tsx` - event subscription
- `/packages/core/src/core/turn.ts` - tool response management
- `/packages/core/src/core/geminiCompatibleWrapper.ts` - history tracking

#### Code To Be REPLACED
- `geminiChat.recordHistory()` (lines 1034-1165)
- `geminiChat.extractCuratedHistory()` (lines 232-276)
- `geminiChat.shouldMergeToolResponses()` (lines 1198-1253)
- Direct `this.history` manipulations throughout
- Orphaned tool fixing logic (lines 468-571)
- OpenAI's synthetic response handling

### Lessons from Failed Plans

1. **Architecture Mismatch**: Plans assumed infrastructure that didn't exist
2. **Insufficient Reality Check**: Didn't verify actual method signatures
3. **Too Abstract**: Created new systems instead of modifying existing
4. **Missing Integration Analysis**: Didn't verify exact integration points

### Success Factors

1. **Direct Replacement**: Modify constructor, replace methods
2. **Concrete Integration**: Exact line numbers and signatures
3. **Requirements Mapping**: Every test -> requirement
4. **Pseudocode Enforcement**: Line-by-line compliance
5. **No New Infrastructure**: Use what exists, replace what's broken

### Plan Structure That Works

```
Phases 01-02: Analysis & Pseudocode (foundation)
Phases 03-08: Core HistoryService (requirements HS-001 to HS-008)
Phases 09-11: State Machine (requirements HS-015 to HS-017)
Phases 12-14: Validation (requirements HS-018 to HS-022)
Phases 15-17: Tool Management (requirements HS-009 to HS-014)
Phases 18-20: Event System (requirements HS-026 to HS-029)
Phases 21-23: GeminiChat Integration (requirements HS-049)
Phases 24-26: Turn Integration (requirements HS-050)
Phases 27-29: Provider Updates (requirements HS-041)
Phases 30-32: Final Integration & Cleanup
```

### Critical Implementation Details

1. **Location**: `/packages/core/src/services/history/HistoryService.ts`
2. **Interface**: `IHistoryService` with specific methods from requirements
3. **GeminiChat Constructor Change**: Add `historyService` parameter
4. **Turn.ts Integration**: Wrap tool execution with pending/commit pattern
5. **No Shims**: Direct replacement, no backward compatibility

### What NOT to Do

- ❌ Create HistoryServiceV2 or compatibility layers
- ❌ Add performance features beyond O(1)/O(n) requirements
- ❌ Build complex caching or memory management
- ❌ Create features not in requirements
- ❌ Test implementation details
- ❌ Ignore pseudocode
- ❌ Build in isolation without integration

### Validation Checklist Items

- Every phase references specific requirement numbers
- Pseudocode is numbered and referenced in implementation
- Integration modifies existing files (not creates new)
- No backward compatibility code
- No performance optimization beyond requirements
- Tests map to requirements explicitly
- No isolated features

### Files to Create in Plan

```
project-plans/historyservice/
  plan/
    00-overview.md
    01-analysis.md
    01a-analysis-verification.md
    02-pseudocode.md
    02a-pseudocode-verification.md
    03-historyservice-interface-stub.md
    [... all phases through 32a]
  analysis/
    domain-model.md
    pseudocode/
      history-service.md
      state-machine.md
      validation.md
      tool-management.md
```