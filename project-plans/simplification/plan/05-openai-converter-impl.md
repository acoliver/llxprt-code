# Phase 05: OpenAI Content Converter Implementation

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P05`

## Prerequisites
- Required: Phase 04 completed (TDD tests failing)
- Verification: Tests exist and fail naturally

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/converters/OpenAIContentConverter.ts`
  - UPDATE existing stub file
  - Implement toProviderFormat() following pseudocode lines 12-53
  - Implement fromProviderFormat() following pseudocode lines 55-74
  - Reference specific pseudocode lines in implementation

### Implementation Guide

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P05
 * @requirement REQ-002.2
 */
export class OpenAIContentConverter implements IContentConverter {
  toProviderFormat(contents: Content[]): OpenAIMessage[] {
    // Pseudocode line 13: INITIALIZE messages as empty array
    const messages: OpenAIMessage[] = [];
    // Pseudocode line 14: INITIALIZE pendingToolCalls
    const pendingToolCalls = new Map<string, unknown>();
    
    // Pseudocode line 16-50: Process each content
    for (const content of contents) {
      // Implementation following pseudocode exactly
      // ... (implement based on pseudocode)
    }
    
    // Pseudocode line 52: RETURN messages
    return messages;
  }
  
  fromProviderFormat(response: unknown): Content {
    // Pseudocode line 56-73: Convert response to Content
    // ... (implement based on pseudocode)
  }
}
```

## Verification Commands

```bash
# Run tests - should pass now
npm test packages/core/src/providers/converters/converters.test.ts -- --grep="OpenAIContentConverter"
# Expected: All OpenAI converter tests pass

# Verify pseudocode references
grep -c "Pseudocode line" packages/core/src/providers/converters/OpenAIContentConverter.ts
# Expected: At least 10 references

# No debug code
grep "console\." packages/core/src/providers/converters/OpenAIContentConverter.ts
# Expected: No output
```

## Success Criteria
- All OpenAIContentConverter tests pass
- Implementation follows pseudocode line by line
- Proper type definitions for OpenAIMessage
- No test modifications made