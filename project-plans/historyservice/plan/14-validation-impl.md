# Phase 14: Validation System Implementation

## Phase Information
- **Phase ID**: PLAN-20250128-HISTORYSERVICE.P14
- **Type**: Implementation Phase
- **Prerequisites**: Phase 13a (validation-tdd-verification) passed
- **Focus**: Requirements HS-018 to HS-022 validation system implementation

## Purpose
Implement the validation system methods in HistoryService.ts to make all Phase 13 TDD tests pass. This phase implements real validation logic based on the pseudocode from analysis/pseudocode/validation.md to replace the stub implementations.

## Requirements Coverage

### HS-018: Detect Orphaned Tool Calls
- Implement `detectOrphanedToolCalls()` method
- Find tool calls without corresponding tool responses
- Return array of orphaned ToolCall objects

### HS-019: Detect Orphaned Tool Responses  
- Implement `detectOrphanedToolResponses()` method
- Find tool responses without corresponding tool calls
- Return array of orphaned ToolResponse objects

### HS-020: Validate Tool Response ID Matching
- Implement `validateToolResponseIds()` method
- Ensure all tool response IDs match existing tool call IDs
- Return ValidationResult with errors for mismatches

### HS-021: Overall History Structure Validation
- Implement `validateHistoryStructure()` method
- Complete conversation history validation
- Integration of all validation rules

### HS-022: Provider-Agnostic Validation
- Ensure all validation works across providers
- Generic validation logic without provider-specific assumptions

## Implementation Tasks

### Task 0: Integration with Existing Methods for Automatic Triggers

Update existing methods to call automatic validation:

```typescript
// In addMessage method:
public async addMessage(content: string, role: MessageRole, metadata?: MessageMetadata): Promise<string> {
  // Before adding new message, check previous turn
  if (role === 'user') {
    this.autoCheckOrphans('before_message');
  }
  // ... existing implementation ...
}

// In completeToolExecution method:
public async completeToolExecution(responses: ToolResponse[]): Promise<void> {
  // ... existing implementation ...
  // After completing tools, validate pairing
  this.autoCheckOrphans('after_tools');
}

// In state transition to IDLE:
private async transitionTo(newState: HistoryState, context?: StateContext): Promise<StateTransition> {
  // ... existing implementation ...
  if (newState === HistoryState.IDLE) {
    this.autoCheckOrphans('on_idle');
  }
  // ... rest of implementation ...
}

// In getCuratedHistory method:
public getCuratedHistory(): HistoryEntry[] {
  // Validate before returning
  this.autoCheckOrphans('get_history');
  // ... existing implementation ...
}
```

### Task 1: Implement detectOrphanedToolCalls() with Automatic Triggers
**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/services/history/HistoryService.ts`

**Pseudocode Reference**: validation.md:309-330 (tool call detection logic)

```typescript
// MARKER: HS-018-IMPLEMENTATION-START
// @requirement HS-018: Detect orphaned tool calls
public detectOrphanedToolCalls(): ToolCall[] {
  const orphanedCalls: ToolCall[] = [];
  const responseIds = new Set<string>();
  
  // Step 1: Collect all tool response IDs from history
  // Pseudocode reference: validation.md:312-318
  for (const entry of this.history) {
    if (entry.message.role === 'tool' && entry.message.metadata?.toolCallId) {
      responseIds.add(entry.message.metadata.toolCallId);
    }
  }
  
  // Step 2: Find tool calls without matching responses
  // Pseudocode reference: validation.md:320-330
  for (const entry of this.history) {
    if (entry.message.role === 'assistant' && entry.message.metadata?.toolCalls) {
      for (const toolCall of entry.message.metadata.toolCalls) {
        if (!responseIds.has(toolCall.id)) {
          orphanedCalls.push(toolCall);
        }
      }
    }
  }
  
  return orphanedCalls;
}
// MARKER: HS-018-IMPLEMENTATION-END

// @requirement HS-018: Automatic orphan detection
private autoCheckOrphans(trigger: 'before_message' | 'after_tools' | 'on_idle' | 'get_history'): void {
  try {
    const orphanedCalls = this.detectOrphanedToolCalls();
    const orphanedResponses = this.detectOrphanedToolResponses();
    
    if (orphanedCalls.length > 0 || orphanedResponses.length > 0) {
      const error = new ValidationError(
        `Orphaned tools detected at ${trigger}: ${orphanedCalls.length} calls, ${orphanedResponses.length} responses`
      );
      
      // Log warning but don't block operation
      this.logger?.warn('Orphaned tools detected', {
        trigger,
        orphanedCalls: orphanedCalls.map(c => c.id),
        orphanedResponses: orphanedResponses.map(r => r.toolCallId)
      });
      
      // Emit event for monitoring
      this.eventEmitter?.emit('OrphanedToolsDetected', {
        trigger,
        orphanedCalls,
        orphanedResponses
      });
      
      // For before_message trigger, we may want to block
      if (trigger === 'before_message' && (orphanedCalls.length > 0 || orphanedResponses.length > 0)) {
        throw error;
      }
    }
  } catch (error) {
    if (trigger === 'before_message') {
      throw error; // Re-throw for blocking triggers
    }
    // Log but don't block for non-critical triggers
    this.logger?.error('Error during automatic orphan check', { trigger, error });
  }
}
```

### Task 2: Implement detectOrphanedToolResponses()
**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/services/history/HistoryService.ts`

**Pseudocode Reference**: validation.md:332-353 (tool response detection logic)

```typescript
// MARKER: HS-019-IMPLEMENTATION-START
public detectOrphanedToolResponses(): ToolResponse[] {
  const orphanedResponses: ToolResponse[] = [];
  const callIds = new Set<string>();
  
  // Step 1: Collect all tool call IDs from history
  // Pseudocode reference: validation.md:335-341
  for (const entry of this.history) {
    if (entry.message.role === 'assistant' && entry.message.metadata?.toolCalls) {
      for (const toolCall of entry.message.metadata.toolCalls) {
        callIds.add(toolCall.id);
      }
    }
  }
  
  // Step 2: Find tool responses without matching calls
  // Pseudocode reference: validation.md:343-353
  for (const entry of this.history) {
    if (entry.message.role === 'tool' && entry.message.metadata?.toolCallId) {
      const toolCallId = entry.message.metadata.toolCallId;
      if (!callIds.has(toolCallId)) {
        orphanedResponses.push({
          toolCallId: toolCallId,
          result: entry.message.content,
          error: undefined
        });
      }
    }
  }
  
  return orphanedResponses;
}
// MARKER: HS-019-IMPLEMENTATION-END
```

### Task 3: Implement validateToolResponseIds()
**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/services/history/HistoryService.ts`

**Pseudocode Reference**: validation.md:355-385 (ID validation logic)

```typescript
// MARKER: HS-020-IMPLEMENTATION-START
public validateToolResponseIds(): ValidationResult {
  const errors: ValidationError[] = [];
  const callIds = new Set<string>();
  
  // Step 1: Collect all tool call IDs and check for duplicates
  // Pseudocode reference: validation.md:358-368
  for (let i = 0; i < this.history.length; i++) {
    const entry = this.history[i];
    if (entry.message.role === 'assistant' && entry.message.metadata?.toolCalls) {
      for (const toolCall of entry.message.metadata.toolCalls) {
        if (callIds.has(toolCall.id)) {
          errors.push({
            type: 'MISMATCHED_IDS',
            message: `Duplicate tool call ID found: ${toolCall.id}`,
            entryIndex: i,
            toolId: toolCall.id
          });
        } else {
          callIds.add(toolCall.id);
        }
      }
    }
  }
  
  // Step 2: Validate tool response IDs match existing calls
  // Pseudocode reference: validation.md:370-385
  for (let i = 0; i < this.history.length; i++) {
    const entry = this.history[i];
    if (entry.message.role === 'tool' && entry.message.metadata?.toolCallId) {
      const toolCallId = entry.message.metadata.toolCallId;
      if (!callIds.has(toolCallId)) {
        errors.push({
          type: 'MISMATCHED_IDS',
          message: `Tool response references non-existent call ID: ${toolCallId}`,
          entryIndex: i,
          toolId: toolCallId
        });
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
// MARKER: HS-020-IMPLEMENTATION-END
```

### Task 4: Implement validateHistoryStructure()
**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/services/history/HistoryService.ts`

**Pseudocode Reference**: validation.md:387-420 (structure validation logic)

```typescript
// MARKER: HS-021-IMPLEMENTATION-START
public validateHistoryStructure(): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Step 1: Basic structure validation
  // Pseudocode reference: validation.md:390-400
  if (!Array.isArray(this.history)) {
    errors.push({
      type: 'INVALID_STRUCTURE',
      message: 'History must be an array',
      entryIndex: -1
    });
    return { isValid: false, errors };
  }
  
  // Step 2: Validate each history entry
  // Pseudocode reference: validation.md:402-415
  for (let i = 0; i < this.history.length; i++) {
    const entry = this.history[i];
    
    // Validate entry structure
    if (!entry.id || !entry.message || !entry.timestamp) {
      errors.push({
        type: 'INVALID_STRUCTURE',
        message: 'History entry missing required fields (id, message, timestamp)',
        entryIndex: i
      });
      continue;
    }
    
    // Validate message structure
    const message = entry.message;
    if (!message.id || !message.role || !message.content) {
      errors.push({
        type: 'INVALID_STRUCTURE',
        message: 'Message missing required fields (id, role, content)',
        entryIndex: i
      });
      continue;
    }
    
    // Validate message role
    const validRoles: MessageRole[] = ['user', 'assistant', 'system', 'tool'];
    if (!validRoles.includes(message.role)) {
      errors.push({
        type: 'INVALID_STRUCTURE',
        message: `Invalid message role: ${message.role}`,
        entryIndex: i
      });
    }
    
    // Validate tool messages have required metadata
    if (message.role === 'tool' && !message.metadata?.toolCallId) {
      errors.push({
        type: 'INVALID_STRUCTURE',
        message: 'Tool messages must have toolCallId in metadata',
        entryIndex: i
      });
    }
  }
  
  // Step 3: Run integrated validation checks
  // Pseudocode reference: validation.md:417-420
  const orphanedCalls = this.detectOrphanedToolCalls();
  const orphanedResponses = this.detectOrphanedToolResponses();
  const idValidation = this.validateToolResponseIds();
  
  // Add orphaned tool call errors
  for (const call of orphanedCalls) {
    errors.push({
      type: 'ORPHANED_TOOL_CALL',
      message: `Tool call without response: ${call.id}`,
      toolId: call.id
    });
  }
  
  // Add orphaned tool response errors
  for (const response of orphanedResponses) {
    errors.push({
      type: 'ORPHANED_TOOL_RESPONSE',
      message: `Tool response without matching call: ${response.toolCallId}`,
      toolId: response.toolCallId
    });
  }
  
  // Add ID validation errors
  errors.push(...idValidation.errors);
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
// MARKER: HS-021-IMPLEMENTATION-END
```

## Implementation Guidelines

### Code Quality Standards
- Follow existing HistoryService code patterns
- Use TypeScript strict mode features
- Add comprehensive JSDoc comments
- Reference pseudocode line numbers in comments

### Error Handling
- Use ValidationError types from types.ts
- Provide clear, actionable error messages
- Include context (entry index, tool ID) where relevant
- Handle edge cases gracefully

### Performance Considerations
- Minimize multiple passes through history array
- Use Set data structures for O(1) lookups
- Cache results where appropriate
- Handle large history arrays efficiently

### Provider Agnostic Design
- No provider-specific logic or assumptions
- Work with generic Message/HistoryEntry structures
- Extensible for different conversation formats
- No hardcoded provider names or formats

## Required Code Markers

### Implementation Markers
```typescript
// MARKER: HS-018-IMPLEMENTATION-START
// detectOrphanedToolCalls implementation
// MARKER: HS-018-IMPLEMENTATION-END

// MARKER: HS-019-IMPLEMENTATION-START  
// detectOrphanedToolResponses implementation
// MARKER: HS-019-IMPLEMENTATION-END

// MARKER: HS-020-IMPLEMENTATION-START
// validateToolResponseIds implementation  
// MARKER: HS-020-IMPLEMENTATION-END

// MARKER: HS-021-IMPLEMENTATION-START
// validateHistoryStructure implementation
// MARKER: HS-021-IMPLEMENTATION-END
```

### Method Documentation
```typescript
/**
 * Detects tool calls that don't have corresponding tool responses
 * @requirement HS-018
 * @pseudocode validation.md:309-330
 * @returns Array of orphaned ToolCall objects
 */
```

## Success Criteria

### ✅ Implementation Complete
- [ ] All 4 validation methods implemented
- [ ] NotYetImplemented errors removed  
- [ ] All methods return correct types
- [ ] Required code markers present

### ✅ Phase 13 Tests Pass
- [ ] All validation TDD tests pass
- [ ] No test failures or errors
- [ ] All edge cases handled correctly
- [ ] Performance acceptable for large histories

### ✅ Code Quality Standards
- [ ] TypeScript compilation successful
- [ ] JSDoc documentation complete
- [ ] Error handling comprehensive
- [ ] Provider-agnostic design maintained

### ✅ Integration Ready
- [ ] Methods integrate with existing HistoryService
- [ ] Compatible with current type definitions  
- [ ] No breaking changes to existing code
- [ ] Ready for next phase integration

## Test Execution Commands

### Run All Validation Tests
```bash
cd /Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core
npm test -- --testPathPattern=validation
```

### Run Specific Validation Methods
```bash
# Test orphaned calls detection
npm test -- --testNamePattern="detectOrphanedToolCalls"

# Test orphaned responses detection  
npm test -- --testNamePattern="detectOrphanedToolResponses"

# Test ID validation
npm test -- --testNamePattern="validateToolResponseIds"

# Test structure validation
npm test -- --testNamePattern="validateHistoryStructure"
```

### Watch Mode for Implementation
```bash
npm test -- --watch --testPathPattern=validation
```

## Validation Test Data

### Test Scenario Examples

#### Valid Tool Call/Response Pair
```typescript
const validHistory: HistoryEntry[] = [
  {
    id: 'entry1',
    message: {
      id: 'msg1',
      role: 'assistant',
      content: 'I will help you search.',
      timestamp: new Date(),
      metadata: {
        toolCalls: [
          { id: 'call1', name: 'search', arguments: { query: 'test' } }
        ]
      }
    },
    timestamp: new Date()
  },
  {
    id: 'entry2', 
    message: {
      id: 'msg2',
      role: 'tool',
      content: '{"results": []}',
      timestamp: new Date(),
      metadata: {
        toolCallId: 'call1'
      }
    },
    timestamp: new Date()
  }
];
```

#### Orphaned Tool Call Scenario
```typescript
const orphanedCallHistory: HistoryEntry[] = [
  {
    id: 'entry1',
    message: {
      id: 'msg1', 
      role: 'assistant',
      content: 'Searching...',
      timestamp: new Date(),
      metadata: {
        toolCalls: [
          { id: 'call1', name: 'search', arguments: { query: 'test' } }
        ]
      }
    },
    timestamp: new Date()
  }
  // Missing tool response for call1
];
```

#### Orphaned Tool Response Scenario
```typescript
const orphanedResponseHistory: HistoryEntry[] = [
  {
    id: 'entry1',
    message: {
      id: 'msg1',
      role: 'tool', 
      content: '{"results": []}',
      timestamp: new Date(),
      metadata: {
        toolCallId: 'nonexistent-call'
      }
    },
    timestamp: new Date()
  }
];
```

## Failure Recovery

### Common Implementation Issues

**Issue: Tests still failing after implementation**
- **Recovery**: Check test expectations match implementation behavior
- **Debug**: Add console.log statements to trace validation logic
- **Verify**: Ensure all edge cases from tests are handled

**Issue: TypeScript compilation errors**
- **Recovery**: Verify return types match interface definitions
- **Check**: Import statements for ValidationResult and ValidationError types
- **Fix**: Type annotations for all method parameters and returns

**Issue: Performance issues with large histories**
- **Recovery**: Profile validation methods with large test data
- **Optimize**: Use Set data structures instead of array searches
- **Cache**: Avoid repeated iteration through history array

**Issue: Provider-specific assumptions creeping in**
- **Recovery**: Review validation logic for hardcoded provider names
- **Test**: Verify validation works with different message formats
- **Refactor**: Use generic field names and structures only

### Debugging Commands

```bash
# TypeScript compilation check
npx tsc --noEmit

# Run single test with debug output  
npm test -- --testNamePattern="detectOrphanedToolCalls" --verbose

# Check test coverage
npm test -- --coverage --testPathPattern=validation
```

## Next Steps

Upon successful Phase 14 completion:
1. All validation TDD tests pass
2. HistoryService validation methods fully implemented
3. Ready to proceed to next integration phase
4. Validation system ready for provider integration

Upon implementation failure:
1. Address specific test failures using debugging commands
2. Review pseudocode references for implementation guidance  
3. Use failure recovery procedures for common issues
4. Do not proceed until all tests pass

## Notes
- This phase implements REAL validation logic to replace stubs
- Tests should guide implementation behavior and edge case handling
- Reference validation.md pseudocode for implementation patterns
- Focus on provider-agnostic design for broad compatibility
- Performance optimization important for large conversation histories