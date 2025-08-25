# Phase 13a: Integration TDD Verification

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P13A`

## Prerequisites
- Required: Phase 13 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P13" .`

## Purpose
Verify that the CLI integration behavioral tests were created correctly and will fail naturally with 
the current stub implementations.

## Verification Tasks

### Automated Checks
```bash
# Check plan markers exist from P13
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P13" . | wc -l
# Expected: 4+ occurrences

# Check requirements covered in tests
grep -r "@requirement:REQ-004" packages/cli/src/ui/commands/test/ | wc -l
# Expected: 3+ occurrences

# Run tests to verify they fail naturally (not with NotYetImplemented)
npm test -- --grep "provider alias" 2>&1 | grep -E "(Cannot read|is not a function|Cannot find|ProviderNotFoundError)" || echo "Tests fail naturally"
# Expected: Test failures with natural error messages, not stub exceptions

# Check for proper behavioral test structure in CLI tests
grep -r "@scenario\|@given\|@when\|@then" packages/cli/src/ui/commands/test/ | wc -l
# Expected: 10+ occurrences

# Check that no tests expect NotYetImplemented exceptions (reverse testing)
grep -r "expect.*NotYetImplemented\|toThrow.*NotYetImplemented" packages/cli/src/ui/commands/test/ && echo "FAIL: Reverse testing found" || echo "PASS: No reverse testing"
# Expected: PASS - No reverse testing found

# Check requirements covered in ProviderManager integration tests
grep -r "@requirement:REQ-003" packages/core/src/providers/test/ProviderManager.integration.test.ts | wc -l
# Expected: 3+ occurrences
```

### Manual Verification Checklist
- [ ] providerCommand.alias.test.ts file created testing complete CLI command flow
- [ ] ProviderManager.integration.test.ts file created testing integration points
- [ ] Tests follow behavioral pattern (no mock verification)
- [ ] Tests naturally fail with current stub implementation
- [ ] All tests tagged with plan P13 markers
- [ ] Test structure includes @scenario, @given, @when, @then markers (10+ occurrences)

## Success Criteria
- 4+ plan markers found from P13 test implementation
- 3+ requirement markers found for REQ-004 in CLI test files
- Tests follow proper behavioral pattern without reverse testing
- Tests naturally fail with current stub implementations
- 10+ occurrences of behavioral markers (@scenario, @given, @when, @then) in CLI tests

## Failure Recovery
If this verification phase fails:
1. Identify missing or incorrect plan markers in tests
2. Verify test files were created with proper behavioral assertions
3. Check that tests don't expect NotYetImplemented patterns
4. Ensure tests fail naturally with meaningful error messages

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P13A.md`
Contents will include:
- Results of automated checks
- Verification that all manual checklist items were completed
- Summary of test files created and modified