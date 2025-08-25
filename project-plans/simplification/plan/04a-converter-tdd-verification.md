# Phase 04a: Converter TDD Verification

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P04a`

## Verification Tasks

### Automated Checks

```bash
# Tests exist and are behavioral
echo "Verifying TDD tests..."

# Check for mock theater
grep -r "toHaveBeenCalled\|toHaveBeenCalledWith" packages/core/src/providers/converters/
[ $? -ne 0 ] || { echo "FAIL: Mock verification found"; exit 1; }

# Check for reverse testing
grep -r "NotYetImplemented\|toThrow.*NotYet" packages/core/src/providers/converters/
[ $? -ne 0 ] || { echo "FAIL: Reverse testing found"; exit 1; }

# Check for behavioral assertions
grep -c "toBe\|toEqual\|toMatch" packages/core/src/providers/converters/converters.test.ts
ASSERTION_COUNT=$?
[ $ASSERTION_COUNT -ge 10 ] || { echo "FAIL: Insufficient behavioral assertions"; exit 1; }

# Property-based testing (30% minimum)
TOTAL_TESTS=$(grep -c "it(" packages/core/src/providers/converters/converters.test.ts)
PROPERTY_TESTS=$(grep -c "test.prop\|fc.assert" packages/core/src/providers/converters/converters.test.ts)
PERCENTAGE=$((PROPERTY_TESTS * 100 / TOTAL_TESTS))
[ $PERCENTAGE -ge 30 ] || { echo "FAIL: Only $PERCENTAGE% property tests (need 30%)"; exit 1; }

# Tests should fail with stubs
npm test packages/core/src/providers/converters/ 2>&1 | grep -q "fail"
[ $? -eq 0 ] || { echo "FAIL: Tests not failing with stubs"; exit 1; }
```

### Manual Verification Checklist

- [ ] Tests expect real behavior
- [ ] No testing for NotYetImplemented  
- [ ] 30% property-based tests minimum
- [ ] Each test has BDD comments
- [ ] Tests fail naturally with stubs
- [ ] Behavioral contracts defined

## Success Criteria
- All tests behavioral
- No mock theater
- Property testing present
- Ready for implementation