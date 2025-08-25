# Phase 14a: ProviderContentGenerator Verification

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P14a`

## Verification Tasks

### Automated Checks

```bash
# ProviderContentGenerator uses Content[] directly
grep "request.contents" packages/core/src/core/ProviderContentGenerator.ts
[ $? -eq 0 ] || { echo "FAIL: Not using request.contents"; exit 1; }

# No IMessage conversion
grep "IMessage\|convertToIMessages\|convertFromProviderResponse" packages/core/src/core/ProviderContentGenerator.ts | grep -v "//"
[ $? -ne 0 ] || { echo "FAIL: Still has IMessage conversion"; exit 1; }

# TypeScript compilation
npm run typecheck -- --noEmit
[ $? -eq 0 ] || { echo "FAIL: TypeScript errors"; exit 1; }

# All tests pass
npm test packages/core/src/core/ProviderContentGenerator.test.ts
[ $? -eq 0 ] || { echo "FAIL: Tests failing"; exit 1; }

# Mutation testing (80% minimum)
npx stryker run --mutate packages/core/src/core/ProviderContentGenerator.ts
MUTATION_SCORE=$(jq -r '.metrics.mutationScore' .stryker-tmp/reports/mutation-report.json)
[ $(echo "$MUTATION_SCORE >= 80" | bc) -eq 1 ] || { echo "FAIL: Mutation score $MUTATION_SCORE% < 80%"; exit 1; }

# Property-based testing check (30% minimum)
TEST_FILE="packages/core/src/core/ProviderContentGenerator.test.ts"
TOTAL=$(grep -c "it(\|test(" "$TEST_FILE")
PROPERTY=$(grep -c "test.prop\|fc.assert" "$TEST_FILE")
if [ $TOTAL -gt 0 ]; then
  PERCENT=$((PROPERTY * 100 / TOTAL))
  [ $PERCENT -ge 30 ] || { echo "FAIL: Only $PERCENT% property tests (need 30%)"; exit 1; }
fi

# Integration with wrapper
grep "GeminiCompatibleWrapper" packages/core/src/core/ProviderContentGenerator.ts
[ $? -eq 0 ] || { echo "FAIL: Not using GeminiCompatibleWrapper"; exit 1; }
```

### Manual Verification Checklist

- [ ] ProviderContentGenerator fully updated
- [ ] Content[] flows directly to providers
- [ ] No intermediate conversions
- [ ] Integration with wrapper complete
- [ ] Mutation score >= 80%
- [ ] Property tests >= 30%

## Success Criteria
- Direct Content[] pass-through verified
- High test coverage achieved
- No format conversions remain
- Ready for final integration