// MARKER: HS-041-TEST-PARAMS - Tests use Content[] parameters
// MARKER: HS-041-TEST-CLEAN - Tests verify clean provider separation
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AnthropicProvider } from './AnthropicProvider.js';
import { ITool } from '../ITool.js';
import { Content } from '@google/genai';
import { TEST_PROVIDER_CONFIG } from '../test-utils/providerTestConfig.js';

// Mock the ToolFormatter
vi.mock('../../tools/ToolFormatter.js', () => ({
  ToolFormatter: vi.fn().mockImplementation(() => ({
    toProviderFormat: vi.fn((tools: ITool[], format: string) => {
      if (format === 'anthropic') {
        return tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description || '',
          input_schema: {
            type: 'object',
            ...tool.function.parameters,
          },
        }));
      }
      return tools;
    }),
    fromProviderFormat: vi.fn((rawToolCall: unknown, format: string) => {
      if (format === 'anthropic') {
        const toolCall = rawToolCall as {
          id: string;
          name: string;
          input?: unknown;
        };
        return [
          {
            id: toolCall.id,
            type: 'function',
            function: {
              name: toolCall.name,
              arguments: toolCall.input ? JSON.stringify(toolCall.input) : '',
            },
          },
        ];
      }
      return [rawToolCall];
    }),
  })),
}));

// Mock the retry utility
vi.mock('../../utils/retry.js', () => ({
  retryWithBackoff: vi.fn(async (fn, options) => {
    let lastError;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        attempts++;
        if (
          attempts < maxAttempts &&
          options?.shouldRetry &&
          options.shouldRetry(error)
        ) {
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }),
}));

// Create a shared mock instance for messages.create
const mockMessagesCreate = vi.fn();

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockMessagesCreate,
    },
    beta: {
      models: {
        list: vi.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            const models = [
              { id: 'claude-opus-4-20250514', display_name: 'Claude 4 Opus' },
              {
                id: 'claude-sonnet-4-20250514',
                display_name: 'Claude 4 Sonnet',
              },
              {
                id: 'claude-3-7-opus-20250115',
                display_name: 'Claude 3.7 Opus',
              },
              {
                id: 'claude-3-7-sonnet-20250115',
                display_name: 'Claude 3.7 Sonnet',
              },
              {
                id: 'claude-3-5-sonnet-20241022',
                display_name: 'Claude 3.5 Sonnet',
              },
              {
                id: 'claude-3-5-haiku-20241022',
                display_name: 'Claude 3.5 Haiku',
              },
              { id: 'claude-3-opus-20240229', display_name: 'Claude 3 Opus' },
              {
                id: 'claude-3-sonnet-20240229',
                display_name: 'Claude 3 Sonnet',
              },
              { id: 'claude-3-haiku-20240307', display_name: 'Claude 3 Haiku' },
            ];
            for (const model of models) {
              yield model;
            }
          },
        }),
      },
    },
  })),
}));

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAnthropicInstance: any;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create provider with test API key
    provider = new AnthropicProvider(
      'test-api-key',
      undefined,
      TEST_PROVIDER_CONFIG,
    );

    // Use the shared mock instance
    mockAnthropicInstance = {
      messages: {
        create: mockMessagesCreate,
      },
    };
  });

  describe('getModels', () => {
    it('should return a list of Anthropic models including latest aliases', async () => {
      const models = await provider.getModels();

      expect(models).toHaveLength(11); // 2 latest aliases + 9 specific versions

      // Check for latest aliases
      expect(models.some((m) => m.id === 'claude-opus-4-latest')).toBe(true);
      expect(models.some((m) => m.id === 'claude-sonnet-4-latest')).toBe(true);

      // Check for Claude 4 models
      expect(models.some((m) => m.id === 'claude-opus-4-20250514')).toBe(true);
      expect(models.some((m) => m.id === 'claude-sonnet-4-20250514')).toBe(
        true,
      );

      // Check for Claude 3.7 models
      expect(models.some((m) => m.id === 'claude-3-7-opus-20250115')).toBe(
        true,
      );
      expect(models.some((m) => m.id === 'claude-3-7-sonnet-20250115')).toBe(
        true,
      );

      // Check that all models have correct provider
      models.forEach((model) => {
        expect(model.provider).toBe('anthropic');
        expect(model.supportedToolFormats).toContain('anthropic');
      });
    });

    it('should return models with correct structure', async () => {
      const models = await provider.getModels();

      models.forEach((model) => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('supportedToolFormats');
        expect(model.provider).toBe('anthropic');
        expect(model.supportedToolFormats).toContain('anthropic');
      });
    });
  });

  describe('generateChatCompletion', () => {
    it('should stream content from Anthropic API', async () => {
      // Mock streaming response
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello' },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: ' world' },
          };
        },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockStream);

      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Say hello' }] },
      ];
      const generator = provider.generateChatCompletion(contents);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { role: 'model', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: ' world' }] },
        // Final complete response is not yielded when text was streamed (to avoid duplicates)
      ]);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'Say hello' }],
        max_tokens: 64000,
        stream: true,
      });
    });

    it('should handle tool calls in the stream', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_start',
            content_block: {
              type: 'tool_use',
              id: 'tool-123',
              name: 'get_weather',
            },
          };
          yield {
            type: 'content_block_delta',
            delta: {
              type: 'input_json_delta',
              partial_json: '{"location":"San Francisco"}',
            },
          };
          yield { type: 'content_block_stop' };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Result' },
          };
        },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockStream);

      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'What is the weather?' }] },
      ];
      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'get_weather',
            description: 'Get the weather',
            parameters: { type: 'object', properties: {} },
          },
        },
      ];

      const generator = provider.generateChatCompletion(contents, tools);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { role: 'model', parts: [{ text: 'Result' }] },
        {
          role: 'model',
          parts: [
            {
              functionCall: {
                name: 'get_weather',
                args: { location: 'San Francisco' },
                id: 'tool-123',
              },
            },
            { text: 'Result' },
          ],
        },
      ]);

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'What is the weather?' }],
        max_tokens: 64000,
        stream: true,
        tools: [
          {
            name: 'get_weather',
            description: 'Get the weather',
            input_schema: { type: 'object', properties: {} },
          },
        ],
      });
    });

    it('should handle API errors', async () => {
      mockAnthropicInstance.messages.create.mockRejectedValue(
        new Error('API Error'),
      );

      const contents: Content[] = [{ role: 'user', parts: [{ text: 'test' }] }];
      const generator = provider.generateChatCompletion(contents);

      await expect(generator.next()).rejects.toThrow(
        'Anthropic API error: API Error',
      );
    });

    it('should handle usage tracking', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'message_start',
            message: {
              usage: { input_tokens: 10, output_tokens: 0 },
            },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello' },
          };
          yield {
            type: 'message_delta',
            usage: { input_tokens: 10, output_tokens: 5 },
          };
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: ' world' },
          };
          yield {
            type: 'message_stop',
          };
        },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockStream);

      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Say hello' }] },
      ];
      const generator = provider.generateChatCompletion(contents);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Since AnthropicProvider now returns Content[], we expect the usage tracking
      // to be handled differently. The provider should yield content chunks.
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('role');
      expect(chunks[0]).toHaveProperty('parts');
      // Usage information would be handled at a higher level, not in individual chunks
    });

    it('should ignore unknown chunk types', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello' },
          };
          yield { type: 'content_block_stop' }; // Should be ignored
          yield { type: 'message_delta' }; // Should be ignored without usage
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: ' world' },
          };
        },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockStream);

      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Say hello' }] },
      ];
      const generator = provider.generateChatCompletion(contents);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Check that we received content chunks in the new format
      expect(chunks.length).toBeGreaterThan(0);
      const textChunks = chunks.filter(
        (c) => c.parts && c.parts.some((p) => p.text),
      );
      expect(textChunks.length).toBeGreaterThan(0);
      // Should receive the text content in Content format
    });

    it('should use ToolFormatter for tool conversion', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Done' },
          };
        },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockStream);

      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'test_tool',
            description: 'A test tool',
            parameters: {
              type: 'object',
              properties: { foo: { type: 'string' } },
            },
          },
        },
      ];

      const contents: Content[] = [{ role: 'user', parts: [{ text: 'test' }] }];
      const generator = provider.generateChatCompletion(contents, tools);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Verify ToolFormatter was used
      const ToolFormatterMock = vi.mocked(
        (await import('../../tools/ToolFormatter.js')).ToolFormatter,
      );
      const toolFormatterInstance = ToolFormatterMock.mock.results[0].value;

      expect(toolFormatterInstance.toProviderFormat).toHaveBeenCalledWith(
        tools,
        'anthropic',
      );
    });

    it('should retry on rate limit errors', { timeout: 10000 }, async () => {
      // First call fails with overloaded error
      mockAnthropicInstance.messages.create
        .mockRejectedValueOnce(
          new Error(
            'Anthropic API error: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}',
          ),
        )
        .mockResolvedValueOnce({
          async *[Symbol.asyncIterator]() {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Success' },
            };
          },
        });

      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Test retry' }] },
      ];
      const generator = provider.generateChatCompletion(contents);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { role: 'model', parts: [{ text: 'Success' }] },
        // Final complete response is not yielded when text was streamed (to avoid duplicates)
      ]);

      // Should have been called twice (first failed, second succeeded)
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      mockAnthropicInstance.messages.create.mockRejectedValue(
        new Error('Invalid API key'),
      );

      const contents: Content[] = [{ role: 'user', parts: [{ text: 'Test' }] }];
      const generator = provider.generateChatCompletion(contents);

      await expect(generator.next()).rejects.toThrow(
        'Anthropic API error: Invalid API key',
      );

      // Should have only been called once (no retry)
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', { timeout: 10000 }, async () => {
      // First call fails, second succeeds
      mockAnthropicInstance.messages.create
        .mockRejectedValueOnce(
          new Error(
            'Anthropic API error: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}',
          ),
        )
        .mockResolvedValueOnce({
          async *[Symbol.asyncIterator]() {
            yield {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Fixed and working' },
            };
          },
        });

      const contents: Content[] = [{ role: 'user', parts: [{ text: 'Test' }] }];

      const generator = provider.generateChatCompletion(contents);

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { role: 'model', parts: [{ text: 'Fixed and working' }] },
        // Final complete response is not yielded when text was streamed (to avoid duplicates)
      ]);

      // Should have been called twice (first failed, second succeeded)
      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledTimes(2);
    });
  });
});
