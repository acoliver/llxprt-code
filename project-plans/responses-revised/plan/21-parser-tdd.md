# Phase 21: Parser TDD

## Phase ID
`PLAN-20250826-RESPONSES.P21`

## Task Description
Write behavioral tests for parseResponsesStream response ID extraction.

## Dependencies
- Phase 20 completed

## Test Requirements
1. **REQ-002.1**: Test response ID extraction from SSE
2. **REQ-002.2**: Test metadata storage in Content
3. **REQ-003.2**: Test Content[] return type
4. Property-based tests (30% minimum)
5. Mutation testing target (80%)

## Test Files
- `/packages/core/src/providers/openai/parseResponsesStream.test.ts`

## Behavioral Tests
```typescript
describe('parseResponsesStream', () => {
  it('should extract response ID from response.completed event');
  it('should store response ID in Content metadata');
  it('should return Content[] not IMessage');
  it('should handle missing response ID gracefully');
  
  // Property tests
  it('should always return valid Content objects for any SSE stream');
  it('should preserve all response IDs from stream');
});
```

## Success Criteria
- All tests defined (failing)
- Tests are behavioral not implementation
- Property tests >= 30%