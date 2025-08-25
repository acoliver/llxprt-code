# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 19: Gemini Provider TDD Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P19`

## Prerequisites

- Required: Phase 18 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P18" packages/core/src/providers/gemini/`
- Expected files from previous phase:
  - `packages/core/src/providers/gemini/GeminiProvider.ts` (modified)

## Implementation Tasks

### Files to Create

- `packages/core/src/providers/gemini/GeminiProvider.unification.test.ts` - Behavioral tests for Gemini provider unified integration
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P19`
  - MUST include: `@requirement:REQ-003.1`
  - MUST include: `@requirement:REQ-003.2`

### Files to Modify

- `packages/core/src/providers/gemini/types.test.ts`
  - Line 1: Add test suite for Gemini provider types with unified system
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P19`
  - Implements: `@requirement:REQ-001.4`
  - Implements: `@requirement:REQ-003.1`

## Required Code Markers

Every test created in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P19
 * @requirement REQ-XXX
 * @scenario [description of test scenario]
 * @given [input data]
 * @when [action being tested]
 * @then [expected outcome]
 */
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P19" packages/core/src/providers/gemini/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-3]" packages/core/src/providers/gemini/ | grep "test" | wc -l
# Expected: 3+ occurrences

# Run phase-specific tests (will naturally fail until implementation)
npm test -- --grep "@plan:.*P19" packages/core/src/providers/gemini/
# Expected: Tests exist but fail with natural errors (not NotImplemented)
```

### Manual Verification Checklist

- [ ] Phase 18 markers present (Gemini stub)
- [ ] GeminiProvider.unification.test.ts file created with behavioral tests
- [ ] Tests follow proper behavioral pattern (no mocks, no reverse testing)
- [ ] Tests naturally fail with real behavior expectations
- [ ] All requirements covered with actual assertions
- [ ] At least 30% property-based tests included
- [ ] No structure-only testing ("toBeDefined" etc.)

## Success Criteria

- Gemini provider behavioral tests for unified integration created
- Tests naturally fail (no NotImplemented patterns)
- All requirements covered (REQ-001.4, REQ-003.1, REQ-003.2)
- 30%+ property-based tests to validate edge cases
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/providers/gemini/GeminiProvider.unification.test.ts
   git checkout -- packages/core/src/providers/gemini/types.test.ts
   ```
2. Files to revert: Gemini test files
3. Cannot proceed to Phase 20 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P19.md`
Contents:

```markdown
Phase: P19
Completed: 2025-08-23
Files Created: 
- packages/core/src/providers/gemini/GeminiProvider.unification.test.ts
Files Modified: 
- packages/core/src/providers/gemini/types.test.ts
Tests Added: [count of new tests]
Verification: [paste of verification command outputs]
```