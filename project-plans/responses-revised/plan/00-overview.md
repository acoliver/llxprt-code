# Plan: OpenAI Responses API Conversation Tracking

Plan ID: PLAN-20250826-RESPONSES
Generated: 2025-08-26
Requirements: REQ-001, REQ-002, REQ-003, REQ-INT-001

## Overview

Enable conversation context tracking for OpenAI's Responses API (GPT-5/O3 models) by passing sessionId as a parameter through the provider interface and storing responseId in Content metadata.

## Integration Analysis (CRITICAL - NOT ISOLATED)

### Existing Code That Will Use This Feature
- `/packages/core/src/core/geminiChat.ts` - Gets sessionId via config.getSessionId()
- `/packages/core/src/config/config.ts` - Stores sessionId, provides getSessionId()
- `/packages/core/src/core/contentGenerator.ts` - Passes sessionId to provider
- `/packages/core/src/providers/ProviderContentGenerator.ts` - Calls generateChatCompletion
- `/packages/core/src/providers/LoggingProviderWrapper.ts` - Wraps provider calls

### Existing Code To Be Replaced
- Hardcoded undefined in OpenAIProvider for conversation_id and previous_response_id
- All IMessage imports throughout codebase (file already deleted, imports remain)

### User Access Points
- CLI: `/provider openai /model gpt-5` or `/model o3`
- Save/Load: `/chat save` and `/chat load` preserve metadata
- History: Conversation history maintains response IDs

### Migration Requirements
- Remove all IMessage imports
- Ensure all tests use Content[] format
- No data migration needed - metadata system already exists

## Phase Structure

```
Phase 01-02: Analysis and Pseudocode
  01-analysis.md                     - Find ALL callers of generateChatCompletion
  01a-analysis-verification.md        - Verify analysis completeness
  02-pseudocode.md                   - Create numbered pseudocode
  02a-pseudocode-verification.md      - Verify pseudocode coverage

Phase 03-05: Interface and Callers Update
  03-interface-stub.md               - Add sessionId parameter + update ALL callers
  03a-interface-stub-verification.md  - Verify stub completeness
  04-interface-tdd.md                - Tests for sessionId flow (30% property-based)
  04a-interface-tdd-verification.md   - Verify test coverage
  05-interface-impl.md               - Implement sessionId passing (reference pseudocode)
  05a-interface-impl-verification.md  - Verify implementation + mutation testing (80%)

Phase 06-08: Provider Updates
  06-provider-stub.md                - Update all providers to accept sessionId
  06a-provider-stub-verification.md   - Verify all providers updated
  07-provider-tdd.md                 - Test provider sessionId handling
  07a-provider-tdd-verification.md    - Verify behavioral tests
  08-provider-impl.md                - Implement provider logic (reference pseudocode)
  08a-provider-impl-verification.md   - Verify + mutation testing

Phase 09-11: Response ID Tracking
  09-response-stub.md                - Parser stub for metadata
  09a-response-stub-verification.md   - Verify stub
  10-response-tdd.md                 - Test responseId extraction
  10a-response-tdd-verification.md    - Verify tests
  11-response-impl.md                - Implement extraction (reference pseudocode)
  11a-response-impl-verification.md   - Verify + mutation testing

Phase 12-14: Complete Integration
  12-integration-stub.md             - Wire real sessionId values
  12a-integration-stub-verification.md - Verify wiring
  13-integration-tdd.md              - End-to-end conversation tests
  13a-integration-tdd-verification.md  - Verify E2E tests
  14-integration-impl.md             - Complete integration
  14a-integration-impl-verification.md - Full integration verification

Phase 15-17: IMessage Cleanup
  15-migration-stub.md              - Prepare IMessage removal
  15a-migration-stub-verification.md - Verify preparation
  16-migration-tdd.md               - Test Content[] replacement
  16a-migration-tdd-verification.md  - Verify tests
  17-migration-impl.md              - Remove all IMessage imports
  17a-migration-impl-verification.md - Verify cleanup complete

Phase 18-20: Final Verification
  18-e2e-tests.md                   - Full system E2E tests
  18a-e2e-verification.md           - Verify E2E
  19-performance.md                 - Performance testing
  19a-performance-verification.md   - Verify performance
  20-final.md                       - Complete system verification
  20a-final-verification.md         - Final sign-off
```

## Success Criteria

1. SessionId flows from config.getSessionId() through to providers
2. ResponseId stored in Content metadata
3. Previous responseId found in message history
4. All IMessage imports removed
5. Conversation context maintained for GPT-5/O3
6. 80% mutation test score
7. 30% property-based tests
8. User can access feature through CLI

## Execution Tracking

Update `execution-tracker.md` after each phase completion.