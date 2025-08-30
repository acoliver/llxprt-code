# Phase 30b: Wire Tool Execution to HistoryService

## Status: CRITICAL FIX REQUIRED

## Problem Statement

The entire HistoryService infrastructure was built but NEVER CONNECTED to the actual tool execution flow. Turn has methods to handle tool execution (handleToolExecutionComplete, handleToolExecutionError) but nothing calls them. CoreToolScheduler executes tools but never notifies Turn or HistoryService. This causes:

- Duplicate tool responses in the UI
- Tool execution history not being tracked
- Inconsistent state between displayed and recorded data

## Root Cause Analysis

The architecture created a beautiful separation of concerns but forgot the critical integration point:

- Turn.pendingToolCalls is populated when LLM requests tool execution
- Turn emits GeminiEventType.ToolCallRequest events
- BUT: No code actually executes these tools and reports back to Turn
- CoreToolScheduler exists in isolation, not connected to Turn
- Result: Tool responses bypass HistoryService completely

## Implementation Plan

### Step 1: Create Tool Execution Bridge

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/toolExecutionBridge.ts`

Create a new bridge class that connects Turn with CoreToolScheduler:

```typescript
import { Turn } from './turn.js';
import { CoreToolScheduler } from './coreToolScheduler.js';
import { ToolCallRequestInfo, ToolCallResponseInfo } from './turn.js';
import { Config } from '../config/config.js';
import { ToolRegistry } from '../tools/tool-registry.js';

export class ToolExecutionBridge {
  private scheduler: CoreToolScheduler;

  constructor(
    private config: Config,
    private toolRegistry: ToolRegistry,
    private getPreferredEditor: () => EditorType | undefined,
    private onEditorClose: () => void,
  ) {
    this.scheduler = new CoreToolScheduler({
      toolRegistry,
      outputUpdateHandler: undefined, // Will be set per execution
      onAllToolCallsComplete: undefined, // Will be set per execution
      onToolCallsUpdate: undefined, // Optional
      getPreferredEditor,
      config,
      onEditorClose,
    });
  }

  async executeToolsForTurn(
    turn: Turn,
    toolRequests: ToolCallRequestInfo[],
    signal: AbortSignal,
    outputUpdateHandler?: (id: string, chunk: string) => void,
  ): Promise<ToolCallResponseInfo[]> {
    const responses: ToolCallResponseInfo[] = [];

    // Configure scheduler for this batch
    this.scheduler = new CoreToolScheduler({
      toolRegistry: this.toolRegistry,
      outputUpdateHandler,
      onAllToolCallsComplete: async (completedCalls) => {
        // CRITICAL: Wire completed calls back to Turn
        for (const call of completedCalls) {
          if (call.status === 'success') {
            await turn.handleToolExecutionComplete(call.request.callId, {
              llmContent: call.response.responseParts,
              returnDisplay: call.response.resultDisplay,
              summary: undefined,
              error: undefined,
            });
            responses.push(call.response);
          } else if (call.status === 'error') {
            await turn.handleToolExecutionError(
              call.request.callId,
              call.response.error || new Error('Tool execution failed'),
            );
            responses.push(call.response);
          } else if (call.status === 'cancelled') {
            await turn.handleToolExecutionError(
              call.request.callId,
              new Error('Tool execution cancelled'),
            );
            responses.push(call.response);
          }
        }
      },
      onToolCallsUpdate: undefined,
      getPreferredEditor: this.getPreferredEditor,
      config: this.config,
      onEditorClose: this.onEditorClose,
    });

    // Execute tools
    await this.scheduler.schedule(toolRequests, signal);

    // Wait for completion (scheduler will call onAllToolCallsComplete)
    return responses;
  }
}
```

### Step 2: Modify GeminiClient to Use Bridge

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/client.ts`

Add tool execution bridge to GeminiClient:

```typescript
// Add import
import { ToolExecutionBridge } from './toolExecutionBridge.js';

export class GeminiClient {
  // ... existing fields ...
  private toolExecutionBridge?: ToolExecutionBridge;

  constructor(private config: Config) {
    // ... existing constructor code ...

    // Initialize tool execution bridge
    this.toolExecutionBridge = new ToolExecutionBridge(
      config,
      config.getToolRegistry(), // Assuming this exists
      () => config.getPreferredEditor(), // Assuming this exists
      () => {} // onEditorClose callback
    );
  }

  // Modify sendMessage to handle tool execution
  async *sendMessage(
    request: PartListUnion,
    signal: AbortSignal,
    prompt_id: string,
    turns?: number,
    originalModel?: string
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
    // ... existing code ...

    // Create Turn with HistoryService
    const historyService = this.historyService; // Assuming this exists
    const turn = new Turn(this.getChat(), prompt_id, providerName, historyService);

    // ... existing turn.run() code ...

    // CRITICAL: After turn completes, execute pending tools
    if (turn.pendingToolCalls.length > 0 && this.toolExecutionBridge) {
      // Execute tools and wire responses back to Turn/HistoryService
      const toolResponses = await this.toolExecutionBridge.executeToolsForTurn(
        turn,
        turn.pendingToolCalls,
        signal,
        (id, chunk) => {
          // Emit tool output update event if needed
          yield {
            type: GeminiEventType.ToolCallResponse,
            value: {
              callId: id,
              responseParts: chunk,
              resultDisplay: undefined,
              error: undefined,
              errorType: undefined
            }
          };
        }
      );

      // Tool responses are now recorded in HistoryService via Turn methods
      // Emit final tool response events
      for (const response of toolResponses) {
        yield {
          type: GeminiEventType.ToolCallResponse,
          value: response
        };
      }
    }

    return turn;
  }
}
```

### Step 3: Alternative Direct Integration in Turn

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/turn.ts`

If the bridge approach is too complex, directly integrate CoreToolScheduler into Turn:

```typescript
import { CoreToolScheduler } from './coreToolScheduler.js';

export class Turn {
  // ... existing fields ...
  private toolScheduler?: CoreToolScheduler;

  constructor(
    private readonly chat: GeminiChat,
    private readonly prompt_id: string,
    private readonly providerName: string = 'backend',
    historyService?: HistoryService,
    private config?: Config,
    private toolRegistry?: ToolRegistry,
  ) {
    // ... existing constructor ...

    // Initialize tool scheduler if we have the necessary dependencies
    if (config && toolRegistry) {
      this.toolScheduler = new CoreToolScheduler({
        toolRegistry,
        outputUpdateHandler: undefined,
        onAllToolCallsComplete: this.handleToolCallsComplete.bind(this),
        onToolCallsUpdate: undefined,
        getPreferredEditor: () => undefined, // TODO: Get from config
        config,
        onEditorClose: () => {},
      });
    }
  }

  // New method to handle tool execution completion
  private async handleToolCallsComplete(
    completedCalls: CompletedToolCall[],
  ): Promise<void> {
    for (const call of completedCalls) {
      if (call.status === 'success') {
        await this.handleToolExecutionComplete(call.request.callId, {
          llmContent: call.response.responseParts,
          returnDisplay: call.response.resultDisplay,
          summary: undefined,
          error: undefined,
        });
      } else if (call.status === 'error' || call.status === 'cancelled') {
        await this.handleToolExecutionError(
          call.request.callId,
          call.response.error || new Error(`Tool ${call.status}`),
        );
      }
    }
  }

  // Add method to execute pending tools
  async executePendingTools(signal: AbortSignal): Promise<void> {
    if (this.pendingToolCalls.length === 0 || !this.toolScheduler) {
      return;
    }

    // Schedule all pending tools for execution
    await this.toolScheduler.schedule(this.pendingToolCalls, signal);
  }
}
```

### Step 4: Wire Tool Execution in Client Flow

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/client.ts`

Ensure tools are executed after Turn processes LLM response:

```typescript
async *sendMessage(
  request: PartListUnion,
  signal: AbortSignal,
  prompt_id: string,
  turns?: number,
  originalModel?: string
): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
  // ... existing code to create and run turn ...

  const turn = new Turn(
    this.getChat(),
    prompt_id,
    providerName,
    this.historyService, // Pass HistoryService
    this.config,         // Pass Config
    await this.config.getToolRegistry() // Pass ToolRegistry
  );

  // Run the turn to get LLM response
  const resultStream = turn.run(request, signal);
  for await (const event of resultStream) {
    yield event;
  }

  // CRITICAL: Execute any pending tool calls
  if (turn.pendingToolCalls.length > 0) {
    await turn.executePendingTools(signal);
    // Tool execution results are now in HistoryService
  }

  return turn;
}
```

## Critical Integration Points

### 1. CoreToolScheduler Modification

The CoreToolScheduler's `onAllToolCallsComplete` callback MUST be wired to call Turn's methods:

- `turn.handleToolExecutionComplete()` for successful executions
- `turn.handleToolExecutionError()` for failed executions

### 2. Turn Creation

Turn instances MUST be created with:

- HistoryService instance
- Config instance (for tool registry access)
- ToolRegistry instance

### 3. Execution Flow

1. LLM requests tool execution → Turn.handlePendingFunctionCall()
2. Turn adds to pendingToolCalls array
3. Turn adds pending calls to HistoryService
4. Client detects pendingToolCalls after turn.run()
5. Client calls turn.executePendingTools() or uses ToolExecutionBridge
6. CoreToolScheduler executes tools
7. On completion, CoreToolScheduler calls Turn.handleToolExecutionComplete/Error
8. Turn updates HistoryService with results
9. Tool responses are properly tracked, no duplicates

## Files to Modify

1. **Create**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/toolExecutionBridge.ts`
2. **Modify**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/client.ts`
3. **Modify**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/turn.ts`
4. **Modify**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/coreToolScheduler.ts` (if needed)

## Success Criteria

- [ ] Tool execution actually calls Turn.handleToolExecutionComplete()
- [ ] HistoryService receives and records all tool executions
- [ ] No duplicate tool responses in the UI
- [ ] Tool execution history is properly tracked
- [ ] All providers (OpenAI, Anthropic, Gemini) work correctly

## Testing Requirements

1. Create integration test that verifies:
   - Tool request → execution → HistoryService update flow
   - No duplicate responses
   - Proper error handling
2. Test with all three providers
3. Test with parallel tool execution
4. Test with tool execution failures

## Notes

- This is a CRITICAL fix that connects the orphaned infrastructure
- Without this, the entire HistoryService is useless
- The duplicate tool response bug will persist until this is implemented
- Choose either the Bridge pattern OR the Direct Integration pattern, not both
