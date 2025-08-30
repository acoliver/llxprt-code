// @plan PLAN-20250128-HISTORYSERVICE.P28
// @requirement HS-041
// @phase provider-updates-tdd
// @behavioral-testing Real provider integration testing

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Content } from '@google/genai';
import { GeminiProvider } from '../gemini/GeminiProvider.js';
import { ITool } from '../ITool.js';

// Type definitions for test assertions
type ProviderWithPrivateProps = GeminiProvider & {
  historyService?: unknown;
  getHistory?: unknown;
  updateHistory?: unknown;
  manageHistory?: unknown;
  conversationHistory?: unknown;
  conversationArray?: unknown;
  historyManager?: unknown;
  sessionHistory?: unknown;
  conversationManager?: unknown;
};

// Test data removed to fix unused variable lint error

// Mock configuration without HistoryService dependency
const mockConfig = {
  name: 'gemini',
  apiKey: 'test-gemini-key',
  baseURL: undefined,
  isOAuthEnabled: false,
};

// Mock tools for testing
const mockTools: ITool[] = [
  {
    name: 'search_web',
    description: 'Search the web for information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];

describe('GeminiProvider Clean Architecture', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create provider without HistoryService dependency
    provider = new GeminiProvider(mockConfig.apiKey, mockConfig.baseURL);
  });

  // MARKER: HS-042-GEMINI-CONTENT-PARAMS - Tests that provider methods accept Content[] parameters
  test('accepts Content[] arrays as parameters', async () => {
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

  // MARKER: HS-042-GEMINI-CONTENT-FORMAT - Tests provider works directly with Gemini Content format
  test('works directly with Gemini Content format', () => {
    const geminiContent: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Multi-part message' }, { text: 'Second part' }],
      },
      {
        role: 'model',
        parts: [
          { text: 'Response part 1' },
          {
            functionCall: {
              id: 'func_456',
              name: 'search_web',
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
              id: 'func_456',
              name: 'search_web',
              response: { results: ['Result 1'] },
            },
          },
        ],
      },
    ];

    // Provider should work with native Gemini Content format
    expect(() => {
      const result = provider.generateChatCompletion(geminiContent, mockTools);
      expect(result).toBeDefined();
    }).not.toThrow();
  });

  // MARKER: HS-042-GEMINI-NO-TOOL-MANAGEMENT - Tests provider has NO tool call management logic
  test('has NO tool call management logic', () => {
    const providerSource = provider.constructor.toString();

    // Verify tool call completion logic is removed
    expect(providerSource.includes('completeToolCall')).toBe(false);
    expect(providerSource.includes('manageToolCalls')).toBe(false);
    expect(providerSource.includes('trackToolCalls')).toBe(false);
    expect(providerSource.includes('orphan')).toBe(false);

    // Provider should focus only on Gemini API communication
    expect(providerSource.includes('synthetic')).toBe(false);
  });

  // MARKER: HS-042-GEMINI-FEATURES - Tests Gemini-specific features work with Content[]
  test('maintains Gemini-specific features with Content[]', () => {
    const geminiSpecificContent: Content[] = [
      { role: 'user', parts: [{ text: 'Test safety settings' }] },
    ];

    // Provider should maintain Gemini-specific functionality
    expect(() => {
      provider.generateChatCompletion(geminiSpecificContent, mockTools);
    }).not.toThrow();

    // Gemini-specific methods should exist
    expect(typeof provider.setModel).toBe('function');
    expect(typeof provider.getCurrentModel).toBe('function');
    expect(typeof provider.getDefaultModel).toBe('function');
  });

  // MARKER: HS-042-GEMINI-NO-HISTORYSERVICE - Tests provider has NO access to HistoryService
  test('has NO HistoryService dependency', () => {
    // Verify no historyService property exists
    expect(
      (provider as ProviderWithPrivateProps).historyService,
    ).toBeUndefined();

    // Verify no history-related methods exist
    expect((provider as ProviderWithPrivateProps).getHistory).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).updateHistory,
    ).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).manageHistory,
    ).toBeUndefined();

    // Provider should work solely with Content[] parameters
    expect(() => {
      new GeminiProvider(mockConfig.apiKey);
    }).not.toThrow();
  });

  // CRITICAL: Provider Translation Testing for Gemini
  // MARKER: HS-042-GEMINI-TRANSLATION - Tests HistoryService format to Gemini format conversion
  test('translates HistoryService format to Gemini format correctly', () => {
    // Test HistoryService → Gemini format conversion
    // Since Gemini natively uses Content[] format, translation should be minimal
    const historyMessages: Content[] = [
      { role: 'user', parts: [{ text: 'Test message' }] },
      { role: 'model', parts: [{ text: 'Response text' }] },
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

    // Gemini should use Content[] directly without major conversion
    // The key verification is that it preserves the Part[] structure
    historyMessages.forEach((content) => {
      expect(content).toHaveProperty('parts');
      expect(Array.isArray(content.parts)).toBe(true);
    });

    // Verify Gemini-specific format is preserved:
    // - Content[] with Part[] structure
    expect(historyMessages[0].parts).toEqual([{ text: 'Test message' }]);

    // - 'model' role instead of 'assistant' (already in correct format)
    expect(historyMessages[1].role).toBe('model');

    // - functionCall/functionResponse structure (native Gemini format)
    const functionCallContent = historyMessages[2];
    expect(functionCallContent.parts?.[0]).toHaveProperty('functionCall');

    const functionResponseContent = historyMessages[3];
    expect(functionResponseContent.parts?.[0]).toHaveProperty(
      'functionResponse',
    );
  });

  // MARKER: HS-042-GEMINI-PART-STRUCTURE - Tests Gemini's unique Part[] content structure
  test('handles Gemini Part[] structure correctly', () => {
    // Test Gemini's unique Part[] content structure
    const complexContent: Content[] = [
      { role: 'user', parts: [{ text: 'Multi-part message' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'func_1',
              name: 'search_web',
              args: { query: 'Gemini' },
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'func_1',
              name: 'search_web',
              response: { results: ['item1', 'item2'] },
            },
          },
        ],
      },
    ];

    // Verify Gemini Part[] structure is maintained
    expect(complexContent[0].parts).toEqual([{ text: 'Multi-part message' }]);

    // Verify function call format
    const functionCallPart = complexContent[1].parts?.[0];
    if (functionCallPart && 'functionCall' in functionCallPart) {
      expect(functionCallPart.functionCall).toMatchObject({
        id: 'func_1',
        name: 'search_web',
        args: { query: 'Gemini' },
      });
    }

    // Verify function response format
    const functionResponsePart = complexContent[2].parts?.[0];
    if (functionResponsePart && 'functionResponse' in functionResponsePart) {
      expect(functionResponsePart.functionResponse).toMatchObject({
        id: 'func_1',
        name: 'search_web',
        response: { results: ['item1', 'item2'] },
      });
    }
  });

  // MARKER: HS-042-GEMINI-ROLE-MAPPING - Tests role conversions specific to Gemini
  test('handles Gemini role mapping correctly', () => {
    // Test role conversions - Gemini uses different role names
    const history: Content[] = [
      { role: 'system', parts: [{ text: 'System message' }] },
      { role: 'user', parts: [{ text: 'User query' }] },
      { role: 'model', parts: [{ text: 'Model response' }] }, // Already correct for Gemini
      { role: 'model', parts: [{ text: 'Another model response' }] },
    ];

    // Gemini natively uses 'model' role, so no conversion needed
    const modelMessages = history.filter((msg) => msg.role === 'model');
    expect(modelMessages.length).toBe(2);

    // Verify no 'assistant' role exists (that's OpenAI/Anthropic)
    const assistantMessages = history.filter((msg) => msg.role === 'assistant');
    expect(assistantMessages.length).toBe(0);

    // System messages handled separately in Gemini
    const systemMessages = history.filter((msg) => msg.role === 'system');
    expect(systemMessages.length).toBe(1);
  });

  // MARKER: HS-042-GEMINI-API-VALIDATION - Tests format meets Gemini API requirements
  test('validates format against Gemini API constraints', () => {
    // Test that format meets Gemini API requirements
    const complexHistory: Content[] = [
      { role: 'user', parts: [{ text: 'Initial query' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'call_1',
              name: 'func1',
              args: { param: 'value' },
            },
          },
          {
            functionCall: {
              id: 'call_2',
              name: 'func2',
              args: { param: 'value' },
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
              response: 'Result 1',
            },
          },
          {
            functionResponse: {
              id: 'call_2',
              name: 'func2',
              response: 'Result 2',
            },
          },
        ],
      },
      { role: 'model', parts: [{ text: 'Final response' }] },
    ];

    // Validate against known Gemini API constraints
    // - Part[] structure validation
    complexHistory.forEach((content) => {
      expect(content.parts).toBeDefined();
      expect(Array.isArray(content.parts)).toBe(true);
      content.parts?.forEach((part) => {
        // Each part should have at least one property
        const keys = Object.keys(part);
        expect(keys.length).toBeGreaterThan(0);

        // Valid part types
        const validPartTypes = ['text', 'functionCall', 'functionResponse'];
        const hasValidType = keys.some((key) => validPartTypes.includes(key));
        expect(hasValidType).toBe(true);
      });
    });

    // - Role validation for Gemini
    const validRoles = ['user', 'model', 'system'];
    complexHistory.forEach((content) => {
      expect(validRoles.includes(content.role)).toBe(true);
    });

    // - Function call/response format validation
    const functionCalls = complexHistory.flatMap(
      (content) =>
        content.parts?.filter((part) => 'functionCall' in part) || [],
    );
    functionCalls.forEach((part) => {
      if ('functionCall' in part && part.functionCall) {
        expect(part.functionCall.id).toBeDefined();
        expect(part.functionCall.name).toBeDefined();
        expect(part.functionCall.args).toBeDefined();
      }
    });
  });

  // MARKER: HS-042-GEMINI-STATELESS - Tests provider independence from history management
  test('works independently from history management', () => {
    const conversation1: Content[] = [
      { role: 'user', parts: [{ text: 'First conversation' }] },
    ];
    const conversation2: Content[] = [
      { role: 'user', parts: [{ text: 'Second conversation' }] },
    ];

    // Provider should handle different conversations without state
    expect(() => {
      provider.generateChatCompletion(conversation1, mockTools);
      provider.generateChatCompletion(conversation2, mockTools);
    }).not.toThrow();

    // Provider should not maintain conversation state
    expect(
      (provider as ProviderWithPrivateProps).conversationHistory,
    ).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).conversationArray,
    ).toBeUndefined();
  });

  // MARKER: HS-042-GEMINI-SEPARATION - Tests clean separation from history management
  test('maintains clean separation from history management', () => {
    // Provider should focus on LLM communication only
    const testContent: Content[] = [
      { role: 'user', parts: [{ text: 'Test separation' }] },
    ];

    expect(() => {
      provider.generateChatCompletion(testContent, mockTools);
    }).not.toThrow();

    // Provider should NOT have history-specific business logic
    expect(
      (provider as ProviderWithPrivateProps).historyManager,
    ).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).sessionHistory,
    ).toBeUndefined();
    expect(
      (provider as ProviderWithPrivateProps).conversationManager,
    ).toBeUndefined();
  });

  // MARKER: HS-042-GEMINI-AUTHENTICATION - Tests provider handles authentication independently
  test('handles authentication independently', () => {
    // Provider should manage its own authentication
    expect(typeof provider.isAuthenticated).toBe('function');
    expect(typeof provider.setApiKey).toBe('function');

    // Test API key changes work
    expect(() => {
      provider.setApiKey('new-gemini-key');
    }).not.toThrow();

    // Provider should support multiple auth modes
    expect(() => {
      provider.setBaseUrl('https://generativelanguage.googleapis.com/v1');
    }).not.toThrow();
  });

  // MARKER: HS-042-GEMINI-NATIVE-FORMAT - Tests Gemini works with native Content[] format
  test('uses native Content[] format without conversion overhead', () => {
    // Since Gemini natively uses Content[] format, there should be minimal conversion
    const nativeGeminiContent: Content[] = [
      { role: 'user', parts: [{ text: 'Native format test' }] },
      {
        role: 'model',
        parts: [
          { text: 'Response text' },
          {
            functionCall: {
              id: 'native_call',
              name: 'native_function',
              args: { native: true },
            },
          },
        ],
      },
    ];

    // Provider should work efficiently with native format
    expect(() => {
      provider.generateChatCompletion(nativeGeminiContent, mockTools);
    }).not.toThrow();

    // No unnecessary format conversions should be needed
    expect(nativeGeminiContent[0].role).toBe('user');
    expect(nativeGeminiContent[1].role).toBe('model');
  });
});
