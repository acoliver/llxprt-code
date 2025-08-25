# Phase 04: Settings Schema TDD

## Phase ID

`PLAN-20250823-LOOPDETSET.P04`

## Prerequisites

- Required: Phase 03a completed
- Verification: `test -f project-plans/loopdetset/.completed/P03a-verification.md`

## Implementation Tasks

### Files to Create

- `packages/core/src/types/test/modelParams.loopdetection.spec.ts`
  - MUST include: `@plan:PLAN-20250823-LOOPDETSET.P04`
  - MUST include: `@requirement:REQ-001.1`
  - Test Profile interface with loopDetectionEnabled field
  - Test undefined defaults to hierarchy
  - Test true/false values work

### Test Requirements

```typescript
/**
 * @plan PLAN-20250823-LOOPDETSET.P04
 * @requirement REQ-001.1
 * @scenario Profile with loop detection enabled
 * @given Profile object with loopDetectionEnabled: true
 * @when Profile is loaded
 * @then loopDetectionEnabled field equals true
 */
it('should accept true for loopDetectionEnabled field', () => {
  const profile: Profile = {
    version: 1,
    provider: 'openai',
    model: 'gpt-4',
    modelParams: {},
    ephemeralSettings: {},
    loopDetectionEnabled: true
  };
  expect(profile.loopDetectionEnabled).toBe(true);
});

/**
 * @requirement REQ-001.3
 * @scenario Profile without loop detection field
 * @given Profile object without loopDetectionEnabled
 * @when Field is accessed
 * @then Returns undefined (for hierarchy fallback)
 */
it('should allow undefined loopDetectionEnabled field', () => {
  const profile: Profile = {
    version: 1,
    provider: 'openai',
    model: 'gpt-4',
    modelParams: {},
    ephemeralSettings: {}
    // loopDetectionEnabled intentionally omitted
  };
  expect(profile.loopDetectionEnabled).toBeUndefined();
});
```

### MANDATORY Testing Rules

1. Test ACTUAL BEHAVIOR with real data
2. NO testing for NotYetImplemented
3. NO reverse tests (expect().not.toThrow())
4. Each test must have behavior-driven comments
5. Test true, false, and undefined cases

## Verification Commands

```bash
# Run tests - should pass for schema tests
npm test -- modelParams.loopdetection.spec

# Check for forbidden patterns
! grep -r "toThrow('NotYetImplemented')" packages/core/src/types/test/
! grep -r "expect.*not\\.toThrow()" packages/core/src/types/test/

# Check test count
grep -c "it(" packages/core/src/types/test/modelParams.loopdetection.spec.ts
# Expected: 5+ tests
```

## Success Criteria

- Tests for true, false, undefined values
- Tests pass (schema already added in stub)
- No reverse testing
- Behavioral assertions only

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P04.md`