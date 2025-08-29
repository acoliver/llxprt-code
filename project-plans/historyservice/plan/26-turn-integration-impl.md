# Phase 26: Turn.ts Integration Implementation

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P26  
**Prerequisites:** Phase 25a passed  
**Type:** Implementation Phase  

## Overview

This implementation phase completes the full Turn.ts integration with HistoryService, implementing the pending/commit pattern around tool execution to make all Phase 25 tests pass. The focus is on integrating with CoreToolScheduler callbacks, preserving TurnEmitter events, and handling errors and cancellations properly while maintaining direct replacement.

## Target Implementation

### Primary File: `/packages/core/src/core/turn.ts`
- **Location**: Update existing `handlePendingFunctionCall` method around line 304
- **Integration Type**: Add HistoryService pending/commit pattern
- **Compatibility**: Preserve all existing functionality

## Implementation Tasks

### Task 1: Complete HistoryService Integration Setup
**File**: `/packages/core/src/core/turn.ts`
**Location**: Import section and constructor

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P26
// @requirement HS-050: Turn.ts integration with CoreToolScheduler
// @requirement HS-011: Tool calls and responses committed atomically
// @requirement HS-012: Abort pending tool calls capability

import { HistoryService } from '../history/HistoryService.js';
import { HistoryItemType } from '../history/types.js';
```

**Constructor Integration** (~line 150):
```typescript
private historyService?: HistoryService;

constructor(
  // existing constructor parameters
  historyService?: HistoryService,
) {
  // existing constructor logic
  this.historyService = historyService;
}
```

### Task 2: Implement Pending Pattern in handlePendingFunctionCall
**File**: `/packages/core/src/core/turn.ts`
**Location**: Method `handlePendingFunctionCall` around line 304

**Replace the current method with full integration**:
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P26
// @requirement HS-050: Complete pending/commit pattern for tool execution
private handlePendingFunctionCall(
  fnCall: FunctionCall,
): ServerGeminiStreamEvent | null {
  const callId =
    fnCall.id ??
    `${fnCall.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const name = fnCall.name || 'undefined_tool_name';
  const args = (fnCall.args || {}) as Record<string, unknown>;

  const toolCallRequest: ToolCallRequestInfo = {
    callId,
    name,
    args,
    isClientInitiated: false,
    prompt_id: this.prompt_id,
  };

  this.pendingToolCalls.push(toolCallRequest);

  // HistoryService Integration: Add tool call as pending before execution
  if (this.historyService) {
    try {
      this.historyService.pendingHistoryItem(callId, {
        type: HistoryItemType.ToolCall,
        callId,
        toolName: name,
        parameters: args,
        timestamp: new Date(),
        isClientInitiated: false,
      });
    } catch (error) {
      // Log but don't fail - history is supplementary
      console.warn(`Failed to add pending history item for ${callId}:`, error);
    }
  }

  // Yield a request for the tool call, not the pending/confirming status
  return { type: GeminiEventType.ToolCallRequest, value: toolCallRequest };
}
```

### Task 3: Implement Tool Execution Commit Pattern  
**File**: `/packages/core/src/core/turn.ts`
**Location**: New method after `handlePendingFunctionCall`

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P26
// @requirement HS-011: Tool calls and responses committed atomically
private commitToolExecution(callId: string, result: ToolResult): void {
  if (this.historyService) {
    try {
      this.historyService.commitHistoryItem(callId, {
        type: HistoryItemType.ToolResponse,
        callId,
        result,
        timestamp: new Date(),
        status: result.success ? 'completed' : 'failed',
      });
    } catch (error) {
      console.warn(`Failed to commit history item for ${callId}:`, error);
    }
  }
}
```

### Task 4: Implement Tool Execution Abort Pattern
**File**: `/packages/core/src/core/turn.ts`
**Location**: New method after `commitToolExecution`

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P26  
// @requirement HS-012: Abort pending tool calls capability
private abortToolExecution(callId: string, reason: 'error' | 'cancellation'): void {
  if (this.historyService) {
    try {
      this.historyService.abortPendingItem(callId, {
        reason,
        timestamp: new Date(),
      });
    } catch (error) {
      console.warn(`Failed to abort history item for ${callId}:`, error);
    }
  }
}
```

### Task 5: Integrate with CoreToolScheduler Callbacks
**File**: `/packages/core/src/core/turn.ts`
**Location**: Find tool execution callback handling (search for existing callback patterns)

**Enhance existing callback handling** (~line 400+):
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P26
// @requirement HS-050: Preserve existing CoreToolScheduler callback pattern
// Find existing tool execution callback logic and enhance:

// Before tool execution callback:
if (this.historyService && toolCallRequest) {
  // Tool is already pending from handlePendingFunctionCall
}

// After successful tool execution callback:
if (toolResult && toolResult.success && this.historyService) {
  this.commitToolExecution(toolCallRequest.callId, toolResult);
}

// After failed tool execution callback:
if (toolResult && !toolResult.success && this.historyService) {
  this.abortToolExecution(toolCallRequest.callId, 'error');
}

// On user cancellation:
if (wasCancelled && this.historyService) {
  this.abortToolExecution(toolCallRequest.callId, 'cancellation');
}
```

### Task 6: Preserve and Enhance TurnEmitter Events
**File**: `/packages/core/src/core/turn.ts`
**Location**: Find existing event emission code (search for "emit" patterns)

**Enhance existing events with history metadata**:
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P26
// @requirement HS-050: TurnEmitter events preserved and enhanced

// Find existing event emission patterns and enhance them:
// Example for turn completion events:
this.emitter.emit('turnComplete', {
  ...existingEventData,
  historyMetadata: this.historyService ? {
    toolCallsCommitted: committedToolCalls.length,
    toolCallsAborted: abortedToolCalls.length,
    totalHistoryItems: this.historyService.getItemCount(),
  } : undefined,
});
```

### Task 7: Error Handling and direct replacement  
**File**: `/packages/core/src/core/turn.ts`
**Location**: Throughout modified methods

**Add comprehensive error handling**:
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P26
// @requirement HS-050: Maintain direct replacement

// Wrap all HistoryService calls in try-catch blocks
// Ensure Turn functionality works even if HistoryService is unavailable
// Log warnings for history failures but don't break tool execution
// Preserve all existing method signatures
// Maintain existing return types and behaviors
```

## Implementation Strategy

### Phase 1: Core Integration (Lines 304-350)
1. **Update handlePendingFunctionCall**: Add pending history pattern
2. **Add commit method**: Create commitToolExecution method
3. **Add abort method**: Create abortToolExecution method  
4. **Test integration**: Verify basic pattern works

### Phase 2: Callback Integration (Lines 400+)
1. **Locate callback patterns**: Find existing CoreToolScheduler integration  
2. **Enhance callbacks**: Add history operations to existing flows
3. **Preserve timing**: Maintain existing callback execution order
4. **Error resilience**: Ensure callback errors don't break history

### Phase 3: Event Enhancement (Various locations)
1. **Locate event emissions**: Find existing TurnEmitter events
2. **Add metadata**: Enhance events with history information
3. **Preserve events**: Ensure all existing events still fire
4. **Timing preservation**: Maintain existing event sequence

### Phase 4: Error and Edge Cases
1. **Graceful degradation**: Handle missing HistoryService gracefully  
2. **Error logging**: Add appropriate warning logs for history failures
3. **Cancellation handling**: Properly handle user cancellations
4. **Resource cleanup**: Ensure proper cleanup on errors

## Required Code Markers

### In Implementation Files
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P26
// @requirement HS-050: Turn.ts integration with CoreToolScheduler
// @requirement HS-011: Tool calls and responses committed atomically  
// @requirement HS-012: Abort pending tool calls capability
```

### Critical Integration Points
1. **Line ~304**: `handlePendingFunctionCall` method enhancement
2. **Line ~350**: New `commitToolExecution` method
3. **Line ~370**: New `abortToolExecution` method
4. **Line ~400+**: CoreToolScheduler callback integration
5. **Various**: TurnEmitter event enhancement points

## Success Criteria

### ✅ Phase 25 Test Compliance
1. **All Phase 25 tests pass**: Every test written in Phase 25 TDD must pass
2. **Tool Execution Flow Tests**: Pending → Executing → Commit/Abort flows work
3. **Error Handling Tests**: Tool failures and cancellations handled correctly
4. **Callback Preservation Tests**: Existing CoreToolScheduler callbacks work
5. **Event Preservation Tests**: All TurnEmitter events continue to work

### ✅ Integration Quality Requirements
1. **direct replacement**: All existing Turn functionality preserved
2. **Performance**: No significant performance degradation
3. **Error Resilience**: History failures don't break tool execution  
4. **Resource Management**: Proper cleanup and memory management
5. **Code Quality**: Clean, maintainable integration code

### ✅ Functional Verification Requirements
1. **Real Tool Integration**: Works with actual shell, file, and other tools
2. **Multi-tool Scenarios**: Handles parallel tool execution correctly
3. **Cancellation Support**: Properly handles user-initiated cancellations  
4. **Error Propagation**: Tool errors properly propagated and historied
5. **History Accuracy**: History accurately reflects tool execution timeline

## Validation Commands

### Core Functionality Validation
```bash
# Run all Phase 25 tests - they must all pass
cd packages/core
npm test -- --testPathPattern="turn.test.ts" --verbose

# Run specific integration tests
npm test -- --testPathPattern="turn.test.ts" --testNamePattern="HistoryService Integration"
```

### direct replacement Validation  
```bash
# Run all existing turn tests - they must still pass
npm test -- --testPathPattern="turn.test.ts" --testNamePattern="^(?!.*HistoryService).*"

# Run broader turn-related tests
npm test -- --testPathPattern="turn"
```

### Integration Performance Validation
```bash
# Test performance impact
npm test -- --testPathPattern="turn.test.ts" --verbose --runInBand

# Memory leak detection (if available)
npm test -- --testPathPattern="turn.test.ts" --detectMemoryLeaks
```

## Implementation Commands

### Step 1: Locate Integration Points
```bash
# Find the exact line numbers for integration
cd packages/core
grep -n "handlePendingFunctionCall" src/core/turn.ts

# Find callback patterns
grep -n -A 5 "CoreToolScheduler\|callback" src/core/turn.ts  

# Find event emission patterns
grep -n -A 5 "emit\|TurnEmitter" src/core/turn.ts
```

### Step 2: Implement Core Integration
```bash
# Edit turn.ts to add the core integration methods
# Focus on handlePendingFunctionCall, commitToolExecution, abortToolExecution
```

### Step 3: Integrate with Existing Flows
```bash
# Add history operations to existing callback flows
# Enhance existing event emissions with history metadata
```

### Step 4: Test and Validate
```bash
# Run Phase 25 tests to verify implementation
npm test -- --testPathPattern="turn.test.ts" --verbose

# Run full test suite to ensure no regressions
npm test
```

## Failure Recovery

### Common Integration Issues

#### 1. Tests Still Failing After Implementation
**Issue:** Phase 25 tests not passing despite implementation
**Recovery:**
```bash
# Run tests with detailed output to identify specific failures
npm test -- --testPathPattern="turn.test.ts" --verbose --no-coverage

# Check specific test failures
npm test -- --testPathPattern="turn.test.ts" --testNamePattern="specific failing test"

# Verify integration points are correctly implemented
grep -A 10 -B 5 "pendingHistoryItem\|commitHistoryItem" src/core/turn.ts
```

#### 2. Callback Integration Issues
**Issue:** CoreToolScheduler callbacks not working correctly  
**Recovery:**
```bash
# Verify callback preservation
grep -A 10 -B 10 "callback" src/core/turn.ts

# Check callback execution order
# Add debug logging to verify callback timing
# Ensure history operations don't interfere with callback flow
```

#### 3. Event System Issues
**Issue:** TurnEmitter events not working or missing metadata
**Recovery:**
```bash
# Verify event emission preservation
grep -A 5 -B 5 "emit" src/core/turn.ts

# Check event payload structure
# Ensure history metadata is optional and doesn't break existing consumers
# Verify all existing events still fire in correct sequence
```

#### 4. Performance Issues
**Issue:** Integration causes performance degradation
**Recovery:**
```bash
# Profile test execution to identify bottlenecks
npm test -- --testPathPattern="turn.test.ts" --verbose --runInBand

# Optimize history operations:
# - Make history operations async where possible
# - Cache frequently accessed history data
# - Minimize history service calls in hot paths
```

#### 5. Error Handling Issues  
**Issue:** History errors breaking tool execution
**Recovery:**
```bash
# Verify all HistoryService calls are wrapped in try-catch
grep -B 2 -A 2 "historyService\." src/core/turn.ts

# Ensure graceful degradation:
# - Tool execution continues even if history fails
# - Warnings logged but not propagated as errors  
# - Missing HistoryService handled gracefully
```

## Advanced Integration Considerations

### Memory Management
- Ensure pending tool calls are properly cleaned up
- History service operations should not cause memory leaks
- Consider tool call timeout scenarios

### Concurrency Handling  
- Multiple parallel tool calls must be handled correctly
- History operations should not interfere with each other
- Race conditions between commit/abort operations avoided

### Error Recovery
- Partial history failures should not affect tool execution
- History service unavailability should not break Turn functionality
- Recovery mechanisms for corrupted history state

### Performance Optimization
- Batch history operations where possible
- Avoid blocking tool execution for history operations
- Minimize memory overhead of history tracking

## Next Steps

Upon successful completion:
1. **All Phase 25 tests passing**: Confirms integration works correctly
2. **Proceed to Phase 30**: Final Integration and cleanup phases  
3. **Document integration patterns**: For use in other system components
4. **Performance benchmarking**: Establish baseline for future optimizations

Upon failure:
1. **Address specific test failures** using recovery procedures
2. **Validate integration points** against Phase 24 stub specification
3. **Consider Phase 25 TDD modifications** if tests need refinement  
4. **Escalate to architecture review** if fundamental issues discovered

## Notes

- Implementation must be incremental - start with basic pending/commit pattern
- Preserve all existing Turn.ts functionality - no breaking changes allowed
- History operations are supplementary - they must not break core tool execution
- Focus on real tool execution scenarios as tested in Phase 25 TDD
- All HistoryService operations should be defensive and resilient
- The implementation should gracefully handle HistoryService being undefined/unavailable