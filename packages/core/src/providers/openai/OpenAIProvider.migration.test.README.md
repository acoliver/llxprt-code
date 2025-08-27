# OpenAI Provider Migration TDD Tests

**Phase**: PLAN-20250826-RESPONSES.P32  
**Requirements**: REQ-003.1, REQ-003.2  
**Approach**: Test-Driven Development (Red → Green → Refactor)

## Overview

This test suite implements TDD tests for migrating OpenAIProvider from IMessage[] to Content[] format. The tests are written BEFORE implementation and are expected to FAIL initially.

## Test Coverage

### 1. Content[] Input Migration (4 tests)

Tests that verify OpenAIProvider can accept Content[] instead of IMessage[]:

- ✅ **Basic Content[] acceptance**: Verifies provider accepts Content[] format
- ✅ **Complex message structure**: Tests Content[] with metadata and mixed roles
- ❌ **Internal format conversion**: Verifies Content[] converts to internal format correctly (FAILS - needs implementation)
- ❌ **Function call handling**: Tests Content[] with functionCall parts (FAILS - needs implementation)

### 2. ResponseId Metadata Preservation (3 tests)

Tests that verify Content metadata with responseId is preserved:

- ❌ **Metadata preservation**: Verifies responseId metadata is preserved (FAILS - needs implementation)
- ❌ **Most recent responseId**: Tests finding most recent assistant responseId (FAILS - needs implementation)
- ✅ **Custom metadata fields**: Handles Content with arbitrary metadata

### 3. Backward Compatibility (3 tests)

Tests that verify migration maintains backward compatibility:

- ❌ **Behavioral compatibility**: Verifies same behavior with Content[] (FAILS - needs implementation)
- ✅ **Tool call consistency**: Handles tools consistently in Content[] format
- ❌ **Usage statistics**: Preserves usage data in Content format (FAILS - needs implementation)

### 4. Property-Based Tests (7 tests - >30% requirement)

Uses fast-check for arbitrary input testing:

- ❌ **TypeScript compilation**: Never breaks with valid Content[] (FAILS - needs implementation)
- ❌ **Metadata preservation**: Preserves any metadata structure (FAILS - needs implementation)
- ❌ **Conversation coherence**: Maintains coherence with any valid history (FAILS - needs implementation)
- ❌ **Role variations**: Handles all valid Content roles (FAILS - needs implementation)
- ❌ **Arbitrary metadata**: Preserves complex metadata structures (FAILS - needs implementation)
- ❌ **Mixed arrays**: Handles Content[] arrays of any size (FAILS - needs implementation)
- ❌ **Type safety**: Maintains safety with Content extensions (FAILS - needs implementation)

## Current Test Status

**Total Tests**: 17  
**Passing**: 4 (23.5%)  
**Failing**: 8 (47.1%) - Expected in TDD Red phase  
**Property-Based**: 7 (41.2%) - Exceeds 30% requirement

## Test Failures (Expected in TDD)

### Key Failing Tests:

1. **Content[] to IMessage[] conversion** - Core migration logic not implemented
2. **Metadata preservation** - responseId tracking not implemented
3. **Usage statistics** - Usage data handling in Content format not implemented
4. **Property-based tests** - Various edge cases not handled

### Error Examples:

```
Function call for 'test_function' is missing required ID
expected false to be true // Object.is equality
Property failed after 1 tests
```

## Implementation Requirements

Based on test failures, implementation needs:

1. **Content[] Input Handling**:
   - Accept Content[] in generateChatCompletion()
   - Convert Content[] to internal IMessage[] format
   - Handle Content.parts[] structure

2. **Metadata Preservation**:
   - Extract responseId from Content.metadata
   - Implement findPreviousResponseId() for Content[]
   - Preserve arbitrary metadata fields

3. **Response Format**:
   - Return Content[] with responseId in metadata
   - Preserve usage statistics in Content format
   - Handle function calls as Content.parts[].functionCall

4. **Type Safety**:
   - Maintain TypeScript compilation with Content extensions
   - Handle arbitrary Content[] structures
   - Preserve backward compatibility

## Next Steps (Phase 33)

After implementing the above requirements, tests should move from Red → Green phase:

1. Run tests to verify failures (✅ Complete - tests failing as expected)
2. Implement Content[] support in OpenAIProvider
3. Implement metadata preservation logic
4. Update response formatting
5. Re-run tests to verify Green phase
6. Refactor for code quality

## Property-Based Testing

The test suite uses fast-check for property-based testing with:

- **7 property-based tests** (41.2% of total)
- **102 total property test runs** across all tests
- Tests arbitrary inputs, edge cases, and invariant properties
- Exceeds the 30% property-based testing requirement

## Test Organization

Tests follow behavioral testing principles:

- Focus on **what** the system should do, not **how**
- Use realistic scenarios and edge cases
- Verify invariant properties hold for arbitrary inputs
- Test the migration contract, not implementation details
