# Phase 8: Add Missing Tests - Fixed

## Summary
Added missing tests for the history access methods: `getCuratedHistory`, `getLastUserMessage`, and `getLastModelMessage` in the HistoryService test suite.

## Changes Made
1. Created a new `History Access Methods` describe block in `packages/core/src/services/history/__tests__/HistoryService.test.ts`
2. Added tests for `getCuratedHistory()` method that verify it filters out messages with empty content
3. Added tests for `getLastUserMessage()` method that verify it returns the last user message
4. Added tests for `getLastModelMessage()` method that verify it returns the last model message

## Test Details
- The tests properly handle the validation constraints of the HistoryService by directly manipulating the internal messages array to test edge cases
- Tests verify that `getCuratedHistory` correctly filters out messages with empty content while preserving those with actual content
- Tests verify that `getLastUserMessage` and `getLastModelMessage` correctly return the last message of their respective roles

## Status
All new tests are passing.