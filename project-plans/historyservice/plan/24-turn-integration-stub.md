# Phase 24: Turn.ts Integration Stub

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P24  
**Title:** Turn.ts Integration Stub for HistoryService Tool Management  
**Requirements:** HS-050 (Turn Integration), HS-009 to HS-014 (Tool Management)

## Prerequisites

- [ ] Phase 23a passed (GeminiChat integration verified)
- [ ] Tool Management methods in HistoryService fully implemented (Phases 15-17a completed)
- [ ] HistoryService core implementation validated
- [ ] Event system implementation completed

## Critical Integration Analysis

Based on actual Turn.ts source code analysis:

**Current Tool Execution Flow:**
- **Line 253**: `handlePendingFunctionCall(fnCall)` method processes individual function calls
- **Line 304**: `handlePendingFunctionCall` method creates ToolCallRequestInfo and adds to `pendingToolCalls` array
- Uses GeminiEventType.ToolCallRequest events via TurnEmitter
- Event-driven pattern maintained through TurnEmitter system

**Key Modification Point:**
- **Target Method**: `handlePendingFunctionCall` (line 304-325), NOT `handleFunctionCalls`
- **Integration Strategy**: Wrap pending/commit pattern around existing tool request flow
- **Architecture**: Preserve event-driven TurnEmitter system
- **No ToolManager**: Direct integration with HistoryService tool methods (no intermediate layer)

## Implementation Tasks

### 1. Add HistoryService Integration Properties

**File:** `/packages/core/src/core/turn.ts`
**Location:** After line 80 (class properties section)

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P24
// @requirement HS-050: Turn integration with HistoryService tool management
private historyService?: IHistoryService;
private historyService integrationTools: boolean = false;

// Method to enable HistoryService integration
setHistoryService(historyService: IHistoryService): void {
  this.historyService = historyService;
  this.historyService integrationTools = true;
}
```

### 2. Modify handlePendingFunctionCall Method

**File:** `/packages/core/src/core/turn.ts`
**Location:** Replace existing handlePendingFunctionCall method (lines 304-325)

```typescript
// @requirement HS-050: Integrate pending/commit pattern with existing tool flow
// @requirement HS-009: Add pending tool calls before processing
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

  // EXISTING: Add to pending tool calls array (preserve current behavior)
  this.pendingToolCalls.push(toolCallRequest);

  // NEW: Add pending tool call to HistoryService if enabled
  // Note: Tool management is integrated directly into HistoryService, not a separate ToolManager
  if (this.historyService integrationTools && this.historyService) {
    try {
      // @pseudocode tool-management.md:29-61 (HistoryService.addPendingToolCalls)
      const historyToolCall = {
        id: callId,
        function: {
          name: name,
          arguments: JSON.stringify(args)
        },
        timestamp: Date.now()
      };
      
      // Note: This is async but we don't await to preserve event flow timing
      this.historyService.addPendingToolCalls([historyToolCall]).catch(error => {
        console.warn(`Failed to add pending tool call ${callId} to HistoryService:`, error);
      });
      
      console.log(`Added pending tool call ${callId} (${name}) to HistoryService`);
    } catch (error) {
      console.warn(`Error adding pending tool call ${callId} to HistoryService:`, error);
    }
  }

  // EXISTING: Yield request event (preserve TurnEmitter pattern)
  return { type: GeminiEventType.ToolCallRequest, value: toolCallRequest };
}
```

### 3. Add Tool Execution Completion Handler

**File:** `/packages/core/src/core/turn.ts`
**Location:** After handlePendingFunctionCall method (around line 325)

```typescript
// @requirement HS-010: Commit tool responses after successful execution
// @requirement HS-013: Tool state management integration
// Note: Calls HistoryService directly, no intermediate ToolManager
public async handleToolExecutionComplete(
  toolCallId: string, 
  result: ToolResult
): Promise<void> {
  // STUB: Add tool response to HistoryService if enabled
  if (this.historyService integrationTools && this.historyService) {
    try {
      // @pseudocode tool-management.md:107-134 (HistoryService.commitToolResponses)
      const toolResponse = {
        toolCallId: toolCallId,
        content: result.output || result.error || null,
        timestamp: Date.now(),
        executionTime: result.executionTime,
        error: result.error ? result.error : undefined
      };
      
      await this.historyService.commitToolResponses([toolResponse]);
      console.log(`Added tool response for ${toolCallId} to HistoryService`);
    } catch (error) {
      console.warn(`Failed to add tool response for ${toolCallId} to HistoryService:`, error);
    }
  }
}

// @requirement HS-012: Handle tool execution failures
public async handleToolExecutionError(
  toolCallId: string, 
  error: Error
): Promise<void> {
  // STUB: Add error response to HistoryService if enabled
  if (this.historyService integrationTools && this.historyService) {
    try {
      const errorResponse = {
        toolCallId: toolCallId,
        error: error.message,
        timestamp: Date.now()
      };
      
      await this.historyService.commitToolResponses([errorResponse]);
      console.log(`Added error response for ${toolCallId} to HistoryService`);
    } catch (historyError) {
      console.warn(`Failed to add error response for ${toolCallId} to HistoryService:`, historyError);
    }
  }
}

// @requirement HS-011: Complete tool execution cycle
public async completeAllToolExecution(): Promise<void> {
  // STUB: Complete tool execution cycle in HistoryService
  if (this.historyService integrationTools && this.historyService && this.pendingToolCalls.length > 0) {
    try {
      // Note: completeToolExecution might be part of commitToolResponses flow
      // HistoryService manages the complete cycle internally
      const status = await this.historyService.getToolCallStatus();
      console.log(`Tool execution status: ${status.completedCalls} completed, ${status.pendingCalls} pending`);
    } catch (error) {
      console.warn('Failed to complete tool execution cycle in HistoryService:', error);
    }
  }
}
```

### 4. Add Tool Status Querying

**File:** `/packages/core/src/core/turn.ts`
**Location:** After completion handlers

```typescript
// @requirement HS-014: Tool call status querying
public getToolExecutionStatus(): ToolExecutionStatus | null {
  // STUB: Get tool status from HistoryService if enabled
  if (this.historyService integrationTools && this.historyService) {
    try {
      return this.historyService.getToolCallStatus();
    } catch (error) {
      console.warn('Failed to get tool status from HistoryService:', error);
    }
  }
  
  // service delegation: Return basic status based on current Turn state
  return {
    pendingCalls: this.pendingToolCalls.length,
    completedCalls: 0, // Cannot determine without HistoryService
    failedCalls: 0,    // Cannot determine without HistoryService
    currentState: this.pendingToolCalls.length > 0 ? 'TOOLS_EXECUTING' : 'READY'
  };
}

// @requirement HS-050: Helper for external tool state management
public hasPendingTools(): boolean {
  return this.pendingToolCalls.length > 0;
}
```

### 5. Add Required Imports

**File:** `/packages/core/src/core/turn.ts`
**Location:** After existing imports (around line 30)

```typescript
// @requirement HS-050: Import HistoryService interfaces for integration
import { IHistoryService } from '../historyservice/interfaces/IHistoryService.js';
import { ToolExecutionStatus } from '../historyservice/interfaces/ToolTypes.js';
```

## Integration Strategy

### Preserving Existing Architecture

**Event System Integration:**
- No changes to existing TurnEmitter event flow
- Tool execution still handled by existing event system
- HistoryService integration is additive, not replacement
- Direct HistoryService integration (no intermediate ToolManager layer)

**TurnEmitter Event System:**
- All existing events preserved (ToolCallRequest, ToolCallResponse)
- New events can be added later for HistoryService status
- Event timing and order maintained

**Gemini Provider Compatibility:**
- No changes to Gemini API interactions
- Tool request/response format unchanged
- Provider-specific logic preserved

## Success Criteria

- [ ] Turn class accepts HistoryService via `setHistoryService()` method
- [ ] `handlePendingFunctionCall` integrates pending tool calls with HistoryService methods directly
- [ ] Tool execution completion handlers created for response management via HistoryService
- [ ] Tool status querying implemented via `getToolExecutionStatus()` from HistoryService
- [ ] TurnEmitter event system unchanged and functional
- [ ] Service integration (`historyService integrationTools`) controls integration
- [ ] TypeScript compilation passes without errors
- [ ] No breaking changes to existing Turn functionality
- [ ] No intermediate ToolManager layer - direct HistoryService integration

## Required Code Markers

All new code must include these markers:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P24
// @requirement HS-050: [specific requirement description]
// @pseudocode [reference to pseudocode file:line-range]
```

## Verification Commands

```bash
# Verify HistoryService integration properties
grep -n "historyService.*IHistoryService" /packages/core/src/core/turn.ts
grep -n "historyService integrationTools.*boolean" /packages/core/src/core/turn.ts

# Check handlePendingFunctionCall modification
grep -A 30 "handlePendingFunctionCall.*fnCall" /packages/core/src/core/turn.ts | grep "addPendingToolCalls"

# Verify tool completion handlers
grep -n "handleToolExecutionComplete\|handleToolExecutionError" /packages/core/src/core/turn.ts

# Check tool status integration
grep -n "getToolExecutionStatus\|ToolExecutionStatus" /packages/core/src/core/turn.ts

# Verify imports
grep -n "IHistoryService\|ToolExecutionStatus" /packages/core/src/core/turn.ts

# Ensure TypeScript compilation passes
cd /packages/core && npx tsc --noEmit src/core/turn.ts
```

## Next Phase

**Phase 24a:** Turn Integration Stub Verification
- Validate all integration points implemented correctly
- Test service integration functionality
- Verify preserved existing functionality
- Confirm TypeScript compilation success