# Phase 10: Base Provider and Interface Update

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P10`

## Prerequisites
- Required: Phase 09a completed (all providers using Content[])
- Verification: All three providers have Content[] signatures

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/IProvider.ts`
  ```typescript
  /**
   * @plan PLAN-20250113-SIMPLIFICATION.P10
   * @requirement REQ-001.1
   */
  export interface IProvider {
    name: string;
    
    generateContent(
      contents: Content[], // Changed from IMessage[]
      config?: GenerateConfig
    ): AsyncIterableIterator<Content>; // Returns Content
    
    // Other methods unchanged
  }
  ```

- `packages/core/src/providers/BaseProvider.ts`
  ```typescript
  /**
   * @plan PLAN-20250113-SIMPLIFICATION.P10
   * @requirement REQ-001.1
   */
  export abstract class BaseProvider implements IProvider {
    abstract generateContent(
      contents: Content[], // Changed from IMessage[]
      config?: GenerateConfig
    ): AsyncIterableIterator<Content>;
    
    // Remove IMessage imports
    // Update any helper methods
  }
  ```

## Verification Commands

```bash
# Interface uses Content[]
grep "Content\[\]" packages/core/src/providers/IProvider.ts
# Expected: Found in generateContent signature

# BaseProvider updated
grep "Content\[\]" packages/core/src/providers/BaseProvider.ts
# Expected: Found in abstract method

# Type check all providers
npm run typecheck
# Expected: No errors

# All providers still implement interface
for provider in openai anthropic gemini; do
  echo "Checking $provider implements IProvider..."
  grep "implements IProvider" packages/core/src/providers/$provider/*Provider.ts
done
```

## Success Criteria
- Interface updated to Content[]
- BaseProvider abstract method updated
- All providers still type-safe
- No compilation errors