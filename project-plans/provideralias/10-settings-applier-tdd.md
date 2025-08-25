# Phase 10: Settings Applier TDD Implementation

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P10`

## Prerequisites
- Required: Phase 09 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P09" .`
- Expected files from previous phase:
  - `packages/core/src/providers/ProviderAliasSettingsApplier.ts`
  - Modified `packages/core/src/providers/ProviderManager.ts`

## Purpose
Create comprehensive behavioral tests for the settings applier functionality that will naturally fail with current stub implementations.

## Implementation Tasks

### Files to Create
- `packages/core/src/providers/test/ProviderAliasSettingsApplier.test.ts` - Tests for settings applier functionality
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P10`
  - MUST include: `@requirement:REQ-005`
  - Test applying provider settings through SettingsService
  - Test applying ephemeral settings through SettingsService
  - Test applying model parameters through provider
  - Test with various alias configurations

- `packages/core/src/providers/test/ProviderManagerWithAliases.test.ts` - Integration tests for provider manager with aliases
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P10`
  - MUST include: `@requirement:REQ-004`
  - Test `/provider <alias-name>` command resolving aliases to base providers
  - Test `/provider <alias-name>` command applying alias-specific settings
  - Verify complete integration flow from command to settings application

### Required Test Structure
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
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P10" . | wc -l
# Expected: 4+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-005" packages/core/src/providers/test/ | wc -l
# Expected: 6+ occurrences

# Run phase-specific tests - should fail naturally
npm test -- --grep "alias settings" 2>&1 | grep -E "(Cannot read|is not a function|Cannot find|ProviderNotFoundError)"
# Expected: Test failures with natural error messages

# Check for proper behavioral test structure
grep -r "@scenario\|@given\|@when\|@then" packages/core/src/providers/test/ | wc -l
# Expected: 25+ occurrences
```

### Manual Verification Checklist
- [ ] ProviderAliasSettingsApplier.test.ts file created testing all specified behaviors
- [ ] ProviderManagerWithAliases.test.ts file created testing CLI integration
- [ ] Tests follow behavioral pattern (no mock verification)
- [ ] Tests naturally fail with current stub implementation
- [ ] All tests tagged with plan and requirement IDs
- [ ] Test structure includes @scenario, @given, @when, @then markers

## Success Criteria
- 10+ behavioral tests for settings applier functionality
- 5+ integration tests for CLI provider command
- All tests naturally fail with current stub implementation
- No reverse testing patterns (expect().toThrow('NotYetImplemented'))
- Tests are tagged with P10 markers

## Failure Recovery
If this phase fails:
1. `git checkout -- packages/core/src/providers/test/`
2. Re-create tests with proper behavioral patterns
3. Ensure tests naturally fail without expecting stub exceptions
4. Cannot proceed to Phase 11 until validation tests fail correctly

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P10.md`
Contents will include:
- Tests created with coverage stats
- Verification that all tests fail naturally with stubs
- Behavioral test structure validation