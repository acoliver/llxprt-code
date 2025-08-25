# Phase 12: GeminiCompatibleWrapper Update Stub

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P12`

## Prerequisites
- Required: Phase 11a completed (all tests updated)
- Verification: All providers and tests using Content[]

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts`
  - CREATE stub for new generateContentStream signature
  - Will accept Content[] from request
  - Stub returns empty Content for now

### Stub Implementation

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P12
 * @requirement REQ-INT-001.1
 */
export class GeminiCompatibleWrapper {
  constructor(private provider: IProvider) {}
  
  async *generateContentStream(
    request: GenerateContentParameters
  ): AsyncGenerator<GenerateContentResponse> {
    // Stub implementation - will be completed in Phase 14
    const emptyContent: Content = { role: 'model', parts: [] };
    yield { 
      candidates: [{ content: emptyContent }]
    } as GenerateContentResponse;
  }
  
  // Other methods unchanged for now
}
```

## Verification Commands

```bash
# TypeScript compiles
npm run typecheck
# Expected: Success

# Wrapper exists and compiles
test -f packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts
# Expected: File exists

# Plan marker present
grep "@plan:PLAN-20250113-SIMPLIFICATION.P12" packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts
# Expected: Found
```

## Success Criteria
- Wrapper stub created
- TypeScript compiles
- Ready for TDD phase