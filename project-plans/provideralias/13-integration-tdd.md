# Phase 13: Integration TDD Implementation

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P13`

## Prerequisites
- Required: Phase 12 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P12" .`
- Expected files from previous phase:
  - `packages/cli/src/ui/commands/test/providerCommand.alias.test.ts`

## Purpose
Create comprehensive behavioral tests for the CLI integration functionality that will naturally fail with current stub implementations.

## Implementation Tasks

### Files to Modify
- `packages/cli/src/ui/commands/test/providerCommand.alias.test.ts` - Tests for provider command alias integration
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P13`
  - MUST include: `@requirement:REQ-004`
  - Test complete command flow for valid aliases
  - Test error handling for non-existent aliases
  - Test proper settings application through command flow

- `packages/core/src/providers/test/ProviderManager.integration.test.ts` - Integration tests between ProviderManager and aliases
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P13`
  - MUST include: `@requirement:REQ-003`
  - Test listing providers includes aliases
  - Test switching providers resolves aliases correctly
  - Test integration with SettingsService for applying settings

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
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P13" . | wc -l
# Expected: 4+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-004" packages/cli/src/ui/commands/test/ | wc -l
# Expected: 3+ occurrences

# Run phase-specific tests - should fail naturally
npm test -- --grep "provider alias" 2>&1 | grep -E "(Cannot read|is not a function|Cannot find|ProviderNotFoundError)"
# Expected: Test failures with natural error messages

# Check for proper behavioral test structure
grep -r "@scenario\|@given\|@when\|@then" packages/cli/src/ui/commands/test/ | wc -l
# Expected: 10+ occurrences
```

### Manual Verification Checklist
- [ ] providerCommand.alias.test.ts file created testing complete CLI command flow
- [ ] ProviderManager.integration.test.ts file created testing integration points
- [ ] Tests follow behavioral pattern (no mock verification)
- [ ] Tests naturally fail with current stub implementation
- [ ] All tests tagged with plan and requirement IDs
- [ ] Test structure includes @scenario, @given, @when, @then markers

## Success Criteria
- 8+ behavioral tests for CLI provider command with aliases
- 5+ integration tests for ProviderManager with aliases
- All tests naturally fail with current stub implementation
- No reverse testing patterns (expect().toThrow('NotYetImplemented'))
- Tests are tagged with P13 markers

## Failure Recovery
If this phase fails:
1. `git checkout -- packages/cli/src/ui/commands/test/`
2. Re-create tests with proper behavioral patterns
3. Ensure tests naturally fail without expecting stub exceptions
4. Cannot proceed to Phase 14 until validation tests fail correctly

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P13.md`
Contents will include:
- Tests created with coverage stats
- Verification that all tests fail naturally with stubs
- Behavioral test structure validation