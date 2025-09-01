/**
 * Behavioral tests for tool error scenarios
 * These test REAL error conditions that happen in production
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Turn } from '../core/turn.js';
import { GeminiChat } from '../core/geminiChat.js';
import { HistoryService } from '../services/history/HistoryService.js';
import { CoreToolScheduler } from '../core/coreToolScheduler.js';
import type { Content } from '@google/genai';

describe('Tool Error Behavioral Tests - REAL ERROR SCENARIOS', () => {
  let historyService: HistoryService;
  let turn: Turn;
  let mockChat: GeminiChat;

  beforeEach(() => {
    historyService = new HistoryService('test-conversation-id');
    mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
    } as any;
    turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);
  });

  describe('Non-existent tool calls', () => {
    it("should handle model calling a tool that doesn't exist", async () => {
      // Model hallucinates a tool that doesn't exist
      mockChat.sendMessageStream = vi
        .fn()
        .mockImplementation(async function* () {
          yield {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: {
                        id: 'call_fake_tool',
                        name: 'quantum_database_optimizer', // This tool doesn't exist
                        args: { optimize: true },
                      },
                    },
                  ],
                },
              },
            ],
          };
        });

      const signal = new AbortController().signal;
      const events = [];

      for await (const event of turn.run(
        { parts: [{ text: 'optimize my database' }] },
        signal,
      )) {
        events.push(event);
      }

      // Should generate error response for non-existent tool
      const history = historyService.getHistory();

      // CRITICAL: Must not send orphaned tool response
      // Should either:
      // 1. Not add any tool messages at all
      // 2. Add both assistant message with tool call AND error response
      const toolMessages = history.filter((m) => m.role === 'tool');
      const assistantMessages = history.filter((m) => m.role === 'assistant');

      if (toolMessages.length > 0) {
        // If we have tool responses, we MUST have corresponding assistant messages
        expect(assistantMessages.some((m) => m.toolCalls?.length > 0)).toBe(
          true,
        );

        // The tool response should indicate the tool doesn't exist
        expect(toolMessages[0].toolResponses?.[0].error).toContain('not found');
      }
    });

    it('should not create orphans when tool registry is empty', async () => {
      // No tools registered but model tries to call one
      const emptyScheduler = new CoreToolScheduler({} as any);

      mockChat.sendMessageStream = vi
        .fn()
        .mockImplementation(async function* () {
          yield {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: {
                        id: 'call_missing',
                        name: 'any_tool',
                        args: {},
                      },
                    },
                  ],
                },
              },
            ],
          };
        });

      const events = [];
      const signal = new AbortController().signal;

      for await (const event of turn.run(
        { parts: [{ text: 'do something' }] },
        signal,
      )) {
        events.push(event);
      }

      // Should handle gracefully without orphans
      const history = historyService.getHistory();
      const hasOrphanedResponse = history.some(
        (m) =>
          m.role === 'tool' &&
          !history.some(
            (other) =>
              other.role === 'assistant' &&
              other.toolCalls?.some((tc) =>
                m.toolResponses?.some((tr) => tr.toolCallId === tc.id),
              ),
          ),
      );

      expect(hasOrphanedResponse).toBe(false);
    });
  });

  describe('Malformed tool arguments', () => {
    it('should handle tool call with invalid schema', async () => {
      // Model sends malformed arguments
      mockChat.sendMessageStream = vi
        .fn()
        .mockImplementation(async function* () {
          yield {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: {
                        id: 'call_bad_args',
                        name: 'read_file',
                        args: {
                          // Missing required 'path' field
                          filename: 'test.txt', // Wrong field name
                          recursive: 'yes', // Wrong type (should be boolean)
                        },
                      },
                    },
                  ],
                },
              },
            ],
          };
        });

      const signal = new AbortController().signal;
      const events = [];

      for await (const event of turn.run(
        { parts: [{ text: 'read file' }] },
        signal,
      )) {
        events.push(event);
      }

      // Should handle schema validation error
      const history = historyService.getHistory();

      // Must maintain paired structure
      if (history.some((m) => m.role === 'tool')) {
        const assistantWithCall = history.find(
          (m) => m.role === 'assistant' && m.toolCalls?.length > 0,
        );
        expect(assistantWithCall).toBeDefined();

        const toolResponse = history.find((m) => m.role === 'tool');
        expect(toolResponse?.toolResponses?.[0].error).toContain('validation');
      }
    });

    it('should handle deeply nested malformed JSON in tool args', async () => {
      // Model sends circular reference or too deeply nested args
      const circularArgs: any = { level1: {} };
      circularArgs.level1.circular = circularArgs; // Circular reference

      mockChat.sendMessageStream = vi
        .fn()
        .mockImplementation(async function* () {
          yield {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: {
                        id: 'call_circular',
                        name: 'process_data',
                        args: circularArgs,
                      },
                    },
                  ],
                },
              },
            ],
          };
        });

      const signal = new AbortController().signal;
      const events = [];

      // Should not crash on circular reference
      let crashed = false;
      try {
        for await (const event of turn.run(
          { parts: [{ text: 'process' }] },
          signal,
        )) {
          events.push(event);
        }
      } catch (e) {
        crashed = true;
      }

      expect(crashed).toBe(false); // Should handle gracefully

      // Should create error response, not orphan
      const history = historyService.getHistory();
      const hasValidPairing = history.every((m) => {
        if (m.role === 'tool') {
          return history.some(
            (other) =>
              other.role === 'assistant' && other.toolCalls?.length > 0,
          );
        }
        return true;
      });

      expect(hasValidPairing).toBe(true);
    });
  });

  describe('Cancellation scenarios', () => {
    it('should properly handle cancellation during tool execution', async () => {
      const abortController = new AbortController();

      mockChat.sendMessageStream = vi
        .fn()
        .mockImplementation(async function* () {
          yield {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: {
                        id: 'call_slow',
                        name: 'long_running_task',
                        args: { duration: 10000 },
                      },
                    },
                  ],
                },
              },
            ],
          };
        });

      const events = [];

      // Start the turn
      const turnPromise = (async () => {
        for await (const event of turn.run(
          { parts: [{ text: 'run long task' }] },
          abortController.signal,
        )) {
          events.push(event);

          // Cancel after receiving tool call request
          if (event.type === 'tool_call_request') {
            abortController.abort();
            break;
          }
        }
      })();

      await turnPromise;

      // When cancelled, transaction should be rolled back
      const history = historyService.getHistory();

      // Either:
      // 1. No tool messages at all (transaction rolled back)
      // 2. Both assistant and synthetic cancellation response (transaction completed with cancellation)

      const toolMessages = history.filter((m) => m.role === 'tool');
      const assistantMessages = history.filter(
        (m) => m.role === 'assistant' && m.toolCalls?.length > 0,
      );

      if (toolMessages.length > 0) {
        // If we have tool response, must have assistant message too
        expect(assistantMessages.length).toBeGreaterThan(0);
        // And response should indicate cancellation
        expect(toolMessages[0].toolResponses?.[0].error).toContain('cancelled');
      } else {
        // Transaction was rolled back, no orphans
        expect(assistantMessages.length).toBe(0);
      }
    });

    it('should handle cancellation between multiple parallel tool calls', async () => {
      const abortController = new AbortController();

      mockChat.sendMessageStream = vi
        .fn()
        .mockImplementation(async function* () {
          yield {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: {
                        id: 'call_1',
                        name: 'tool_a',
                        args: {},
                      },
                    },
                    {
                      functionCall: {
                        id: 'call_2',
                        name: 'tool_b',
                        args: {},
                      },
                    },
                    {
                      functionCall: {
                        id: 'call_3',
                        name: 'tool_c',
                        args: {},
                      },
                    },
                  ],
                },
              },
            ],
          };
        });

      const events = [];
      let toolCallCount = 0;

      const turnPromise = (async () => {
        for await (const event of turn.run(
          { parts: [{ text: 'run multiple tools' }] },
          abortController.signal,
        )) {
          events.push(event);

          if (event.type === 'tool_call_request') {
            toolCallCount++;
            // Cancel after second tool call
            if (toolCallCount === 2) {
              abortController.abort();
              break;
            }
          }
        }
      })();

      await turnPromise;

      // Should handle partial completion gracefully
      const history = historyService.getHistory();

      // All tool responses must have corresponding calls
      const orphanedResponses = history.filter((m) => {
        if (m.role === 'tool' && m.toolResponses) {
          return !history.some(
            (other) =>
              other.role === 'assistant' &&
              other.toolCalls?.some((tc) =>
                m.toolResponses!.some((tr) => tr.toolCallId === tc.id),
              ),
          );
        }
        return false;
      });

      expect(orphanedResponses.length).toBe(0);
    });
  });

  describe('Stream termination scenarios', () => {
    it('should handle stream termination mid-tool-call', async () => {
      // Stream dies while receiving tool call
      mockChat.sendMessageStream = vi
        .fn()
        .mockImplementation(async function* () {
          yield {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: {
                        id: 'call_incomplete',
                        name: 'test_tool',
                        // Stream terminates here - args incomplete
                      },
                    },
                  ],
                },
              },
            ],
          };
          throw new Error('Stream terminated unexpectedly');
        });

      const signal = new AbortController().signal;
      const events = [];
      let streamError = null;

      try {
        for await (const event of turn.run(
          { parts: [{ text: 'test' }] },
          signal,
        )) {
          events.push(event);
        }
      } catch (e) {
        streamError = e;
      }

      expect(streamError).toBeTruthy();

      // Should not create orphaned messages
      const history = historyService.getHistory();

      // No orphaned tool responses
      const orphans = history.filter(
        (m) =>
          m.role === 'tool' &&
          !history.some(
            (other) =>
              other.role === 'assistant' && other.toolCalls?.length > 0,
          ),
      );

      expect(orphans.length).toBe(0);
    });

    it('should handle network error during tool response transmission', async () => {
      // Tool executes successfully but response fails to transmit
      const beginSpy = vi.spyOn(historyService, 'beginToolTransaction');
      const commitSpy = vi.spyOn(historyService, 'commitTransaction');
      const rollbackSpy = vi.spyOn(historyService, 'rollbackTransaction');

      mockChat.sendMessageStream = vi
        .fn()
        .mockImplementation(async function* () {
          yield {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      functionCall: {
                        id: 'call_network_fail',
                        name: 'fetch_data',
                        args: { url: 'http://example.com' },
                      },
                    },
                  ],
                },
              },
            ],
          };
        });

      // Simulate network failure when trying to send response
      const originalCommit =
        historyService.commitTransaction.bind(historyService);
      historyService.commitTransaction = vi.fn().mockImplementation(() => {
        throw new Error('Network error: Failed to transmit');
      });

      const signal = new AbortController().signal;
      const events = [];
      let networkError = null;

      try {
        for await (const event of turn.run(
          { parts: [{ text: 'fetch' }] },
          signal,
        )) {
          events.push(event);

          if (event.type === 'tool_call_request') {
            // Simulate tool execution
            await turn.handleToolExecutionComplete('call_network_fail', {
              output: 'data fetched',
            });
          }
        }
      } catch (e) {
        networkError = e;
      }

      // Transaction should be rolled back on network error
      expect(rollbackSpy).toHaveBeenCalled();

      // No partial data should be in history
      const history = historyService.getHistory();
      const hasIncompleteTransaction = history.some(
        (m) =>
          (m.role === 'assistant' && m.toolCalls?.length > 0) ||
          (m.role === 'tool' && m.toolResponses?.length > 0),
      );

      expect(hasIncompleteTransaction).toBe(false);
    });
  });

  describe('API rejection scenarios', () => {
    it('should detect orphaned responses before sending to API', async () => {
      // This is the ACTUAL bug we're seeing in production
      const messagesToSend = [
        {
          role: 'system',
          content: 'You are a helpful assistant',
        },
        {
          role: 'tool', // ORPHANED - no assistant message with tool call
          tool_call_id: 'e46661a9c',
          content: '{"output": "Found 1383 files"}',
        },
      ];

      // Function to validate messages before API call
      const validateForAPI = (messages: any[]) => {
        const errors = [];

        // Check for orphaned tool responses
        const toolMessages = messages.filter((m) => m.role === 'tool');
        const assistantMessages = messages.filter(
          (m) => m.role === 'assistant',
        );

        for (const toolMsg of toolMessages) {
          const hasMatchingCall = assistantMessages.some((am) =>
            am.tool_calls?.some((tc) => tc.id === toolMsg.tool_call_id),
          );

          if (!hasMatchingCall) {
            errors.push(`Orphaned tool response: ${toolMsg.tool_call_id}`);
          }
        }

        return errors;
      };

      const errors = validateForAPI(messagesToSend);
      expect(errors).toContain('Orphaned tool response: e46661a9c');
    });
  });
});
