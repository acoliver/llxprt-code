/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import process from 'node:process';
import { Turn } from '../core/turn.js';
import { CoreToolScheduler } from '../core/coreToolScheduler.js';
import { HistoryService } from '../services/history/HistoryService.js';
import { Config, ApprovalMode } from '../config/config.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { MockTool } from '../test-utils/tools.js';
import { GeminiChat } from '../core/geminiChat.js';

describe('Tool-HistoryService Integration', () => {
  let historyService: HistoryService;
  let config: Config;
  let toolRegistry: ToolRegistry;
  let turn: Turn;
  let scheduler: CoreToolScheduler;
  let mockChat: GeminiChat;

  beforeEach(async () => {
    // Create fresh instances for each test
    config = new Config({
      sessionId: 'test-session',
      targetDir: process.cwd(),
      sandbox: false,
    });
    config.setApprovalMode(ApprovalMode.YOLO); // Skip confirmations for testing

    historyService = new HistoryService('test-conversation-id');
    toolRegistry = new ToolRegistry(config);

    // Register a mock tool
    const mockTool = new MockTool(config);
    toolRegistry.registerTool(mockTool);

    // Mock GeminiChat
    mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn(() => []),
    } as { sendMessageStream: () => unknown; getHistory: () => unknown[] };

    turn = new Turn(
      mockChat,
      'test-prompt-id',
      'test-provider',
      historyService,
      {
        conversationId: 'test-conversation',
        messageId: 'test-message',
      },
    );

    scheduler = new CoreToolScheduler({
      toolRegistry: Promise.resolve(toolRegistry),
      config,
      getPreferredEditor: () => undefined,
      onEditorClose: () => {},
      turn,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Tool Execution Recording', () => {
    it('should record tool execution in HistoryService', async () => {
      const toolCallRequest = {
        callId: 'test-call-1',
        name: 'MockTool',
        args: { action: 'test' },
        isClientInitiated: false,
        prompt_id: 'test-prompt-id',
      };

      // Schedule and execute tool
      await scheduler.schedule(toolCallRequest, new AbortController().signal);

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check HistoryService recorded the execution
      const status = historyService.getToolCallStatus();
      expect(status.completedCalls).toBeGreaterThan(0);
      expect(status.pendingCalls).toBe(0);
    });
  });

  describe('Multiple Tool Execution', () => {
    it('should record multiple tools correctly', async () => {
      const toolCallRequests = [
        {
          callId: 'test-call-1',
          name: 'MockTool',
          args: { action: 'test1' },
          isClientInitiated: false,
          prompt_id: 'test-prompt-id',
        },
        {
          callId: 'test-call-2',
          name: 'MockTool',
          args: { action: 'test2' },
          isClientInitiated: false,
          prompt_id: 'test-prompt-id',
        },
      ];

      // Schedule tools
      for (const request of toolCallRequests) {
        await scheduler.schedule(request, new AbortController().signal);
      }

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check HistoryService recorded both executions
      const status = historyService.getToolCallStatus();
      expect(status.completedCalls).toBe(2);
      expect(status.pendingCalls).toBe(0);

      // Verify execution order is maintained
      expect(status.executionOrder).toHaveLength(2);
      expect(status.executionOrder[0]).toBe('test-call-1');
      expect(status.executionOrder[1]).toBe('test-call-2');
    });
  });

  describe('Failed Tool Handling', () => {
    it('should record tool failures in HistoryService', async () => {
      // Create a tool that will fail
      const mockFailingTool = new MockTool(config, true); // true = force failure
      toolRegistry.registerTool(mockFailingTool);

      const toolCallRequest = {
        callId: 'test-call-fail',
        name: 'MockTool',
        args: { action: 'fail' },
        isClientInitiated: false,
        prompt_id: 'test-prompt-id',
      };

      await scheduler.schedule(toolCallRequest, new AbortController().signal);

      // Wait for execution to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check HistoryService recorded the failure
      const status = historyService.getToolCallStatus();
      expect(status.failedCalls).toBe(1);
      expect(status.pendingCalls).toBe(0);
    });
  });

  describe('Duplicate Prevention', () => {
    it('should prevent duplicate tool responses', async () => {
      const toolCallRequest = {
        callId: 'test-call-duplicate',
        name: 'MockTool',
        args: { action: 'test' },
        isClientInitiated: false,
        prompt_id: 'test-prompt-id',
      };

      // Execute the same tool twice
      await scheduler.schedule(toolCallRequest, new AbortController().signal);

      // Wait for first execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to add duplicate response directly to HistoryService
      const toolResponse = {
        toolCallId: 'test-call-duplicate',
        result: 'Duplicate result',
      };

      // First commit should succeed
      historyService.commitToolResponses([toolResponse]);

      // Second commit should be ignored (duplicate prevention)
      historyService.commitToolResponses([toolResponse]);

      // Check only one response was recorded
      const status = historyService.getToolCallStatus();
      expect(status.responseCount).toBe(1);
      expect(status.completedCalls).toBe(1);
    });
  });

  describe('Turn Integration', () => {
    it('should integrate Turn methods with HistoryService', async () => {
      const toolCallId = 'test-turn-integration';

      // Test handleToolExecutionComplete
      await turn.handleToolExecutionComplete(toolCallId, {
        llmContent: 'Test result',
        returnDisplay: 'Test display',
      });

      // Verify response was recorded
      const status = historyService.getToolCallStatus();
      expect(status.responseCount).toBe(1);

      // Test handleToolExecutionError
      await turn.handleToolExecutionError(
        toolCallId + '-error',
        new Error('Test error'),
      );

      // Verify error was recorded
      const updatedStatus = historyService.getToolCallStatus();
      expect(updatedStatus.responseCount).toBe(2);
    });
  });

  describe('Tool Call Status', () => {
    it('should provide accurate tool call status', async () => {
      const toolCallRequest = {
        callId: 'test-status',
        name: 'MockTool',
        args: { action: 'test' },
        isClientInitiated: false,
        prompt_id: 'test-prompt-id',
      };

      // Initial state
      let status = turn.getToolExecutionStatus();
      expect(status).toBeDefined();
      expect(status!.pendingCalls).toBe(0);

      // Schedule tool
      await scheduler.schedule(toolCallRequest, new AbortController().signal);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check final status
      status = turn.getToolExecutionStatus();
      expect(status!.completedCalls).toBeGreaterThan(0);
    });
  });

  describe('Database Consistency', () => {
    it('should maintain data consistency between Turn and HistoryService', async () => {
      const toolCallRequest = {
        callId: 'test-consistency',
        name: 'MockTool',
        args: { action: 'test' },
        isClientInitiated: false,
        prompt_id: 'test-prompt-id',
      };

      // Execute through scheduler
      await scheduler.schedule(toolCallRequest, new AbortController().signal);

      // Wait for completion
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify Turn and HistoryService are consistent
      const turnStatus = turn.getToolExecutionStatus();
      const historyStatus = historyService.getToolCallStatus();

      expect(turnStatus!.completedCalls).toBe(historyStatus.completedCalls);
      expect(turnStatus!.pendingCalls).toBe(historyStatus.pendingCalls);
      expect(turnStatus!.currentState).toBe(historyStatus.currentState);
    });
  });
});
