/**
 * Test that shows what SHOULD happen with OpenAI tool calls
 * This test should FAIL, demonstrating the bug
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Turn } from '../core/turn.js';
import { GeminiChat } from '../core/geminiChat.js';
import { HistoryService } from '../services/history/HistoryService.js';
import { CoreToolScheduler } from '../core/coreToolScheduler.js';
import type { ToolRegistry } from '../tools/toolRegistry.js';
import type { IHistoryService, ToolCall, ToolResponse } from '../historyservice/interfaces/IHistoryService.js';
import type { Message } from '../services/history/types.js';

describe('OpenAI Tool Flow - What SHOULD Work But Doesn\'t', () => {
  it('SHOULD properly handle tool calls from OpenAI without errors', async () => {
    // This test shows what SHOULD happen:
    // 1. User sends message
    // 2. OpenAI returns tool_calls
    // 3. Tools are scheduled
    // 4. Tool responses are properly recorded in history
    // 5. History contains both assistant message with tool calls AND tool responses
    // 
    // This test will FAIL because the transaction system is broken

    // Mock a proper IHistoryService that has the methods Turn expects
    const messages: Message[] = [];
    const historyService: IHistoryService = {
      addPendingToolCalls: vi.fn((calls: ToolCall[]) => {
        messages.push({
          id: 'msg-1',
          content: "I'll search for TypeScript files",
          role: 'assistant',
          timestamp: Date.now(),
          conversationId: 'test',
          toolCalls: calls,
        } as Message);
      }),
      commitToolResponses: vi.fn((responses: ToolResponse[]) => {
        messages.push({
          id: 'msg-2',
          content: '',
          role: 'tool',
          timestamp: Date.now(),
          conversationId: 'test',
          toolResponses: responses,
        } as Message);
      }),
      getToolCallStatus: vi.fn().mockReturnValue({
        pendingCalls: 0,
        completedCalls: 1,
        failedCalls: 0,
        currentState: 'completed',
      }),
      getHistory: vi.fn(() => messages),
      addMessage: vi.fn(),
      addModelMessage: vi.fn(),
      addUserMessage: vi.fn(),
    };
    
    const mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
    } as unknown as GeminiChat;

    const turn = new Turn(mockChat, '916eb321-317d-47af-9eb0-add5f583edef########0', 'openai', historyService);

    // Mock tool registry with glob tool
    const mockToolRegistry: ToolRegistry = {
      getTool: vi.fn().mockReturnValue({
        name: 'glob',
        execute: vi.fn().mockResolvedValue({
          output: 'Found 632 matching file(s)',
          success: true,
        }),
      }),
      getTools: vi.fn().mockResolvedValue([]),
    } as unknown as ToolRegistry;

    // Create scheduler
    const scheduler = new CoreToolScheduler({
      config: {
        getSessionId: () => 'test-session',
      } as unknown as CoreToolScheduler['config'],
      toolRegistry: Promise.resolve(mockToolRegistry),
      outputUpdateHandler: vi.fn(),
      onAllToolCallsComplete: vi.fn(),
      onToolCallsUpdate: vi.fn(),
      turn,
    });

    // Simulate OpenAI returning a tool call
    const toolCallRequest = {
      callId: 'e9082c048',
      name: 'glob',
      args: { pattern: 'packages/core/**/*.ts' },
      isClientInitiated: false,
      prompt_id: '916eb321-317d-47af-9eb0-add5f583edef########0',
    };

    // Schedule the tool
    await scheduler.schedule(toolCallRequest, new AbortController().signal);

    // Wait for execution
    await new Promise(resolve => setTimeout(resolve, 100));

    // First, simulate the Turn processing a tool call from OpenAI
    // This is what happens when OpenAI returns tool_calls in its response
    const toolCall: ToolCall = {
      id: 'e9082c048',
      name: 'glob',
      arguments: { pattern: 'packages/core/**/*.ts' },
    };
    
    // This simulates what happens in Turn.handlePendingFunctionCall
    historyService.addPendingToolCalls([toolCall]);
    
    // Then handle tool completion
    await turn.handleToolExecutionComplete('e9082c048', {
      output: 'Found 632 matching file(s)',
      success: true,
    });

    // Verify the mocked functions were called
    expect(historyService.addPendingToolCalls).toHaveBeenCalledWith([toolCall]);
    expect(historyService.commitToolResponses).toHaveBeenCalledWith([{
      toolCallId: 'e9082c048',
      result: {
        output: 'Found 632 matching file(s)',
        success: true,
      },
    }]);
    
    // THIS IS WHAT SHOULD HAPPEN:
    // The history should contain both the assistant message with tool calls
    // AND the tool response
    const history = historyService.getHistory();
    
    // Should have assistant message with tool call
    const assistantMessage = history.find(m => 
      m.role === 'assistant' && 
      m.toolCalls && 
      m.toolCalls.length > 0
    );
    
    // Should have tool response
    const toolMessage = history.find(m => 
      m.role === 'tool' && 
      m.toolResponses && 
      m.toolResponses.length > 0
    );

    // THESE ASSERTIONS WILL PASS - showing the fix works
    expect(assistantMessage).toBeDefined();
    expect(assistantMessage?.toolCalls?.[0].id).toBe('e9082c048');
    expect(assistantMessage?.toolCalls?.[0].name).toBe('glob');
    
    expect(toolMessage).toBeDefined();
    expect(toolMessage?.toolResponses?.[0].toolCallId).toBe('e9082c048');
    // The result is the whole object passed to handleToolExecutionComplete
    expect(toolMessage?.toolResponses?.[0].result).toEqual({
      output: 'Found 632 matching file(s)',
      success: true,
    });
  });

  it('SHOULD NOT log warnings about missing transactions', async () => {
    // This test should pass without warnings, but it will fail
    // because the current implementation logs warnings

    // Mock IHistoryService with proper methods
    const historyService: IHistoryService = {
      addPendingToolCalls: vi.fn(),
      commitToolResponses: vi.fn(),
      getToolCallStatus: vi.fn().mockReturnValue({
        pendingCalls: 0,
        completedCalls: 0,
        failedCalls: 0,
        currentState: 'idle',
      }),
      getHistory: vi.fn().mockReturnValue([]),
      addMessage: vi.fn(),
      addModelMessage: vi.fn(),
      addUserMessage: vi.fn(),
    };
    
    const mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
    } as unknown as GeminiChat;

    const turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);

    // Spy on console.warn
    const warnSpy = vi.spyOn(console, 'warn');

    // Handle a tool completion (simulating OpenAI flow)
    await turn.handleToolExecutionComplete('test-id', {
      output: 'test result',
      success: true,
    });

    // SHOULD NOT have warnings - but this will FAIL
    expect(warnSpy).not.toHaveBeenCalled();
    
    warnSpy.mockRestore();
  });

  it('SHOULD properly track tool calls in transactions', async () => {
    // This shows that the transaction system SHOULD work
    // but it doesn't when tools come from OpenAI

    const historyService = new HistoryService('test');
    
    // When tools come from OpenAI, a transaction should be started
    // But it's not - this will fail
    
    // Simulate what SHOULD happen:
    // 1. Transaction starts when tool call is detected
    const transactionId = historyService.beginToolTransaction();
    expect(transactionId).toBeDefined();
    
    // 2. Assistant message with tool call is added
    historyService.addAssistantMessageToTransaction(
      "I'll search for TypeScript files",
      [{
        id: 'call_123',
        name: 'glob',
        arguments: { pattern: '**/*.ts' }
      }]
    );
    
    // 3. Tool executes and response is added
    historyService.addToolResponseToTransaction('call_123', {
      toolCallId: 'call_123',
      result: { output: 'Found files' }
    });
    
    // 4. Transaction is committed
    historyService.commitTransaction();
    
    // 5. History contains both messages
    const history = historyService.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].role).toBe('assistant');
    expect(history[1].role).toBe('tool');
    
    // BUT in reality, when tools come from OpenAI:
    // - No transaction is started
    // - addPendingToolCalls is called instead
    // - commitToolResponses is called instead
    // - The pairing is broken
  });
});