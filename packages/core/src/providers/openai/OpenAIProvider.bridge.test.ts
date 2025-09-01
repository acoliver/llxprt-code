/**
 * OpenAIProvider Bridge Test
 *
 * Tests that OpenAIProvider acts as a proper bridge:
 * - IN: Accepts HistoryService format
 * - OUT: Emits HistoryService-shaped updates
 * - Preserves tool call IDs throughout
 *
 * This test will FAIL initially because OpenAIProvider doesn't work this way yet.
 * That's the point - we're testing for the REAL issues.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIProvider } from './OpenAIProvider.js';
import type {
  HistoryMessage,
  ToolCall,
  ToolResponse,
} from '../../services/history/types.js';
import type { Content } from '@google/genai';

describe('OpenAIProvider - Chat Completions Bridge (REAL)', () => {
  let provider: OpenAIProvider;
  let mockOpenAIClient: any;
  let capturedRequest: any;

  beforeEach(() => {
    capturedRequest = null;

    // Mock ONLY the OpenAI client network calls
    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn(async (request) => {
            capturedRequest = request;
            // If streaming is requested, return an async iterable
            if (request.stream) {
              return {
                async *[Symbol.asyncIterator]() {
                  // Default streaming response
                  yield {
                    choices: [
                      {
                        delta: { content: 'default response' },
                        finish_reason: 'stop',
                      },
                    ],
                  };
                },
              };
            }
            // Default non-streaming response
            return {
              choices: [
                {
                  message: { role: 'assistant', content: 'default response' },
                  finish_reason: 'stop',
                },
              ],
            };
          }),
        },
      },
    };

    // Create REAL provider with mocked client
    // The provider SHOULD have a method that accepts HistoryMessage[]
    provider = new OpenAIProvider(
      'test-key', // apiKey
      undefined, // baseURL
      undefined, // config
      undefined, // oauthManager
    );
    // Override the internal client for testing
    (provider as any).openai = mockOpenAIClient;
  });

  describe('Conversion IN: HistoryService → OpenAI', () => {
    it('should accept HistoryService format and convert to OpenAI format', async () => {
      // What we WANT to send: HistoryService format
      const historyMessages: HistoryMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'List files in current directory',
          timestamp: Date.now(),
          conversationId: 'test-convo',
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: "I'll list the files for you",
          timestamp: Date.now(),
          conversationId: 'test-convo',
          toolCalls: [
            {
              id: 'call_abc123', // THIS ID MUST BE PRESERVED
              name: 'ls',
              arguments: { path: '.' },
            },
          ],
        },
        {
          id: 'msg3',
          role: 'tool',
          content: '', // Tool messages often have empty content
          timestamp: Date.now(),
          conversationId: 'test-convo',
          toolResponses: [
            {
              toolCallId: 'call_abc123', // MUST MATCH ABOVE
              result: 'file1.txt\nfile2.txt\nfile3.txt',
            },
          ],
        },
      ] as any;

      // The provider SHOULD have a method that accepts HistoryMessage[]
      // This will fail until we implement it
      const generator = provider.generateChatCompletionEx(historyMessages);
      await generator.next();

      // Verify what was sent to OpenAI has correct format
      expect(capturedRequest).toBeDefined();
      expect(capturedRequest.messages).toBeDefined();

      // Should have converted to OpenAI format
      expect(capturedRequest.messages).toEqual([
        {
          role: 'user',
          content: 'List files in current directory',
        },
        {
          role: 'assistant',
          content: "I'll list the files for you",
          tool_calls: [
            {
              id: 'call_abc123', // ID PRESERVED!
              type: 'function',
              function: {
                name: 'ls',
                arguments: '{"path":"."}', // Stringified
              },
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: 'call_abc123', // MATCHES tool_calls[].id
          content: 'file1.txt\nfile2.txt\nfile3.txt',
        },
      ]);
    });

    it('should handle multiple tool calls in one message', async () => {
      const historyMessages: HistoryMessage[] = [
        {
          id: 'msg1',
          role: 'assistant',
          content: "I'll check both things",
          timestamp: Date.now(),
          conversationId: 'test-convo',
          toolCalls: [
            { id: 'call_1', name: 'ls', arguments: { path: '.' } },
            { id: 'call_2', name: 'pwd', arguments: {} },
          ],
        },
        {
          id: 'msg2',
          role: 'tool',
          content: '',
          timestamp: Date.now(),
          conversationId: 'test-convo',
          toolResponses: [
            { toolCallId: 'call_1', result: 'files...' },
            { toolCallId: 'call_2', result: '/home/user' },
          ],
        },
      ] as any;

      const generator = provider.generateChatCompletionEx(historyMessages);
      await generator.next();

      const assistantMsg = capturedRequest.messages.find(
        (m) => m.role === 'assistant',
      );
      expect(assistantMsg.tool_calls).toHaveLength(2);
      expect(assistantMsg.tool_calls[0].id).toBe('call_1');
      expect(assistantMsg.tool_calls[1].id).toBe('call_2');

      // Tool responses should be separate messages
      const toolMessages = capturedRequest.messages.filter(
        (m) => m.role === 'tool',
      );
      expect(toolMessages).toHaveLength(2);
      expect(toolMessages[0].tool_call_id).toBe('call_1');
      expect(toolMessages[1].tool_call_id).toBe('call_2');
    });

    it('should reject messages with OpenAI-specific fields (catch bypass bugs)', async () => {
      const badMessages = [
        {
          role: 'assistant',
          content: 'test',
          // This is OpenAI format - should be rejected
          tool_calls: [
            {
              id: 'test',
              type: 'function',
              function: { name: 'test', arguments: '{}' },
            },
          ],
        },
      ];

      const generator = provider.generateChatCompletionEx(badMessages as any);

      // Should throw or emit error because we're bypassing the adapter
      await expect(generator.next()).rejects.toThrow(
        /Provider-specific field|Invalid format|tool_calls/i,
      );
    });
  });

  describe('Streaming OUT: OpenAI → HistoryMessage events', () => {
    it('should emit HistoryMessage events from streaming response', async () => {
      // Mock streaming response
      mockOpenAIClient.chat.completions.create.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          // Content chunks
          yield {
            choices: [
              {
                delta: { content: "I'll help " },
              },
            ],
          };
          yield {
            choices: [
              {
                delta: { content: 'you with that.' },
              },
            ],
          };
          // Tool call start
          yield {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_xyz789',
                      type: 'function',
                      function: { name: 'read_file' },
                    },
                  ],
                },
              },
            ],
          };
          // Tool call arguments in chunks
          yield {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      function: { arguments: '{"path":' },
                    },
                  ],
                },
              },
            ],
          };
          yield {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      function: { arguments: '"/test.txt"}' },
                    },
                  ],
                },
              },
            ],
          };
          // Finish
          yield {
            choices: [
              {
                finish_reason: 'tool_calls',
              },
            ],
          };
        },
      });

      const messages: HistoryMessage[] = [];
      for await (const message of provider.generateChatCompletionEx([])) {
        messages.push(message);
      }

      // We should get multiple messages: content chunks and final message with tool calls
      // Find the final message with tool calls
      const assistantWithToolCalls = messages.find(
        (m) => m.role === 'assistant' && m.toolCalls,
      );
      expect(assistantWithToolCalls).toBeDefined();
      expect(assistantWithToolCalls?.toolCalls).toBeDefined();
      expect(assistantWithToolCalls?.toolCalls?.[0]).toEqual({
        id: 'call_xyz789', // ID preserved
        name: 'read_file',
        arguments: { path: '/test.txt' }, // Parsed from JSON string
      });

      // Check that we got streaming content chunks
      const contentMessages = messages.filter(
        (m) => m.role === 'assistant' && m.content,
      );
      expect(contentMessages.length).toBeGreaterThan(0);
      // Accumulate all content
      const allContent = contentMessages.map((m) => m.content).join('');
      expect(allContent).toContain("I'll help you with that.");
    });

    it('should handle incomplete JSON in tool arguments gracefully', async () => {
      mockOpenAIClient.chat.completions.create.mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_bad',
                      type: 'function',
                      function: { name: 'broken' },
                    },
                  ],
                },
              },
            ],
          };
          // Incomplete JSON
          yield {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      function: { arguments: '{"incomplete":' },
                    },
                  ],
                },
              },
            ],
          };
          // Stream ends without completing JSON
          yield {
            choices: [
              {
                finish_reason: 'stop',
              },
            ],
          };
        },
      });

      const messages: HistoryMessage[] = [];
      let errorThrown = false;
      try {
        for await (const message of provider.generateChatCompletionEx([])) {
          messages.push(message);
        }
      } catch (error: any) {
        errorThrown = true;
        expect(error.message).toMatch(/Invalid JSON|Incomplete tool call/i);
      }

      // Should either throw error or not emit assistant message with broken tool calls
      if (!errorThrown) {
        const assistantWithBrokenTools = messages.find(
          (m) =>
            m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0,
        );
        expect(assistantWithBrokenTools).toBeUndefined();
      }
    });
  });

  describe('Non-streaming OUT', () => {
    it('should emit HistoryMessage events from complete response', async () => {
      // Configure provider for non-streaming mode
      (provider as any).providerConfig = {
        getEphemeralSettings: () => ({ streaming: 'disabled' }),
      };

      mockOpenAIClient.chat.completions.create.mockImplementation(
        async (request) => {
          capturedRequest = request;
          // Check if streaming is requested (should be false due to config)
          if (request.stream) {
            return {
              async *[Symbol.asyncIterator]() {
                yield {
                  choices: [
                    {
                      delta: { content: 'unexpected streaming response' },
                      finish_reason: 'stop',
                    },
                  ],
                };
              },
            };
          }
          // Non-streaming response format
          return {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Here are the results',
                  tool_calls: [
                    {
                      id: 'call_complete',
                      type: 'function',
                      function: {
                        name: 'search',
                        arguments: '{"query":"test results"}',
                      },
                    },
                  ],
                },
                finish_reason: 'tool_calls',
              },
            ],
            usage: {
              prompt_tokens: 50,
              completion_tokens: 30,
              total_tokens: 80,
            },
          };
        },
      );

      const messages: HistoryMessage[] = [];
      for await (const message of provider.generateChatCompletionEx([])) {
        messages.push(message);
      }

      // Should emit assistant message with all the data
      expect(messages).toHaveLength(1);
      const assistantMsg = messages[0];
      expect(assistantMsg.role).toBe('assistant');
      expect(assistantMsg.content).toBe('Here are the results');
      expect(assistantMsg.toolCalls).toEqual([
        {
          id: 'call_complete',
          name: 'search',
          arguments: { query: 'test results' }, // Parsed
        },
      ]);
      // Usage could be in metadata
      expect(assistantMsg.metadata?.usage).toEqual({
        prompt_tokens: 50,
        completion_tokens: 30,
      });
    });
  });

  describe('End-to-end ID preservation (CRITICAL)', () => {
    it('should preserve tool call IDs through the full cycle', async () => {
      const historyWithToolCalls: HistoryMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Previous request',
          timestamp: Date.now(),
          conversationId: 'test-convo',
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: 'Using tool',
          timestamp: Date.now(),
          conversationId: 'test-convo',
          toolCalls: [
            {
              id: 'PRESERVE_THIS_ID_123', // This EXACT ID must appear in OpenAI request
              name: 'important_tool',
              arguments: { critical: true },
            },
          ],
        },
        {
          id: 'msg3',
          role: 'tool',
          content: '',
          timestamp: Date.now(),
          conversationId: 'test-convo',
          toolResponses: [
            {
              toolCallId: 'PRESERVE_THIS_ID_123', // Must match
              result: { success: true, data: 'important' },
            },
          ],
        },
      ] as any;

      // Mock response that includes a NEW tool call
      mockOpenAIClient.chat.completions.create.mockImplementation(
        async (request) => {
          capturedRequest = request;
          // Return streaming response (since streaming is enabled by default)
          return {
            async *[Symbol.asyncIterator]() {
              yield {
                choices: [
                  {
                    delta: {
                      tool_calls: [
                        {
                          index: 0,
                          id: 'NEW_CALL_456', // New ID from OpenAI
                          type: 'function',
                          function: {
                            name: 'another_tool',
                            arguments: '{"test":true}',
                          },
                        },
                      ],
                    },
                  },
                ],
              };
              yield { choices: [{ finish_reason: 'tool_calls' }] };
            },
          };
        },
      );

      await provider.generateChatCompletionEx(historyWithToolCalls).next();

      // 1. Check request has preserved IDs
      const assistantMsg = capturedRequest.messages.find(
        (m) => m.role === 'assistant',
      );
      expect(assistantMsg.tool_calls[0].id).toBe('PRESERVE_THIS_ID_123');

      const toolMsg = capturedRequest.messages.find((m) => m.role === 'tool');
      expect(toolMsg.tool_call_id).toBe('PRESERVE_THIS_ID_123');

      // 2. Collect emitted messages
      const messages: HistoryMessage[] = [];
      for await (const message of provider.generateChatCompletionEx(
        historyWithToolCalls,
      )) {
        messages.push(message);
      }

      // 3. New tool call should have OpenAI's ID preserved
      const newAssistantMsg = messages.find(
        (m) => m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0,
      );
      expect(newAssistantMsg?.toolCalls?.[0].id).toBe('NEW_CALL_456');
    });
  });
});
