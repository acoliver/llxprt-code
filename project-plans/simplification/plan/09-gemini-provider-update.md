# Phase 09: Gemini Provider Update

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P09`

## Prerequisites
- Required: Phase 08a completed (Anthropic provider integrated)
- Verification: Both OpenAI and Anthropic using Content[]

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/gemini/GeminiProvider.ts`
  - MODIFY generateChatCompletion to accept Content[] directly
  - REMOVE convertMessagesToGeminiFormat method (no longer needed)
  - REMOVE IMessage imports and references
  - Simplify since Content[] is already Gemini format

### Implementation

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P09
 * @requirement REQ-003.3
 */
class GeminiProvider extends BaseProvider {
  async *generateChatCompletion(
    contents: Content[], // Already in correct format!
    tools?: ITool[],
    toolFormat?: string
  ): AsyncIterableIterator<Content> {
    // No conversion needed - Content[] is Gemini's native format
    
    // Determine auth and make API call
    const authToken = await this.determineBestAuth();
    
    // Create appropriate client based on auth mode
    // ... existing auth logic ...
    
    // Use contents directly (no conversion)
    const request = {
      model: this.currentModel,
      contents, // Direct pass-through!
      config: {
        tools: this.convertToolsToGeminiFormat(tools),
        ...this.modelParams
      }
    };
    
    // Stream responses (already Content format)
    for await (const response of stream) {
      yield response; // Already Content!
    }
  }
  
  // DELETE convertMessagesToGeminiFormat method entirely
}
```

## Verification Commands

```bash
# Verify convertMessagesToGeminiFormat removed
grep "convertMessagesToGeminiFormat" packages/core/src/providers/gemini/GeminiProvider.ts
# Expected: No occurrences

# Verify Content[] used directly
grep "contents," packages/core/src/providers/gemini/GeminiProvider.ts | grep -v "//"
# Expected: Direct usage in request

# Type check
npm run typecheck
# Expected: No errors
```

## Success Criteria
- GeminiProvider simplified
- No format conversion needed
- Direct Content[] pass-through
- All three providers aligned