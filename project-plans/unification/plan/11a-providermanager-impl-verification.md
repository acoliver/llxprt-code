# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 11a: ProviderManager Implementation Verification

## Phase ID

`PLAN-20250823-UNIFICATION.P11a`

## Prerequisites

- Required: Phase 11 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P11" packages/core/src/providers/`
- Expected files from previous phase:
  - `packages/core/src/providers/ProviderManager.ts` (with full implementation)

## Implementation Tasks

### Files to Create

- `packages/core/src/providers/verification/providermanager-impl-verification.md` - Verification document for full implementation
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P11a`
  - MUST include: `@requirement:REQ-003.1`
  - MUST include: `@requirement:REQ-003.3`

### Files to Modify

- `packages/core/src/providers/index.ts`
  - Line 1: Export verification document
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P11a`
  - Implements: `@requirement:REQ-003`

## Required Code Markers

Every verification document created in this phase MUST include:

```markdown
<!-- 
 * @plan PLAN-20250823-UNIFICATION.P11a
 * @requirement REQ-XXX
 * @verification lines 1-N
 -->
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P11a" packages/core/src/providers/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered in implementation
grep -r "@requirement:REQ-003" packages/core/src/providers/ProviderManager.ts | wc -l
# Expected: 2+ occurrences

# All ProviderManager tests should now pass
npm test packages/core/src/providers/ProviderManager.unification.test.ts
# Expected: All tests pass

# No test modifications were made during implementation
git diff packages/core/src/providers/ProviderManager.unification.test.ts | grep -E "^[+-]" | grep -v "^[+-]{3}"
# Expected: 0 occurrences (tests should not be modified)

# Verify pseudocode was followed
claude --dangerously-skip-permissions -p "
Compare packages/core/src/providers/ProviderManager.ts with project-plans/unification/analysis/pseudocode/provider-adapter-pseudocode.md
Check every numbered line is implemented
Report missing steps to verification-report.txt
" || echo "Verification tool not available, manual check required"

# No debug code in implementation
grep -r "console\.\|TODO\|FIXME\|XXX" packages/core/src/providers/ProviderManager.ts
# Expected: 0 occurrences

# Run mutation testing for ProviderManager
npx stryker run --mutate packages/core/src/providers/ProviderManager.ts
MUTATION_SCORE=$(jq -r '.metrics.mutationScore' .stryker-tmp/reports/mutation-report.json)
if (( $(echo "$MUTATION_SCORE < 80" | bc -l) )); then
  echo "FAIL: Mutation score $MUTATION_SCORE% is below 80%"
  exit 1
fi
# Expected: Mutation score 80%+
```

### Manual Verification Checklist

- [ ] Phase 11 markers present (ProviderManager fully implemented)
- [ ] Implementation verification document created
- [ ] All ProviderManager tests pass
- [ ] No test modifications made during implementation
- [ ] Implementation follows pseudocode exactly
- [ ] No debug code exists in implementation
- [ ] Mutation testing passes with 80%+ score

## Success Criteria

- ProviderManager fully implemented with unified conversation integration
- All existing tests pass
- Implementation follows pseudocode exactly
- No test modifications made during implementation
- No debug code in production implementation
- Mutation score 80%+ for ProviderManager

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/providers/verification/providermanager-impl-verification.md
   git checkout -- packages/core/src/providers/ProviderManager.ts
   ```
2. Files to revert: ProviderManager implementation verification file and ProviderManager.ts
3. Cannot proceed to Phase 12 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P11a.md`
Contents:

```markdown
Phase: P11a
Completed: 2025-08-23
Files Created: 
- packages/core/src/providers/verification/providermanager-impl-verification.md
Files Modified: 
- packages/core/src/providers/index.ts
Tests Added: 0
Verification: [paste of verification command outputs]
```