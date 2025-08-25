# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 05a: ConversationManager Implementation Verification

## Phase ID

`PLAN-20250823-UNIFICATION.P05a`

## Prerequisites

- Required: Phase 05 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P05" packages/core/src/conversation/`
- Expected files from previous phase:
  - `packages/core/src/conversation/ConversationManager.ts` (fully implemented)

## Implementation Tasks

### Files to Create

- `packages/core/src/conversation/verification/conversation-manager-impl-verification.md` - Verification document for full implementation
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P05a`
  - MUST include: `@requirement:REQ-001`

### Files to Modify

- `packages/core/src/conversation/index.ts`
  - Line 1: Export verification document
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P05a`
  - Implements: `@requirement:REQ-001`

## Required Code Markers

Every verification document created in this phase MUST include:

```markdown
<!--
 * @plan PLAN-20250823-UNIFICATION.P05a
 * @requirement REQ-XXX
 * @verification lines 1-N
 -->
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P05a" packages/core/src/conversation/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered in implementation
grep -r "@requirement:REQ-001" packages/core/src/conversation/ConversationManager.ts | wc -l
# Expected: 1+ occurrences

# All ConversationManager tests should now pass
npm test packages/core/src/conversation/ConversationManager.test.ts
# Expected: All tests pass

# No test modifications were made during implementation
git diff packages/core/src/conversation/ConversationManager.test.ts | grep -E "^[+-]" | grep -v "^[+-]{3}"
# Expected: 0 occurrences (tests should not be modified)

# Verify pseudocode was followed
claude --dangerously-skip-permissions -p "
Compare packages/core/src/conversation/ConversationManager.ts with project-plans/unification/analysis/pseudocode/conversation-manager-pseudocode.md
Check every numbered line is implemented
Report missing steps to verification-report.txt
" || echo "Verification tool not available, manual check required"

# No debug code in implementation
grep -r "console\.\|TODO\|FIXME\|XXX" packages/core/src/conversation/ConversationManager.ts
# Expected: 0 occurrences

# Run mutation testing for ConversationManager
npx stryker run --mutate packages/core/src/conversation/ConversationManager.ts
MUTATION_SCORE=$(jq -r '.metrics.mutationScore' .stryker-tmp/reports/mutation-report.json)
if (( $(echo "$MUTATION_SCORE < 80" | bc -l) )); then
  echo "FAIL: Mutation score $MUTATION_SCORE% is below 80%"
  exit 1
fi
# Expected: Mutation score 80%+
```

### Manual Verification Checklist

- [ ] Phase 05 markers present (ConversationManager fully implemented)
- [ ] Implementation verification document created
- [ ] All ConversationManager tests pass
- [ ] No test modifications made during implementation
- [ ] Implementation follows pseudocode exactly
- [ ] No debug code exists in implementation
- [ ] Mutation testing passes with 80%+ score

## Success Criteria

- ConversationManager fully implemented
- All existing tests pass
- Implementation follows pseudocode exactly
- No test modifications made during implementation
- No debug code in production implementation
- Mutation score 80%+ for ConversationManager

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/conversation/verification/conversation-manager-impl-verification.md
   git checkout -- packages/core/src/conversation/ConversationManager.ts
   ```
2. Files to revert: ConversationManager implementation verification file and ConversationManager.ts
3. Cannot proceed to Phase 06 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P05a.md`
Contents:

```markdown
Phase: P05a
Completed: 2025-08-23
Files Created: 
- packages/core/src/conversation/verification/conversation-manager-impl-verification.md
Files Modified: 
- packages/core/src/conversation/index.ts
Tests Added: 0
Verification: [paste of verification command outputs]
```