# Phase 15a: Final Integration Verification

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P15a`

## Verification Tasks

### Automated Checks

```bash
# IMessage completely removed
test ! -f packages/core/src/types/IMessage.ts
[ $? -eq 0 ] || { echo "FAIL: IMessage.ts still exists"; exit 1; }

# No IMessage references anywhere
IMESSAGE_COUNT=$(grep -r "IMessage" packages/core/src --include="*.ts" | grep -v "//" | wc -l)
[ $IMESSAGE_COUNT -eq 0 ] || { echo "FAIL: Found $IMESSAGE_COUNT IMessage references"; exit 1; }

# All converters exported
grep "export.*OpenAIContentConverter" packages/core/src/index.ts
[ $? -eq 0 ] || { echo "FAIL: OpenAIContentConverter not exported"; exit 1; }

grep "export.*AnthropicContentConverter" packages/core/src/index.ts
[ $? -eq 0 ] || { echo "FAIL: AnthropicContentConverter not exported"; exit 1; }

grep "export.*GeminiContentConverter" packages/core/src/index.ts
[ $? -eq 0 ] || { echo "FAIL: GeminiContentConverter not exported"; exit 1; }

# Full build cycle
npm run format:check
[ $? -eq 0 ] || { echo "FAIL: Format check failed"; exit 1; }

npm run lint:ci
[ $? -eq 0 ] || { echo "FAIL: Lint failed"; exit 1; }

npm run typecheck
[ $? -eq 0 ] || { echo "FAIL: TypeScript compilation failed"; exit 1; }

npm run build
[ $? -eq 0 ] || { echo "FAIL: Build failed"; exit 1; }

npm run test:ci
[ $? -eq 0 ] || { echo "FAIL: Tests failed"; exit 1; }

# Mutation testing on critical paths (80% minimum)
for file in \
  packages/core/src/providers/openai/OpenAIContentConverter.ts \
  packages/core/src/providers/anthropic/AnthropicContentConverter.ts \
  packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts \
  packages/core/src/core/ProviderContentGenerator.ts; do
  
  if [ -f "$file" ]; then
    npx stryker run --mutate "$file"
    SCORE=$(jq -r '.metrics.mutationScore' .stryker-tmp/reports/mutation-report.json)
    [ $(echo "$SCORE >= 80" | bc) -eq 1 ] || { echo "FAIL: $file mutation score $SCORE% < 80%"; exit 1; }
  fi
done

# Property-based testing coverage (30% minimum)
for test in \
  packages/core/src/providers/openai/OpenAIContentConverter.test.ts \
  packages/core/src/providers/anthropic/AnthropicContentConverter.test.ts \
  packages/core/src/providers/gemini/GeminiContentConverter.test.ts; do
  
  if [ -f "$test" ]; then
    TOTAL=$(grep -c "it(\|test(" "$test")
    PROPERTY=$(grep -c "test.prop\|fc.assert" "$test")
    if [ $TOTAL -gt 0 ]; then
      PERCENT=$((PROPERTY * 100 / TOTAL))
      [ $PERCENT -ge 30 ] || { echo "FAIL: $test has only $PERCENT% property tests"; exit 1; }
    fi
  fi
done

# End-to-end integration test
echo "Running end-to-end test with all providers..."
npm run test:e2e
[ $? -eq 0 ] || { echo "FAIL: End-to-end tests failed"; exit 1; }
```

### Manual Verification Checklist

- [ ] IMessage completely removed from codebase
- [ ] All providers use Content[] directly
- [ ] Converters properly integrated
- [ ] No format conversions in main flow
- [ ] All tests passing
- [ ] Mutation coverage >= 80%
- [ ] Property test coverage >= 30%
- [ ] Build and deploy ready

## Success Criteria
- Feature fully implemented
- All requirements met
- High quality verified
- Production ready