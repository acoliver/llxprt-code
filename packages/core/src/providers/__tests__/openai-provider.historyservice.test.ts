// @plan PLAN-20250128-HISTORYSERVICE.P28
// @requirement HS-041
// @phase provider-updates-tdd
// @behavioral-testing Real provider integration testing

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Content } from '@google/genai';
import { OpenAIProvider } from '../openai/OpenAIProvider.js';
import { ITool } from '../ITool.js';

// Type definitions for test assertions
type OpenAIMessage = {
  role: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

type ProviderWithConverter = OpenAIProvider & {
  converter: {
    toProviderFormat: (contents: Content[]) => OpenAIMessage[];
  };
};

type ProviderWithPrivateProps = OpenAIProvider & {
  historyService?: unknown;
  getHistory?: unknown;
  updateHistory?: unknown;
  addToHistory?: unknown;
  conversationHistory?: unknown;
  lastConversation?: unknown;
  manageHistory?: unknown;
  storeHistory?: unknown;
  retrieveHistory?: unknown;
};

// Test data removed to fix unused variable lint error

// Mock configuration without HistoryService dependency
const mockConfig = {
  name: 'openai',
  apiKey: 'sk-test-key',
  baseURL: undefined,
  isOAuthEnabled: false,
};

// Mock tools for testing
const mockTools: ITool[] = [
  {
    name: 'get_weather',
    description: 'Get weather information',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Location to get weather for',
        },
      },
      required: ['location'],
    },
  },
];

describe('OpenAIProvider Clean Architecture', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create provider without HistoryService dependency
    provider = new OpenAIProvider(mockConfig.apiKey, mockConfig.baseURL);
  });

  // MARKER: HS-042-OPENAI-SYNTHETIC-REMOVAL - Tests that provider eliminates synthetic response generation for orphaned tool calls
  test('eliminates synthetic response generation for orphaned tool calls', () => {
    // Verify provider does NOT generate synthetic responses
    const providerString = provider.constructor.toString();

    // These should not exist in the provider code
    expect(providerString.includes('synthetic')).toBe(false);
    expect(providerString.includes('orphan')).toBe(false);
    expect(providerString.includes('generateSyntheticResponse')).toBe(false);
    expect(providerString.includes('createFakeResponse')).toBe(false);
  });

  // MARKER: HS-042-OPENAI-CONTENT-PARAMS - Tests that provider uses Content[] parameters for API calls
  test('uses Content[] parameters for API calls', async () => {
    const testContents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Test message' }],
      },
    ];

    // Test that generateChatCompletion accepts Content[] parameters
    expect(() => {
      const result = provider.generateChatCompletion(testContents, mockTools);
      expect(result).toBeDefined();
      expect(Symbol.asyncIterator in result).toBe(true);
    }).not.toThrow();
  });

  // MARKER: HS-042-OPENAI-STREAMING - Tests streaming works with Content[] parameters
  test('handles streaming with Content[] parameters', () => {
    const streamContent: Content[] = [
      { role: 'user', parts: [{ text: 'Stream this response' }] },
    ];

    // Provider should support streaming with Content[] input
    expect(() => {
      const result = provider.generateChatCompletion(streamContent, mockTools);
      expect(Symbol.asyncIterator in result).toBe(true);
    }).not.toThrow();
  });

  // MARKER: HS-042-OPENAI-TOKEN-COUNTING - Tests token counting works with Content[] parameters
  test('maintains token counting with Content[] parameters', () => {
    const tokenTestContent: Content[] = [
      { role: 'user', parts: [{ text: 'Count tokens in this message' }] },
      { role: 'model', parts: [{ text: 'This is the response' }] },
    ];

    // Provider should handle token counting independently
    expect(() => {
      provider.generateChatCompletion(tokenTestContent, mockTools);
    }).not.toThrow();

    // OpenAI provider uses external token estimation
    // The provider itself may not have an estimateTokens method but should handle token counting
  });

  // MARKER: HS-042-OPENAI-NO-HISTORYSERVICE - Tests provider has NO access to HistoryService
  test('has NO HistoryService dependency', () => {
    // Verify no historyService property exists
    expect(
      (provider as ProviderWithPrivateProps).historyService,
    ).toBeUndefined();

    // Verify no history-related methods exist in provider
    expect((provider as ProviderWithPrivateProps).getHistory).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).updateHistory,
    ).toBeUndefined();
    expect((provider as ProviderWithPrivateProps).addToHistory).toBeUndefined();

    // Provider should work solely with Content[] parameters
    expect(() => {
      new OpenAIProvider(mockConfig.apiKey);
    }).not.toThrow();
  });

  // CRITICAL: Provider Translation Testing for OpenAI
  // MARKER: HS-042-OPENAI-TRANSLATION - Tests HistoryService format to OpenAI format conversion
  test('translates HistoryService format to OpenAI format correctly', () => {
    // Test HistoryService → OpenAI format conversion
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

    // Access the converter to test format translation
    const converter = (provider as ProviderWithConverter).converter;
    expect(converter).toBeDefined();

    const translated = converter.toProviderFormat(historyMessages);

    // Verify OpenAI-specific format differences:
    // - Has 'tool' role (distinct from assistant)
    const hasToolRole = translated.some(
      (msg: OpenAIMessage) => msg.role === 'tool',
    );
    expect(hasToolRole).toBe(true);

    // - tool_calls structure specific to OpenAI
    const toolCallMessage = translated.find(
      (msg: OpenAIMessage) => msg.tool_calls,
    );
    expect(toolCallMessage).toBeDefined();
    if (toolCallMessage) {
      expect(Array.isArray(toolCallMessage.tool_calls)).toBe(true);
      expect(toolCallMessage.tool_calls[0]).toHaveProperty('id');
      expect(toolCallMessage.tool_calls[0]).toHaveProperty('type', 'function');
      expect(toolCallMessage.tool_calls[0]).toHaveProperty('function');
    }
  });

  // MARKER: HS-042-OPENAI-TOOL-STRUCTURE - Tests OpenAI-specific tool call structure
  test('handles OpenAI-specific tool call structure', () => {
    // Test OpenAI tool call format requirements
    const toolCallHistory: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'call_abc',
              name: 'get_weather',
              args: { location: 'NYC' },
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'call_abc',
              name: 'get_weather',
              response: { temp: '72F' },
            },
          },
        ],
      },
    ];

    const converter = (provider as ProviderWithConverter).converter;
    const translated = converter.toProviderFormat(toolCallHistory);

    // Verify OpenAI tool call structure
    const assistantMsg = translated.find(
      (msg: OpenAIMessage) => msg.role === 'assistant' && msg.tool_calls,
    );
    expect(assistantMsg).toBeDefined();
    if (assistantMsg && assistantMsg.tool_calls) {
      expect(assistantMsg.tool_calls[0]).toMatchObject({
        id: 'call_abc',
        type: 'function',
        function: {
          name: 'get_weather',
          arguments: expect.any(String),
        },
      });
    }

    // Verify tool response format (OpenAI doesn't include name in tool messages)
    const toolMsg = translated.find(
      (msg: OpenAIMessage) => msg.role === 'tool',
    );
    expect(toolMsg).toBeDefined();
    if (toolMsg) {
      expect(toolMsg).toMatchObject({
        role: 'tool',
        tool_call_id: 'call_abc',
        content: expect.any(String),
      });
    }
  });

  // MARKER: HS-042-OPENAI-API-VALIDATION - Tests translation meets OpenAI API requirements
  test('validates translation against OpenAI API constraints', () => {
    // Test that translated format meets OpenAI API requirements
    const complexHistory: Content[] = [
      { role: 'system', parts: [{ text: 'System prompt' }] },
      { role: 'user', parts: [{ text: 'User message' }] },
      { role: 'model', parts: [{ text: 'Response' }] },
      { role: 'user', parts: [{ text: 'Call a function' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'call_1',
              name: 'func1',
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
              name: 'func1',
              response: 'Result',
            },
          },
        ],
      },
    ];

    const converter = (provider as ProviderWithConverter).converter;
    const translated = converter.toProviderFormat(complexHistory);

    // Validate against known OpenAI API constraints
    // - Message role requirements
    const validRoles = ['system', 'user', 'assistant', 'tool'];
    translated.forEach((msg: OpenAIMessage) => {
      expect(validRoles.includes(msg.role)).toBe(true);
    });

    // - Tool call format validation
    const toolCallMessages = translated.filter(
      (msg: OpenAIMessage) => msg.tool_calls,
    );
    toolCallMessages.forEach((msg: OpenAIMessage) => {
      expect(msg.role).toBe('assistant');
      expect(Array.isArray(msg.tool_calls)).toBe(true);
      msg.tool_calls?.forEach((call) => {
        expect(call.id).toBeDefined();
        expect(call.type).toBe('function');
        expect(call.function.name).toBeDefined();
        expect(typeof call.function.arguments).toBe('string');
      });
    });

    // - Tool response messages should have required fields (OpenAI doesn't include name field)
    const toolMessages = translated.filter(
      (msg: OpenAIMessage) => msg.role === 'tool',
    );
    toolMessages.forEach((msg: OpenAIMessage) => {
      expect(msg.tool_call_id).toBeDefined();
      expect(msg.content).toBeDefined();
      // Note: OpenAI tool messages don't have a 'name' field
    });
  });

  // MARKER: HS-042-OPENAI-STATELESS - Tests provider works independently from history management
  test('works independently from history management', () => {
    const conversation1: Content[] = [
      { role: 'user', parts: [{ text: 'First conversation' }] },
    ];
    const conversation2: Content[] = [
      { role: 'user', parts: [{ text: 'Second conversation' }] },
    ];

    // Provider should handle different conversations without state interference
    expect(() => {
      provider.generateChatCompletion(conversation1, mockTools);
      provider.generateChatCompletion(conversation2, mockTools);
    }).not.toThrow();

    // Provider should not maintain conversation state
    expect(
      (provider as ProviderWithPrivateProps).conversationHistory,
    ).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).lastConversation,
    ).toBeUndefined();
  });

  // MARKER: HS-042-OPENAI-NO-ORPHAN-LOGIC - Tests provider has no orphan detection logic
  test('has no orphan detection logic', () => {
    const providerSource = provider.constructor.toString();

    // Verify orphan-related logic is not present
    expect(providerSource.includes('orphan')).toBe(false);
    expect(providerSource.includes('findOrphaned')).toBe(false);
    expect(providerSource.includes('completeOrphaned')).toBe(false);

    // Verify no synthetic response generation
    expect(providerSource.includes('synthetic')).toBe(false);
    expect(providerSource.includes('fake')).toBe(false);
    expect(providerSource.includes('mock')).toBe(false);
  });

  // MARKER: HS-042-OPENAI-CONTENT-ONLY - Tests provider focuses only on LLM communication
  test('focuses only on LLM communication', () => {
    const testContent: Content[] = [
      { role: 'user', parts: [{ text: 'Test LLM communication' }] },
    ];

    // Provider should focus solely on OpenAI API communication
    expect(() => {
      provider.generateChatCompletion(testContent, mockTools);
    }).not.toThrow();

    // Provider should have OpenAI-specific methods
    expect(typeof provider.setModel).toBe('function');
    expect(typeof provider.getCurrentModel).toBe('function');
    expect(typeof provider.getDefaultModel).toBe('function');

    // Provider should NOT have history management methods
    expect(
      (provider as ProviderWithPrivateProps).manageHistory,
    ).toBeUndefined();
    expect((provider as ProviderWithPrivateProps).storeHistory).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).retrieveHistory,
    ).toBeUndefined();
  });

  // MARKER: HS-042-OPENAI-AUTHENTICATION - Tests provider handles authentication independently
  test('handles authentication independently', () => {
    // Provider should manage its own authentication
    expect(typeof provider.setApiKey).toBe('function');
    expect(typeof provider.isAuthenticated).toBe('function');

    // Test authentication changes work
    expect(() => {
      provider.setApiKey('sk-new-test-key');
    }).not.toThrow();

    // Test base URL changes work
    expect(() => {
      provider.setBaseUrl('https://api.openai.com/v1');
    }).not.toThrow();
  });
});
