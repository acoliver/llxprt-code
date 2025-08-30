/**
 * Diagnostic Test: Tool-HistoryService Integration
 * This test verifies the basic wiring is in place, even if full execution doesn't work
 */

import { describe, it, expect, vi } from 'vitest';
import { Turn } from '../core/turn.js';
import { HistoryService } from '../services/history/HistoryService.js';

describe('Diagnostic: Tool-HistoryService Integration Wiring', () => {
  it('should verify Turn has HistoryService integration methods', () => {
    const historyService = new HistoryService('test-conv');
    const mockChat = { getHistory: () => [] } as {
      getHistory: () => unknown[];
    };

    const turn = new Turn(
      mockChat,
      'test-prompt',
      'test-provider',
      historyService,
    );

    // Verify the Turn instance has the integration methods
    expect(typeof turn.handleToolExecutionComplete).toBe('function');
    expect(typeof turn.handleToolExecutionError).toBe('function');
    expect(typeof turn.getToolExecutionStatus).toBe('function');
    expect(turn.historyService).toBe(historyService);
  });

  it('should verify HistoryService has required methods', () => {
    const historyService = new HistoryService('test-conv');

    // Verify HistoryService has the methods Turn expects
    expect(typeof historyService.addPendingToolCalls).toBe('function');
    expect(typeof historyService.commitToolResponses).toBe('function');
    expect(typeof historyService.getToolCallStatus).toBe('function');
  });

  it('should verify Turn methods call HistoryService', async () => {
    const historyService = new HistoryService('test-conv');
    const _addSpy = vi.spyOn(historyService, 'addPendingToolCalls');
    const commitSpy = vi.spyOn(historyService, 'commitToolResponses');

    const mockChat = { getHistory: () => [] } as {
      getHistory: () => unknown[];
    };
    const turn = new Turn(
      mockChat,
      'test-prompt',
      'test-provider',
      historyService,
    );

    // Test handleToolExecutionComplete calls commitToolResponses
    await turn.handleToolExecutionComplete('test-call-1', {
      llmContent: 'test result',
      returnDisplay: 'test display',
    });

    expect(commitSpy).toHaveBeenCalledWith([
      {
        toolCallId: 'test-call-1',
        result: 'test result',
      },
    ]);

    // Test handleToolExecutionError calls commitToolResponses
    await turn.handleToolExecutionError('test-call-2', new Error('test error'));

    expect(commitSpy).toHaveBeenCalledWith([
      {
        toolCallId: 'test-call-2',
        result: { error: 'test error' },
      },
    ]);
  });

  it('should verify basic HistoryService functionality', () => {
    const historyService = new HistoryService('test-conv');

    // Add pending tool calls
    historyService.addPendingToolCalls([
      {
        id: 'test-tool-1',
        name: 'TestTool',
        arguments: { arg: 'value' },
      },
    ]);

    const status = historyService.getToolCallStatus();
    expect(status.pendingCalls).toBe(1);
    expect(status.completedCalls).toBe(0);

    // Commit a response
    historyService.commitToolResponses([
      {
        toolCallId: 'test-tool-1',
        result: 'test result',
      },
    ]);

    const updatedStatus = historyService.getToolCallStatus();
    expect(updatedStatus.pendingCalls).toBe(0);
    expect(updatedStatus.completedCalls).toBe(1);
  });
});
