# Phase 30c: Verify Tool-HistoryService Integration

## Status: VERIFICATION AND VALIDATION

## Purpose

After implementing Phase 30b's critical wiring, this phase ensures the integration actually works and fixes the original bugs.

## Prerequisites

- Phase 30b must be fully implemented
- Tool execution must be wired to HistoryService
- Turn.handleToolExecutionComplete/Error must be called during execution

## Verification Plan

### Step 1: Create Integration Test Suite

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/__tests__/tool-history-integration.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiClient } from '../client.js';
import { Turn } from '../turn.js';
import { HistoryService } from '../../services/history/HistoryService.js';
import { CoreToolScheduler } from '../coreToolScheduler.js';
import { Config } from '../../config/config.js';

describe('Tool-HistoryService Integration', () => {
  let client: GeminiClient;
  let historyService: HistoryService;
  let config: Config;

  beforeEach(() => {
    config = new Config();
    historyService = new HistoryService();
    client = new GeminiClient(config);
    // Inject HistoryService into client
    client['historyService'] = historyService;
  });

  describe('Tool Execution Flow', () => {
    it('should record tool execution in HistoryService', async () => {
      // Create a Turn with pending tool calls
      const turn = new Turn(
        {} as any, // mock chat
        'test-prompt-id',
        'test-provider',
        historyService,
      );

      // Simulate LLM requesting a tool
      const toolRequest = {
        callId: 'test-call-1',
        name: 'shell',
        args: { command: 'echo test' },
        isClientInitiated: false,
        prompt_id: 'test-prompt-id',
      };

      // Add to pending calls (simulating what handlePendingFunctionCall does)
      turn.pendingToolCalls.push(toolRequest);
      historyService.addPendingToolCalls([
        {
          id: toolRequest.callId,
          name: toolRequest.name,
          arguments: toolRequest.args,
        },
      ]);

      // Execute the tool (this should call Turn.handleToolExecutionComplete)
      await turn.executePendingTools(new AbortController().signal);

      // Verify HistoryService received the execution
      const status = historyService.getToolCallStatus();
      expect(status.completedCalls).toBe(1);
      expect(status.pendingCalls).toBe(0);

      // Verify no duplicate responses
      const history = historyService.getHistory();
      const toolResponses = history.filter((h) => h.role === 'tool');
      expect(toolResponses.length).toBe(1);
    });

    it('should prevent duplicate tool responses', async () => {
      const spy = vi.spyOn(historyService, 'commitToolResponses');

      // Simulate tool execution
      const turn = new Turn(
        {} as any,
        'test-prompt-id',
        'test-provider',
        historyService,
      );

      const toolRequest = {
        callId: 'test-call-2',
        name: 'read_file',
        args: { path: '/test.txt' },
        isClientInitiated: false,
        prompt_id: 'test-prompt-id',
      };

      turn.pendingToolCalls.push(toolRequest);

      // Execute once
      await turn.handleToolExecutionComplete('test-call-2', {
        llmContent: 'File contents',
        returnDisplay: undefined,
        summary: undefined,
        error: undefined,
      });

      // Try to add duplicate (should be prevented by HistoryService)
      await turn.handleToolExecutionComplete('test-call-2', {
        llmContent: 'Duplicate contents',
        returnDisplay: undefined,
        summary: undefined,
        error: undefined,
      });

      // Should only have one call to commitToolResponses for this tool
      expect(spy).toHaveBeenCalledTimes(2);

      // But HistoryService should only have one response
      const history = historyService.getHistory();
      const toolResponses = history.filter(
        (h) => h.role === 'tool' && h.content.includes('test-call-2'),
      );
      expect(toolResponses.length).toBe(1);
    });

    it('should handle parallel tool execution', async () => {
      const turn = new Turn(
        {} as any,
        'test-prompt-id',
        'test-provider',
        historyService,
      );

      // Add multiple pending tools
      const tools = [
        { callId: 'call-1', name: 'tool1', args: {} },
        { callId: 'call-2', name: 'tool2', args: {} },
        { callId: 'call-3', name: 'tool3', args: {} },
      ];

      tools.forEach((t) => {
        turn.pendingToolCalls.push({
          ...t,
          isClientInitiated: false,
          prompt_id: 'test-prompt-id',
        });
      });

      // Add all as pending
      historyService.addPendingToolCalls(
        tools.map((t) => ({
          id: t.callId,
          name: t.name,
          arguments: t.args,
        })),
      );

      // Execute all in parallel
      await Promise.all(
        tools.map((t) =>
          turn.handleToolExecutionComplete(t.callId, {
            llmContent: `Result for ${t.name}`,
            returnDisplay: undefined,
            summary: undefined,
            error: undefined,
          }),
        ),
      );

      // Verify all were recorded
      const status = historyService.getToolCallStatus();
      expect(status.completedCalls).toBe(3);
      expect(status.pendingCalls).toBe(0);
    });

    it('should handle tool execution errors', async () => {
      const turn = new Turn(
        {} as any,
        'test-prompt-id',
        'test-provider',
        historyService,
      );

      const toolRequest = {
        callId: 'error-call',
        name: 'failing_tool',
        args: { willFail: true },
        isClientInitiated: false,
        prompt_id: 'test-prompt-id',
      };

      turn.pendingToolCalls.push(toolRequest);
      historyService.addPendingToolCalls([
        {
          id: toolRequest.callId,
          name: toolRequest.name,
          arguments: toolRequest.args,
        },
      ]);

      // Simulate error
      await turn.handleToolExecutionError(
        'error-call',
        new Error('Tool execution failed'),
      );

      // Verify error was recorded
      const status = historyService.getToolCallStatus();
      expect(status.failedCalls).toBe(1);
      expect(status.pendingCalls).toBe(0);

      // Verify error response in history
      const history = historyService.getHistory();
      const errorResponse = history.find(
        (h) => h.role === 'tool' && h.content.includes('error'),
      );
      expect(errorResponse).toBeDefined();
    });
  });

  describe('CoreToolScheduler Integration', () => {
    it('should call Turn methods on tool completion', async () => {
      const turn = new Turn(
        {} as any,
        'test-prompt-id',
        'test-provider',
        historyService,
      );

      const handleCompleteSpy = vi.spyOn(turn, 'handleToolExecutionComplete');
      const handleErrorSpy = vi.spyOn(turn, 'handleToolExecutionError');

      // Create scheduler with callback to Turn
      const scheduler = new CoreToolScheduler({
        toolRegistry: {} as any,
        outputUpdateHandler: undefined,
        onAllToolCallsComplete: async (completedCalls) => {
          for (const call of completedCalls) {
            if (call.status === 'success') {
              await turn.handleToolExecutionComplete(
                call.request.callId,
                {} as any,
              );
            } else if (call.status === 'error') {
              await turn.handleToolExecutionError(
                call.request.callId,
                new Error('Failed'),
              );
            }
          }
        },
        onToolCallsUpdate: undefined,
        getPreferredEditor: () => undefined,
        config: {} as any,
        onEditorClose: () => {},
      });

      // Schedule a tool
      await scheduler.schedule(
        {
          callId: 'scheduler-test',
          name: 'test_tool',
          args: {},
          isClientInitiated: false,
          prompt_id: 'test-prompt-id',
        },
        new AbortController().signal,
      );

      // Verify Turn methods were called
      expect(
        handleCompleteSpy.mock.calls.length + handleErrorSpy.mock.calls.length,
      ).toBeGreaterThan(0);
    });
  });
});
```

### Step 2: Provider-Specific Integration Tests

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/providers/__tests__/tool-integration.test.ts`

```typescript
describe('Provider Tool Integration', () => {
  describe('OpenAI Provider', () => {
    it('should track OpenAI tool calls in HistoryService', async () => {
      // Test OpenAI-specific tool call format
    });
  });

  describe('Anthropic Provider', () => {
    it('should track Anthropic tool calls in HistoryService', async () => {
      // Test Anthropic-specific tool use format
    });
  });

  describe('Gemini Provider', () => {
    it('should track Gemini function calls in HistoryService', async () => {
      // Test Gemini-specific function call format
    });
  });
});
```

### Step 3: End-to-End Verification Script

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/scripts/verify-tool-integration.ts`

```typescript
#!/usr/bin/env tsx

import { GeminiClient } from '../src/core/client.js';
import { Config } from '../src/config/config.js';
import { HistoryService } from '../src/services/history/HistoryService.js';

async function verifyToolIntegration() {
  console.log('🔍 Verifying Tool-HistoryService Integration...\n');

  const config = new Config();
  const client = new GeminiClient(config);
  const historyService = new HistoryService();

  // Inject HistoryService
  client['historyService'] = historyService;

  // Test 1: Single tool execution
  console.log('Test 1: Single tool execution');
  const message = "Please run the command 'echo test' in the shell";

  const signal = new AbortController().signal;
  const events = [];

  for await (const event of client.sendMessage(message, signal, 'test-1')) {
    events.push(event);
    if (event.type === 'tool_call_response') {
      console.log('  ✓ Tool response received');
    }
  }

  // Check HistoryService
  const status1 = historyService.getToolCallStatus();
  console.log(`  Tools executed: ${status1.completedCalls}`);
  console.log(`  Tools pending: ${status1.pendingCalls}`);
  console.log(`  Tools failed: ${status1.failedCalls}`);

  // Test 2: Multiple parallel tools
  console.log('\nTest 2: Multiple parallel tools');
  const message2 =
    'Read /etc/hosts, list current directory, and show current date';

  for await (const event of client.sendMessage(message2, signal, 'test-2')) {
    if (event.type === 'tool_call_request') {
      console.log(`  → Tool requested: ${event.value.name}`);
    }
    if (event.type === 'tool_call_response') {
      console.log(`  ✓ Tool completed: ${event.value.callId}`);
    }
  }

  const status2 = historyService.getToolCallStatus();
  console.log(`  Total tools executed: ${status2.completedCalls}`);

  // Test 3: Check for duplicates
  console.log('\nTest 3: Duplicate prevention');
  const history = historyService.getHistory();
  const toolResponses = history.filter((h) => h.role === 'tool');
  const uniqueIds = new Set(toolResponses.map((r) => r.toolCallId));

  if (toolResponses.length === uniqueIds.size) {
    console.log('  ✓ No duplicate tool responses detected');
  } else {
    console.log(
      `  ✗ DUPLICATES FOUND: ${toolResponses.length} responses, ${uniqueIds.size} unique`,
    );
  }

  // Test 4: Error handling
  console.log('\nTest 4: Error handling');
  const message3 = 'Try to read a non-existent file /this/does/not/exist.txt';

  for await (const event of client.sendMessage(message3, signal, 'test-3')) {
    if (event.type === 'error') {
      console.log('  ✓ Error properly handled');
    }
  }

  const status3 = historyService.getToolCallStatus();
  if (status3.failedCalls > 0) {
    console.log(`  ✓ Failed tools tracked: ${status3.failedCalls}`);
  }

  // Final summary
  console.log('\n📊 Final Summary:');
  console.log('─────────────────');
  const finalStatus = historyService.getToolCallStatus();
  console.log(
    `Total tool calls: ${finalStatus.completedCalls + finalStatus.failedCalls}`,
  );
  console.log(`Successful: ${finalStatus.completedCalls}`);
  console.log(`Failed: ${finalStatus.failedCalls}`);
  console.log(`Pending: ${finalStatus.pendingCalls}`);

  const allHistory = historyService.getHistory();
  console.log(`Total history entries: ${allHistory.length}`);
  console.log(
    `Tool responses: ${allHistory.filter((h) => h.role === 'tool').length}`,
  );

  // Check if original bug is fixed
  const duplicates = checkForDuplicates(allHistory);
  if (duplicates.length === 0) {
    console.log('\n✅ SUCCESS: No duplicate tool responses found!');
    console.log('The original bug has been fixed.');
  } else {
    console.log('\n❌ FAILURE: Duplicate tool responses detected!');
    console.log('The original bug persists.');
    duplicates.forEach((d) => console.log(`  - Duplicate: ${d}`));
  }
}

function checkForDuplicates(history: any[]): string[] {
  const seen = new Map<string, number>();
  const duplicates: string[] = [];

  history
    .filter((h) => h.role === 'tool')
    .forEach((h) => {
      const key = `${h.toolCallId}-${h.content}`;
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      if (count > 0) {
        duplicates.push(key);
      }
    });

  return duplicates;
}

// Run verification
verifyToolIntegration().catch(console.error);
```

### Step 4: Manual Verification Checklist

Create a manual testing protocol:

1. **Basic Flow Test**
   - [ ] Start the application
   - [ ] Send a message that triggers a tool call
   - [ ] Verify only ONE tool response appears in UI
   - [ ] Check console for HistoryService logs

2. **Multiple Tools Test**
   - [ ] Send message triggering 3+ parallel tools
   - [ ] Verify each tool response appears exactly once
   - [ ] Verify order matches execution order

3. **Error Handling Test**
   - [ ] Trigger a tool that will fail
   - [ ] Verify error is shown once
   - [ ] Verify HistoryService tracks the failure

4. **Provider Tests**
   - [ ] Test with OpenAI provider
   - [ ] Test with Anthropic provider
   - [ ] Test with Gemini provider
   - [ ] Verify consistent behavior across all

5. **Performance Test**
   - [ ] Execute 10+ tools in sequence
   - [ ] Verify no memory leaks
   - [ ] Verify no duplicate responses

### Step 5: Debug Instrumentation

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/core/debugToolFlow.ts`

```typescript
import { DebugLogger } from '../debug/index.js';

const logger = new DebugLogger('tool-flow');

export class ToolFlowDebugger {
  private static callStack: Map<string, any> = new Map();

  static trackToolRequest(callId: string, name: string, source: string) {
    logger.log(`[${source}] Tool requested: ${name} (${callId})`);
    this.callStack.set(callId, {
      name,
      requestedAt: Date.now(),
      source,
      events: [`requested from ${source}`],
    });
  }

  static trackToolExecution(callId: string, executor: string) {
    logger.log(`[${executor}] Executing tool: ${callId}`);
    const entry = this.callStack.get(callId);
    if (entry) {
      entry.events.push(`execution started by ${executor}`);
      entry.executionStarted = Date.now();
    }
  }

  static trackToolComplete(callId: string, handler: string) {
    logger.log(`[${handler}] Tool completed: ${callId}`);
    const entry = this.callStack.get(callId);
    if (entry) {
      entry.events.push(`completed, handled by ${handler}`);
      entry.completedAt = Date.now();
      const duration = entry.completedAt - entry.requestedAt;
      logger.log(`  Duration: ${duration}ms`);
    }
  }

  static trackHistoryUpdate(callId: string, action: string) {
    logger.log(`[HistoryService] ${action}: ${callId}`);
    const entry = this.callStack.get(callId);
    if (entry) {
      entry.events.push(`HistoryService: ${action}`);
    }
  }

  static printReport() {
    console.log('\n=== Tool Flow Report ===');
    this.callStack.forEach((entry, callId) => {
      console.log(`\nTool: ${entry.name} (${callId})`);
      console.log('Events:');
      entry.events.forEach((e) => console.log(`  - ${e}`));
      if (entry.completedAt) {
        const duration = entry.completedAt - entry.requestedAt;
        console.log(`Total time: ${duration}ms`);
      } else {
        console.log('Status: INCOMPLETE');
      }
    });
    console.log('========================\n');
  }
}
```

Add debug calls throughout the flow:

- Turn.handlePendingFunctionCall: `ToolFlowDebugger.trackToolRequest()`
- CoreToolScheduler.executeToolCall: `ToolFlowDebugger.trackToolExecution()`
- Turn.handleToolExecutionComplete: `ToolFlowDebugger.trackToolComplete()`
- HistoryService methods: `ToolFlowDebugger.trackHistoryUpdate()`

## Success Metrics

### Quantitative

- [ ] 0 duplicate tool responses in 100 test runs
- [ ] 100% of tool executions recorded in HistoryService
- [ ] 100% of tool errors properly tracked
- [ ] All 3 providers pass integration tests

### Qualitative

- [ ] Tool execution flow is traceable via debug logs
- [ ] Error messages are clear and actionable
- [ ] Performance is not degraded
- [ ] Code is maintainable and well-documented

## Rollback Plan

If integration causes issues:

1. Disable HistoryService integration by setting Turn.historyService to undefined
2. CoreToolScheduler continues to work without callbacks
3. Original flow remains functional (with duplicate bug)
4. Debug and fix issues before re-enabling

## Documentation Updates

1. **Architecture Diagram**: Update to show Tool → Turn → HistoryService flow
2. **API Documentation**: Document new methods and integration points
3. **Troubleshooting Guide**: Add section on tool execution issues
4. **Developer Guide**: Explain how to add new tools with HistoryService support

## Post-Implementation Review

After implementation:

1. Run full test suite
2. Manual testing with real usage patterns
3. Performance profiling
4. Code review focusing on:
   - Race conditions
   - Memory leaks
   - Error handling
   - Edge cases

## Conclusion

This phase ensures that Phase 30b's implementation actually works and fixes the original bugs. Without proper verification, we risk having built elaborate infrastructure that doesn't solve the problem. The tests and verification steps here will confirm that:

1. Tool execution is properly connected to HistoryService
2. Duplicate tool responses are eliminated
3. All providers work correctly
4. The system is robust and maintainable

Only after all verification steps pass can we consider the HistoryService integration complete and the original bug fixed.
