# HistoryService Plan Validation Checklist

## Beyond PLAN.md Requirements

This document specifies additional validation criteria specific to the HistoryService implementation that must be checked before plan execution begins.

## 1. Reality Verification (MUST CHECK FIRST)

### Current Code Validation
- [ ] Verify geminiChat.ts line 306 still has `private history: Content[] = []`
- [ ] Verify recordHistory method exists at lines 1034-1165
- [ ] Verify extractCuratedHistory exists at lines 232-276
- [ ] Verify shouldMergeToolResponses exists at lines 1198-1253
- [ ] Verify orphan fixing logic exists at lines 468-571
- [ ] Verify Turn.ts handleFunctionCalls exists (NOT handlePendingFunctionCalls)
- [ ] Verify OpenAIProvider has synthetic response handling
- [ ] Verify AnthropicProvider does NOT have synthetic response handling

### Interface Verification
- [ ] Confirm Content interface structure hasn't changed
- [ ] Confirm FunctionCall interface has id field
- [ ] Confirm ToolResponse structure matches current implementation
- [ ] Verify TurnEmitter event structure
- [ ] Check CoreToolScheduler callback signature

## 2. Requirements Coverage Matrix

### Every Phase Must Map to Requirements
- [ ] Phase 03-08: Maps to HS-001 through HS-008 (Core History)
- [ ] Phase 09-11: Maps to HS-015 through HS-017 (State Management)
- [ ] Phase 12-14: Maps to HS-018 through HS-022 (Validation)
- [ ] Phase 15-17: Maps to HS-009 through HS-014 (Tool Management)
- [ ] Phase 18-20: Maps to HS-026 through HS-029 (Event System)
- [ ] Phase 21-23: Maps to HS-049 (GeminiChat Integration)
- [ ] Phase 24-26: Maps to HS-050 (Turn Integration)
- [ ] Phase 27-29: Maps to HS-041 (Provider Compatibility)
- [ ] Phase 30-32: Maps to HS-046 through HS-048 (Testing)

### Requirements NOT to Exceed
- [ ] NO performance features beyond HS-036 (1000 messages)
- [ ] NO retrieval optimization beyond HS-037 (O(1) recent)
- [ ] NO validation optimization beyond HS-038 (O(n))
- [ ] NO features without requirement numbers

## 3. Pseudocode Enforcement Validation

### Phase 02 Pseudocode Requirements
- [ ] Every method has numbered pseudocode
- [ ] Line numbers are sequential
- [ ] Pseudocode includes error conditions
- [ ] Pseudocode includes state transitions
- [ ] No implementation details in pseudocode

### Pseudocode Files Created
- [ ] `analysis/pseudocode/history-service.md` exists
- [ ] `analysis/pseudocode/state-machine.md` exists
- [ ] `analysis/pseudocode/validation.md` exists
- [ ] `analysis/pseudocode/tool-management.md` exists

### Implementation Phase Validation
- [ ] Each implementation phase references pseudocode file
- [ ] Each method has `@pseudocode lines X-Y` comment
- [ ] Implementation order matches pseudocode order
- [ ] No shortcuts or "optimizations" not in pseudocode

## 4. Integration Validation

### Direct Replacement (NO SHIMS)
- [ ] NO backward compatibility layers
- [ ] NO dual-mode operation
- [ ] NO feature flags for migration
- [ ] NO parallel implementations
- [ ] Direct constructor modification in GeminiChat
- [ ] Direct method replacement (not wrapping)

### Files Modified (Not Created)
- [ ] geminiChat.ts is MODIFIED not recreated
- [ ] turn.ts is MODIFIED not recreated
- [ ] Providers are MODIFIED not recreated
- [ ] NO ServiceV2 or ServiceNew files

### Integration Points Work
- [ ] GeminiChat constructor can accept IHistoryService
- [ ] Turn.ts can intercept tool execution
- [ ] Providers don't need history access
- [ ] Event system can integrate with UI

## 5. TDD Validation

### Test Structure
- [ ] Every test references requirement: `@requirement HS-XXX`
- [ ] Every test references pseudocode: `@pseudocode lines X-Y`
- [ ] Tests written BEFORE implementation
- [ ] Tests fail naturally (not expecting NotYetImplemented)

### Test Coverage Requirements
- [ ] Behavioral tests only (no implementation testing)
- [ ] No mock theater (testing mock calls)
- [ ] No reverse testing (expecting stubs)
- [ ] 30% property-based tests
- [ ] Integration tests for each integration point

## 6. Anti-Pattern Detection

### Forbidden Patterns
- [ ] NO `HistoryServiceV2` or version suffixes
- [ ] NO `IHistoryServiceCompatibility` interfaces
- [ ] NO `LegacyHistoryAdapter` classes
- [ ] NO performance caching not in requirements
- [ ] NO speculative features
- [ ] NO complex abstractions

### Code Patterns to Avoid
- [ ] NO mutating history array directly
- [ ] NO complex inheritance hierarchies
- [ ] NO dependency injection frameworks
- [ ] NO external libraries beyond existing

## 7. Concrete Implementation Details

### File Locations Verified
- [ ] `/packages/core/src/services/history/` directory can be created
- [ ] `/packages/core/src/services/history/HistoryService.ts` path valid
- [ ] `/packages/core/src/services/history/IHistoryService.ts` path valid
- [ ] `/packages/core/src/services/history/types.ts` path valid

### Method Signatures Concrete
- [ ] `addUserMessage(content: Content): Promise<void>`
- [ ] `addPendingToolCalls(calls: FunctionCall[]): string[]`
- [ ] `commitToolTurn(ids: string[], responses: ToolResponse[]): Promise<void>`
- [ ] `getHistory(): Content[]`
- [ ] `validateHistory(): ValidationResult`

## 8. Risk-Specific Validation

### Identified Risks Addressed
- [ ] Plan handles missing tool IDs
- [ ] Plan handles concurrent history updates
- [ ] Plan handles provider switching
- [ ] Plan handles stream failures
- [ ] Plan handles tool cancellation

### Edge Cases Covered
- [ ] Empty tool responses
- [ ] Orphaned tool calls
- [ ] Invalid history state
- [ ] Race conditions

## 9. Phase Dependencies

### Sequential Execution Verified
- [ ] Core must complete before State Machine
- [ ] State Machine must complete before Tool Management
- [ ] Tool Management must complete before Integration
- [ ] No phases can be skipped
- [ ] Each phase builds on previous

### Integration Order
- [ ] GeminiChat integrated FIRST
- [ ] Turn.ts integrated SECOND
- [ ] Providers updated LAST
- [ ] Testing throughout, not just at end

## 10. Success Metrics Validation

### Measurable Outcomes
- [ ] "Zero orphaned tool calls" - testable
- [ ] "Tool responses never lost" - testable
- [ ] "<50ms operations" - measurable
- [ ] "95% test coverage" - measurable
- [ ] "80% mutation score" - measurable

### Not Promised
- [ ] NO promise of "10x performance"
- [ ] NO promise of "infinite scalability"
- [ ] NO promise of "zero memory usage"
- [ ] NO promise of features not in requirements

## Validation Script

Run this before plan execution:

```bash
# 1. Verify current code structure
grep -n "private history: Content\[\]" packages/core/src/core/geminiChat.ts
grep -n "recordHistory" packages/core/src/core/geminiChat.ts
grep -n "handleFunctionCalls" packages/core/src/core/turn.ts

# 2. Check for existing HistoryService (should not exist)
find packages/core -name "*HistoryService*" 2>/dev/null
[ $? -eq 0 ] && echo "WARNING: HistoryService already exists"

# 3. Verify plan structure
find project-plans/historyservice/plan -name "*.md" | wc -l
# Should be 64 files (32 phases * 2)

# 4. Check pseudocode exists
ls -la project-plans/historyservice/analysis/pseudocode/*.md

# 5. Verify requirements mapping
grep -r "@requirement HS-" project-plans/historyservice/plan/*.md | wc -l
# Should be > 100 references

# 6. Check for forbidden patterns
grep -r "backward.*compatibility\|compatibility.*layer\|dual.*mode" project-plans/historyservice/
[ $? -eq 0 ] && echo "ERROR: Compatibility layers found in plan"

# 7. Verify integration points
grep -r "geminiChat.ts" project-plans/historyservice/plan/*.md | wc -l
# Should have multiple references
```

## Red Flags - Immediate Plan Rejection

1. **Plan creates new systems instead of modifying existing**
2. **Plan includes backward compatibility code**
3. **Plan optimizes beyond requirements**
4. **Plan doesn't reference pseudocode**
5. **Plan creates isolated feature**
6. **Plan doesn't map tests to requirements**
7. **Plan assumes infrastructure that doesn't exist**
8. **Plan creates V2 or duplicate versions**
9. **Plan includes speculative features**
10. **Plan uses complex abstractions**

## Final Validation

Before approving plan for execution:

- [ ] All sections above checked
- [ ] Validation script runs successfully
- [ ] No red flags detected
- [ ] Concrete integration points verified
- [ ] Requirements mapping complete
- [ ] Pseudocode enforcement clear
- [ ] NO backward compatibility code
- [ ] Direct replacement strategy confirmed

**Sign-off**: Plan is ready for execution when ALL items checked ✅