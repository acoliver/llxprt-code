/**
 * Test that reproduces the EXACT bug from the debug logs:
 * Transaction is started but immediately rolled back when "User sent new message"
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Turn } from '../core/turn.js';
import { GeminiChat } from '../core/geminiChat.js';
import { HistoryService } from '../services/history/HistoryService.js';
import { MessageRoleEnum } from '../services/history/types.js';

describe('CRITICAL BUG: Transaction Rollback on Tool Call', () => {
  it('should reproduce the exact error from debug logs', async () => {
    // This simulates EXACTLY what happens in the debug log:
    // 1. User sends message: "look through the code..."
    // 2. LLM responds with tool call (glob pattern: "packages/core/**/*.ts")
    // 3. Transaction is started
    // 4. Transaction is IMMEDIATELY rolled back with "User sent new message"
    // 5. Tool completes
    // 6. ERROR: No active transaction

    const historyService = new HistoryService('chat_1756731831011');
    
    // User sends initial message
    historyService.addMessage(
      "look through the code and map for me the entire lifecycle of a request to tool call to LLM and back again",
      MessageRoleEnum.USER
    );

    // LLM starts responding
    historyService.addMessage(
      "I'll analyze the lifecycle of a request from tool call to LLM and back.",
      MessageRoleEnum.MODEL
    );

    // Tool transaction starts (line 605 in log)
    const transactionId = historyService.beginToolTransaction();
    expect(transactionId).toBeDefined();
    
    // Add assistant message with tool call
    historyService.addAssistantMessageToTransaction(
      "I'll analyze the lifecycle of a request from tool call to LLM and back. Let me start by exploring the core components and then trace through the actual code flow.",
      [{
        id: 'e9082c048',
        name: 'glob',
        arguments: { pattern: 'packages/core/**/*.ts' }
      }]
    );

    // THE BUG: Something triggers "User sent new message" which rolls back the transaction
    // This happens at line 606 in the debug log
    // Let's see what causes this...
    
    // Hypothesis: addMessage is called again which triggers rollback
    historyService.addMessage(
      "look through the code and map for me the entire lifecycle of a request to tool call to LLM and back again",
      MessageRoleEnum.USER
    );

    // Now the transaction is rolled back
    // When tool completes, there's no active transaction
    expect(() => {
      historyService.addToolResponseToTransaction('e9082c048', {
        toolCallId: 'e9082c048',
        result: { output: 'Found 632 matching file(s)' }
      });
    }).toThrow('No active transaction');
  });

  it('should show that addMessage with USER role triggers rollback', () => {
    const historyService = new HistoryService('test');
    
    // Start a transaction
    const txId = historyService.beginToolTransaction();
    expect(historyService['currentTransaction']).toBeDefined();
    
    // Adding a USER message should rollback the transaction
    historyService.addMessage('new user message', MessageRoleEnum.USER);
    
    // Transaction should be rolled back
    expect(historyService['currentTransaction']).toBeUndefined();
  });

  it('should show the actual flow that causes the bug', () => {
    const historyService = new HistoryService('test');
    const mockChat = {} as any;
    const turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);

    // Simulate what happens in Turn.run() when processing OpenAI response
    
    // 1. Tool call is detected in OpenAI response
    // 2. handlePendingFunctionCall is called (or in our fix, startToolTransaction)
    turn.startToolTransaction([{
      callId: 'e9082c048',
      name: 'glob',
      args: { pattern: 'packages/core/**/*.ts' }
    }]);

    // Transaction should be active
    expect(turn['currentTransactionId']).toBeDefined();

    // 3. BUT THEN: Something adds the user message AGAIN
    // This is what we see in the logs - the user message is added after transaction starts
    historyService.addMessage(
      "look through the code...",
      MessageRoleEnum.USER
    );

    // 4. This rolls back the transaction!
    expect(turn['currentTransactionId']).toBeDefined(); // But historyService transaction is gone
    
    // 5. Tool completes
    const consoleSpy = vi.spyOn(console, 'warn');
    turn.handleToolExecutionComplete('e9082c048', {
      output: 'Found files',
      success: true
    });

    // 6. Warning is logged because transaction was rolled back
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('handleToolExecutionComplete called without active transaction')
    );
  });
});