# Phase 22: GeminiChat Integration TDD

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P22  
**Title:** GeminiChat Integration Test-Driven Development  
**Requirements:** HS-049 (GeminiChat Integration without major refactoring)

## Prerequisites

- [ ] Phase 21a passed (GeminiChat integration stub verification complete)
- [ ] TypeScript compilation passes without errors
- [ ] All required interfaces (IHistoryService) are available
- [ ] HistoryService implementation available with actual behavior (not NotYetImplemented)

## TDD Overview

This phase creates comprehensive behavioral tests for the GeminiChat-HistoryService integration. Tests focus on REAL behavior with actual conversation data, verifying that the integration preserves existing GeminiChat functionality while adding service delegation capabilities.

**Critical:** Tests MUST verify integration behavior, not isolation. They should test the complete workflow from GeminiChat method calls through to HistoryService operations and back.

## Test Creation Tasks

### Task 1: Integration Test Infrastructure

**Target:** `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/__tests__/geminiChat.historyservice.test.ts`

**Test Infrastructure Requirements:**
```typescript
// IHistoryService interface for testing (REQUIRED - not optional)
interface IHistoryService {
  addMessage(content: Content, metadata?: any): string;
  getCuratedHistory(): Message[];
  shouldMergeToolResponses(content: Content): boolean;
  // Add other methods as needed
}

// Test data - real conversation scenarios
const REAL_CONVERSATION_DATA = {
  userMessage: { role: 'user', parts: [{ text: 'Hello world' }] },
  modelResponse: { role: 'model', parts: [{ text: 'Hi there!' }] },
  toolCallMessage: { role: 'model', parts: [{ functionCall: { name: 'search', args: { query: 'test' } } }] },
  toolResponseMessage: { role: 'user', parts: [{ functionResponse: { name: 'search', response: { result: 'found' } } }] },
  multipleToolResponses: [
    { role: 'user', parts: [{ functionResponse: { name: 'search1', response: { result: 'result1' } } }] },
    { role: 'user', parts: [{ functionResponse: { name: 'search2', response: { result: 'result2' } } }] }
  ]
};
```

**Success Criteria:**
- IHistoryService interface matches expected contract
- Real conversation data covers all integration scenarios
- Test infrastructure validates HistoryService is always required

### Task 2: RecordHistory Integration Tests

**Target:** Behavioral tests for recordHistory method delegation

**Test Cases:**
```typescript
describe('recordHistory integration', () => {
  test('delegates to historyService (REQUIRED)', () => {
    // Test that recordHistory calls historyService.addMessage
    // Verify correct parameters are passed
    // Ensure original array is NOT modified - service handles everything
  });

  test('handles service errors gracefully', () => {
    // Test error handling when historyService.addMessage throws
    // Verify error is properly reported
    // Service is REQUIRED - no fallback
  });

  test('preserves tool call merging behavior', () => {
    // Test that tool call preservation logic works through service
    // Verify tool calls and responses are properly grouped
    // Service is REQUIRED for all operations
  });

  test('handles automatic function calling history through service', () => {
    // Test recordHistory with automaticFunctionCallingHistory parameter
    // Verify service receives all parts of the conversation turn
    // Ensure curated history extraction works with service
  });
});
```

**Critical Requirements:**
- Tests use REAL conversation data, not minimal examples
- Verify actual Content objects with proper structure
- Test both success and failure scenarios
- Ensure no regression in existing functionality

### Task 3: ExtractCuratedHistory Integration Tests  

**Target:** Behavioral tests for extractCuratedHistory method delegation

**Test Cases:**
```typescript
describe('extractCuratedHistory integration', () => {
  test('delegates to historyService.getCuratedHistory (REQUIRED)', () => {
    // Test service delegation with real conversation history
    // Verify Message[] to Content[] conversion works correctly
    // Ensure curated history filtering logic is preserved through service
  });

  test('handles message-to-content conversion correctly', () => {
    // Test conversion from HistoryService Message format to Gemini Content format
    // Verify all message types (user, model, tool) convert properly
    // Test edge cases like empty content, missing parts
  });

  test('preserves content validation behavior', () => {
    // Test that invalid content detection still works through service
    // Verify empty responses are handled correctly
    // Ensure tool responses with valid content are preserved
  });

  test('maintains conversation continuity after curation', () => {
    // Test that curated history maintains proper conversation flow
    // Verify user-model-tool response sequences are preserved
    // Test with complex multi-turn tool interactions
  });
});
```

### Task 4: ShouldMergeToolResponses Integration Tests

**Target:** Behavioral tests for shouldMergeToolResponses method delegation

**Test Cases:**
```typescript
describe('shouldMergeToolResponses integration', () => {
  test('delegates merge decision to service (REQUIRED)', () => {
    // Test that service makes merge decisions
    // Verify tool response detection logic works through service
    // Service is REQUIRED - no fallback logic
  });

  test('handles multiple tool responses correctly', () => {
    // Test merging of multiple sequential tool responses
    // Verify each response is evaluated for merging independently
    // Test complex scenarios with mixed content types
  });

  test('preserves tool response ordering and structure', () => {
    // Test that merged tool responses maintain proper order
    // Verify Parts array structure is preserved correctly
    // Ensure tool call IDs match responses appropriately
  });
});
```

### Task 5: HistoryService Requirement Tests

**Target:** Behavioral tests validating HistoryService is always required

**Test Cases:**
```typescript
describe('HistoryService requirement validation', () => {
  test('constructor requires HistoryService parameter', () => {
    // Test that HistoryService is a required parameter
    // Verify no optional usage is allowed
    // Ensure proper initialization with service
  });

  test('all methods use HistoryService directly', () => {
    // Test that all history operations go through service
    // Verify no array-based fallback exists
    // Service is mandatory for all operations
  });

  test('maintains conversation state through service', () => {
    // Test conversation continuity with service
    // Verify history is properly managed by service
    // Ensure all data flows through service
  });
});
```

### Task 6: End-to-End Integration Tests

**Target:** Complete workflow tests with real conversation scenarios

**Test Cases:**
```typescript
describe('complete conversation workflows', () => {
  test('full conversation with required HistoryService', () => {
    // Test complete conversation from start to finish with service
    // Include user messages, model responses, tool calls, tool responses
    // Verify history consistency through service
  });

  test('complex tool interaction workflows', () => {
    // Test multi-tool scenarios with parallel tool calls
    // Verify tool response merging through service
    // Test error recovery with tool failures
  });

  test('streaming conversation with service integration', () => {
    // Test streaming message flows through service
    // Verify incremental history updates work correctly
    // Ensure streaming behavior is preserved
  });
});
```

## Required Code Markers

All test files MUST include these markers for traceability:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P22
// @requirement HS-049
// @phase gemini-integration-tdd
```

## Success Criteria

**All tests must pass with the following verification:**

- [ ] RecordHistory integration tests pass (service delegation)
- [ ] ExtractCuratedHistory integration tests pass (message conversion + filtering)
- [ ] ShouldMergeToolResponses integration tests pass (service delegation)
- [ ] HistoryService requirement tests pass (validates mandatory service)
- [ ] End-to-end workflow tests pass (complete conversation scenarios)
- [ ] Tests use REAL conversation data, not minimal mocks
- [ ] Tests verify INTEGRATION behavior, not isolated unit behavior
- [ ] All tests validate HistoryService is REQUIRED (not optional)
- [ ] No regression in existing GeminiChat functionality detected
- [ ] Test coverage includes error scenarios and edge cases

## Implementation Guidelines

**Test Data Requirements:**
- Use actual Content objects with realistic Parts structure
- Include real tool calls with function names and arguments  
- Test with multi-part messages and complex conversation flows
- Cover edge cases like empty responses, malformed content

**Behavioral Verification Focus:**
- Verify method calls result in expected state changes
- Test that service methods receive correct parameters
- Ensure service delegation activates appropriately on service errors
- Validate that conversation history remains accessible and consistent

**Integration Testing Approach:**
- Test GeminiChat methods end-to-end, not individual service calls
- Verify the complete data flow from method input to final history state
- Test that HistoryService is always required (no optional usage)
- Ensure service handles all history operations

## Verification Commands

```bash
# Run the integration tests
cd /Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core
npm test -- --testPathPattern="geminiChat.historyservice.test.ts"

# Verify test coverage  
npm run test:coverage -- src/core/geminiChat.ts

# Check that tests are using real data
grep -r "REAL_CONVERSATION_DATA\|realConversation\|actualContent" src/core/__tests__/

# Verify integration focus (should find service delegation tests)
grep -r "historyService\." src/core/__tests__/geminiChat.historyservice.test.ts

# Ensure no NotYetImplemented expectations in tests
grep -r "NotYetImplemented" src/core/__tests__/geminiChat.historyservice.test.ts && echo "❌ Tests expect NotYetImplemented" || echo "✓ Tests expect real behavior"
```

## Next Phase

**Phase 22a:** GeminiChat Integration TDD Verification - Validate that all integration tests pass and behavior is correctly verified

**Dependencies for Future Phases:**
- Phase 23: Turn Integration Stub (requires working GeminiChat integration)
- Phase 24: Final Integration Implementation (requires all component tests passing)