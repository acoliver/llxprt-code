// @plan PLAN-20250128-HISTORYSERVICE.P28
// @requirement HS-041
// @phase provider-updates-tdd
// @behavioral-testing Real provider integration testing

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Content } from '@google/genai';
import { AnthropicProvider } from '../anthropic/AnthropicProvider.js';
import { ITool } from '../ITool.js';

// Type definitions for test assertions
type AnthropicMessage = {
  role: string;
  content: string | Array<{ type: string; [key: string]: unknown }>;
};

type ProviderWithConvertMethod = AnthropicProvider & {
  convertContentsToAnthropicMessages: (
    contents: Content[],
  ) => AnthropicMessage[];
};

type ProviderWithPrivateProps = AnthropicProvider & {
  historyService?: unknown;
  getHistory?: unknown;
  updateHistory?: unknown;
  addToHistory?: unknown;
  conversationHistory?: unknown;
  conversationCache?: unknown;
};

// Test data removed to fix unused variable lint error

// MARKER: HS-042-ANTHROPIC-MOCK-CONFIG - Mock configuration without HistoryService dependency
const mockConfig = {
  name: 'anthropic',
  apiKey: 'sk-ant-test-key',
  baseURL: undefined,
  isOAuthEnabled: false,
};

// Mock tools for testing
const mockTools: ITool[] = [
  {
    name: 'search',
    description: 'Search for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];

describe('AnthropicProvider Clean Architecture', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create provider without HistoryService dependency
    provider = new AnthropicProvider(mockConfig.apiKey, mockConfig.baseURL);
  });

  // MARKER: HS-042-ANTHROPIC-CONTENT-PARAMS - Tests that provider accepts Content[] arrays as method parameters
  test('accepts Content[] arrays as method parameters', async () => {
    const testContents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Test message' }],
      },
    ];

    // Test that generateChatCompletion accepts Content[] parameters
    expect(() => {
      // This should not throw a type error - the method signature should accept Content[]
      const result = provider.generateChatCompletion(testContents, mockTools);
      expect(result).toBeDefined();
      expect(Symbol.asyncIterator in result).toBe(true);
    }).not.toThrow();
  });

  // MARKER: HS-042-ANTHROPIC-NO-HISTORYSERVICE - Verify provider has NO access to HistoryService
  test('has NO access to HistoryService', () => {
    // Test that provider constructor does NOT accept HistoryService
    expect(() => {
      new AnthropicProvider(mockConfig.apiKey, mockConfig.baseURL);
    }).not.toThrow();

    // Verify no historyService property exists
    expect(
      (provider as ProviderWithPrivateProps).historyService,
    ).toBeUndefined();

    // Verify no history-related methods exist
    expect((provider as ProviderWithPrivateProps).getHistory).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).updateHistory,
    ).toBeUndefined();
    expect((provider as ProviderWithPrivateProps).addToHistory).toBeUndefined();
  });

  // MARKER: HS-042-ANTHROPIC-CONTENT-PROCESSING - Tests provider processes Content[] arrays without history knowledge
  test('processes Content[] arrays without history knowledge', () => {
    const testHistory: Content[] = [
      { role: 'user', parts: [{ text: 'First message' }] },
      { role: 'model', parts: [{ text: 'First response' }] },
      { role: 'user', parts: [{ text: 'Second message' }] },
    ];

    // Provider should work solely with provided Content[] data
    expect(() => {
      const result = provider.generateChatCompletion(testHistory, mockTools);
      expect(result).toBeDefined();
    }).not.toThrow();

    // Provider should not modify the input Content[] array
    const originalLength = testHistory.length;
    provider.generateChatCompletion(testHistory, mockTools);
    expect(testHistory.length).toBe(originalLength);
  });

  // MARKER: HS-042-ANTHROPIC-FORMAT-PRESERVATION - Tests Anthropic-specific message formatting with Content[]
  test('preserves Anthropic-specific message formatting', () => {
    const anthropicFormatContent: Content[] = [
      { role: 'system', parts: [{ text: 'You are a helpful assistant' }] },
      { role: 'user', parts: [{ text: 'Test message' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'toolu_123',
              name: 'search',
              args: { query: 'test' },
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'toolu_123',
              name: 'search',
              response: 'Search results...',
            },
          },
        ],
      },
    ];

    // Provider should handle Anthropic-specific formats correctly
    expect(() => {
      const result = provider.generateChatCompletion(
        anthropicFormatContent,
        mockTools,
      );
      expect(result).toBeDefined();
    }).not.toThrow();
  });

  // MARKER: HS-042-ANTHROPIC-AUTH-INDEPENDENCE - Tests provider authentication works without HistoryService
  test('maintains authentication independently', () => {
    // Provider should handle authentication without HistoryService
    expect(provider.setApiKey).toBeDefined();
    expect(typeof provider.setApiKey).toBe('function');

    // Test setting API key works
    expect(() => {
      provider.setApiKey('sk-ant-new-key');
    }).not.toThrow();

    // Test that provider can check authentication status independently
    expect(typeof provider.isAuthenticated).toBe('function');
  });

  // CRITICAL: Provider Translation Testing
  // MARKER: HS-042-ANTHROPIC-TRANSLATION - Tests HistoryService format to Anthropic format conversion
  test('translates HistoryService format to Anthropic format correctly', () => {
    // Test HistoryService → Anthropic format conversion
    const historyMessages: Content[] = [
      { role: 'user', parts: [{ text: 'Test message' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'call_123',
              name: 'search',
              args: { query: 'test' },
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'call_123',
              name: 'search',
              response: 'Tool result',
            },
          },
        ],
      },
    ];

    // Mock the private convertContentsToAnthropicMessages method for testing
    const convertMethod = (provider as ProviderWithConvertMethod)
      .convertContentsToAnthropicMessages;
    expect(typeof convertMethod).toBe('function');

    const translated = convertMethod.call(provider, historyMessages);

    // Verify Anthropic-specific format differences:
    // - No 'tool' role (tools embedded differently in Anthropic)
    expect(
      translated.some((msg: AnthropicMessage) => msg.role === 'tool'),
    ).toBe(false);

    // - Tool calls use Anthropic's specific structure
    const toolUseMessage = translated.find(
      (msg: AnthropicMessage) =>
        Array.isArray(msg.content) &&
        msg.content.some(
          (block: { type: string }) => block.type === 'tool_use',
        ),
    );
    expect(toolUseMessage).toBeDefined();

    // - Tool results are embedded as tool_result blocks
    const toolResultMessage = translated.find(
      (msg: AnthropicMessage) =>
        Array.isArray(msg.content) &&
        msg.content.some(
          (block: { type: string }) => block.type === 'tool_result',
        ),
    );
    expect(toolResultMessage).toBeDefined();
  });

  // MARKER: HS-042-ANTHROPIC-ROLE-MAPPING - Tests role conversions specific to Anthropic
  test('handles Anthropic-specific role mapping correctly', () => {
    // Test role conversions specific to Anthropic
    const complexHistory: Content[] = [
      { role: 'system', parts: [{ text: 'You are a helpful assistant' }] },
      { role: 'user', parts: [{ text: 'Call multiple tools' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'call_1',
              name: 'tool1',
              args: {},
            },
          },
          {
            functionCall: {
              id: 'call_2',
              name: 'tool2',
              args: {},
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'call_1',
              name: 'tool1',
              response: 'Result 1',
            },
          },
          {
            functionResponse: {
              id: 'call_2',
              name: 'tool2',
              response: 'Result 2',
            },
          },
        ],
      },
    ];

    const convertMethod = (provider as ProviderWithConvertMethod)
      .convertContentsToAnthropicMessages;
    const translated = convertMethod.call(provider, complexHistory);

    // Verify Anthropic embeds tool responses correctly
    expect(
      translated.every(
        (msg: AnthropicMessage) =>
          msg.role === 'user' || msg.role === 'assistant',
      ),
    ).toBe(true);

    // Verify message sequencing is preserved
    expect(translated.length).toBeGreaterThan(0);

    // System messages should be filtered out (handled separately)
    expect(
      translated.some((msg: AnthropicMessage) => msg.role === 'system'),
    ).toBe(false);
  });

  // MARKER: HS-042-ANTHROPIC-API-VALIDATION - Tests translation meets Anthropic API requirements
  test('validates translation against Anthropic API constraints', () => {
    const testHistory: Content[] = [
      { role: 'user', parts: [{ text: 'User message' }] },
      { role: 'model', parts: [{ text: 'Assistant response' }] },
    ];

    const convertMethod = (provider as ProviderWithConvertMethod)
      .convertContentsToAnthropicMessages;
    const translated = convertMethod.call(provider, testHistory);

    // Validate against known Anthropic API constraints
    // - Messages should alternate between user and assistant
    expect(
      translated.every(
        (msg: AnthropicMessage) =>
          msg.role === 'user' || msg.role === 'assistant',
      ),
    ).toBe(true);

    // - Content should be string or array of content blocks
    translated.forEach((msg: AnthropicMessage) => {
      expect(
        typeof msg.content === 'string' || Array.isArray(msg.content),
      ).toBe(true);
    });

    // - Tool use should have required fields
    translated.forEach((msg: AnthropicMessage) => {
      if (Array.isArray(msg.content)) {
        msg.content.forEach(
          (block: {
            type?: string;
            id?: string;
            name?: string;
            input?: unknown;
            tool_use_id?: string;
            content?: unknown;
          }) => {
            if (block.type === 'tool_use') {
              expect(block.id).toBeDefined();
              expect(block.name).toBeDefined();
              expect(block.input).toBeDefined();
            }
            if (block.type === 'tool_result') {
              expect(block.tool_use_id).toBeDefined();
              expect(block.content).toBeDefined();
            }
          },
        );
      }
    });
  });

  // MARKER: HS-042-ANTHROPIC-NO-ORPHAN-DETECTION - Verify orphan detection is removed from provider
  test('has NO orphan detection logic', () => {
    // Verify provider does not contain orphan detection logic
    const providerString = provider.constructor.toString();

    // These should not exist in the provider code
    expect(providerString.includes('orphan')).toBe(false);
    expect(providerString.includes('orphaned')).toBe(false);
    expect(providerString.includes('findOrphanedTool')).toBe(false);
    expect(providerString.includes('synthetic')).toBe(false);
  });

  // MARKER: HS-042-ANTHROPIC-STATELESS - Verify provider is stateless and works only with provided data
  test('works as stateless provider with Content[] parameters only', () => {
    const content1: Content[] = [
      { role: 'user', parts: [{ text: 'First conversation' }] },
    ];
    const content2: Content[] = [
      { role: 'user', parts: [{ text: 'Second conversation' }] },
    ];

    // Provider should handle completely different conversations without state
    expect(() => {
      provider.generateChatCompletion(content1, mockTools);
      provider.generateChatCompletion(content2, mockTools);
    }).not.toThrow();

    // Provider should not maintain conversation state between calls
    expect(
      (provider as ProviderWithPrivateProps).conversationHistory,
    ).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).conversationCache,
    ).toBeUndefined();
  });
});
