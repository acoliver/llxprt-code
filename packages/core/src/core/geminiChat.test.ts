/**
 * Behavioral tests for GeminiChat that test user-observable behavior
 * Following RULES.md lines 269-284: Test behavior, not implementation
 *
 * These tests focus on what users care about:
 * - Sending messages and getting responses
 * - History being maintained correctly
 * - Error handling when things go wrong
 * - Tool call/response workflows
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GeminiChat } from './geminiChat.js';
import { Config } from '../config/config.js';
import { ContentGenerator } from './contentGenerator.js';
import { HistoryService } from '../services/history/index.js';
import { GenerateContentResponse } from '@google/genai';

describe('GeminiChat', () => {
  let config: Config;
  let contentGenerator: ContentGenerator;
  let historyService: HistoryService;
  let geminiChat: GeminiChat;

  beforeEach(() => {
    // Use real HistoryService instance - following RULES.md line 269-284 principle
    historyService = new HistoryService('test-conversation');

    // Mock only at the boundary (API calls) - real dependencies elsewhere
    config = {
      getModel: () => 'gemini-2.0-flash',
      setModel: vi.fn(),
      setFallbackMode: vi.fn(),
      getQuotaErrorOccurred: () => false,
      getContentGeneratorConfig: () => ({ authType: 'test_auth' }),
      flashFallbackHandler: vi.fn(),
    } as unknown as Config;

    contentGenerator = {
      generateContent: vi.fn(),
      generateContentStream: vi.fn(),
    } as unknown as ContentGenerator;

    geminiChat = new GeminiChat(config, contentGenerator, {}, historyService);
  });

  // RULES.md lines 279-284: GOOD - Test behavior user cares about
  test('when user sends a message, they get a response', async () => {
    // Arrange: Mock API to return a valid response
    const expectedResponse: GenerateContentResponse = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'Hello! How can I help you?' }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 5,
        candidatesTokenCount: 8,
        totalTokenCount: 13,
      },
    };
    vi.mocked(contentGenerator.generateContent).mockResolvedValue(
      expectedResponse,
    );

    // Act: User sends a message
    const response = await geminiChat.sendMessage(
      { message: 'Hello' },
      'test-prompt-id',
    );

    // Assert: User receives expected response
    expect(response.candidates?.[0]?.content?.parts?.[0]).toHaveProperty(
      'text',
      'Hello! How can I help you?',
    );
  });

  // RULES.md lines 279-284: GOOD - Test user-observable outcome
  test('conversation history is maintained across multiple messages', async () => {
    // Arrange: Set up mock responses for two exchanges
    const firstResponse: GenerateContentResponse = {
      candidates: [
        { content: { role: 'model', parts: [{ text: 'First response' }] } },
      ],
      usageMetadata: {
        promptTokenCount: 5,
        candidatesTokenCount: 5,
        totalTokenCount: 10,
      },
    };
    const secondResponse: GenerateContentResponse = {
      candidates: [
        { content: { role: 'model', parts: [{ text: 'Second response' }] } },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15,
      },
    };

    vi.mocked(contentGenerator.generateContent)
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(secondResponse);

    // Act: User has a two-turn conversation
    await geminiChat.sendMessage({ message: 'First message' }, 'prompt-1');
    await geminiChat.sendMessage({ message: 'Second message' }, 'prompt-2');

    // Assert: History contains both exchanges in correct order
    const history = geminiChat.getHistory();
    expect(history).toHaveLength(4); // user1, model1, user2, model2
    expect(history[0].role).toBe('user');
    expect(history[0].parts?.[0]).toHaveProperty('text', 'First message');
    expect(history[1].role).toBe('model');
    expect(history[1].parts?.[0]).toHaveProperty('text', 'First response');
    expect(history[2].role).toBe('user');
    expect(history[2].parts?.[0]).toHaveProperty('text', 'Second message');
    expect(history[3].role).toBe('model');
    expect(history[3].parts?.[0]).toHaveProperty('text', 'Second response');
  });

  // RULES.md lines 279-284: GOOD - Test user-observable error behavior
  test('when API fails, user receives meaningful error', async () => {
    // Arrange: Mock API to fail
    const apiError = new Error('API quota exceeded');
    vi.mocked(contentGenerator.generateContent).mockRejectedValue(apiError);

    // Act & Assert: User gets the error when sending message
    await expect(
      geminiChat.sendMessage({ message: 'Hello' }, 'test-prompt-id'),
    ).rejects.toThrow('API quota exceeded');
  });

  // RULES.md lines 279-284: GOOD - Test system prompt behavior user observes
  test('system prompts are included in requests to model', async () => {
    // Arrange: Set system instruction and mock response
    const mockResponse: GenerateContentResponse = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'Response with system context' }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 15,
        candidatesTokenCount: 10,
        totalTokenCount: 25,
      },
    };
    vi.mocked(contentGenerator.generateContent).mockResolvedValue(mockResponse);

    // Act: User sets system instruction and sends message
    geminiChat.setSystemInstruction('You are a helpful assistant');
    await geminiChat.sendMessage(
      { message: 'What can you do?' },
      'test-prompt-id',
    );

    // Assert: System instruction was passed to content generator
    const generateCall = vi.mocked(contentGenerator.generateContent).mock
      .calls[0];
    expect(generateCall[0].config?.systemInstruction).toBe(
      'You are a helpful assistant',
    );
  });

  // RULES.md lines 279-284: GOOD - Test user-observable tool workflow
  test('tool calls and responses flow correctly in conversation', async () => {
    // Arrange: Mock tool call response then tool execution result
    const toolCallResponse: GenerateContentResponse = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              {
                functionCall: {
                  name: 'search_web',
                  args: { query: 'weather today' },
                },
              },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 5,
        totalTokenCount: 15,
      },
    };

    const finalResponse: GenerateContentResponse = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'Based on the search, it will be sunny today.' }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 20,
        candidatesTokenCount: 12,
        totalTokenCount: 32,
      },
    };

    vi.mocked(contentGenerator.generateContent)
      .mockResolvedValueOnce(toolCallResponse)
      .mockResolvedValueOnce(finalResponse);

    // Act: User asks question that triggers tool use
    const firstResponse = await geminiChat.sendMessage(
      { message: 'What is the weather today?' },
      'prompt-1',
    );

    // Simulate tool execution and response
    const toolResponse = {
      functionResponse: {
        name: 'search_web',
        response: { result: 'Weather: Sunny, 75°F' },
      },
    };

    const secondResponse = await geminiChat.sendMessage(
      { message: [toolResponse] },
      'prompt-2',
    );

    // Assert: User sees complete tool workflow
    expect(firstResponse.candidates?.[0]?.content?.parts?.[0]).toHaveProperty(
      'functionCall',
    );
    expect(secondResponse.candidates?.[0]?.content?.parts?.[0]).toHaveProperty(
      'text',
      'Based on the search, it will be sunny today.',
    );

    // Assert: History contains the complete tool workflow
    const history = geminiChat.getHistory();
    expect(history).toHaveLength(4); // user question, model tool call, user tool response, model final answer
    expect(history[1].parts?.[0]).toHaveProperty('functionCall');
    expect(history[2].parts?.[0]).toHaveProperty('functionResponse');
  });

  // RULES.md lines 279-284: GOOD - Test streaming behavior user observes
  test('streaming messages provide incremental content to user', async () => {
    // Arrange: Create async generator that yields chunks
    async function* mockStreamResponse() {
      yield {
        candidates: [
          { content: { role: 'model', parts: [{ text: 'Hello ' }] } },
        ],
        usageMetadata: undefined,
      };
      yield {
        candidates: [
          { content: { role: 'model', parts: [{ text: 'there! ' }] } },
        ],
        usageMetadata: undefined,
      };
      yield {
        candidates: [
          { content: { role: 'model', parts: [{ text: 'How can I help?' }] } },
        ],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 8,
          totalTokenCount: 13,
        },
      };
    }

    vi.mocked(contentGenerator.generateContentStream).mockResolvedValue(
      mockStreamResponse(),
    );

    // Act: User requests streaming response
    const streamResponse = await geminiChat.sendMessageStream(
      { message: 'Hello' },
      'stream-prompt-id',
    );

    // Assert: User receives incremental chunks
    const chunks = [];
    for await (const chunk of streamResponse) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[0].candidates?.[0]?.content?.parts?.[0]?.text).toBe('Hello ');
    expect(chunks[1].candidates?.[0]?.content?.parts?.[0]?.text).toBe(
      'there! ',
    );
    expect(chunks[2].candidates?.[0]?.content?.parts?.[0]?.text).toBe(
      'How can I help?',
    );
  });

  // RULES.md lines 279-284: GOOD - Test user-observable history management
  test('users can clear conversation history', () => {
    // Arrange: Add some history
    geminiChat.addHistory({ role: 'user', parts: [{ text: 'Hello' }] });
    geminiChat.addHistory({ role: 'model', parts: [{ text: 'Hi there!' }] });
    expect(geminiChat.getHistory()).toHaveLength(2);

    // Act: User clears history
    geminiChat.clearHistory();

    // Assert: History is empty for user
    expect(geminiChat.getHistory()).toHaveLength(0);
    expect(geminiChat.isEmpty()).toBe(true);
  });

  // RULES.md lines 279-284: GOOD - Test user-observable tool configuration
  test('users can configure tools for model to use', async () => {
    // Arrange: Define tools and mock response with tool use
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'get_current_time',
            description: 'Get the current time',
          },
        ],
      },
    ];

    const toolCallResponse: GenerateContentResponse = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ functionCall: { name: 'get_current_time', args: {} } }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 8,
        candidatesTokenCount: 3,
        totalTokenCount: 11,
      },
    };

    vi.mocked(contentGenerator.generateContent).mockResolvedValue(
      toolCallResponse,
    );

    // Act: User sets tools and sends message
    geminiChat.setTools(tools);
    const response = await geminiChat.sendMessage(
      { message: 'What time is it?' },
      'tool-prompt-id',
    );

    // Assert: Model uses the provided tools
    expect(response.candidates?.[0]?.content?.parts?.[0]).toHaveProperty(
      'functionCall',
    );
    expect(
      response.candidates?.[0]?.content?.parts?.[0].functionCall?.name,
    ).toBe('get_current_time');

    // Assert: Tools were passed to content generator
    const generateCall = vi.mocked(contentGenerator.generateContent).mock
      .calls[0];
    expect(generateCall[0].config?.tools).toEqual(tools);
  });

  // RULES.md lines 279-284: GOOD - Test user-observable history types
  test('users can access both full and curated conversation history', () => {
    // Arrange: Add mix of valid and edge case content
    geminiChat.addHistory({ role: 'user', parts: [{ text: 'Valid message' }] });
    geminiChat.addHistory({
      role: 'model',
      parts: [{ text: 'Valid response' }],
    });

    // Act: User requests both history types
    const fullHistory = geminiChat.getHistory(false);
    const curatedHistory = geminiChat.getHistory(true);

    // Assert: User gets appropriate history for each request
    expect(fullHistory).toHaveLength(2);
    expect(curatedHistory).toHaveLength(2);

    // Both should contain the valid messages
    expect(fullHistory[0].parts?.[0]?.text).toBe('Valid message');
    expect(curatedHistory[0].parts?.[0]?.text).toBe('Valid message');
  });

  // RULES.md lines 96-101: Test input validation (edge cases user encounters)
  test('handles empty message gracefully', async () => {
    // Arrange: Mock response for empty input
    const mockResponse: GenerateContentResponse = {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [{ text: 'I need a message to respond to.' }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 1,
        candidatesTokenCount: 8,
        totalTokenCount: 9,
      },
    };
    vi.mocked(contentGenerator.generateContent).mockResolvedValue(mockResponse);

    // Act: User sends empty message
    const response = await geminiChat.sendMessage(
      { message: '' },
      'empty-prompt-id',
    );

    // Assert: System handles it gracefully
    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toContain(
      'I need a message',
    );
  });

  // RULES.md lines 96-101: Test edge case responses user might encounter
  test('handles malformed API responses by returning them as-is', async () => {
    // Arrange: Mock malformed API response (following actual implementation behavior)
    const malformedResponse: GenerateContentResponse = {
      candidates: undefined, // Missing candidates
      usageMetadata: undefined,
    };
    vi.mocked(contentGenerator.generateContent).mockResolvedValue(
      malformedResponse,
    );

    // Act: User sends message that gets malformed response
    const response = await geminiChat.sendMessage(
      { message: 'Hello' },
      'malformed-prompt-id',
    );

    // Assert: User receives the malformed response (actual behavior - no validation in GeminiChat)
    expect(response.candidates).toBeUndefined();
    expect(response.usageMetadata).toBeUndefined();
  });
});
