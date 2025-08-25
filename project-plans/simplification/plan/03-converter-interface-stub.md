# Phase 03: Content Converter Interface Stub

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P03`

## Prerequisites
- Required: Phases 01-02 completed (analysis and pseudocode)
- Verification: Pseudocode exists at `analysis/pseudocode/content-converter.md`

## Implementation Tasks

### Files to Create

- `packages/core/src/providers/converters/IContentConverter.ts`
  ```typescript
  /**
   * @plan PLAN-20250113-SIMPLIFICATION.P03
   * @requirement REQ-002.1
   * @pseudocode lines 01-04
   */
  import { Content } from '@google/genai';

  export interface IContentConverter {
    toProviderFormat(contents: Content[]): unknown;
    fromProviderFormat(response: unknown): Content;
  }
  ```

- `packages/core/src/providers/converters/OpenAIContentConverter.ts`
  ```typescript
  /**
   * @plan PLAN-20250113-SIMPLIFICATION.P03
   * @requirement REQ-002.2
   * @pseudocode lines 10-11
   */
  import { Content } from '@google/genai';
  import { IContentConverter } from './IContentConverter.js';

  export class OpenAIContentConverter implements IContentConverter {
    toProviderFormat(contents: Content[]): unknown {
      // Stub implementation
      return [];
    }

    fromProviderFormat(response: unknown): Content {
      // Stub implementation
      return { role: 'model', parts: [] };
    }
  }
  ```

- `packages/core/src/providers/converters/AnthropicContentConverter.ts`
  ```typescript
  /**
   * @plan PLAN-20250113-SIMPLIFICATION.P03
   * @requirement REQ-002.3
   * @pseudocode lines 80-81
   */
  import { Content } from '@google/genai';
  import { IContentConverter } from './IContentConverter.js';

  export class AnthropicContentConverter implements IContentConverter {
    toProviderFormat(contents: Content[]): unknown {
      // Stub implementation
      return [];
    }

    fromProviderFormat(response: unknown): Content {
      // Stub implementation
      return { role: 'model', parts: [] };
    }
  }
  ```

## Verification Commands

```bash
# Check TypeScript compilation
npm run typecheck

# Check plan markers
grep -r "@plan:PLAN-20250113-SIMPLIFICATION.P03" packages/core/src/providers/converters/
# Expected: 3 occurrences

# Verify no TODOs
grep -r "TODO" packages/core/src/providers/converters/
# Expected: No output
```

## Success Criteria
- TypeScript compiles without errors
- Interface and stub classes created
- All files include plan markers
- No TODO comments