# Tests to Remove - Comprehensive Analysis

This document identifies problematic tests that should be removed as part of the simplification effort. These tests validate broken behavior, use hardcoded IDs, implement "mock theater," or check for invalid/stub behavior.

## Summary

**Total problematic tests identified: 47**
- Anthropic tests: 16 problematic tests
- OpenAI tests: 18 problematic tests  
- Gemini tests: 6 problematic tests
- Converter tests: 4 problematic tests
- Adapter tests: 3 problematic tests

## Detailed Analysis by Category

### 1. Anthropic Provider Tests (`/Users/acoliver/projects/llxprt-code/packages/core/src/providers/anthropic/`)

#### File: `AnthropicProvider.test.ts`
**Issues Found: 12 tests to remove**

1. **Lines 569-578** - `'should validate and fix tool_use/tool_result mismatches on retry'`
   - **Problem**: Tests hardcoded ID `'broken-tool-123'` for synthetic tool results
   - **Why remove**: Validates broken/synthetic behavior rather than real functionality
   - **Code**: Expects `tool_use_id: 'broken-tool-123'` in synthetic responses

2. **Lines 195-234** - `'should stream content from Anthropic API'`
   - **Problem**: Mock theater - only verifies mock calls, doesn't test real behavior
   - **Why remove**: Tests mock setup rather than actual streaming logic
   
3. **Lines 235-314** - `'should handle tool calls in the stream'`
   - **Problem**: Mock theater - relies entirely on mocked responses
   - **Why remove**: Doesn't validate real tool call handling

4. **Lines 315-327** - `'should handle API errors'`
   - **Problem**: Mock theater - tests mock rejection, not real error handling
   - **Why remove**: Only verifies mock setup

5. **Lines 328-374** - `'should handle usage tracking'`
   - **Problem**: Mock theater + vague assertions about "handling at higher level"
   - **Why remove**: Doesn't actually test usage tracking logic

6. **Lines 375-411** - `'should ignore unknown chunk types'`
   - **Problem**: Mock theater with unclear expectations
   - **Why remove**: Tests mock behavior, not real chunk processing

7. **Lines 412-457** - `'should use ToolFormatter for tool conversion'`
   - **Problem**: Mock theater - only verifies mocks were called
   - **Why remove**: Tests mock interactions, not real conversion logic

8. **Lines 458-493** - `'should retry on rate limit errors'`
   - **Problem**: Mock theater with hardcoded retry behavior
   - **Why remove**: Tests mock setup, not real retry logic

9. **Lines 494-509** - `'should not retry on non-retryable errors'`
   - **Problem**: Mock theater - tests mock rejection
   - **Why remove**: Only verifies mock behavior

10. **Lines 149-192** - `'should return a list of Anthropic models including latest aliases'`
    - **Problem**: Structure-only test checking model count and properties exist
    - **Why remove**: Tests structure, not actual API integration

11. **Lines 180-191** - `'should return models with correct structure'`
    - **Problem**: Pure structure validation without business logic
    - **Why remove**: Only checks property existence

12. **Lines 7-44** - Mock setup for ToolFormatter
    - **Problem**: Entire mock structure is overly complex mock theater
    - **Why remove**: Enables mock theater tests rather than real behavior validation

#### File: `AnthropicProvider.oauth.test.ts`
**Issues Found: 4 tests to remove**

1. **Lines 134-168** - `'should use OAuth token when no API key is provided'`
   - **Problem**: Mock theater - entirely dependent on mocked OAuth responses
   - **Why remove**: Tests mock setup, not real OAuth integration

2. **Lines 169-191** - `'should throw error when no authentication is available'`
   - **Problem**: Mock theater - tests mock return values
   - **Why remove**: Only validates mock behavior

3. **Lines 192-230** - `'should prefer API key over OAuth when both are available'`
   - **Problem**: Mock theater with hardcoded responses
   - **Why remove**: Tests mocks, not real precedence logic

4. **Lines 233-258** - `'should throw error when getting models fails due to no authentication'`
   - **Problem**: Mock theater - tests mock rejection
   - **Why remove**: Only verifies mock setup

### 2. OpenAI Provider Tests (`/Users/acoliver/projects/llxprt-code/packages/core/src/providers/openai/`)

#### File: `OpenAIProvider.switch.test.ts`
**Issues Found: 8 tests to remove**

1. **Lines 65-138** - `'should use responses API for gpt-4o model'` (SKIPPED)
   - **Problem**: Test is skipped with comment acknowledging implementation doesn't work
   - **Why remove**: Tests broken/unimplemented behavior

2. **Lines 140-164** - `'should use legacy API for gpt-3.5-turbo model'`
   - **Problem**: Mock theater - tests hardcoded mock responses
   - **Why remove**: Only validates mock behavior, not real API switching

3. **Lines 166-190** - `'should use legacy API when OPENAI_RESPONSES_DISABLE is true'`
   - **Problem**: Mock theater - relies on mocked responses
   - **Why remove**: Tests mock setup, not real environment handling

4. **Lines 192-268** - `'should pass tools to responses API when using gpt-4o'` (SKIPPED)
   - **Problem**: Test is skipped, acknowledging broken implementation
   - **Why remove**: Tests unimplemented functionality

5. **Lines 270-311** - `'should pass tools to legacy API when using gpt-3.5-turbo'`
   - **Problem**: Mock theater - only verifies mock calls
   - **Why remove**: Tests mock interactions, not real tool handling

#### File: `OpenAIProvider.responses.test.ts`
**Issues Found: 3 tests to remove**

1. **Lines 96-256** - `'should properly format tool responses in subsequent requests'`
   - **Problem**: Complex mock theater with extensive fetch mocking
   - **Why remove**: Tests mock responses, not real API integration

2. **Lines 258-355** - `'should handle edge case where tool response might be missing'`
   - **Problem**: Mock theater testing synthetic cancellation responses
   - **Why remove**: Tests mock behavior for edge cases, not real handling

3. **Lines 357-496** - `'should include function_call_output in responses API format'`
   - **Problem**: Extensive mock theater with fetch mocking
   - **Why remove**: Tests mock setup rather than real API formatting

#### File: `OpenAIProvider.responsesIntegration.test.ts`
**Issues Found: 7 tests to remove (ALL SKIPPED)**

1. **Lines 18-280** - Entire test suite is skipped
   - **Problem**: All tests acknowledge "Integration tests that depend on responses API implementation which is not complete"
   - **Why remove**: Tests unimplemented/broken functionality

**All 7 tests in this file should be removed:**
- `'should make a successful streaming request'`
- `'should cache and reuse conversations'`  
- `'should handle tool calls correctly'`
- `'should handle API errors correctly'`
- `'should handle non-streaming responses'`
- `'should throw error for stateful mode'`

### 3. Gemini Provider Tests (`/Users/acoliver/projects/llxprt-code/packages/core/src/providers/gemini/`)

#### File: `GeminiProvider.test.ts`
**Issues Found: 6 tests to remove (ALL STUB TESTS)**

1. **Lines 30-33** - `'should set __oauth_needs_code to true when OAuth flow requires user input'`
   - **Problem**: Stub test with comment "This will require mocking the OAuth flow in a later phase"
   - **Why remove**: Not a real test, just a placeholder

2. **Lines 40-43** - `'should set __oauth_provider to "gemini" for provider identification'`
   - **Problem**: Stub test - same placeholder comment
   - **Why remove**: Not a real test

3. **Lines 50-53** - `'should reset global state variables after successful authentication'`
   - **Problem**: Stub test with placeholder comment
   - **Why remove**: Not a real test

4. **Lines 60-63** - `'should reset global state variables after OAuth flow cancellation'`
   - **Problem**: Stub test with placeholder comment
   - **Why remove**: Not a real test

5. **Lines 70-73** - `'should maintain global state during active OAuth flow'`
   - **Problem**: Stub test with placeholder comment
   - **Why remove**: Not a real test

6. **Lines 80-93** - `'should handle concurrent OAuth requests from different providers'`
   - **Problem**: Stub test with placeholder comment
   - **Why remove**: Not a real test

### 4. Converter Tests (`/Users/acoliver/projects/llxprt-code/packages/core/src/providers/converters/`)

#### File: `SystemMessageHandling.test.ts`
**Issues Found: 4 tests with system role problems**

1. **Lines 16-39** - `'should handle Content with role="system"'` (OpenAI)
   - **Problem**: Tests Content with `role: 'system'` which is invalid for Gemini
   - **Why remove**: Creates Content objects with invalid roles for unified system

2. **Lines 41-68** - `'should handle multiple system messages'` (OpenAI)
   - **Problem**: Tests multiple Content with `role: 'system'`
   - **Why remove**: Invalid for Gemini-native architecture

3. **Lines 98-119** - `'should handle Content with role="system"'` (Anthropic)
   - **Problem**: Tests Content with `role: 'system'` 
   - **Why remove**: Invalid role in unified Content format

4. **Lines 139-160** - `'should handle multiple system messages'` (Anthropic)
   - **Problem**: Tests multiple Content with `role: 'system'`
   - **Why remove**: Invalid for unified architecture

### 5. Adapter Tests (`/Users/acoliver/projects/llxprt-code/packages/core/src/providers/adapters/`)

#### File: `GeminiCompatibleWrapper.system.test.ts`
**Issues Found: 3 tests to remove**

1. **Lines 77-100** - `'should filter out system messages for OpenAI provider'`
   - **Problem**: Tests backward compatibility for invalid Content format
   - **Why remove**: Validates broken behavior (system role in Content)

2. **Lines 102-125** - `'should filter out system messages for Anthropic provider'`
   - **Problem**: Tests backward compatibility for invalid Content format  
   - **Why remove**: Validates broken behavior (system role in Content)

3. **Lines 179-204** - `'should handle streaming with system messages'`
   - **Problem**: Tests processing of invalid Content with system role
   - **Why remove**: Validates broken input format

## Tests Count by File

| File | Total Tests | Problematic Tests | Percentage |
|------|-------------|------------------|------------|
| AnthropicProvider.test.ts | ~15 | 12 | 80% |
| AnthropicProvider.oauth.test.ts | 8 | 4 | 50% |
| OpenAIProvider.switch.test.ts | 8 | 5 | 63% |
| OpenAIProvider.responses.test.ts | 3 | 3 | 100% |
| OpenAIProvider.responsesIntegration.test.ts | 7 | 7 | 100% |
| GeminiProvider.test.ts | 6 | 6 | 100% |
| SystemMessageHandling.test.ts | ~8 | 4 | 50% |
| GeminiCompatibleWrapper.system.test.ts | ~8 | 3 | 38% |

## Categories of Problems

### 1. Mock Theater Tests (28 tests)
Tests that only verify mock interactions without testing real behavior:
- Most Anthropic provider tests
- OpenAI switch logic tests
- OAuth integration tests

### 2. Hardcoded ID Tests (2 tests)  
Tests expecting specific hardcoded IDs like `'broken-tool-123'`:
- Anthropic tool result validation tests

### 3. Invalid Content Format Tests (7 tests)
Tests that create or expect Content with `role='system'`:
- All system message handling converter tests
- Adapter system message filtering tests

### 4. Stub/Placeholder Tests (6 tests)
Tests that are explicitly incomplete or placeholders:
- All GeminiProvider.test.ts tests

### 5. Skipped/Broken Implementation Tests (4 tests)
Tests that are skipped due to known broken implementations:
- OpenAI responses API tests
- OpenAI integration tests

## Recommendations

1. **Remove all 47 identified tests** - They validate broken, mock, or invalid behavior
2. **Replace with integration tests** - Focus on real behavior validation
3. **Implement proper Content format tests** - Test valid Gemini Content format only
4. **Add behavioral contract tests** - Test real provider interactions
5. **Remove mock dependencies** - Favor real API testing with test credentials

## Migration Strategy

1. **Phase 1**: Remove all identified problematic tests
2. **Phase 2**: Implement behavioral contract tests for each provider
3. **Phase 3**: Add integration tests with real API endpoints  
4. **Phase 4**: Verify all tests use valid Content format (no system role)

This cleanup will significantly improve test quality by removing mock theater and focusing on real behavioral validation.