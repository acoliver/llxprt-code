# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 23: Compression Integration TDD Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P23`

## Prerequisites

- Required: Phase 22 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P22" packages/core/src/conversation/`
- Expected files from previous phase:
  - `packages/core/src/conversation/CompressionIntegration.ts`

## Implementation Tasks

### Files to Create

- `packages/core/src/conversation/CompressionIntegration.test.ts` - Behavioral tests for compression integration
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P23`
  - MUST include: `@requirement:REQ-001.3`
  - MUST include: `@requirement:REQ-003.4`

### Files to Modify

- `packages/core/src/conversation/types.test.ts`
  - Line 1: Add test suite for compression integration types
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P23`
  - Implements: `@requirement:REQ-001.3`

## Required Code Markers

Every test created in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P23
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
grep -r "@plan:PLAN-20250823-UNIFICATION.P23" packages/core/src/conversation/ | grep "test" | wc -l
# Expected: 2+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-4]" packages/core/src/conversation/ | grep "test" | wc -l
# Expected: 2+ occurrences

# Run phase-specific tests (will naturally fail until implementation)
npm test -- --grep "@plan:.*P23" packages/core/src/conversation/
# Expected: Tests exist but fail with natural errors (not NotImplemented)
```

### Manual Verification Checklist

- [ ] Phase 22 markers present (compression stub)
- [ ] CompressionIntegration.test.ts file created with behavioral tests
- [ ] Tests follow proper behavioral pattern (no mocks, no reverse testing)
- [ ] Tests naturally fail with real behavior expectations
- [ ] All requirements covered with actual assertions
- [ ] At least 30% property-based tests included
- [ ] No structure-only testing ("toBeDefined" etc.)

## Success Criteria

- Compression integration behavioral tests created
- Tests naturally fail (no NotImplemented patterns)
- All requirements covered (REQ-001.3, REQ-003.4)
- 30%+ property-based tests to validate edge cases
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/conversation/CompressionIntegration.test.ts
   git checkout -- packages/core/src/conversation/types.test.ts
   ```
2. Files to revert: Compression integration test files
3. Cannot proceed to Phase 24 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P23.md`
Contents:

```markdown
Phase: P23
Completed: 2025-08-23
Files Created: 
- packages/core/src/conversation/CompressionIntegration.test.ts
Files Modified: 
- packages/core/src/conversation/types.test.ts
Tests Added: [count of new tests]
Verification: [paste of verification command outputs]
```