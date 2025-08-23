import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CerebrasProvider } from './CerebrasProvider.js';
import { IMessage } from '../IMessage.js';
import { ITool } from '../ITool.js';
import { ContentGeneratorRole } from '../ContentGeneratorRole.js';

vi.mock('../../settings/settingsServiceInstance.js', () => ({
  getSettingsService: vi.fn(() => ({
    getProviderSettings: vi.fn(() => ({})),
    setProviderSetting: vi.fn(),
  })),
}));

vi.mock('../../debug/index.js', () => ({
  DebugLogger: vi.fn().mockImplementation(() => ({
    debug: vi.fn(),
  })),
}));

describe('CerebrasProvider', () => {
  let provider: CerebrasProvider;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    provider = new CerebrasProvider(mockApiKey);
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(provider.name).toBe('cerebras');
      expect(provider.toolFormat).toBe('openai');
      expect(provider.getCurrentModel()).toBe('qwen-3-coder-480b');
    });

    it('should initialize with custom base URL', () => {
      const customBaseUrl = 'https://custom.api.com';
      const customProvider = new CerebrasProvider(mockApiKey, customBaseUrl);
      expect(customProvider).toBeDefined();
    });

    it('should initialize without API key', () => {
      const providerWithoutKey = new CerebrasProvider();
      expect(providerWithoutKey).toBeDefined();
    });
  });

  describe('supportsOAuth', () => {
    it('should return false as Cerebras does not support OAuth', () => {
      expect(provider['supportsOAuth']()).toBe(false);
    });
  });

  describe('getModels', () => {
    it('should return list of available models when authenticated', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(mockApiKey);

      const models = await provider.getModels();

      expect(models).toHaveLength(1);
      expect(models[0]).toEqual({
        id: 'qwen-3-coder-480b',
        name: 'Qwen 3 Coder 480B',
        provider: 'cerebras',
        supportedToolFormats: ['openai'],
        contextWindow: 131072,
        maxOutputTokens: 32768,
      });
    });

    it('should return empty array when not authenticated', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(null);

      const models = await provider.getModels();

      expect(models).toEqual([]);
    });
  });

  describe('generateChatCompletion', () => {
    it('should handle streaming response', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(mockApiKey);

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
            ),
          );
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"choices":[{"delta":{"content":" world"}}],"usage":{"prompt_tokens":10,"completion_tokens":2}}\n\n',
            ),
          );
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        body: mockStream,
      });

      const messages: IMessage[] = [
        { role: ContentGeneratorRole.USER, content: 'Hello' },
      ];

      const generator = provider.generateChatCompletion(messages);
      const results = [];
      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        role: 'assistant',
        content: 'Hello',
      });
      expect(results[1]).toEqual({
        role: 'assistant',
        content: ' world',
      });
      expect(results[2]).toHaveProperty('usage');
    });

    it('should handle non-streaming response', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(mockApiKey);

      provider['_config'] = {
        getEphemeralSettings: () => ({ streaming: 'disabled' }),
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Hello world',
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 2,
          },
        }),
      });

      const messages: IMessage[] = [
        { role: ContentGeneratorRole.USER, content: 'Hello' },
      ];

      const generator = provider.generateChatCompletion(messages);
      const results = [];
      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        role: ContentGeneratorRole.ASSISTANT,
        content: 'Hello world',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 2,
          total_tokens: 12,
        },
      });
    });

    it('should handle tool calls in response', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(mockApiKey);

      provider['_config'] = {
        getEphemeralSettings: () => ({ streaming: 'disabled' }),
      };

      const mockToolCall = {
        id: 'tool-1',
        function: {
          name: 'test_tool',
          arguments: '{"arg": "value"}',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
                tool_calls: [mockToolCall],
              },
            },
          ],
        }),
      });

      const messages: IMessage[] = [
        { role: ContentGeneratorRole.USER, content: 'Use a tool' },
      ];

      const tools: ITool[] = [
        {
          name: 'test_tool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              arg: { type: 'string' },
            },
          },
        },
      ];

      const generator = provider.generateChatCompletion(messages, tools);
      const results = [];
      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        role: ContentGeneratorRole.ASSISTANT,
        content: '',
        tool_calls: [
          {
            id: 'tool-1',
            type: 'function',
            function: {
              name: 'test_tool',
              arguments: '{"arg": "value"}',
            },
          },
        ],
      });
    });

    it('should throw error when not authenticated', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(null);

      const messages: IMessage[] = [
        { role: ContentGeneratorRole.USER, content: 'Hello' },
      ];

      const generator = provider.generateChatCompletion(messages);

      await expect(async () => {
        for await (const _chunk of generator) {
          // Should throw before yielding
        }
      }).rejects.toThrow('Authentication required for Cerebras API calls');
    });

    it('should handle API errors', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(mockApiKey);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const messages: IMessage[] = [
        { role: ContentGeneratorRole.USER, content: 'Hello' },
      ];

      const generator = provider.generateChatCompletion(messages);

      await expect(async () => {
        for await (const _chunk of generator) {
          // Should throw before yielding
        }
      }).rejects.toThrow('Cerebras authentication failed');
    });

    it('should handle rate limit errors', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(mockApiKey);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      const messages: IMessage[] = [
        { role: ContentGeneratorRole.USER, content: 'Hello' },
      ];

      const generator = provider.generateChatCompletion(messages);

      await expect(async () => {
        for await (const _chunk of generator) {
          // Should throw before yielding
        }
      }).rejects.toThrow('Cerebras rate limit exceeded');
    });

    it('should strip thinking tokens from assistant messages', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(mockApiKey);

      provider['_config'] = {
        getEphemeralSettings: () => ({ streaming: 'disabled' }),
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const messages: IMessage[] = [
        { role: ContentGeneratorRole.USER, content: 'Question' },
        {
          role: ContentGeneratorRole.ASSISTANT,
          content: '<think>Internal thoughts</think>Visible response',
        },
      ];

      await provider.generateChatCompletion(messages).next();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"content":"Visible response"'),
        }),
      );
    });

    it('should handle system messages', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(mockApiKey);

      provider['_config'] = {
        getEphemeralSettings: () => ({ streaming: 'disabled' }),
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const messages: IMessage[] = [
        { role: ContentGeneratorRole.SYSTEM, content: 'System prompt' },
        { role: ContentGeneratorRole.USER, content: 'User message' },
      ];

      await provider.generateChatCompletion(messages).next();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"role":"system"'),
        }),
      );
    });
  });

  describe('model management', () => {
    it('should set and get model', () => {
      provider.setModel('qwen-3-coder-480b');
      expect(provider.getCurrentModel()).toBe('qwen-3-coder-480b');
    });

    it('should return default model', () => {
      expect(provider.getDefaultModel()).toBe('qwen-3-coder-480b');
    });
  });

  describe('isPaidMode', () => {
    it('should return true for paid models', () => {
      provider.setModel('qwen-3-coder-480b');
      expect(provider.isPaidMode()).toBe(true);
    });

    it('should return false for free tier model', () => {
      provider.setModel('qwen-3-coder-480b');
      expect(provider.isPaidMode()).toBe(true);
    });
  });

  describe('model parameters', () => {
    it('should set and get model parameters', () => {
      const params = { temperature: 0.7, max_tokens: 1000 };
      provider.setModelParams(params);
      expect(provider.getModelParams()).toEqual(params);
    });

    it('should clear model parameters', () => {
      provider.setModelParams({ temperature: 0.7 });
      provider.setModelParams(undefined);
      expect(provider.getModelParams()).toBeUndefined();
    });

    it('should apply temperature clamping', async () => {
      vi.spyOn(provider, 'getAuthToken').mockResolvedValue(mockApiKey);

      provider.setModelParams({ temperature: 2.0 });
      provider['_config'] = {
        getEphemeralSettings: () => ({ streaming: 'disabled' }),
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const messages: IMessage[] = [
        { role: ContentGeneratorRole.USER, content: 'Test' },
      ];

      await provider.generateChatCompletion(messages).next();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"temperature":1.5'),
        }),
      );
    });
  });

  describe('getApiCost', () => {
    it('should calculate API cost based on usage', () => {
      provider['lastUsage'] = { inputTokens: 1000, outputTokens: 500 };
      provider.setModel('qwen-3-coder-480b');

      const cost = provider.getApiCost();
      expect(cost).toBeCloseTo(1.5); // (1000/1000 * 1.0) + (500/1000 * 1.0) = 1.0 + 0.5 = 1.5
    });

    it('should return cost for qwen model', () => {
      provider['lastUsage'] = { inputTokens: 1000, outputTokens: 500 };
      provider.setModel('qwen-3-coder-480b');

      const cost = provider.getApiCost();
      expect(cost).toBeCloseTo(1.5);
    });
  });

  describe('server tools', () => {
    it('should return empty array for server tools', () => {
      expect(provider.getServerTools()).toEqual([]);
    });

    it('should throw error when invoking server tool', async () => {
      await expect(provider.invokeServerTool('test', {})).rejects.toThrow(
        'Server tools not supported by Cerebras provider',
      );
    });
  });

  describe('setApiKey', () => {
    it('should update API key', async () => {
      const newApiKey = 'new-api-key';
      provider.setApiKey(newApiKey);
      // API key is stored in base class, test it via getAuthToken
      const authToken = await provider['getAuthToken']();
      expect(authToken).toBe(newApiKey);
    });
  });

  describe('setBaseUrl', () => {
    it('should update base URL', () => {
      const newBaseUrl = 'https://new.api.com';
      provider.setBaseUrl(newBaseUrl);
      expect(provider['baseURL']).toBe(newBaseUrl);
    });

    it('should reset to default when empty string provided', () => {
      provider.setBaseUrl('');
      expect(provider['baseURL']).toBe('https://api.cerebras.ai/v1');
    });
  });
});
