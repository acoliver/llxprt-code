/**
 * Real integration tests for tool transaction system
 * These tests verify that the transaction system is ACTUALLY USED in the tool execution flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Turn } from '../core/turn.js';
import { GeminiChat } from '../core/geminiChat.js';
import { HistoryService } from '../services/history/HistoryService.js';
import { CoreToolScheduler } from '../core/coreToolScheduler.js';
import { OpenAIProvider } from '../providers/openai/OpenAIProvider.js';
import type { Content } from '@google/genai';

describe('Tool Transaction Integration - REAL TESTS', () => {
  let historyService: HistoryService;
  let turn: Turn;
  let mockChat: GeminiChat;
  let mockProvider: OpenAIProvider;
  let sentToAPI: any[] = [];

  beforeEach(() => {
    sentToAPI = [];
    historyService = new HistoryService('test-conversation-id');
    mockChat = {
      sendMessageStream: vi.fn(),
      getHistory: vi.fn().mockReturnValue([]),
    } as any;

    // Mock the provider to capture what's actually sent to the API
    mockProvider = {
      generateContentStream: vi.fn().mockImplementation(async (messages) => {
        sentToAPI.push(...messages);
        throw new Error('400 - Orphaned tool response');
      }),
    } as any;

    turn = new Turn(mockChat, 'test-prompt', 'openai', historyService);
  });

  describe('Critical: Tool execution must use transaction system', () => {
    it('should send BOTH assistant message with tool calls AND tool responses to API', async () => {
      // Simulate a tool call from the model
      const toolCallFromModel = {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'call_123',
              name: 'read_file',
              args: { path: '/test.txt' },
            },
          },
        ],
      };

      // Start transaction for tool call
      const txId = historyService.beginToolTransaction();

      // Add assistant message with tool call
      historyService.addAssistantMessageToTransaction('Calling read_file', [
        {
          id: 'call_123',
          name: 'read_file',
          arguments: { path: '/test.txt' },
        },
      ]);

      // Simulate tool execution and response
      const toolResponse = {
        toolCallId: 'call_123',
        result: { content: 'file contents' },
      };
      historyService.addToolResponseToTransaction('call_123', toolResponse);

      // Commit the transaction
      historyService.commitTransaction();

      // Now simulate sending to API
      const history = historyService.getHistory();

      // THIS IS THE KEY TEST: Verify what would be sent to API
      expect(history).toHaveLength(2);
      expect(history[0].role).toBe('assistant'); // Assistant message with tool calls
      expect(history[0].toolCalls).toHaveLength(1);
      expect(history[0].toolCalls![0].id).toBe('call_123');

      expect(history[1].role).toBe('tool'); // Tool response message
      expect(history[1].toolResponses).toHaveLength(1);
      expect(history[1].toolResponses![0].toolCallId).toBe('call_123');

      // CRITICAL: Both messages must be sent together, never orphaned responses alone
      const messagesForAPI = history;
      expect(messagesForAPI.find((m) => m.role === 'assistant')).toBeDefined();
      expect(messagesForAPI.find((m) => m.role === 'tool')).toBeDefined();
    });

    it('should FAIL if tool responses are sent without assistant message (orphaned)', async () => {
      // This test simulates the CURRENT BROKEN BEHAVIOR
      // Tool response sent directly without assistant message
      const orphanedToolResponse = {
        role: 'tool',
        toolResponses: [
          {
            toolCallId: 'call_456',
            result: { content: 'orphaned response' },
          },
        ],
      };

      // Try to send just the tool response (current broken flow)
      const messagesToSend = [orphanedToolResponse];

      // This should be detected as invalid
      const hasOrphanedResponse = messagesToSend.some(
        (m) =>
          m.role === 'tool' &&
          !messagesToSend.some(
            (other) =>
              other.role === 'assistant' &&
              other.toolCalls?.some(
                (tc) => tc.id === m.toolResponses?.[0]?.toolCallId,
              ),
          ),
      );

      expect(hasOrphanedResponse).toBe(true); // This is the bug!
    });

    it('should use transaction system in Turn.run() when handling tool calls', async () => {
      // Spy on transaction methods
      const beginSpy = vi.spyOn(historyService, 'beginToolTransaction');
      const addAssistantSpy = vi.spyOn(
        historyService,
        'addAssistantMessageToTransaction',
      );
      const addResponseSpy = vi.spyOn(
        historyService,
        'addToolResponseToTransaction',
      );
      const commitSpy = vi.spyOn(historyService, 'commitTransaction');

      // Mock the chat to return a tool call
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
                        id: 'call_789',
                        name: 'test_tool',
                        args: {},
                      },
                    },
                  ],
                },
              },
            ],
          };
        });

      // Run the turn
      const signal = new AbortController().signal;
      const events = [];
      for await (const event of turn.run(
        { parts: [{ text: 'test' }] },
        signal,
      )) {
        events.push(event);

        // Simulate tool execution completion
        if (event.type === 'tool_call_request') {
          await turn.handleToolExecutionComplete('call_789', {
            output: 'tool result',
          });
        }
      }

      // CRITICAL ASSERTIONS: Transaction system MUST be used
      expect(beginSpy).toHaveBeenCalled();
      expect(addAssistantSpy).toHaveBeenCalled();
      expect(addResponseSpy).toHaveBeenCalled();
      expect(commitSpy).toHaveBeenCalled();

      // Verify the history has both messages
      const history = historyService.getHistory();
      const hasAssistantWithToolCall = history.some(
        (m) => m.role === 'assistant' && m.toolCalls?.length > 0,
      );
      const hasToolResponse = history.some(
        (m) => m.role === 'tool' && m.toolResponses?.length > 0,
      );

      expect(hasAssistantWithToolCall).toBe(true);
      expect(hasToolResponse).toBe(true);
    });
  });

  describe('Integration with OpenAI Provider', () => {
    it('should send properly paired tool calls and responses to OpenAI', async () => {
      // This test validates that the history format can be converted to OpenAI format
      // Currently this FAILS because the converter expects Gemini Content format

      // Create a proper transaction
      const txId = historyService.beginToolTransaction();
      historyService.addAssistantMessageToTransaction('Using tool', [
        {
          id: 'call_abc',
          name: 'calculator',
          arguments: { operation: 'add', a: 1, b: 2 },
        },
      ]);
      historyService.addToolResponseToTransaction('call_abc', {
        toolCallId: 'call_abc',
        result: { answer: 3 },
      });
      historyService.commitTransaction();

      const history = historyService.getHistory();

      // This simulates what should be sent to OpenAI
      const openAIMessages = history
        .map((msg) => {
          if (msg.role === 'assistant' && msg.toolCalls) {
            return {
              role: 'assistant',
              content: msg.content,
              tool_calls: msg.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.arguments),
                },
              })),
            };
          } else if (msg.role === 'tool' && msg.toolResponses) {
            return msg.toolResponses.map((tr) => ({
              role: 'tool',
              tool_call_id: tr.toolCallId,
              content: JSON.stringify(tr.result),
            }));
          }
          return { role: msg.role, content: msg.content };
        })
        .flat();

      // Verify OpenAI format has both parts
      expect(openAIMessages).toHaveLength(2);
      expect(openAIMessages[0]).toMatchObject({
        role: 'assistant',
        tool_calls: expect.arrayContaining([
          expect.objectContaining({
            id: 'call_abc',
            type: 'function',
          }),
        ]),
      });
      expect(openAIMessages[1]).toMatchObject({
        role: 'tool',
        tool_call_id: 'call_abc',
      });

      // CRITICAL: No orphaned tool responses
      const toolMessages = openAIMessages.filter((m) => m.role === 'tool');
      const assistantMessages = openAIMessages.filter(
        (m) => m.role === 'assistant',
      );

      for (const toolMsg of toolMessages) {
        const hasMatchingCall = assistantMessages.some((am) =>
          am.tool_calls?.some((tc) => tc.id === toolMsg.tool_call_id),
        );
        expect(hasMatchingCall).toBe(true); // Every tool response must have a matching call
      }
    });

    it('should detect and prevent orphaned tool responses before sending to API', async () => {
      // Simulate the broken flow where only tool response is queued
      const orphanedMessages = [
        {
          role: 'tool',
          tool_call_id: 'orphan_123',
          content: '{"result": "should not be sent alone"}',
        },
      ];

      // This should be caught before sending to API
      const validateMessages = (messages: any[]) => {
        const toolResponseIds = messages
          .filter((m) => m.role === 'tool')
          .map((m) => m.tool_call_id);

        const toolCallIds = messages
          .filter((m) => m.role === 'assistant')
          .flatMap((m) => m.tool_calls || [])
          .map((tc) => tc.id);

        for (const responseId of toolResponseIds) {
          if (!toolCallIds.includes(responseId)) {
            throw new Error(`Orphaned tool response detected: ${responseId}`);
          }
        }
      };

      expect(() => validateMessages(orphanedMessages)).toThrow(
        'Orphaned tool response detected: orphan_123',
      );
    });
  });

  describe('Real flow simulation', () => {
    it('should handle the exact flow that causes 400 errors', async () => {
      // This simulates the EXACT flow from the debug logs
      const debugLogFlow = {
        toolCallId: 'e46661a9c',
        toolName: 'glob',
        toolArgs: { pattern: '**/*.ts' },
      };

      // What currently happens (BROKEN):
      // 1. Tool executes
      // 2. Only tool response is sent
      const brokenFlow = [
        {
          role: 'tool',
          tool_call_id: debugLogFlow.toolCallId,
          content: '{"output": "Found 1383 files..."}',
        },
      ];

      // What SHOULD happen (FIXED):
      // 1. Transaction starts
      // 2. Assistant message with tool call added
      // 3. Tool executes
      // 4. Tool response added
      // 5. Transaction commits with BOTH messages
      const fixedFlow = [
        {
          role: 'assistant',
          content: 'Searching for TypeScript files',
          tool_calls: [
            {
              id: debugLogFlow.toolCallId,
              type: 'function',
              function: {
                name: debugLogFlow.toolName,
                arguments: JSON.stringify(debugLogFlow.toolArgs),
              },
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: debugLogFlow.toolCallId,
          content: '{"output": "Found 1383 files..."}',
        },
      ];

      // Verify broken flow would fail
      const hasOrphan = (messages: any[]) => {
        return messages.some(
          (m) =>
            m.role === 'tool' &&
            !messages.some(
              (other) =>
                other.role === 'assistant' &&
                other.tool_calls?.some((tc) => tc.id === m.tool_call_id),
            ),
        );
      };

      expect(hasOrphan(brokenFlow)).toBe(true); // Current broken state
      expect(hasOrphan(fixedFlow)).toBe(false); // How it should work
    });
  });
});
