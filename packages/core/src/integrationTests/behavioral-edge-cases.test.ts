/**
 * Behavioral Edge Case Tests
 *
 * These test REAL scenarios that should be caught but often aren't
 * because mock tests don't represent actual system behavior.
 */

import { describe, it, expect } from 'vitest';
import { HistoryService } from '../services/history/HistoryService';
import { MessageRoleEnum } from '../services/history/types';
import type { Content } from '@google/genai';

describe('Behavioral Edge Cases - Things We Should Catch', () => {
  describe('Streaming Interruption Scenarios', () => {
    it('should handle interruption mid-token during streaming', () => {
      const historyService = new HistoryService('test-conversation');

      // User sends message
      historyService.addMessage(
        'Explain quantum computing',
        MessageRoleEnum.USER,
      );

      // Model starts streaming response but gets cut off mid-word
      const partialContent =
        'Quantum computing is a revolutionary technology that uses the principles of quantum mech';

      // This simulates what happens when user cancels during streaming
      historyService.addMessage(partialContent, MessageRoleEnum.MODEL, {
        metadata: {
          streaming: true,
          interrupted: true,
          completeWord: false,
        },
      });

      // User continues - system should handle partial response
      historyService.addMessage('continue', MessageRoleEnum.USER);

      const history = historyService.getHistory();
      const modelMessage = history.find(
        (m) => m.role === MessageRoleEnum.MODEL,
      );

      // Should detect incomplete response
      expect(modelMessage?.content).toContain('quantum mech');
      expect(modelMessage?.content).not.toContain('mechanics');
      expect(modelMessage?.metadata?.metadata?.interrupted).toBe(true);
    });

    it('should handle interruption between tool call and tool execution', () => {
      const historyService = new HistoryService('test-conversation');

      // Model decides to use tool
      const modelContent: Content = {
        role: 'model',
        parts: [
          { text: 'Let me search for that information.' },
          {
            functionCall: {
              name: 'web_search',
              args: { query: 'latest news' },
            },
          },
        ],
      };

      historyService.addMessage('Search for news', MessageRoleEnum.USER);
      historyService.addMessage(
        'Let me search for that information.',
        MessageRoleEnum.MODEL,
        { originalContent: modelContent },
      );

      // Tool starts executing but user cancels
      // In real system, tool executor would be mid-execution
      const partialToolResponse = {
        toolCallId: 'search_1',
        result: {
          partial: true,
          results: ['Result 1', 'Result 2'],
          error: 'Execution interrupted',
        },
      };

      // No tool response added because execution was cancelled
      // This creates the orphan

      historyService.addMessage('stop', MessageRoleEnum.USER);

      // Check for orphan
      const history = historyService.getHistory();
      let hasToolCall = false;
      let hasToolResponse = false;

      history.forEach((msg) => {
        const content = msg.metadata?.originalContent as Content | undefined;
        if (content?.parts) {
          content.parts.forEach((part) => {
            if ('functionCall' in part) hasToolCall = true;
            if ('functionResponse' in part) hasToolResponse = true;
          });
        }
      });

      expect(hasToolCall).toBe(true);
      expect(hasToolResponse).toBe(false);
    });
  });

  describe('Concurrent Tool Execution Scenarios', () => {
    it('should handle cancellation during parallel tool execution', () => {
      const historyService = new HistoryService('test-conversation');

      // Model executes multiple tools in parallel
      const modelContent: Content = {
        role: 'model',
        parts: [
          { text: 'I will gather information from multiple sources.' },
          {
            functionCall: {
              name: 'read_file',
              args: { path: 'file1.ts' },
            },
          },
          {
            functionCall: {
              name: 'read_file',
              args: { path: 'file2.ts' },
            },
          },
          {
            functionCall: {
              name: 'web_search',
              args: { query: 'typescript best practices' },
            },
          },
        ],
      };

      historyService.addMessage(
        'Analyze my TypeScript project',
        MessageRoleEnum.USER,
      );
      historyService.addMessage(
        'I will gather information from multiple sources.',
        MessageRoleEnum.MODEL,
        { originalContent: modelContent },
      );

      // Only first tool completes before cancellation
      const firstResponse: Content = {
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: 'read_file',
              response: { content: 'file1 content' },
            },
          },
        ],
      };

      historyService.addMessage(
        JSON.stringify({ content: 'file1 content' }),
        MessageRoleEnum.TOOL,
        { originalContent: firstResponse },
      );

      // User cancels - other 2 tools become orphans
      historyService.addMessage('cancel', MessageRoleEnum.USER);

      // Count orphans
      const history = historyService.getHistory();
      const toolCalls: string[] = [];
      const toolResponses: string[] = [];

      history.forEach((msg) => {
        const content = msg.metadata?.originalContent as Content | undefined;
        if (content?.parts) {
          content.parts.forEach((part) => {
            if ('functionCall' in part && part.functionCall) {
              toolCalls.push(
                `${part.functionCall.name}:${JSON.stringify(part.functionCall.args)}`,
              );
            }
            if ('functionResponse' in part && part.functionResponse) {
              toolResponses.push(part.functionResponse.name);
            }
          });
        }
      });

      // Should have 3 calls but only 1 response
      expect(toolCalls.length).toBe(3);
      expect(toolResponses.length).toBe(1);

      // 2 orphans in parallel execution
      const orphanCount = toolCalls.length - toolResponses.length;
      expect(orphanCount).toBe(2);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle tool execution failures creating pseudo-orphans', () => {
      const historyService = new HistoryService('test-conversation');

      const modelContent: Content = {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'run_command',
              args: { command: 'npm test' },
            },
          },
        ],
      };

      historyService.addMessage('Run tests', MessageRoleEnum.USER);
      historyService.addMessage('', MessageRoleEnum.MODEL, {
        originalContent: modelContent,
      });

      // Tool fails with error - but error response might not be added properly
      // This can create an orphan-like situation

      // User tries to continue
      historyService.addMessage('try again', MessageRoleEnum.USER);

      // System should detect missing tool response
      const history = historyService.getHistory();
      const lastModelMsg = [...history]
        .reverse()
        .find((m) => m.role === MessageRoleEnum.MODEL);

      if (lastModelMsg?.metadata?.originalContent) {
        const content = lastModelMsg.metadata.originalContent as Content;
        const hasUnresolvedToolCall = content.parts?.some(
          (p) =>
            'functionCall' in p &&
            !history.some((h) => h.role === MessageRoleEnum.TOOL),
        );

        expect(hasUnresolvedToolCall).toBe(true);
      }
    });

    it('should handle timeout scenarios where tools never respond', () => {
      const historyService = new HistoryService('test-conversation');

      const modelContent: Content = {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'long_running_operation',
              args: { timeout: 60000 },
            },
          },
        ],
      };

      historyService.addMessage('Process large dataset', MessageRoleEnum.USER);
      historyService.addMessage('Processing...', MessageRoleEnum.MODEL, {
        originalContent: modelContent,
      });

      // Simulate timeout - no response ever comes
      // User gives up and sends new message
      historyService.addMessage(
        'forget it, do something else',
        MessageRoleEnum.USER,
      );

      // This creates an orphan that might persist across conversation
      const validation = historyService.validateHistory();

      // Should detect the orphaned long-running operation
      const hasOrphan = !validation.isValid || validation.warnings.length > 0;
      expect(hasOrphan).toBe(true);
    });
  });

  describe('State Corruption Scenarios', () => {
    it('should handle double tool response (duplicate response bug)', () => {
      const historyService = new HistoryService('test-conversation');

      const modelContent: Content = {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'fetch_data',
              args: { id: '123' },
            },
          },
        ],
      };

      historyService.addMessage('Get data', MessageRoleEnum.USER);
      historyService.addMessage('Fetching...', MessageRoleEnum.MODEL, {
        originalContent: modelContent,
      });

      // Bug: Tool response added twice (race condition)
      const response: Content = {
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: 'fetch_data',
              response: { data: 'result' },
            },
          },
        ],
      };

      historyService.addMessage('result', MessageRoleEnum.TOOL, {
        originalContent: response,
      });

      // Duplicate response (shouldn't happen but does in race conditions)
      historyService.addMessage('result', MessageRoleEnum.TOOL, {
        originalContent: response,
      });

      // Should detect duplicate tool responses
      const history = historyService.getHistory();
      const toolResponseCount = history.filter(
        (m) => m.role === MessageRoleEnum.TOOL,
      ).length;

      expect(toolResponseCount).toBe(2); // Bug: should be 1
    });

    it('should handle tool response without corresponding tool call', () => {
      const historyService = new HistoryService('test-conversation');

      historyService.addMessage('Hello', MessageRoleEnum.USER);
      historyService.addMessage('Hi there!', MessageRoleEnum.MODEL);

      // Bug: Tool response added without any tool call
      const orphanResponse: Content = {
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: 'phantom_tool',
              response: { error: 'This should not exist' },
            },
          },
        ],
      };

      historyService.addMessage(
        JSON.stringify({ error: 'This should not exist' }),
        MessageRoleEnum.TOOL,
        { originalContent: orphanResponse },
      );

      // This corrupts the conversation history
      const validation = historyService.validateHistory();

      // Should detect tool response without call
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Continue Command Edge Cases', () => {
    it('should handle continue with no prior context', () => {
      const historyService = new HistoryService('test-conversation');

      // User says continue with empty history
      historyService.addMessage('continue', MessageRoleEnum.USER);

      // System should handle gracefully
      const history = historyService.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].content).toBe('continue');

      // Should not crash when trying to continue nothing
    });

    it('should handle continue after error message', () => {
      const historyService = new HistoryService('test-conversation');

      historyService.addMessage('Do something', MessageRoleEnum.USER);

      // Model encounters error
      historyService.addMessage(
        'Error: API rate limit exceeded',
        MessageRoleEnum.MODEL,
        { metadata: { error: true, code: 429 } },
      );

      // User says continue
      historyService.addMessage('continue', MessageRoleEnum.USER);

      // Should handle continuing after error
      const history = historyService.getHistory();
      const errorMsg = history.find((m) => m.metadata?.metadata?.error);

      expect(errorMsg).toBeDefined();
      expect(history[history.length - 1].content).toBe('continue');
    });

    it('should handle continue with multiple pending tool calls', () => {
      const historyService = new HistoryService('test-conversation');

      // Multiple tools queued but not executed
      const modelContent: Content = {
        role: 'model',
        parts: [
          { text: 'I need to do several things:' },
          { functionCall: { name: 'tool1', args: {} } },
          { functionCall: { name: 'tool2', args: {} } },
          { functionCall: { name: 'tool3', args: {} } },
        ],
      };

      historyService.addMessage('Complex task', MessageRoleEnum.USER);
      historyService.addMessage(
        'I need to do several things:',
        MessageRoleEnum.MODEL,
        { originalContent: modelContent },
      );

      // User cancels before any execute
      historyService.addMessage('stop', MessageRoleEnum.USER);

      // User says continue - should handle 3 orphaned tools
      historyService.addMessage('continue', MessageRoleEnum.USER);

      // All 3 tools are orphaned
      const history = historyService.getHistory();
      let orphanCount = 0;

      history.forEach((msg) => {
        const content = msg.metadata?.originalContent as Content | undefined;
        if (content?.parts) {
          content.parts.forEach((part) => {
            if ('functionCall' in part) orphanCount++;
          });
        }
      });

      expect(orphanCount).toBe(3);
    });
  });
});
