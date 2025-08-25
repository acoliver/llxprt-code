# Phase 08: Anthropic Provider Integration

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P08`

## Prerequisites
- Required: Phase 07a completed (OpenAI provider integrated)
- Verification: OpenAI provider using Content[]

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/anthropic/AnthropicProvider.ts`
  - MODIFY generateChatCompletion signature to accept Content[]
  - ADD AnthropicContentConverter as private member
  - UPDATE implementation to use converter
  - REMOVE IMessage[] handling code
  - REMOVE validateAndFixMessages method
  - Reference pseudocode lines 140-163 (adapted for Anthropic)

### Implementation

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P08
 * @requirement REQ-003.2
 */
class AnthropicProvider extends BaseProvider {
  private converter = new AnthropicContentConverter();
  
  async *generateChatCompletion(
    contents: Content[], // Changed from IMessage[]
    tools?: ITool[],
    toolFormat?: string
  ): AsyncIterableIterator<Content> {
    // Convert Content[] to Anthropic format
    const messages = this.converter.toProviderFormat(contents);
    
    // Make API call
    const response = await this.anthropic.messages.create({
      model: this.model,
      messages,
      stream: true
    });
    
    // Stream responses
    for await (const chunk of response) {
      const content = this.converter.fromProviderFormat(chunk);
      yield content;
    }
  }
}
```

### Files to Update

- `packages/core/src/providers/anthropic/AnthropicProvider.test.ts`
  - Update tests to use Content[] instead of IMessage[]
  - Remove tests for validateAndFixMessages

## Verification Commands

```bash
# Type check
npm run typecheck

# Run Anthropic provider tests
npm test packages/core/src/providers/anthropic/
# Expected: Tests updated and passing

# Verify Content[] usage
grep "Content\[\]" packages/core/src/providers/anthropic/AnthropicProvider.ts
# Expected: Multiple occurrences
```

## Success Criteria
- AnthropicProvider accepts Content[]
- Converter integrated
- validateAndFixMessages removed
- Tests passing