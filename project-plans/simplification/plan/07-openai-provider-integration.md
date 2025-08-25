# Phase 07: OpenAI Provider Integration

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P07`

## Prerequisites
- Required: Phase 05-06 completed (converters implemented)
- Verification: OpenAIContentConverter fully functional

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/openai/OpenAIProvider.ts`
  - MODIFY generateChatCompletion signature to accept Content[]
  - ADD OpenAIContentConverter as private member
  - UPDATE implementation to use converter
  - REMOVE IMessage[] handling code
  - Reference pseudocode lines 140-163

### Integration Points

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P07
 * @requirement REQ-003.1
 * @pseudocode lines 140-163
 */
class OpenAIProvider extends BaseProvider {
  private converter = new OpenAIContentConverter();
  
  async *generateChatCompletion(
    contents: Content[], // Changed from IMessage[]
    tools?: ITool[],
    toolFormat?: string
  ): AsyncIterableIterator<Content> { // Returns Content not IMessage
    // Pseudocode line 149: Convert Content[] to OpenAI format
    const messages = this.converter.toProviderFormat(contents);
    
    // Pseudocode line 152-156: Make API call
    const stream = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      stream: true
    });
    
    // Pseudocode line 159-162: Stream responses
    for await (const chunk of stream) {
      const content = this.converter.fromProviderFormat(chunk);
      yield content;
    }
  }
}
```

### Files That Import This Provider

- `packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts`
  - Will now pass Content[] directly
- `packages/core/src/providers/ProviderManager.ts`
  - Provider registry unchanged
- `packages/core/src/providers/openai/OpenAIProvider.test.ts`
  - Update tests to use Content[] instead of IMessage[]

## Verification Commands

```bash
# Type check
npm run typecheck

# Run OpenAI provider tests
npm test packages/core/src/providers/openai/
# Expected: Tests may need updating

# Verify Content[] usage
grep "Content\[\]" packages/core/src/providers/openai/OpenAIProvider.ts
# Expected: Multiple occurrences

# Verify IMessage removed
grep "IMessage" packages/core/src/providers/openai/OpenAIProvider.ts
# Expected: No occurrences (or only in comments)
```

## Success Criteria
- OpenAIProvider accepts Content[] instead of IMessage[]
- Converter properly integrated
- Existing functionality preserved
- Tests updated and passing