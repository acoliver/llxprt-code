# Phase 11: Provider Tests Update

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P11`

## Prerequisites
- Required: Phase 10a completed (interfaces updated)
- Verification: All providers using Content[]

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/openai/OpenAIProvider.test.ts`
  - UPDATE all tests to use Content[] instead of IMessage[]
  - REMOVE tests that check IMessage structure
  - ADD tests for Content[] handling

- `packages/core/src/providers/anthropic/AnthropicProvider.test.ts`
  - UPDATE all tests to use Content[] instead of IMessage[]
  - REMOVE validateAndFixMessages tests
  - ADD converter integration tests

- `packages/core/src/providers/gemini/GeminiProvider.test.ts`
  - UPDATE to verify direct Content[] pass-through
  - REMOVE convertMessagesToGeminiFormat tests
  - ADD tests for simplified flow

### Test Example

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P11
 * @requirement REQ-INT-001.3
 */
describe('Provider with Content[]', () => {
  it('should handle Content[] input', async () => {
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi!' }] }
    ];
    
    const provider = new OpenAIProvider();
    const responses: Content[] = [];
    
    for await (const response of provider.generateContent(contents)) {
      responses.push(response);
    }
    
    expect(responses.length).toBeGreaterThan(0);
    expect(responses[0].role).toBe('model');
  });
  
  // Property-based test (30% requirement)
  test.prop([fc.array(fc.record({
    role: fc.constantFrom('user', 'model'),
    parts: fc.array(fc.record({ text: fc.string() }))
  }))])('handles any valid Content[]', async (contents) => {
    const provider = new OpenAIProvider();
    const result = provider.generateContent(contents);
    expect(result).toBeDefined();
  });
});
```

## Verification Commands

```bash
# All provider tests updated
grep -r "IMessage" packages/core/src/providers/*/\*.test.ts | grep -v "//"
# Expected: No occurrences

# Tests use Content[]
grep -r "Content\[\]" packages/core/src/providers/*/\*.test.ts | wc -l
# Expected: Many occurrences

# Tests pass
npm test packages/core/src/providers/
# Expected: All pass

# Property-based tests present (30%)
for test in packages/core/src/providers/*/\*.test.ts; do
  TOTAL=$(grep -c "it(\|test(" $test)
  PROPERTY=$(grep -c "test.prop\|fc." $test)
  if [ $TOTAL -gt 0 ]; then
    PERCENT=$((PROPERTY * 100 / TOTAL))
    [ $PERCENT -ge 30 ] || echo "WARN: $test has only $PERCENT% property tests"
  fi
done
```

## Success Criteria
- All tests updated to Content[]
- 30% property-based tests
- No IMessage references
- All tests passing