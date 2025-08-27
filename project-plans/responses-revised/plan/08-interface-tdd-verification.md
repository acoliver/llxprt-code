# Phase 08a: Interface TDD Verification

## Phase ID
`PLAN-20250826-RESPONSES.P08a`

## Task Description

Verify TDD tests are behavioral, include property-based testing (30% minimum), and will achieve mutation testing score (80% minimum).

## Input Files

- `/packages/core/src/providers/IProvider.test.ts`
- Test files for callers identified in domain-model.md

## Verification Checklist

### Test Quality
- [ ] Tests expect ACTUAL BEHAVIOR
- [ ] NO testing for NotYetImplemented
- [ ] NO reverse tests (expect().not.toThrow())
- [ ] Tests fail naturally (not "cannot find")
- [ ] Behavioral assertions (toBe, toEqual) not structure checks

### Property-Based Testing (30% MINIMUM)
- [ ] Property-based tests present
- [ ] At least 30% of tests are property-based
- [ ] Use fast-check or similar library
- [ ] Test invariants, not specific values

### Mock Theater Detection
- [ ] NO expect(mock).toHaveBeenCalled()
- [ ] NO testing mock configuration
- [ ] NO structure-only tests (toHaveProperty)
- [ ] Tests verify real behavior

## Verification Commands

```bash
# Check for behavioral tests
grep -E "toBe\(|toEqual\(|toMatch\(|toContain\(" packages/core/src/providers/IProvider.test.ts
# Expected: Multiple occurrences

# Check for property-based tests
grep -E "test\.prop|fc\.assert|property\(" packages/core/src/providers/IProvider.test.ts
# Expected: At least 30% of tests

# Check for mock theater (BAD)
grep -E "toHaveBeenCalled|toHaveBeenCalledWith" packages/core/src/providers/IProvider.test.ts
# Expected: 0 occurrences

# Check for reverse testing (BAD)
grep -E "NotYetImplemented|not\.toThrow" packages/core/src/providers/IProvider.test.ts
# Expected: 0 occurrences

# Count total tests vs property tests
TOTAL=$(grep -c "it\(\\|test\(" packages/core/src/providers/IProvider.test.ts)
PROPERTY=$(grep -c "test\.prop\|fc\." packages/core/src/providers/IProvider.test.ts)
PERCENTAGE=$((PROPERTY * 100 / TOTAL))
echo "Property test percentage: $PERCENTAGE%"
# Expected: >= 30%

# Run tests (should fail naturally)
npm test packages/core/src/providers/IProvider.test.ts 2>&1 | head -20
# Expected: Tests fail with actual errors, not NotYetImplemented
```

## Mutation Testing Preparation

```bash
# Install mutation testing tools if not present
npm list @stryker-mutator/core || npm install --save-dev @stryker-mutator/core

# Prepare stryker config
cat > stryker.conf.js << EOF
module.exports = {
  mutate: ['packages/core/src/providers/**/*.ts'],
  testRunner: 'vitest',
  thresholds: { high: 80, low: 60, break: 50 }
};
EOF
```

## Success Criteria

- Behavioral tests only
- 30%+ property-based tests
- No mock theater
- No reverse testing
- Tests fail naturally
- Ready for 80% mutation score

## Failure Actions

If verification fails:
1. Add more property-based tests
2. Remove mock verification tests
3. Convert structure tests to behavioral
4. Re-run Phase 04 with corrections

## Output

Create verification result:
```json
{
  "phase": "04a",
  "status": "pass|fail",
  "behavioral_tests": true/false,
  "property_test_percentage": 0,
  "mock_theater_found": false,
  "reverse_testing_found": false,
  "ready_for_mutation_testing": true/false,
  "issues": []
}
```

Save to: `/project-plans/responses-revised/verification/04a-result.json`