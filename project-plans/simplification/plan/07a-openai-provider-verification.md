# Phase 07a: OpenAI Provider Integration Verification

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P07a`

## Verification Tasks

### Automated Checks

```bash
# Type check passes
npm run typecheck
[ $? -eq 0 ] || { echo "FAIL: Type errors"; exit 1; }

# OpenAI provider uses Content[]
grep "Content\[\]" packages/core/src/providers/openai/OpenAIProvider.ts
[ $? -eq 0 ] || { echo "FAIL: Not using Content[]"; exit 1; }

# IMessage removed from OpenAI provider
grep "IMessage" packages/core/src/providers/openai/OpenAIProvider.ts | grep -v "//"
[ $? -ne 0 ] || { echo "FAIL: IMessage still present"; exit 1; }

# Converter is used
grep "OpenAIContentConverter" packages/core/src/providers/openai/OpenAIProvider.ts
[ $? -eq 0 ] || { echo "FAIL: Converter not integrated"; exit 1; }

# Provider tests updated and passing
npm test packages/core/src/providers/openai/OpenAIProvider.test.ts
[ $? -eq 0 ] || { echo "FAIL: Provider tests failing"; exit 1; }
```

### Integration Test

```typescript
// Test that OpenAI provider works with Content[]
const contents: Content[] = [
  { role: 'user', parts: [{ text: 'Test' }] }
];
const provider = new OpenAIProvider();
for await (const response of provider.generateContent(contents)) {
  expect(response.role).toBe('model');
}
```

### Manual Verification Checklist

- [ ] OpenAIProvider accepts Content[]
- [ ] Converter properly integrated
- [ ] No duplicate conversation cache
- [ ] Streaming works correctly
- [ ] Tool calls handled properly

## Success Criteria
- Provider fully migrated to Content[]
- All tests passing
- Integration verified