# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 08a: ToolCallTrackerService Implementation Verification

## Phase ID

`PLAN-20250823-UNIFICATION.P08a`

## Prerequisites

- Required: Phase 08 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P08" packages/core/src/tools/`
- Expected files from previous phase:
  - `packages/core/src/tools/ToolCallTrackerService.ts` (fully implemented)

## Implementation Tasks

### Files to Create

- `packages/core/src/tools/verification/toolcalltracker-impl-verification.md` - Verification document for full implementation
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P08a`
  - MUST include: `@requirement:REQ-002`

### Files to Modify

- `packages/core/src/tools/index.ts`
  - Line 1: Export verification document
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P08a`
  - Implements: `@requirement:REQ-002`

## Required Code Markers

Every verification document created in this phase MUST include:

```markdown
<!-- 
 * @plan PLAN-20250823-UNIFICATION.P08a
 * @requirement REQ-XXX
 * @verification lines 1-N
 -->
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P08a" packages/core/src/tools/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered in implementation
grep -r "@requirement:REQ-002" packages/core/src/tools/ToolCallTrackerService.ts | wc -l
# Expected: 1+ occurrences

# All ToolCallTrackerService tests should now pass
npm test packages/core/src/tools/ToolCallTrackerService.test.ts
# Expected: All tests pass

# No test modifications were made during implementation
git diff packages/core/src/tools/ToolCallTrackerService.test.ts | grep -E "^[+-]" | grep -v "^[+-]{3}"
# Expected: 0 occurrences (tests should not be modified)

# Verify pseudocode was followed
claude --dangerously-skip-permissions -p "
Compare packages/core/src/tools/ToolCallTrackerService.ts with project-plans/unification/analysis/pseudocode/tool-call-tracker-pseudocode.md
Check every numbered line is implemented
Report missing steps to verification-report.txt
" || echo "Verification tool not available, manual check required"

# No debug code in implementation
grep -r "console\.\|TODO\|FIXME\|XXX" packages/core/src/tools/ToolCallTrackerService.ts
# Expected: 0 occurrences

# Run mutation testing for ToolCallTrackerService
npx stryker run --mutate packages/core/src/tools/ToolCallTrackerService.ts
MUTATION_SCORE=$(jq -r '.metrics.mutationScore' .stryker-tmp/reports/mutation-report.json)
if (( $(echo "$MUTATION_SCORE < 80" | bc -l) )); then
  echo "FAIL: Mutation score $MUTATION_SCORE% is below 80%"
  exit 1
fi
# Expected: Mutation score 80%+
```

### Manual Verification Checklist

- [ ] Phase 08 markers present (ToolCallTrackerService fully implemented)
- [ ] Implementation verification document created
- [ ] All ToolCallTrackerService tests pass
- [ ] No test modifications made during implementation
- [ ] Implementation follows pseudocode exactly
- [ ] No debug code exists in implementation
- [ ] Mutation testing passes with 80%+ score

## Success Criteria

- ToolCallTrackerService fully implemented
- All existing tests pass
- Implementation follows pseudocode exactly
- No test modifications made during implementation
- No debug code in production implementation
- Mutation score 80%+ for ToolCallTrackerService

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/tools/verification/toolcalltracker-impl-verification.md
   git checkout -- packages/core/src/tools/ToolCallTrackerService.ts
   ```
2. Files to revert: ToolCallTrackerService implementation verification file and ToolCallTrackerService.ts
3. Cannot proceed to Phase 09 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P08a.md`
Contents:

```markdown
Phase: P08a
Completed: 2025-08-23
Files Created: 
- packages/core/src/tools/verification/toolcalltracker-impl-verification.md
Files Modified: 
- packages/core/src/tools/index.ts
Tests Added: 0
Verification: [paste of verification command outputs]
```