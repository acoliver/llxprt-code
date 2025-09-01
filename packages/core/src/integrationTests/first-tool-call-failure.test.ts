/**
 * Test that replicates the EXACT failure seen when a user types a request
 * and the LLM responds with a tool call - "No active transaction" error
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Turn } from '../core/turn.js';
import { GeminiChat } from '../core/geminiChat.js';
import { HistoryService } from '../services/history/HistoryService.js';
import { CoreToolScheduler } from '../core/coreToolScheduler.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';

describe('CRITICAL BUG: First Tool Call Failure', () => {
  it('should handle the FIRST tool call from OpenAI without "No active transaction" error', async () => {
    // This test simulates EXACTLY what happens when:
    // 1. User types: "look through the code and map for me the entire lifecycle..."
    // 2. LLM decides to call a tool (glob with pattern '**/*.ts')
    // 3. Tool executes successfully
    // 4. ERROR: "No active transaction" when trying to record the tool response

    const historyService = new HistoryService('chat_1756730972143');
    
    // Mock the GeminiChat that would be created
    const mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
    } as any;

    // Create Turn instance as the system does
    const turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);

    // Mock tool registry with glob tool
    const mockToolRegistry: ToolRegistry = {
      getTool: vi.fn().mockResolvedValue({
        name: 'glob',
        execute: vi.fn().mockResolvedValue({
          output: 'Found 1378 matching file(s)',
          success: true,
        }),
      }),
      getTools: vi.fn().mockResolvedValue([]),
    } as any;

    // Create CoreToolScheduler as the system does
    const scheduler = new CoreToolScheduler({
      config: {} as any,
      toolRegistry: Promise.resolve(mockToolRegistry),
      outputUpdateHandler: vi.fn(),
      onAllToolCallsComplete: vi.fn(),
      onToolCallsUpdate: vi.fn(),
      turn, // This is the key - scheduler has access to turn
    });

    // This simulates what happens when OpenAI returns a tool call
    // The tool gets scheduled and executed WITHOUT handlePendingFunctionCall being called first
    const toolCallRequest = {
      callId: '4ebd93c63',
      name: 'glob',
      args: { pattern: '**/*.ts' },
      isClientInitiated: false,
      prompt_id: 'test-prompt',
    };

    // Schedule the tool (this is what happens when OpenAI returns a tool call)
    await scheduler.schedule(toolCallRequest, new AbortController().signal);

    // Wait for execution
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now when the tool completes, handleToolExecutionComplete is called
    // This is where the error happens: "No active transaction"
    const toolResult = {
      output: 'Found 1378 matching file(s)',
      success: true,
    };

    // THIS IS THE FAILING CALL - it should NOT throw "No active transaction"
    await expect(
      turn.handleToolExecutionComplete('4ebd93c63', toolResult)
    ).resolves.not.toThrow();

    // Verify that the history has the tool call and response properly recorded
    const history = historyService.getHistory();
    
    // Should have assistant message with tool call
    const hasAssistantWithToolCall = history.some(
      m => m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0
    );
    
    // Should have tool response
    const hasToolResponse = history.some(
      m => m.role === 'tool' && m.toolResponses && m.toolResponses.length > 0
    );

    // These should BOTH be true - the transaction system should have recorded both
    expect(hasAssistantWithToolCall).toBe(true);
    expect(hasToolResponse).toBe(true);
  });

  it('should demonstrate the EXACT error that happens in production WITHOUT the fix', async () => {
    const historyService = new HistoryService('test-conversation');
    const mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
    } as any;
    
    const turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);

    // Directly call handleToolExecutionComplete WITHOUT any transaction started
    // This is what WAS happening in production before the fix
    
    const consoleSpy = vi.spyOn(console, 'warn');
    
    await turn.handleToolExecutionComplete('some-tool-id', {
      output: 'tool result',
      success: true,
    });

    // With the fix, this should now log a warning about bypassing transaction system
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('handleToolExecutionComplete called without active transaction'),
    );

    // And there should be NO transaction
    expect(turn['currentTransactionId']).toBeUndefined();
    
    consoleSpy.mockRestore();
  });

  it('should work correctly when startToolTransaction is called first', async () => {
    const historyService = new HistoryService('test-conversation');
    const mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
    } as any;
    
    const turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);

    // This is the FIX: Call startToolTransaction before executing tools
    turn.startToolTransaction([{
      callId: 'test-tool-id',
      name: 'glob',
      args: { pattern: '**/*.ts' }
    }]);

    // Now handleToolExecutionComplete should work
    await turn.handleToolExecutionComplete('test-tool-id', {
      output: 'tool result',
      success: true,
    });

    // Verify the history has both messages
    const history = historyService.getHistory();
    
    const hasAssistantWithToolCall = history.some(
      m => m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0
    );
    
    const hasToolResponse = history.some(
      m => m.role === 'tool' && m.toolResponses && m.toolResponses.length > 0
    );

    expect(hasAssistantWithToolCall).toBe(true);
    expect(hasToolResponse).toBe(true);
  });
});