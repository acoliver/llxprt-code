# Phase 13: Validation TDD Implementation

## Phase Information
- **Phase ID**: PLAN-20250128-HISTORYSERVICE.P13
- **Type**: Test-Driven Development Phase
- **Prerequisites**: Phase 12a (validation-stub-verification) passed
- **Focus**: Requirements HS-018 to HS-022 validation system

## Purpose
Implement behavioral tests for the validation system using Test-Driven Development methodology. Create comprehensive tests that validate REAL behavior for detecting orphaned tool calls, orphaned tool responses, tool response ID matching, and overall history structure validation.

## Requirements Coverage

### HS-018: Detect Orphaned Tool Calls
- Tool calls without corresponding tool responses
- Test cases for single and multiple orphaned calls
- Edge cases with empty history and mixed scenarios

### HS-019: Detect Orphaned Tool Responses  
- Tool responses without corresponding tool calls
- Test cases for single and multiple orphaned responses
- Edge cases with malformed response IDs

### HS-020: Validate Tool Response ID Matching
- Tool response IDs must match existing tool call IDs
- Test cases for correct matching and mismatched IDs
- Edge cases with duplicate IDs and invalid formats

### HS-021: Overall History Structure Validation
- Complete conversation history validation
- Integration of all validation rules
- Test cases for complex multi-turn conversations

### HS-022: Provider-Agnostic Validation
- No knowledge of specific provider requirements
- Generic validation that works across providers
- Test flexibility for different conversation structures

## Test Creation Tasks

### Task 1: Orphaned Tool Call Detection Tests
```typescript
// Test file: packages/core/src/validation/__tests__/ValidationService.orphanedCalls.test.ts
// MARKER: VALIDATION-TDD-ORPHANED-CALLS-START

describe('ValidationService - Orphaned Tool Call Detection (HS-018)', () => {
  describe('Manual Detection', () => {
    // Test single orphaned tool call
    // Test multiple orphaned tool calls  
    // Test mixed valid/orphaned calls
    // Test empty history edge case
    // Test tool call without proper ID
  });
  
  describe('Automatic Trigger Points', () => {
    it('should automatically check for orphans before sending new message')
    it('should automatically validate after tool execution completes')
    it('should automatically validate on state transition to IDLE')
    it('should automatically validate when getCuratedHistory() is called')
    it('should handle errors during automatic validation gracefully')
    it('should emit warning events when orphans detected automatically')
  });

// MARKER: VALIDATION-TDD-ORPHANED-CALLS-END
```

### Task 2: Orphaned Tool Response Detection Tests
```typescript
// Test file: packages/core/src/validation/__tests__/ValidationService.orphanedResponses.test.ts
// MARKER: VALIDATION-TDD-ORPHANED-RESPONSES-START

describe('ValidationService - Orphaned Tool Response Detection (HS-019)', () => {
  // Test single orphaned tool response
  // Test multiple orphaned tool responses
  // Test mixed valid/orphaned responses  
  // Test response without proper tool call reference
  // Test malformed response IDs
});

// MARKER: VALIDATION-TDD-ORPHANED-RESPONSES-END
```

### Task 3: Tool Response ID Matching Tests
```typescript
// Test file: packages/core/src/validation/__tests__/ValidationService.responseMatching.test.ts
// MARKER: VALIDATION-TDD-RESPONSE-MATCHING-START

describe('ValidationService - Tool Response ID Matching (HS-020)', () => {
  // Test correct ID matching
  // Test mismatched response IDs
  // Test duplicate tool call IDs
  // Test invalid ID formats
  // Test case sensitivity in ID matching
});

// MARKER: VALIDATION-TDD-RESPONSE-MATCHING-END
```

### Task 4: Overall History Structure Tests
```typescript
// Test file: packages/core/src/validation/__tests__/ValidationService.historyStructure.test.ts
// MARKER: VALIDATION-TDD-HISTORY-STRUCTURE-START

describe('ValidationService - Overall History Structure Validation (HS-021)', () => {
  // Test complete valid conversation
  // Test complex multi-turn scenarios
  // Test integration of all validation rules
  // Test large conversation histories
  // Test edge cases with minimal history
});

// MARKER: VALIDATION-TDD-HISTORY-STRUCTURE-END
```

### Task 5: Provider-Agnostic Validation Tests
```typescript
// Test file: packages/core/src/validation/__tests__/ValidationService.providerAgnostic.test.ts
// MARKER: VALIDATION-TDD-PROVIDER-AGNOSTIC-START

describe('ValidationService - Provider-Agnostic Validation (HS-022)', () => {
  // Test generic conversation structures
  // Test flexibility across different formats
  // Test no provider-specific logic
  // Test extensibility for new providers
  // Test backwards compatibility
});

// MARKER: VALIDATION-TDD-PROVIDER-AGNOSTIC-END
```

### Task 6: Automatic Validation Integration Tests
```typescript
// Test file: packages/core/src/validation/__tests__/ValidationService.autoTriggers.test.ts
// MARKER: VALIDATION-TDD-AUTO-TRIGGERS-START

describe('ValidationService - Automatic Validation Triggers', () => {
  describe('Before Message Send', () => {
    it('should validate previous turn is complete before new message')
    it('should block message send if orphaned tools detected')
    it('should allow message send after orphan resolution')
  });
  
  describe('After Tool Execution', () => {
    it('should validate tool pairing after each execution')
    it('should validate all parallel tool executions completed')
    it('should handle validation during rapid tool executions')
  });
  
  describe('State Transition to IDLE', () => {
    it('should perform final validation on IDLE transition')
    it('should emit warnings but not block transition')
    it('should clean up validation state on IDLE')
  });
  
  describe('GetCuratedHistory Call', () => {
    it('should validate before returning curated history')
    it('should filter out invalid entries from curated history')
    it('should log validation issues found during curation')
  });
});

// MARKER: VALIDATION-TDD-AUTO-TRIGGERS-END
```

## Test Behavior Requirements

### REAL Behavior Testing
- Tests must validate ACTUAL system behavior
- NO stub implementations or mock returns
- NO expectation of NotYetImplemented errors
- Tests should FAIL initially and pass after implementation

### Reference Implementation
- Tests must reference pseudocode from validation.md
- Implement behavioral patterns from analysis/pseudocode/validation.md
- Follow validation logic structure outlined in requirements

### Edge Case Coverage
- Empty conversation histories
- Single message conversations
- Large conversation histories (100+ messages)
- Malformed message structures
- Missing required fields
- Invalid data types
- Boundary condition testing

### Test Data Scenarios

#### Scenario 1: Valid Complete Conversation
```typescript
const validConversation = {
  messages: [
    { role: 'user', content: 'Hello', id: 'msg1' },
    { role: 'assistant', content: 'Hi there!', id: 'msg2' },
    { 
      role: 'assistant', 
      content: 'Let me help you with that.',
      toolCalls: [{ id: 'call1', function: { name: 'search' } }],
      id: 'msg3'
    },
    { 
      role: 'tool', 
      content: '{"result": "found"}',
      toolCallId: 'call1',
      id: 'msg4'
    }
  ]
};
```

#### Scenario 2: Orphaned Tool Call
```typescript
const orphanedCallConversation = {
  messages: [
    { role: 'user', content: 'Search for something', id: 'msg1' },
    { 
      role: 'assistant', 
      content: 'Searching...',
      toolCalls: [{ id: 'call1', function: { name: 'search' } }],
      id: 'msg2'
    }
    // Missing tool response for call1
  ]
};
```

#### Scenario 3: Orphaned Tool Response
```typescript
const orphanedResponseConversation = {
  messages: [
    { role: 'user', content: 'Hello', id: 'msg1' },
    { role: 'assistant', content: 'Hi!', id: 'msg2' },
    { 
      role: 'tool', 
      content: '{"result": "found"}',
      toolCallId: 'nonexistent-call',
      id: 'msg3'
    }
  ]
};
```

#### Scenario 4: Mismatched Tool Response IDs
```typescript
const mismatchedIdConversation = {
  messages: [
    { 
      role: 'assistant', 
      content: 'Searching...',
      toolCalls: [{ id: 'call1', function: { name: 'search' } }],
      id: 'msg1'
    },
    { 
      role: 'tool', 
      content: '{"result": "found"}',
      toolCallId: 'call2', // Should be 'call1'
      id: 'msg2'
    }
  ]
};
```

## Implementation Guidelines

### Test Structure
```typescript
describe('ValidationService Method', () => {
  beforeEach(() => {
    // Setup validation service
    validationService = new ValidationService();
  });

  describe('when validating [specific scenario]', () => {
    it('should [expected behavior]', async () => {
      // Arrange - setup test data
      // Act - call validation method
      // Assert - verify results
    });

    it('should handle edge case of [edge case]', async () => {
      // Edge case testing
    });
  });
});
```

### Validation Result Assertions
```typescript
// For valid scenarios
expect(result.isValid).toBe(true);
expect(result.errors).toHaveLength(0);
expect(result.warnings).toBeUndefined();

// For invalid scenarios
expect(result.isValid).toBe(false);
expect(result.errors).toContain('Expected error message');
expect(result.errors[0].code).toBe('ORPHANED_TOOL_CALL');
```

### Error Code Standards
- `ORPHANED_TOOL_CALL` - For HS-018 violations
- `ORPHANED_TOOL_RESPONSE` - For HS-019 violations  
- `TOOL_RESPONSE_ID_MISMATCH` - For HS-020 violations
- `INVALID_HISTORY_STRUCTURE` - For HS-021 violations
- `VALIDATION_ERROR` - For general validation failures

## Required Code Markers

### Test File Markers
```typescript
// MARKER: VALIDATION-TDD-[TEST-TYPE]-START
// Test implementation
// MARKER: VALIDATION-TDD-[TEST-TYPE]-END
```

### Method Implementation Markers
```typescript
// MARKER: HS-018-IMPLEMENTATION-START
// Orphaned tool call detection logic
// MARKER: HS-018-IMPLEMENTATION-END

// MARKER: HS-019-IMPLEMENTATION-START  
// Orphaned tool response detection logic
// MARKER: HS-019-IMPLEMENTATION-END

// MARKER: HS-020-IMPLEMENTATION-START
// Tool response ID matching logic
// MARKER: HS-020-IMPLEMENTATION-END

// MARKER: HS-021-IMPLEMENTATION-START
// Overall history structure validation
// MARKER: HS-021-IMPLEMENTATION-END
```

## Test Execution Commands

### Run All Validation Tests
```bash
cd packages/core
npm test -- --testPathPattern=validation
```

### Run Specific Test Suites
```bash
# Orphaned calls tests
npm test -- ValidationService.orphanedCalls.test.ts

# Orphaned responses tests  
npm test -- ValidationService.orphanedResponses.test.ts

# Response matching tests
npm test -- ValidationService.responseMatching.test.ts

# History structure tests
npm test -- ValidationService.historyStructure.test.ts

# Provider agnostic tests
npm test -- ValidationService.providerAgnostic.test.ts
```

### Watch Mode for TDD
```bash
npm test -- --watch --testPathPattern=validation
```

## Success Criteria

### ✅ Complete Test Coverage
- All 5 test suites created and executable
- Tests cover HS-018 through HS-022 requirements
- Edge cases properly tested
- No test expects NotYetImplemented

### ✅ Behavioral Testing
- Tests validate REAL system behavior
- Tests fail initially (red phase)
- Implementation makes tests pass (green phase)
- Tests reference validation.md pseudocode

### ✅ Test Quality Standards
- Clear test descriptions and scenarios
- Proper arrange/act/assert structure
- Meaningful assertions with expected results
- Edge case coverage for each requirement

### ✅ Code Organization
- Test files properly organized by functionality
- Required code markers present
- Consistent naming conventions
- TypeScript compilation successful

### ✅ Integration Readiness
- Tests integrate with existing ValidationService
- Compatible with current type definitions
- No conflicts with existing codebase
- Ready for implementation phase

## Expected File Structure After Phase 13
```
packages/core/src/validation/
├── ValidationService.ts (with stub methods from Phase 12)
├── types/
│   ├── ValidationResult.ts
│   └── ValidationError.ts  
└── __tests__/
    ├── ValidationService.orphanedCalls.test.ts (NEW)
    ├── ValidationService.orphanedResponses.test.ts (NEW)
    ├── ValidationService.responseMatching.test.ts (NEW)
    ├── ValidationService.historyStructure.test.ts (NEW)
    └── ValidationService.providerAgnostic.test.ts (NEW)
```

## Failure Recovery

### If Tests Don't Run
1. Verify TypeScript compilation passes
2. Check test file imports and dependencies
3. Ensure ValidationService stub exists from Phase 12
4. Verify Jest configuration for validation tests

### If Tests Lack Coverage
1. Review requirements HS-018 through HS-022
2. Add missing edge case scenarios
3. Ensure all validation methods are tested
4. Add integration test scenarios

### If Tests Are Too Implementation-Specific
1. Focus on behavioral outcomes, not implementation details
2. Test external API contracts, not internal methods
3. Ensure tests work with different implementation approaches
4. Remove provider-specific assumptions

### If Tests Expect Stubs
1. Remove NotYetImplemented expectations
2. Focus on real validation behavior
3. Tests should fail until implementation is complete
4. Ensure tests validate actual business logic

## Next Steps
Upon successful completion of Phase 13:
1. Mark Phase 13 as completed
2. All validation TDD tests are ready
3. Tests provide clear requirements for implementation
4. Ready to proceed to Phase 13a (verification)
5. Implementation phase can begin with clear test guidance

## Notes
- This is TDD setup phase - tests written BEFORE implementation
- Tests should fail initially and guide implementation
- Reference pseudocode from validation.md for behavioral patterns
- Focus on requirements validation, not technical implementation details
- Provider-agnostic approach ensures broad compatibility