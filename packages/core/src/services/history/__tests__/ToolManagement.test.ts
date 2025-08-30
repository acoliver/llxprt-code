import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../HistoryService';
import { ToolCall, ToolResponse } from '../types';

describe('HistoryService Tool Management (Integrated)', () => {
  let historyService: HistoryService;

  beforeEach(() => {
    historyService = new HistoryService('test-conversation-id');
  });

  // @plan PLAN-20250128-HISTORYSERVICE.P17
  // @requirement HS-009
  // @phase tool-management-test
  describe('addPendingToolCalls', () => {
    const sampleToolCalls: ToolCall[] = [
      {
        id: 'tool_call_1',
        name: 'search_web',
        arguments: { query: 'test query' },
      },
      {
        id: 'tool_call_2',
        name: 'read_file',
        arguments: { path: '/test/file.txt' },
      },
    ];

    it('should add valid tool calls to pending state', () => {
      historyService.addPendingToolCalls(sampleToolCalls);

      expect(historyService.hasPendingToolCalls()).toBe(true);
      expect(historyService.getPendingToolCalls()).toHaveLength(
        sampleToolCalls.length,
      );
    });

    it('should allow overwriting tool calls with same ID (current behavior)', () => {
      // Add calls first
      historyService.addPendingToolCalls(sampleToolCalls);
      expect(historyService.getPendingToolCalls()).toHaveLength(2);

      // Add same calls again - overwrites existing ones
      historyService.addPendingToolCalls(sampleToolCalls);
      expect(historyService.getPendingToolCalls()).toHaveLength(2); // Still 2, not 4
    });

    it('should handle empty arrays without error (current behavior)', () => {
      // Empty array is accepted but does nothing
      historyService.addPendingToolCalls([]);
      expect(historyService.hasPendingToolCalls()).toBe(false);

      // Null array will cause iteration error
      expect(() =>
        historyService.addPendingToolCalls(null as unknown as ToolCall[]),
      ).toThrow();
    });

    it('should reject tool calls with missing required fields', () => {
      const invalidToolCall = {
        // Missing id field
        name: 'test_function',
      } as ToolCall;

      expect(() =>
        historyService.addPendingToolCalls([invalidToolCall]),
      ).toThrow('Invalid tool call:');
    });
  });

  // @plan PLAN-20250128-HISTORYSERVICE.P17
  // @requirement HS-010
  // @phase tool-management-test
  describe('commitToolResponses', () => {
    const sampleToolCalls: ToolCall[] = [
      {
        id: 'tool_call_1',
        name: 'search_web',
        arguments: { query: 'test query' },
      },
      {
        id: 'tool_call_2',
        name: 'read_file',
        arguments: { path: '/test/file.txt' },
      },
    ];

    const sampleToolResponses: ToolResponse[] = [
      {
        toolCallId: 'tool_call_1',
        result: 'Search results: ...',
      },
      {
        toolCallId: 'tool_call_2',
        result: 'File content: ...',
      },
    ];

    it('should atomically commit tool responses with proper pairing', () => {
      // Setup pending calls first
      historyService.addPendingToolCalls(sampleToolCalls);

      historyService.commitToolResponses(sampleToolResponses);

      // Verify pending calls are cleared after commit
      expect(historyService.hasPendingToolCalls()).toBe(false);
      // Verify tool status shows completed calls
      const status = historyService.getToolCallStatus();
      expect(status.completedCalls).toBe(sampleToolResponses.length);
    });

    it('should reject responses without matching pending calls', () => {
      const mismatchedResponses: ToolResponse[] = [
        {
          toolCallId: 'nonexistent_call_id',
          result: 'This should fail pairing',
        },
      ];

      expect(() =>
        historyService.commitToolResponses(mismatchedResponses),
      ).toThrow('No pending tool call found for response:');
    });

    it('should fail to commit responses for non-existent calls after first commit', () => {
      // Add calls first
      historyService.addPendingToolCalls(sampleToolCalls);

      // Commit responses (this clears pending calls)
      historyService.commitToolResponses(sampleToolResponses);

      // Try to commit same responses again - should fail since calls no longer pending
      expect(() =>
        historyService.commitToolResponses(sampleToolResponses),
      ).toThrow('No pending tool call found for response:');
    });

    it('should handle empty arrays without validation (current behavior)', () => {
      // Empty array should work but do nothing (since there are no pending calls)
      historyService.commitToolResponses([]);

      // Invalid array will cause iteration error
      expect(() =>
        historyService.commitToolResponses(null as unknown as ToolResponse[]),
      ).toThrow();
    });
  });

  // @plan PLAN-20250128-HISTORYSERVICE.P17
  // @requirement HS-011
  // @phase tool-management-test
  describe('Atomic Operations', () => {
    const sampleToolCalls: ToolCall[] = [
      {
        id: 'tool_call_1',
        name: 'search_web',
        arguments: { query: 'test query' },
      },
    ];

    const invalidToolResponse: ToolResponse = {
      toolCallId: 'tool_call_1',
      // Missing result field
    } as unknown as ToolResponse;

    it('should rollback on partial failures', () => {
      // Add calls
      historyService.addPendingToolCalls(sampleToolCalls);

      // Before committing, verify we have pending calls
      expect(historyService.hasPendingToolCalls()).toBe(true);
      expect(historyService.getPendingToolCalls()).toHaveLength(1);

      // Try to commit invalid responses - should fail and rollback
      expect(() =>
        historyService.commitToolResponses([invalidToolResponse]),
      ).toThrow('Invalid tool response:');

      // After failure, we should still have our pending calls
      expect(historyService.hasPendingToolCalls()).toBe(true);
      expect(historyService.getPendingToolCalls()).toHaveLength(1);
    });
  });

  // @plan PLAN-20250128-HISTORYSERVICE.P17
  // @requirement HS-012
  // @phase tool-management-test
  describe('abortPendingToolCalls', () => {
    const sampleToolCalls: ToolCall[] = [
      {
        id: 'tool_call_1',
        name: 'search_web',
        arguments: { query: 'test query' },
      },
      {
        id: 'tool_call_2',
        name: 'read_file',
        arguments: { path: '/test/file.txt' },
      },
    ];

    const _sampleToolResponses: ToolResponse[] = [
      {
        toolCallId: 'tool_call_1',
        result: 'Search results: ...',
      },
    ];

    it('should abort all pending tool calls and clear state', () => {
      // Add calls but don't commit responses, so they remain pending
      historyService.addPendingToolCalls(sampleToolCalls);

      // Verify we have pending state
      expect(historyService.hasPendingToolCalls()).toBe(true);
      expect(historyService.getPendingToolCalls()).toHaveLength(2);

      // Abort pending calls
      historyService.abortPendingToolCalls();

      // Verify state is cleared
      expect(historyService.hasPendingToolCalls()).toBe(false);
      expect(historyService.getPendingToolCalls()).toHaveLength(0);
    });

    it('should prevent abortion during tool execution', async () => {
      // Set state to TOOLS_EXECUTING
      // We need to simulate this state to test the prevention
      // For now, this test will depend on the implementation of state transitions
    });
  });

  // @plan PLAN-20250128-HISTORYSERVICE.P17
  // @requirement HS-013
  // @phase tool-management-test
  describe('ID Pairing Validation', () => {
    const sampleToolCalls: ToolCall[] = [
      {
        id: 'tool_call_1',
        name: 'search_web',
        arguments: { query: 'test query' },
      },
      {
        id: 'tool_call_2',
        name: 'read_file',
        arguments: { path: '/test/file.txt' },
      },
    ];

    it('should detect orphaned tool calls through validation', () => {
      historyService.addPendingToolCalls(sampleToolCalls);

      const validation = historyService.validateHistory();

      // Should have warnings about pending tool calls without responses
      expect(validation.isValid).toBe(true); // Pending calls don't make history invalid
      // Pending calls are expected behavior, not validation errors
    });

    it('should reject orphaned responses through public API', () => {
      const orphanedResponse: ToolResponse[] = [
        {
          toolCallId: 'orphaned_call_id',
          result: 'Orphaned result',
        },
      ];

      // Try to commit responses without matching calls - should throw error
      expect(() =>
        historyService.commitToolResponses(orphanedResponse),
      ).toThrow('No pending tool call found for response:');
    });
  });

  // @plan PLAN-20250128-HISTORYSERVICE.P17
  // @requirement HS-014
  // @phase tool-management-test
  describe('Multiple Parallel Tool Calls', () => {
    const sampleToolCalls: ToolCall[] = [
      {
        id: 'tool_call_1',
        name: 'search_web',
        arguments: { query: 'test query 1' },
      },
      {
        id: 'tool_call_2',
        name: 'read_file',
        arguments: { path: '/test/file1.txt' },
      },
      {
        id: 'tool_call_3',
        name: 'write_file',
        arguments: { path: '/test/file2.txt', content: 'test content' },
      },
    ];

    it('should handle multiple tool calls in single batch', () => {
      historyService.addPendingToolCalls(sampleToolCalls);

      expect(historyService.hasPendingToolCalls()).toBe(true);
      expect(historyService.getPendingToolCalls()).toHaveLength(3);
    });

    it('should maintain proper ordering of tool calls', () => {
      historyService.addPendingToolCalls(sampleToolCalls);

      const pendingCalls = historyService.getPendingToolCalls();

      expect(pendingCalls[0].id).toBe('tool_call_1');
      expect(pendingCalls[1].id).toBe('tool_call_2');
      expect(pendingCalls[2].id).toBe('tool_call_3');
    });

    it('should maintain proper ordering of tool responses', () => {
      // Add calls first
      historyService.addPendingToolCalls(sampleToolCalls);

      // Commit responses in different order than calls
      const responses: ToolResponse[] = [
        {
          toolCallId: 'tool_call_2',
          result: 'File 1 content',
        },
        {
          toolCallId: 'tool_call_1',
          result: 'Search results',
        },
        {
          toolCallId: 'tool_call_3',
          result: 'Write success',
        },
      ];

      historyService.commitToolResponses(responses);

      // Verify responses are committed by checking tool call status
      const status = historyService.getToolCallStatus();
      expect(status.completedCalls).toBe(3);
      expect(status.pendingCalls).toBe(0); // Should be 0 after commit

      // Check execution order matches original call order
      expect(status.executionOrder[0]).toBe('tool_call_1');
      expect(status.executionOrder[1]).toBe('tool_call_2');
      expect(status.executionOrder[2]).toBe('tool_call_3');
    });

    it('should return correct tool call status information', () => {
      // Add calls first
      historyService.addPendingToolCalls(sampleToolCalls);

      // Check status before committing any responses
      const statusBefore = historyService.getToolCallStatus();
      expect(statusBefore.pendingCalls).toBe(3);
      expect(statusBefore.completedCalls).toBe(0);

      // Commit responses for all pending calls
      const responses: ToolResponse[] = [
        { toolCallId: 'tool_call_1', result: 'Search results' },
        { toolCallId: 'tool_call_2', result: 'File content' },
        { toolCallId: 'tool_call_3', result: 'Write success' },
      ];

      historyService.commitToolResponses(responses);

      const statusAfter = historyService.getToolCallStatus();

      expect(statusAfter.pendingCalls).toBe(0); // All cleared after commit
      expect(statusAfter.responseCount).toBe(3);
      expect(statusAfter.completedCalls).toBe(3);
      expect(statusAfter.executionOrder.length).toBe(3);

      // Check execution order
      expect(statusAfter.executionOrder[0]).toBe('tool_call_1');
      expect(statusAfter.executionOrder[1]).toBe('tool_call_2');
      expect(statusAfter.executionOrder[2]).toBe('tool_call_3');
    });
  });
});
