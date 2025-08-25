# Phase 07: Alias Resolver TDD Implementation

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P07`

## Prerequisites
- Required: Phase 06 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P06" .`
- Expected files from previous phase:
  - `packages/core/src/providers/ProviderAliasResolver.ts`
  - Modified `packages/core/src/providers/ProviderManager.ts`

## Purpose
Create comprehensive behavioral tests for the alias resolver functionality that will naturally fail with current stub implementations.

## Implementation Tasks

### Files to Modify
- `packages/core/src/providers/test/ProviderAliasResolver.test.ts` - Tests for alias resolution functionality
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P07`
  - MUST include: `@requirement:REQ-003`
  - Test detection of alias names
  - Test resolution of valid aliases
  - Test error handling for invalid aliases
  - Test with various alias configurations

- `packages/core/src/providers/test/ProviderManager.test.ts` - Tests for provider manager integration
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P07`
  - MUST include: `@requirement:REQ-003`
  - Test listing providers including aliases
  - Test switching to aliases
  - Verify alias resolution in provider switching

## Required Test Structure
Each test must transform INPUT → OUTPUT based on requirements with behavioral assertions:

```typescript
/**
 * @requirement REQ-XXX
 * @scenario [Description of test scenario]
 * @given [Input data]
 * @when [Method being tested]
 * @then [Expected behavior]
 */
```

## Verification Commands

### Automated Checks
```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P07" . | wc -l
# Expected: 4+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-003" packages/core/src/providers/test/ | wc -l
# Expected: 6+ occurrences

# Run phase-specific tests - should fail naturally
npm test -- --grep "alias resolver" 2>&1 | grep -E "(Cannot read|is not a function|Cannot find|ProviderNotFoundError)"
# Expected: Test failures with natural error messages

# Check for proper behavioral test structure
grep -r "@scenario\|@given\|@when\|@then" packages/core/src/providers/test/ | wc -l
# Expected: 25+ occurrences
```

### Manual Verification Checklist
- [ ] ProviderAliasResolver.test.ts file created testing all specified behaviors
- [ ] ProviderManager.test.ts file updated with alias resolution tests
- [ ] Tests follow behavioral pattern (no mock verification)
- [ ] Tests naturally fail with current stub implementation
- [ ] All tests tagged with plan and requirement IDs
- [ ] Test structure includes @scenario, @given, @when, @then markers

## Success Criteria
- 10+ behavioral tests for alias resolution functionality
- 5+ integration tests with ProviderManager
- All tests naturally fail with current stub implementation
- No reverse testing patterns (expect().toThrow('NotYetImplemented'))
- Tests are tagged with P07 markers

## Failure Recovery
If this phase fails:
1. `git checkout -- packages/core/src/providers/test/`
2. Re-create tests with proper behavioral patterns
3. Ensure tests naturally fail without expecting stub exceptions
4. Cannot proceed to Phase 08 until validation tests fail correctly

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P07.md`
Contents will include:
- Tests created with coverage stats
- Verification that all tests fail naturally with stubs
- Behavioral test structure validation