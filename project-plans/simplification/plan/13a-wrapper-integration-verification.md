# Phase 13a: Wrapper Integration Verification

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P13a`

## Verification Tasks

### Automated Checks

```bash
# Wrapper passes Content[] directly
grep "request\.contents" packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts
[ $? -eq 0 ] || { echo "FAIL: Not using request.contents directly"; exit 1; }

# No IMessage conversion
grep "IMessage\|convertToIMessages" packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts | grep -v "//"
[ $? -ne 0 ] || { echo "FAIL: Still converting to IMessage"; exit 1; }

# Integration test passes
npm test packages/core/src/providers/integration/
[ $? -eq 0 ] || { echo "FAIL: Integration tests failing"; exit 1; }

# All providers work through wrapper
for provider in openai anthropic gemini; do
  echo "Testing $provider through wrapper..."
  # Would need actual integration test here
done

# Mutation testing on wrapper
npx stryker run --mutate packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts
MUTATION_SCORE=$(jq -r '.metrics.mutationScore' .stryker-tmp/reports/mutation-report.json)
[ $(echo "$MUTATION_SCORE >= 80" | bc) -eq 1 ] || { echo "FAIL: Mutation score $MUTATION_SCORE% < 80%"; exit 1; }
```

### Manual Verification Checklist

- [ ] Wrapper integration complete
- [ ] Content[] flows through unchanged
- [ ] All providers work via wrapper
- [ ] Integration tests pass
- [ ] Mutation score >= 80%

## Success Criteria
- Wrapper fully integrated
- No format conversions
- High test coverage