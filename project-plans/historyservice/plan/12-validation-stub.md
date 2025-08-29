# Phase 12: Validation System Stub

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P12  
**Prerequisites:** Phase 11a (State Implementation Verification) passed  
**Deliverable:** Validation system stubs for requirements HS-018 to HS-022

## Implementation Tasks

### 1. Add Validation Method Stubs to HistoryService

Add the following stub methods to the existing `HistoryService` class in `/packages/core/src/services/history/HistoryService.ts`:

```typescript
/**
 * Detects orphaned tool calls (calls without matching responses)
 * Automatically triggered:
 * - Before sending new message (validates previous turn)
 * - After tool execution completes (validates pairing)
 * - On state transition to IDLE (final check)
 * - When getCuratedHistory() is called
 * @requirement HS-018
 */
public detectOrphanedToolCalls(): ToolCall[] {
  throw new NotYetImplemented("detectOrphanedToolCalls - Phase 12 stub");
}

/**
 * Internal method to automatically check for orphans
 * @requirement HS-018
 */
private autoCheckOrphans(trigger: 'before_message' | 'after_tools' | 'on_idle' | 'get_history'): void {
  // STUB: Will call detectOrphanedToolCalls() and handle results
  throw new NotYetImplemented("autoCheckOrphans - Phase 12 stub");
}

/**
 * Detects orphaned tool responses (responses without matching calls)
 * @requirement HS-019
 */
public detectOrphanedToolResponses(): ToolResponse[] {
  throw new NotYetImplemented("detectOrphanedToolResponses - Phase 12 stub");
}

/**
 * Validates that tool response IDs match existing tool call IDs
 * @requirement HS-020
 */
public validateToolResponseIds(): ValidationResult {
  throw new NotYetImplemented("validateToolResponseIds - Phase 12 stub");
}

/**
 * Validates the overall history structure
 * @requirement HS-021
 */
public validateHistoryStructure(): ValidationResult {
  throw new NotYetImplemented("validateHistoryStructure - Phase 12 stub");
}
```

### 2. Add Required Types

Add these type definitions to support the validation methods:

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  type: 'ORPHANED_TOOL_CALL' | 'ORPHANED_TOOL_RESPONSE' | 'MISMATCHED_IDS' | 'INVALID_STRUCTURE';
  message: string;
  entryIndex?: number;
  toolId?: string;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: any;
}

interface ToolResponse {
  toolCallId: string;
  result: any;
  error?: string;
}
```

### 3. Import NotYetImplemented Error

Ensure the `NotYetImplemented` error class is imported:

```typescript
import { NotYetImplemented } from '../../errors/NotYetImplemented';
```

## Required Code Markers

Each stub method must include these markers:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P12
// @requirement HS-018 (for detectOrphanedToolCalls)
// @requirement HS-019 (for detectOrphanedToolResponses) 
// @requirement HS-020 (for validateToolResponseIds)
// @requirement HS-021 (for validateHistoryStructure)
// @phase validation-stub
```

## Success Criteria

### Code Structure
- [ ] All four validation methods added to HistoryService class
- [ ] All methods throw `NotYetImplemented` with descriptive messages
- [ ] Required types defined for validation results
- [ ] Proper requirement markers added to each method
- [ ] TypeScript compilation successful

### Method Signatures
- [ ] `detectOrphanedToolCalls(): ToolCall[]` - Returns empty array or throws
- [ ] `detectOrphanedToolResponses(): ToolResponse[]` - Returns empty array or throws  
- [ ] `validateToolResponseIds(): ValidationResult` - Returns validation result or throws
- [ ] `validateHistoryStructure(): ValidationResult` - Returns validation result or throws

### Documentation
- [ ] Each method has JSDoc comment with @requirement tag
- [ ] Method purposes clearly documented
- [ ] Return types properly documented
- [ ] Error throwing behavior documented

## Alternative Implementation

If `NotYetImplemented` is not available, methods can return default/empty values:

```typescript
public detectOrphanedToolCalls(): ToolCall[] {
  // TODO: Phase 13 implementation
  return [];
}

public detectOrphanedToolResponses(): ToolResponse[] {
  // TODO: Phase 13 implementation  
  return [];
}

public validateToolResponseIds(): ValidationResult {
  // TODO: Phase 13 implementation
  return { isValid: true, errors: [] };
}

public validateHistoryStructure(): ValidationResult {
  // TODO: Phase 13 implementation
  return { isValid: true, errors: [] };
}
```

## Integration Points

### Automatic Validation Triggers
Validation will be automatically triggered at these points:
1. **Before sending new message**: Validates previous turn is complete
2. **After tool execution completes**: Ensures tool calls and responses are paired
3. **On state transition to IDLE**: Final validation check
4. **When getCuratedHistory() is called**: Validates before returning history

### Current Usage
These methods will be used by:
- Phase 13: Validation TDD implementation
- Phase 21: GeminiChat integration for history validation
- Existing message/tool methods for automatic validation
- Phase 30: Final integration tests

### Future Dependencies
- Validation methods will access `this.history` array
- Methods will need to understand tool call/response structure
- Error detection will use tool call ID matching logic

## Verification Commands

```bash
# Check TypeScript compilation
cd /packages/core && npx tsc --noEmit

# Verify method signatures exist
grep -n "detectOrphanedToolCalls\|detectOrphanedToolResponses\|validateToolResponseIds\|validateHistoryStructure" packages/core/src/services/history/HistoryService.ts

# Check requirement markers
grep -n "@requirement HS-01[89]" packages/core/src/services/history/HistoryService.ts
grep -n "@requirement HS-02[01]" packages/core/src/services/history/HistoryService.ts
```

## Error Recovery

### If HistoryService doesn't exist
1. Check if previous phases (01-11) have been completed
2. Locate HistoryService file in correct directory structure
3. Verify previous phase verification passed

### If TypeScript compilation fails
1. Check if required types are properly defined
2. Verify import paths are correct
3. Ensure method signatures match exactly

### If NotYetImplemented is unavailable
1. Use alternative implementation with default return values
2. Add TODO comments for Phase 13 implementation
3. Document expected behavior in comments

## Phase Completion Checklist

- [ ] Four validation stub methods added to HistoryService
- [ ] All methods properly documented with requirements
- [ ] TypeScript compiles without errors
- [ ] Code markers present in all methods
- [ ] Verification commands execute successfully
- [ ] Ready for Phase 13 (Validation TDD implementation)

This phase provides the foundation for the validation system that will prevent orphaned tool calls and ensure history consistency per requirements HS-018 through HS-022.