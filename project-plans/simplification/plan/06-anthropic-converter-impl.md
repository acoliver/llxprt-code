# Phase 06: Anthropic Content Converter Implementation

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P06`

## Prerequisites
- Required: Phase 05a completed (OpenAI converter working)
- Verification: OpenAI converter tests passing

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/converters/AnthropicContentConverter.ts`
  - UPDATE existing stub file
  - Implement toProviderFormat() following pseudocode lines 82-116
  - Implement fromProviderFormat() following pseudocode lines 118-133
  - MUST reference specific pseudocode lines in comments

### Implementation Guide

```typescript
/**
 * @plan PLAN-20250113-SIMPLIFICATION.P06
 * @requirement REQ-002.3
 */
export class AnthropicContentConverter implements IContentConverter {
  toProviderFormat(contents: Content[]): AnthropicMessage[] {
    // Pseudocode line 83: INITIALIZE messages as empty array
    const messages: AnthropicMessage[] = [];
    // Pseudocode line 84: INITIALIZE lastRole as null
    let lastRole: string | null = null;
    // Pseudocode line 85: INITIALIZE currentMessage as null
    let currentMessage: AnthropicMessage | null = null;
    
    // Pseudocode lines 87-109: Process each content
    for (const content of contents) {
      // Follow pseudocode exactly...
    }
    
    // Pseudocode line 115: RETURN messages
    return messages;
  }
  
  fromProviderFormat(response: unknown): Content {
    // Pseudocode lines 119-132: Convert response
    // Implementation following pseudocode...
  }
}
```

## Verification Commands

```bash
# Run tests - should pass now
npm test packages/core/src/providers/converters/converters.test.ts -- --grep="AnthropicContentConverter"
# Expected: All Anthropic converter tests pass

# Verify pseudocode references
grep -c "Pseudocode line" packages/core/src/providers/converters/AnthropicContentConverter.ts
# Expected: At least 8 references

# Type check
npm run typecheck
# Expected: No errors
```

## Success Criteria
- All AnthropicContentConverter tests pass
- Implementation follows pseudocode
- Proper type definitions
- Handles role merging correctly