# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 10: ProviderManager TDD Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P10`

## Prerequisites

- Required: Phase 09 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P09" packages/core/src/providers/`
- Expected files from previous phase:
  - `packages/core/src/providers/ProviderManager.ts` (with stub modifications)

## Implementation Tasks

### Files to Create

- `packages/core/src/providers/ProviderManager.unification.test.ts` - Behavioral tests for unified conversation integration
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P10`
  - MUST include: `@requirement:REQ-003.1`
  - MUST include: `@requirement:REQ-003.3`

### Files to Modify

- `packages/core/src/providers/types.test.ts`
  - Line 1: Add test suite for provider manager types with unified system
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P10`
  - Implements: `@requirement:REQ-003`

## Required Code Markers

Every test created in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P10
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
grep -r "@plan:PLAN-20250823-UNIFICATION.P10" packages/core/src/providers/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-003" packages/core/src/providers/ | grep "test" | wc -l
# Expected: 2+ occurrences

# Run phase-specific tests (will naturally fail until implementation)
npm test -- --grep "@plan:.*P10" packages/core/src/providers/
# Expected: Tests exist but fail with natural errors (not NotImplemented)
```

### Manual Verification Checklist

- [ ] Phase 09 markers present (ProviderManager stub)
- [ ] ProviderManager.unification.test.ts file created with behavioral tests
- [ ] Tests follow proper behavioral pattern (no mocks, no reverse testing)
- [ ] Tests naturally fail with real behavior expectations
- [ ] All requirements covered with actual assertions
- [ ] At least 30% property-based tests included
- [ ] No structure-only testing ("toBeDefined" etc.)

## Success Criteria

- ProviderManager behavioral tests for unified conversation integration created
- Tests naturally fail (no NotImplemented patterns)
- All requirements (REQ-003.1 and REQ-003.3) covered in tests
- 30%+ property-based tests to validate edge cases
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/providers/ProviderManager.unification.test.ts
   git checkout -- packages/core/src/providers/types.test.ts
   ```
2. Files to revert: ProviderManager test files
3. Cannot proceed to Phase 11 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P10.md`
Contents:

```markdown
Phase: P10
Completed: 2025-08-23
Files Created: 
- packages/core/src/providers/ProviderManager.unification.test.ts
Files Modified: 
- packages/core/src/providers/types.test.ts
Tests Added: [count of new tests]
Verification: [paste of verification command outputs]
```