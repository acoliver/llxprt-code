# Phase 15: Tool Management Stub Implementation

**Phase ID**: PLAN-20250128-HISTORYSERVICE.P15  
**Prerequisites**: Phase 14a (validation implementation verification) passed  
**Requirements**: HS-009 to HS-014  

## Overview

This phase adds tool management methods directly to the HistoryService class. Tool tracking is a core history concern - tools ARE history events. This integration prevents orphaned tool calls and maintains consistency through unified state management.

## Requirements Coverage

- **HS-009**: addPendingToolCalls() - Add tool calls to pending state
- **HS-010**: commitToolResponses() - Commit tool responses and pair with calls
- **HS-011**: Atomic operations for tool management
- **HS-012**: abortPendingToolCalls() - Clean up failed tool operations
- **HS-013**: Tool call/response ID pairing validation
- **HS-014**: Tool state consistency management

## Implementation Tasks

### Task 1: Add Tool Management Methods to HistoryService
- Add `addPendingToolCalls()` method stub to HistoryService class
- Add `commitToolResponses()` method stub to HistoryService class
- Add `abortPendingToolCalls()` method stub to HistoryService class
- Add internal pending tool calls tracking within HistoryService
- Include proper JSDoc with requirement annotations

### Task 2: Tool State Management Infrastructure in HistoryService
- Add private `pendingToolCalls` Map to HistoryService class
- Add tool call/response pairing logic stubs within HistoryService
- Include atomic operation placeholders using HistoryService's existing transaction pattern
- Add tool state validation hooks that integrate with HistoryService's state machine

## Required Code Markers

All stub methods must include:
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P15
// @requirement HS-XXX (specific requirement number)
// @phase tool-management-stub
```

## Stub Method Signatures

```typescript
/**
 * Adds tool calls to pending state for later response pairing
 * @requirement HS-009
 */
public addPendingToolCalls(toolCalls: ToolCall[]): void

/**
 * Commits tool responses, pairs with pending calls, adds to history
 * @requirement HS-010
 */
public commitToolResponses(toolResponses: ToolResponse[]): void

/**
 * Aborts pending tool calls and cleans up state
 * @requirement HS-012
 */
public abortPendingToolCalls(): void

// Internal method for pairing validation
private validateToolCallResponsePairs(): ValidationResult
```

## Atomic Operations Structure (HS-011)

The stubs should represent these atomic operation concepts:
- Begin tool operation transaction
- Validate tool call/response consistency
- Commit or rollback based on validation
- Maintain history integrity throughout

## Success Criteria

1. **Stub Methods Created**: All required tool management methods exist
2. **Proper Annotations**: All methods have correct plan/requirement markers
3. **NotYetImplemented Throws**: All stubs throw NotYetImplemented with descriptive messages
4. **Type Safety**: All method signatures use correct TypeScript types
5. **Documentation**: JSDoc comments explain purpose and requirements
6. **Atomic Structure**: Code structure represents atomic operation concepts

## Code Structure

```typescript
export class HistoryService {
  // Tool management is integrated directly into HistoryService
  // Tools ARE history - they're not a separate concern
  private pendingToolCalls: Map<string, ToolCall> = new Map();
  private toolResponses: Map<string, ToolResponse> = new Map();
  private executionOrder: string[] = [];
  
  // Phase 15: Tool Management Methods (part of HistoryService)
  // @plan PLAN-20250128-HISTORYSERVICE.P15
  // @requirement HS-009: Add pending tool calls
  public addPendingToolCalls(toolCalls: ToolCall[]): void {
    throw new NotYetImplemented("HistoryService.addPendingToolCalls - Phase 15 stub");
  }
  
  // @requirement HS-010: Commit tool responses
  public commitToolResponses(toolResponses: ToolResponse[]): void {
    throw new NotYetImplemented("HistoryService.commitToolResponses - Phase 15 stub");  
  }
  
  // @requirement HS-012: Abort pending tool calls
  public abortPendingToolCalls(): void {
    throw new NotYetImplemented("HistoryService.abortPendingToolCalls - Phase 15 stub");
  }
  
  // @requirement HS-013: Validate tool pairing
  private validateToolCallResponsePairs(): ValidationResult {
    throw new NotYetImplemented("HistoryService.validateToolCallResponsePairs - Phase 15 stub");
  }
  
  // @requirement HS-014: Get tool status
  public getToolCallStatus(): ToolExecutionStatus {
    throw new NotYetImplemented("HistoryService.getToolCallStatus - Phase 15 stub");
  }
}
```

## Next Phase

Phase 16: Tool Management TDD - Create comprehensive tests for HistoryService's tool management methods before implementation.

## Architectural Note

Tool management is NOT a separate class or module. It's an integral part of HistoryService because:
- Tool calls and responses ARE history events
- Prevents orphaned tools through unified state management
- Simpler architecture with fewer abstraction layers
- CoreToolScheduler executes → Turn orchestrates → HistoryService records