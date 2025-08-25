# Phase 09a: Gemini Provider Update Verification

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P09a`

## Verification Tasks

### Automated Checks

```bash
# All three providers use Content[]
for provider in openai anthropic gemini; do
  grep "Content\[\]" packages/core/src/providers/$provider/*Provider.ts
  [ $? -eq 0 ] || { echo "FAIL: $provider not using Content[]"; exit 1; }
done

# No IMessage in any provider
for provider in openai anthropic gemini; do
  grep "IMessage" packages/core/src/providers/$provider/*Provider.ts | grep -v "//"
  [ $? -ne 0 ] || { echo "FAIL: IMessage still in $provider"; exit 1; }
done

# GeminiProvider simplified
grep "convertMessagesToGeminiFormat" packages/core/src/providers/gemini/GeminiProvider.ts
[ $? -ne 0 ] || { echo "FAIL: Conversion method still present"; exit 1; }

# All provider tests pass
npm test packages/core/src/providers/
[ $? -eq 0 ] || { echo "FAIL: Provider tests failing"; exit 1; }
```

### Manual Verification Checklist

- [ ] All three providers have consistent signatures
- [ ] GeminiProvider simplified (no conversion)
- [ ] Content[] flows through directly
- [ ] All provider tests passing
- [ ] Ready for wrapper integration

## Success Criteria
- All providers aligned on Content[]
- No format conversions in Gemini
- Tests passing for all providers