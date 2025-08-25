# Phase 14: ProviderContentGenerator Update

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P14`

## Prerequisites
- Required: Phase 13a completed (wrapper integrated)
- Verification: All providers using Content[] directly

## Implementation Tasks

### Files to Modify

- `packages/core/src/core/ProviderContentGenerator.ts`
  - UPDATE to pass Content[] directly to providers
  - REMOVE IMessage conversion logic
  - INTEGRATE with new provider signatures

### Implementation Details

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P14
 * @requirement REQ-INT-001.4
 */
export class ProviderContentGenerator implements ContentGenerator {
  constructor(
    private providerManager: ProviderManager,
    private config: Config
  ) {}
  
  async *generateContentStream(
    request: GenerateContentRequest
  ): AsyncGenerator<GenerateContentStreamResponse> {
    const provider = this.providerManager.getActiveProvider();
    
    // Direct pass-through of Content[]
    // References pseudocode lines 170-184
    const wrappedProvider = new GeminiCompatibleWrapper(provider);
    
    for await (const response of wrappedProvider.generateContentStream({
      contents: request.contents,  // Direct Content[] pass-through
      tools: request.tools,
      config: request.config
    })) {
      yield response;
    }
  }
  
  // Remove all IMessage conversion methods
  // Remove convertToIMessages()
  // Remove convertFromProviderResponse()
}
```

### Integration Points

- Connects to GeminiCompatibleWrapper (Phase 13)
- Uses provider converters (Phases 03-09)
- Maintains streaming behavior

## Verification Commands

```bash
# No IMessage conversion in ProviderContentGenerator
grep "IMessage\|convertToIMessages" packages/core/src/core/ProviderContentGenerator.ts | grep -v "//"
# Expected: No results

# Direct Content[] usage
grep "request.contents" packages/core/src/core/ProviderContentGenerator.ts
# Expected: Found

# TypeScript compiles
npm run typecheck
# Expected: Success

# Integration test passes
npm test packages/core/src/core/ProviderContentGenerator.test.ts
# Expected: All pass
```

## Success Criteria
- ProviderContentGenerator updated
- Direct Content[] pass-through
- No format conversions
- Tests passing