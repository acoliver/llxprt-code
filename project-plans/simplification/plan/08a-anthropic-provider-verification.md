# Phase 08a: Anthropic Provider Integration Verification

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P08a`

## Verification Tasks

### Automated Checks

```bash
# Type check passes
npm run typecheck
[ $? -eq 0 ] || { echo "FAIL: Type errors"; exit 1; }

# Anthropic provider uses Content[]
grep "Content\[\]" packages/core/src/providers/anthropic/AnthropicProvider.ts
[ $? -eq 0 ] || { echo "FAIL: Not using Content[]"; exit 1; }

# validateAndFixMessages removed
grep "validateAndFixMessages" packages/core/src/providers/anthropic/AnthropicProvider.ts
[ $? -ne 0 ] || { echo "FAIL: validateAndFixMessages still present"; exit 1; }

# Converter is used
grep "AnthropicContentConverter" packages/core/src/providers/anthropic/AnthropicProvider.ts
[ $? -eq 0 ] || { echo "FAIL: Converter not integrated"; exit 1; }

# Both providers now use Content[]
for provider in openai anthropic; do
  grep "generateChatCompletion.*Content\[\]" packages/core/src/providers/$provider/*.ts
  [ $? -eq 0 ] || { echo "FAIL: $provider not using Content[]"; exit 1; }
done
```

### Manual Verification Checklist

- [ ] AnthropicProvider accepts Content[]
- [ ] Message validation logic removed
- [ ] Converter handles format translation
- [ ] Both providers have same signature
- [ ] Ready for Gemini provider update

## Success Criteria
- Two providers migrated
- Consistent interfaces
- All tests passing