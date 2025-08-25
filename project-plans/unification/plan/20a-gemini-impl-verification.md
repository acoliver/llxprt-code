# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 20a: Gemini Provider Implementation Verification

## Phase ID

`PLAN-20250823-UNIFICATION.P20a`

## Prerequisites

- Required: Phase 20 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P20" packages/core/src/providers/gemini/`
- Expected files from previous phase:
  - `packages/core/src/providers/gemini/GeminiProvider.unification.test.ts`

## Implementation Tasks

### Files to Create

- `packages/core/src/providers/gemini/verification/gemini-impl-verification.md` - Verification document for full implementation
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P20a`
  - MUST include: `@requirement:REQ-003.1`
  - MUST include: `@requirement:REQ-003.2`
  - MUST include: `@requirement:REQ-001.4`
  - MUST include: `@requirement:REQ-002.2`

### Files to Modify

- `packages/core/src/providers/gemini/index.ts`
  - Line 1: Export verification document
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P20a`
  - Implements: `@requirement:REQ-003.1`

## Required Code Markers

Every verification document created in this phase MUST include:

```markdown
<!--
 * @plan PLAN-20250823-UNIFICATION.P20a
 * @requirement REQ-XXX
 * @verification lines 1-N
 -->
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P20a" packages/core/src/providers/gemini/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered in implementation
grep -r "@requirement:REQ-00[1-4]" packages/core/src/providers/gemini/ | wc -l
# Expected: 4+ occurrences

# All Gemini provider tests should now pass
npm test packages/core/src/providers/gemini/ --grep "unification"
# Expected: All tests pass

# No test modifications were made during implementation
git diff packages/core/src/providers/gemini/ | grep -E "^[+-]" | grep -v "^[+-]{3}" | grep "test"
# Expected: 0 occurrences (tests should not be modified)

# Verify pseudocode was followed
claude --dangerously-skip-permissions -p "
Compare packages/core/src/providers/gemini/GeminiProvider.ts with project-plans/unification/analysis/pseudocode/provider-adapter-pseudocode.md
Check every numbered line is implemented
Report missing steps to verification-report.txt
" || echo "Verification tool not available, manual check required"

# No debug code in implementation
grep -r "console\.\|TODO\|FIXME\|XXX" packages/core/src/providers/gemini/GeminiProvider.ts
# Expected: 0 occurrences

# Run mutation testing for Gemini provider
npx stryker run --mutate packages/core/src/providers/gemini/GeminiProvider.ts
MUTATION_SCORE=$(jq -r '.metrics.mutationScore' .stryker-tmp/reports/mutation-report.json)
if (( $(echo "$MUTATION_SCORE < 80" | bc -l) )); then
  echo "FAIL: Mutation score $MUTATION_SCORE% is below 80%"
  exit 1
fi
# Expected: Mutation score 80%+
```

### Manual Verification Checklist

- [ ] Phase 20 markers present (Gemini provider fully implemented)
- [ ] Implementation verification document created
- [ ] All Gemini provider tests pass
- [ ] No test modifications made during implementation
- [ ] Implementation follows pseudocode exactly
- [ ] No debug code exists in implementation
- [ ] Mutation testing passes with 80%+ score

## Success Criteria

- Gemini provider fully implemented
- All existing tests pass
- Implementation follows pseudocode exactly
- No test modifications made during implementation
- No debug code in production implementation
- Mutation score 80%+ for Gemini provider

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/providers/gemini/verification/gemini-impl-verification.md
   git checkout -- packages/core/src/providers/gemini/GeminiProvider.ts
   ```
2. Files to revert: Gemini implementation verification file and GeminiProvider.ts
3. Cannot proceed to Phase 21 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P20a.md`
Contents:

```markdown
Phase: P20a
Completed: 2025-08-23
Files Created: 
- packages/core/src/providers/gemini/verification/gemini-impl-verification.md
Files Modified: 
- packages/core/src/providers/gemini/index.ts
Tests Added: 0
Verification: [paste of verification command outputs]
```