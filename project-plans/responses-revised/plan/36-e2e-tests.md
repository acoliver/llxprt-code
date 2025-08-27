# Phase 36: End-to-End Tests

## Phase ID
`PLAN-20250826-RESPONSES.P36`

## Task Description
Write comprehensive end-to-end tests for conversation tracking.

## Dependencies
- Phase 35 completed

## Test Scenarios
1. Start new conversation with GPT-5
2. Continue conversation with multiple messages
3. Switch providers mid-conversation
4. Save and load conversation with IDs
5. Verify response IDs persist

## Test Files
- `/packages/cli/src/integration-tests/responses-tracking.integration.test.ts`

## Success Criteria
- All E2E tests pass
- Conversation tracking works
- Response IDs maintained