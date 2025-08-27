# Phase 19: Parser Stub

## Phase ID
`PLAN-20250826-RESPONSES.P19`

## Task Description
Update parseResponsesStream to return Content[] with stub implementation.

## Dependencies
- Phase 18 completed

## Implementation Steps
1. Change return type from IMessage to Content[]
2. Add stub for response ID extraction
3. Add phase markers
4. Ensure compilation

## Files Modified
- `/packages/core/src/providers/openai/parseResponsesStream.ts`

## Phase Markers
```typescript
// PHASE: PLAN-20250826-RESPONSES.P19 - Parser Content[] stub
```

## Success Criteria
- Returns Content[] not IMessage
- TypeScript compiles
- Stub in place for response ID