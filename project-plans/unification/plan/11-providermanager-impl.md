# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 11: ProviderManager Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P11`

## Prerequisites

- Required: Phase 10 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P10" packages/core/src/providers/`
- Expected files from previous phase:
  - `packages/core/src/providers/ProviderManager.unification.test.ts`

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/ProviderManager.ts`
  - Implement full integration with ConversationManager for provider switching
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P11`
  - Implements: `@requirement:REQ-003.1`
  - Implements: `@requirement:REQ-003.3`

### Implementation Details

Following the pseudocode from lines 1-40 in `project-plans/unification/analysis/pseudocode/provider-adapter-pseudocode.md`:

- Line 5: METHOD switchProvider(newProvider)
  - IMPLEMENTATION: Coordinate with ConversationManager to preserve context during switching
- Line 10: METHOD getCurrentProvider()
  - IMPLEMENTATION: Return current provider with unified conversation context
- Line 15: METHOD initializeConversation(conversationId)
  - IMPLEMENTATION: Initialize conversation context with ConversationManager
- Line 20: METHOD onProviderSwitch(oldProvider, newProvider)
  - IMPLEMENTATION: Handle necessary cleanups and context preservation
- Line 25: METHOD validateConversationBeforeSwitch(conversationId, newProvider)
  - IMPLEMENTATION: Check if conversation needs compression when switching providers
- Line 30: METHOD compressConversationIfNeeded(conversationId, newProvider)
  - IMPLEMENTATION: Call ConversationManager's compression when thresholds exceeded
- Line 35: METHOD updateProviderInConversation(conversationId, providerName)
  - IMPLEMENTATION: Update conversation metadata with new provider information

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P11" packages/core/src/providers/ | wc -l
# Expected: 1+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-003" packages/core/src/providers/ | wc -l
# Expected: 2+ occurrences

# Run ProviderManager tests - should all pass
npm test packages/core/src/providers/ProviderManager.unification.test.ts
# Expected: All tests pass
```

### Manual Verification Checklist

- [ ] Phase 10 markers present (TDD tests completed)
- [ ] ProviderManager.ts file updated with full implementation
- [ ] All methods implemented following pseudocode line references
- [ ] No test modifications made
- [ ] All tests pass naturally
- [ ] TypeScript compiles without errors

## Success Criteria

- ProviderManager fully implemented with unified conversation integration
- All methods working per specifications
- All existing tests pass
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   git checkout -- packages/core/src/providers/ProviderManager.ts
   ```
2. Files to revert: ProviderManager implementation
3. Cannot proceed to Phase 12 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P11.md`
Contents:

```markdown
Phase: P11
Completed: 2025-08-23
Files Created: 
Files Modified: 
- packages/core/src/providers/ProviderManager.ts
Tests Added: 0
Verification: [paste of verification command outputs showing all tests pass]
```