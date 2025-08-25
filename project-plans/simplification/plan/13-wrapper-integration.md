# Phase 13: GeminiCompatibleWrapper Integration

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P13`

## Prerequisites
- Required: Phases 07-12 completed (all providers updated)
- Verification: All providers accept Content[]

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts`
  - MODIFY to pass Content[] directly to providers
  - REMOVE IMessage conversion logic
  - Reference pseudocode lines 170-183

### Current Code to Replace

```typescript
// CURRENT: Converts to IMessage[]
async *generateContentStream(request: GenerateContentParameters) {
  const messages = this.convertToIMessages(request.contents);
  for await (const response of this.provider.generateChatCompletion(messages, tools)) {
    // ...
  }
}
```

### New Implementation

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P13
 * @requirement REQ-INT-001.1
 * @pseudocode lines 172-183
 */
async *generateContentStream(request: GenerateContentParameters) {
  // Pseudocode line 174: Extract Content[] directly from request
  const contents = request.contents;
  
  // Pseudocode line 180: Provider now accepts Content[] directly
  for await (const response of this.provider.generateContent(contents, request.config)) {
    yield response;
  }
}
```

### Affected Files

- `packages/core/src/providers/ProviderContentGenerator.ts`
  - Uses GeminiCompatibleWrapper
  - No changes needed, already passes request with contents

- All provider implementations:
  - `OpenAIProvider.ts` - Already updated in Phase 07
  - `AnthropicProvider.ts` - Already updated in Phase 10-12
  - `GeminiProvider.ts` - Will be updated in Phase 14

## Verification Commands

```bash
# Type check entire provider system
npm run typecheck

# Run integration tests
npm test packages/core/src/providers/integration/
# Expected: All pass

# Verify no IMessage references in wrapper
grep "IMessage" packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts
# Expected: No occurrences

# Verify Content[] is passed through
grep "request\.contents" packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts
# Expected: Direct usage
```

## Success Criteria
- GeminiCompatibleWrapper passes Content[] directly
- No intermediate format conversion
- All providers work through wrapper
- Integration tests pass