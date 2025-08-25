# Phase 04: Alias Loader TDD Implementation

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P04`

## Prerequisites
- Required: Phase 03 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P03" .`
- Expected files from previous phase:
  - `packages/core/src/providers/ProviderAliasSchema.ts`
  - `packages/core/src/providers/AliasLoader.ts`
  - Modified `packages/core/src/providers/ProviderManager.ts`

## Purpose
Create comprehensive behavioral tests for the alias loader functionality that will naturally fail with current stub implementations.

## Implementation Tasks

### Files to Create
- `packages/core/src/providers/test/ProviderAliasSchema.test.ts` - Tests for Zod schema validation
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P04`
  - MUST include: `@requirement:REQ-007.1`
  - Test valid alias configurations pass validation
  - Test invalid alias configurations fail validation
  - Test edge cases in validation

- `packages/core/src/providers/test/AliasLoader.test.ts` - Tests for alias loading functionality
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P04`
  - MUST include: `@requirement:REQ-002`
  - Test loading pre-configured aliases
  - Test loading user aliases
  - Test handling naming conflicts between pre-configured and user aliases
  - Test behavior with missing directories
  - Test behavior with invalid JSON files

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
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P04" . | wc -l
# Expected: 4+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-007.1" packages/core/src/providers/test/ | wc -l
# Expected: 2+ occurrences

# Run phase-specific tests - should fail naturally
npm test -- --grep "alias loader" 2>&1 | grep -E "(Cannot read|is not a function|Cannot find)"
# Expected: Test failures with natural error messages

# Check for proper behavioral test structure
grep -r "@scenario\|@given\|@when\|@then" packages/core/src/providers/test/ | wc -l
# Expected: 15+ occurrences
```

### Manual Verification Checklist
- [ ] AliasLoader.test.ts file created testing all specified behaviors
- [ ] ProviderAliasSchema.test.ts file created testing validation rules
- [ ] Tests follow behavioral pattern (no mock verification)
- [ ] Tests naturally fail with current stub implementation
- [ ] All tests tagged with plan and requirement IDs
- [ ] Test structure includes @scenario, @given, @when, @then markers

## Success Criteria
- 10+ behavioral tests for alias loading functionality
- 5+ tests for schema validation
- All tests naturally fail with current stub implementation
- No reverse testing patterns (expect().toThrow('NotYetImplemented'))
- Tests are tagged with P04 markers

## Failure Recovery
If this phase fails:
1. `git checkout -- packages/core/src/providers/test/`
2. Re-create tests with proper behavioral patterns
3. Ensure tests naturally fail without expecting stub exceptions
4. Cannot proceed to Phase 05 until validation tests fail correctly

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P04.md`
Contents will include:
- Tests created with coverage stats
- Verification that all tests fail naturally with stubs
- Behavioral test structure validation