# Phase 11a: Provider Tests Update Verification

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P11a`

## Verification Tasks

### Automated Checks

```bash
# No IMessage in tests
grep -r "IMessage" packages/core/src/providers --include="*.test.ts" | grep -v "//"
[ $? -ne 0 ] || { echo "FAIL: IMessage still in tests"; exit 1; }

# Content[] used in tests
CONTENT_COUNT=$(grep -r "Content\[\]" packages/core/src/providers --include="*.test.ts" | wc -l)
[ $CONTENT_COUNT -ge 20 ] || { echo "FAIL: Insufficient Content[] usage in tests"; exit 1; }

# All provider tests pass
npm test packages/core/src/providers/
[ $? -eq 0 ] || { echo "FAIL: Provider tests failing"; exit 1; }

# Property-based testing check (30% minimum)
for dir in openai anthropic gemini; do
  TEST_FILE="packages/core/src/providers/$dir/${dir}Provider.test.ts"
  if [ -f "$TEST_FILE" ]; then
    TOTAL=$(grep -c "it(\|test(" "$TEST_FILE")
    PROPERTY=$(grep -c "test.prop\|fc.assert" "$TEST_FILE")
    if [ $TOTAL -gt 0 ]; then
      PERCENT=$((PROPERTY * 100 / TOTAL))
      [ $PERCENT -ge 30 ] || { echo "FAIL: $dir has only $PERCENT% property tests"; exit 1; }
    fi
  fi
done

# Behavioral assertions present
grep -r "toBe\|toEqual\|toMatch" packages/core/src/providers --include="*.test.ts" | wc -l
ASSERTION_COUNT=$?
[ $ASSERTION_COUNT -ge 50 ] || { echo "FAIL: Insufficient behavioral assertions"; exit 1; }
```

### Manual Verification Checklist

- [ ] All tests updated to Content[]
- [ ] 30% property-based tests in each file
- [ ] Behavioral assertions present
- [ ] No mock theater
- [ ] Tests cover edge cases

## Success Criteria
- Tests fully migrated
- High property test coverage
- All tests passing
- Ready for integration phases