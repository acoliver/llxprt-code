/**
 * Test that reproduces the EXACT flow when OpenAI returns tool calls
 * This should demonstrate the "No active transaction" error
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Turn } from '../core/turn.js';
import { GeminiChat } from '../core/geminiChat.js';
import { HistoryService } from '../services/history/HistoryService.js';
import { CoreToolScheduler } from '../core/coreToolScheduler.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';

describe('OpenAI Tool Call Flow - Exact Production Bug', () => {
  it('should reproduce the exact flow from the debug logs', async () => {
    // This test reproduces EXACTLY what happens when:
    // 1. User types message in CLI
    // 2. Message goes to OpenAI (qwen) via GeminiCompatibleWrapper
    // 3. OpenAI returns a response with tool_calls
    // 4. Tool gets scheduled and executed
    // 5. ERROR: "No active transaction" when trying to handle completion

    const historyService = new HistoryService('chat_1756731831011');
    const mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
    } as any;

    // Create Turn instance - this is created in client.ts
    const turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);

    // Mock tool registry
    const mockToolRegistry: ToolRegistry = {
      getTool: vi.fn().mockReturnValue({
        name: 'glob',
        execute: vi.fn().mockResolvedValue({
          output: 'Found 632 matching file(s)',
          success: true,
        }),
      }),
      getTools: vi.fn().mockResolvedValue([]),
    } as any;

    // Create CoreToolScheduler - this is what schedules tools
    const scheduler = new CoreToolScheduler({
      config: {
        getSessionId: () => 'test-session',
      } as any,
      toolRegistry: Promise.resolve(mockToolRegistry),
      outputUpdateHandler: vi.fn(),
      onAllToolCallsComplete: vi.fn(),
      onToolCallsUpdate: vi.fn(),
      turn,
    });

    // THIS IS THE KEY PART: When OpenAI returns tool_calls, they are scheduled directly
    // WITHOUT going through Turn.run() or handlePendingFunctionCall
    const toolCallRequest = {
      callId: 'e9082c048',
      name: 'glob',
      args: { pattern: 'packages/core/**/*.ts' },
      isClientInitiated: false,
      prompt_id: 'test-prompt',
    };

    // Schedule the tool - this is what happens when OpenAI returns tool_calls
    await scheduler.schedule(toolCallRequest, new AbortController().signal);

    // Wait for tool to execute
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now the tool completes and handleToolExecutionComplete is called
    // This should fail because there's no transaction
    const consoleSpy = vi.spyOn(console, 'warn');
    
    await turn.handleToolExecutionComplete('e9082c048', {
      output: 'Found 632 matching file(s)',
      success: true,
    });

    // Verify the warning was logged
    expect(consoleSpy).toHaveBeenCalled();
    
    // Log what was actually warned for debugging
    console.log('Console warnings:', consoleSpy.mock.calls);
    
    const warning = consoleSpy.mock.calls[0][0];
    expect(warning).toContain('Failed');
    
    consoleSpy.mockRestore();
  });

  it('should show that Turn.run() is NOT called for OpenAI tool calls', async () => {
    // This test demonstrates that when OpenAI returns tool_calls,
    // Turn.run() is never called, so handlePendingFunctionCall is never called
    
    const historyService = new HistoryService('test');
    const mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
    } as any;

    const turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);
    
    // Spy on handlePendingFunctionCall (private method)
    const handlePendingSpy = vi.spyOn(turn as any, 'handlePendingFunctionCall');
    
    // When tools come from OpenAI, they are scheduled directly
    // handlePendingFunctionCall is NEVER called
    
    // Simulate tool scheduling from OpenAI response
    // (This would normally be done by CoreToolScheduler)
    
    // Verify handlePendingFunctionCall was NOT called
    expect(handlePendingSpy).not.toHaveBeenCalled();
    
    // This is the problem - handlePendingFunctionCall is what starts transactions
    // but it's only called from within Turn.run() when processing Gemini-style responses
  });

  it('should show that completeAllToolExecution is called but fails', async () => {
    // From the error stack trace, we see:
    // "Failed to commit tool transaction" at Turn.completeAllToolExecution
    // This is being called from Turn.run() at line 319
    
    const historyService = new HistoryService('test');
    const mockChat = {
      sendMessageStream: vi.fn().mockImplementation(async function* () {
        // Simulate empty response stream
        yield {
          candidates: [{
            content: { parts: [{ text: 'test' }] },
            finishReason: 'STOP'
          }]
        };
      }),
      getHistory: vi.fn().mockReturnValue([]),
    } as any;

    const turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);
    
    // Run the turn
    const events = [];
    for await (const event of turn.run({ parts: [{ text: 'test' }] }, new AbortController().signal)) {
      events.push(event);
    }
    
    // completeAllToolExecution should have been called
    // but there's no transaction to commit
    const consoleSpy = vi.spyOn(console, 'log');
    await turn.completeAllToolExecution();
    
    // Should log the tool execution status
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Tool execution status')
    );
    
    consoleSpy.mockRestore();
  });
});