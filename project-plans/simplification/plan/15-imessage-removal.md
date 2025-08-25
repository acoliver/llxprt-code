# Phase 15: IMessage Removal and Final Integration

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P15`

## Prerequisites
- Required: Phase 14a completed (ProviderContentGenerator verified)
- Verification: All components using Content[] directly

## Implementation Tasks

### Files to Modify

- `packages/core/src/types/IMessage.ts`
  - DELETE entire file
  - Remove all IMessage interface definitions

- `packages/core/src/index.ts`
  - REMOVE IMessage export
  - UPDATE exports to include converters

- `packages/core/src/providers/index.ts`
  - REMOVE IMessage imports and exports
  - UPDATE to export converter classes

### Cleanup Tasks

```bash
# Find and remove all IMessage imports
grep -r "import.*IMessage" packages/core/src --include="*.ts" | \
  cut -d: -f1 | sort -u | \
  xargs -I {} sed -i "/import.*IMessage/d" {}

# Find and remove IMessage from type definitions
grep -r ": IMessage\[\]" packages/core/src --include="*.ts" | \
  cut -d: -f1 | sort -u
# Manual review and update each to Content[]

# Update barrel exports
echo "// Converters
export { OpenAIContentConverter } from './providers/openai/OpenAIContentConverter';
export { AnthropicContentConverter } from './providers/anthropic/AnthropicContentConverter';
export { GeminiContentConverter } from './providers/gemini/GeminiContentConverter';" >> packages/core/src/index.ts
```

### Final Integration

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P15
 * @requirement REQ-FUNC-001, REQ-FUNC-002, REQ-FUNC-003
 */
// packages/core/src/index.ts
export type { Content, Part, GenerateContentRequest } from '@google/generative-ai';

// Remove these lines:
// export type { IMessage } from './types/IMessage';
// export { convertToIMessages } from './utils/messageConverter';

// Add converter exports
export { OpenAIContentConverter } from './providers/openai/OpenAIContentConverter';
export { AnthropicContentConverter } from './providers/anthropic/AnthropicContentConverter';
export { GeminiContentConverter } from './providers/gemini/GeminiContentConverter';
```

## Verification Commands

```bash
# IMessage file removed
test ! -f packages/core/src/types/IMessage.ts
# Expected: File not found

# No IMessage references in codebase
grep -r "IMessage" packages/core/src --include="*.ts" | grep -v "//" | grep -v "*.md"
# Expected: No results

# TypeScript compiles without IMessage
npm run typecheck
# Expected: Success

# All tests pass
npm test
# Expected: All pass

# Lint passes
npm run lint
# Expected: No errors

# Build succeeds
npm run build
# Expected: Success
```

## Success Criteria
- IMessage completely removed
- All code using Content[]
- No compilation errors
- All tests passing
- Ready for production