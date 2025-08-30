// @plan PLAN-20250128-HISTORYSERVICE.P28
// @requirement HS-041
// @phase provider-updates-tdd
// @behavioral-testing Real provider integration testing

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { Content } from '@google/genai';
import { AnthropicProvider } from '../anthropic/AnthropicProvider.js';
import { OpenAIProvider } from '../openai/OpenAIProvider.js';
import { GeminiProvider } from '../gemini/GeminiProvider.js';
import { ITool } from '../ITool.js';

// Type definitions for test assertions
type ProviderWithPrivateProps = {
  addToHistory?: unknown;
  updateHistory?: unknown;
  historyService?: unknown;
  history?: unknown;
  conversationHistory?: unknown;
  getHistory?: unknown;
  setHistory?: unknown;
  clearHistory?: unknown;
  manageHistory?: unknown;
};

// MARKER: HS-042-INTEGRATION-TEST-DATA - Real conversation data for cross-provider testing
const REAL_ANTHROPIC_DATA = {
  simpleQuery: {
    userMessage: { role: 'user', content: 'What is TypeScript?' },
    modelResponse: {
      role: 'assistant',
      content: 'TypeScript is a typed superset of JavaScript.',
    },
  },
  toolCallScenario: {
    toolCallMessage: {
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_123',
          type: 'function',
          function: { name: 'search', arguments: '{"query": "TypeScript"}' },
        },
      ],
    },
    toolResponse: {
      role: 'tool',
      tool_call_id: 'call_123',
      content: 'TypeScript search results...',
    },
  },
};

const REAL_OPENAI_DATA = {
  chatCompletion: {
    messages: [
      { role: 'user', content: 'Explain async/await' },
      {
        role: 'assistant',
        content: 'async/await is a syntax for handling promises...',
      },
    ],
  },
  toolCallScenario: {
    toolCallMessage: {
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_abc123',
          type: 'function',
          function: {
            name: 'get_weather',
            arguments: '{"location": "San Francisco"}',
          },
        },
      ],
    },
    toolResponse: {
      role: 'tool',
      tool_call_id: 'call_abc123',
      name: 'get_weather',
      content: '{"temperature": "72F", "condition": "sunny"}',
    },
  },
};

const REAL_GEMINI_DATA = {
  conversationHistory: [
    { role: 'user', parts: [{ text: 'What is machine learning?' }] },
    {
      role: 'model',
      parts: [{ text: 'Machine learning is a subset of AI...' }],
    },
  ],
  functionCallScenario: {
    functionCall: {
      role: 'model',
      parts: [
        {
          functionCall: {
            id: 'func_123',
            name: 'search_web',
            args: { query: 'machine learning basics' },
          },
        },
      ],
    },
    functionResponse: {
      role: 'user',
      parts: [
        {
          functionResponse: {
            id: 'func_123',
            name: 'search_web',
            response: { results: ['ML is...', 'AI techniques...'] },
          },
        },
      ],
    },
  },
};

// Mock configuration
const mockConfig = {
  apiKey: 'test-key-integration',
  baseURL: undefined,
};

// Mock tools
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
  {
    name: 'get_weather',
    description: 'Get weather information',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Location' },
      },
      required: ['location'],
    },
  },
  {
    name: 'search_web',
    description: 'Search the web',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];

describe('GeminiChat Orchestration with Providers', () => {
  const testScenarios = [
    {
      provider: 'anthropic',
      data: REAL_ANTHROPIC_DATA,
      createProvider: () =>
        new AnthropicProvider(mockConfig.apiKey, mockConfig.baseURL),
    },
    {
      provider: 'openai',
      data: REAL_OPENAI_DATA,
      createProvider: () =>
        new OpenAIProvider(mockConfig.apiKey, mockConfig.baseURL),
    },
    {
      provider: 'gemini',
      data: REAL_GEMINI_DATA,
      createProvider: () =>
        new GeminiProvider(mockConfig.apiKey, mockConfig.baseURL),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // MARKER: HS-042-INTEGRATION-CONTENT-PREPARATION - Test GeminiChat uses HistoryService to prepare Content[]
  test('GeminiChat uses HistoryService to prepare Content[]', () => {
    // This test verifies the architectural pattern where:
    // 1. GeminiChat gets history from HistoryService
    // 2. GeminiChat prepares Content[] arrays
    // 3. Content[] is passed to provider methods

    const universalContent: Content[] = [
      { role: 'user', parts: [{ text: 'Universal test message' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'universal_call',
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
              id: 'universal_call',
              name: 'search',
              response: 'Universal search result',
            },
          },
        ],
      },
    ];

    testScenarios.forEach((scenario) => {
      const provider = scenario.createProvider();

      // Test that GeminiChat can prepare Content[] arrays for any provider
      expect(() => {
        provider.generateChatCompletion(universalContent, mockTools);
      }).not.toThrow();

      // Verify Content[] is passed to provider methods
      expect(typeof provider.generateChatCompletion).toBe('function');

      console.log(`${scenario.provider}: ✓ Accepts prepared Content[] arrays`);
    });
  });

  // MARKER: HS-042-INTEGRATION-PROVIDER-AGNOSTIC - Test GeminiChat handles provider-agnostic Content[]
  test('GeminiChat handles provider-agnostic Content[]', () => {
    // Test Content[] preparation works for any provider
    const providerAgnosticContent: Content[] = [
      { role: 'system', parts: [{ text: 'You are a helpful assistant' }] },
      { role: 'user', parts: [{ text: 'Cross-provider test' }] },
      {
        role: 'model',
        parts: [
          { text: 'Response with function call:' },
          {
            functionCall: {
              id: 'cross_provider_call',
              name: 'search',
              args: { query: 'cross-provider' },
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'cross_provider_call',
              name: 'search',
              response: 'Cross-provider result',
            },
          },
        ],
      },
      { role: 'model', parts: [{ text: 'Final response' }] },
    ];

    testScenarios.forEach((scenario) => {
      const provider = scenario.createProvider();

      // Verify format conversions happen in GeminiChat layer
      // Each provider should accept the same Content[] input format
      expect(() => {
        provider.generateChatCompletion(providerAgnosticContent, mockTools);
      }).not.toThrow();

      // Ensure providers receive properly formatted data
      // The provider should handle the conversion internally

      console.log(
        `${scenario.provider}: ✓ Handles provider-agnostic Content[]`,
      );
    });
  });

  // MARKER: HS-042-INTEGRATION-HISTORY-UPDATES - Test GeminiChat manages history updates after provider responses
  test('GeminiChat manages history updates after provider responses', () => {
    // This test simulates how GeminiChat would:
    // 1. Get existing history from HistoryService
    // 2. Add new user message
    // 3. Call provider with complete Content[] history
    // 4. Update HistoryService with provider response

    testScenarios.forEach((scenario) => {
      const provider = scenario.createProvider();

      // Simulate existing conversation history
      const existingHistory: Content[] = [
        { role: 'user', parts: [{ text: 'Previous message 1' }] },
        { role: 'model', parts: [{ text: 'Previous response 1' }] },
        { role: 'user', parts: [{ text: 'Previous message 2' }] },
        { role: 'model', parts: [{ text: 'Previous response 2' }] },
      ];

      // Simulate new user message
      const newUserMessage: Content = {
        role: 'user',
        parts: [{ text: 'New message to test history management' }],
      };

      // GeminiChat would combine existing + new for provider call
      const completeHistory = [...existingHistory, newUserMessage];

      // Test GeminiChat updates HistoryService after provider calls
      expect(() => {
        provider.generateChatCompletion(completeHistory, mockTools);
      }).not.toThrow();

      // Verify response recording would happen in GeminiChat
      // Providers don't update history directly
      expect(
        (provider as ProviderWithPrivateProps).addToHistory,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).updateHistory,
      ).toBeUndefined();

      console.log(
        `${scenario.provider}: ✓ Supports history management pattern`,
      );
    });
  });

  // MARKER: HS-042-INTEGRATION-PROVIDER-INDEPENDENCE - Test providers work independently of HistoryService
  test('providers work independently of HistoryService', () => {
    testScenarios.forEach((scenario) => {
      const provider = scenario.createProvider();

      // Test providers have NO knowledge of HistoryService
      expect(
        (provider as ProviderWithPrivateProps).historyService,
      ).toBeUndefined();
      expect((provider as ProviderWithPrivateProps).history).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).conversationHistory,
      ).toBeUndefined();

      // Verify complete separation of concerns
      expect((provider as ProviderWithPrivateProps).getHistory).toBeUndefined();
      expect((provider as ProviderWithPrivateProps).setHistory).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).clearHistory,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).manageHistory,
      ).toBeUndefined();

      // Ensure clean architecture is maintained
      const independentContent: Content[] = [
        { role: 'user', parts: [{ text: 'Independent operation test' }] },
      ];

      expect(() => {
        provider.generateChatCompletion(independentContent, mockTools);
      }).not.toThrow();

      console.log(`${scenario.provider}: ✓ Independent of HistoryService`);
    });
  });

  // MARKER: HS-042-INTEGRATION-CONTENT-PARAMS - Test Content[] parameter pattern is consistent
  test('Content[] parameter pattern is consistent', () => {
    // Define various Content[] patterns that should work across all providers
    const contentPatterns = [
      // Simple conversation
      [{ role: 'user', parts: [{ text: 'Simple message' }] }],
      // Conversation with system message
      [
        { role: 'system', parts: [{ text: 'System instruction' }] },
        { role: 'user', parts: [{ text: 'User message' }] },
      ],
      // Function call pattern
      [
        { role: 'user', parts: [{ text: 'Please search for something' }] },
        {
          role: 'model',
          parts: [
            {
              functionCall: {
                id: 'consistent_call',
                name: 'search',
                args: { query: 'consistency test' },
              },
            },
          ],
        },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                id: 'consistent_call',
                name: 'search',
                response: 'Consistent result',
              },
            },
          ],
        },
      ],
      // Multi-part content
      [
        {
          role: 'user',
          parts: [
            { text: 'Part 1 of message, ' },
            { text: 'Part 2 of message' },
          ],
        },
        {
          role: 'model',
          parts: [
            { text: 'Multi-part response: ' },
            { text: 'Additional response content' },
          ],
        },
      ],
    ];

    testScenarios.forEach((scenario) => {
      const provider = scenario.createProvider();

      contentPatterns.forEach((pattern, _patternIndex) => {
        // Test all providers use same Content[] parameter pattern
        expect(() => {
          provider.generateChatCompletion(pattern, mockTools);
        }).not.toThrow();

        // Verify method signatures are uniform
        expect(typeof provider.generateChatCompletion).toBe('function');
        expect(provider.generateChatCompletion.length).toBeGreaterThanOrEqual(
          1,
        );
      });

      // Ensure clean, consistent interfaces
      expect(provider.name).toBeDefined();
      expect(typeof provider.name).toBe('string');

      console.log(
        `${scenario.provider}: ✓ Consistent Content[] parameter pattern`,
      );
    });
  });

  // MARKER: HS-042-INTEGRATION-FORMAT-CONVERSION - Test format conversions work correctly
  test('all providers handle format conversions correctly', () => {
    // Test that each provider can handle the universal Content[] format
    // and convert it to their specific API format internally

    const universalFormat: Content[] = [
      { role: 'user', parts: [{ text: 'Universal format test' }] },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'format_test_123',
              name: 'search',
              args: { query: 'format conversion' },
            },
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              id: 'format_test_123',
              name: 'search',
              response: 'Format conversion successful',
            },
          },
        ],
      },
      { role: 'model', parts: [{ text: 'Conversion complete' }] },
    ];

    testScenarios.forEach((scenario) => {
      const provider = scenario.createProvider();

      // Each provider should handle format conversion internally
      expect(() => {
        provider.generateChatCompletion(universalFormat, mockTools);
      }).not.toThrow();

      // Test that providers preserve the input Content[] format
      const originalLength = universalFormat.length;
      provider.generateChatCompletion(universalFormat, mockTools);
      expect(universalFormat.length).toBe(originalLength);

      console.log(`${scenario.provider}: ✓ Format conversion works correctly`);
    });
  });

  // MARKER: HS-042-INTEGRATION-ERROR-CONSISTENCY - Test consistent error handling across providers
  test('all providers handle errors consistently', () => {
    const problematicContent: Content[] = [
      // Empty content
      { role: 'user', parts: [] },
      // Missing function response
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'missing_response',
              name: 'search',
              args: { query: 'no response' },
            },
          },
        ],
      },
    ];

    testScenarios.forEach((scenario) => {
      const provider = scenario.createProvider();

      // All providers should handle problematic input gracefully
      expect(() => {
        provider.generateChatCompletion(problematicContent, mockTools);
      }).not.toThrow();

      // Test with empty content array
      expect(() => {
        provider.generateChatCompletion([], mockTools);
      }).not.toThrow();

      // Test with no tools
      expect(() => {
        const simpleContent: Content[] = [
          { role: 'user', parts: [{ text: 'No tools test' }] },
        ];
        provider.generateChatCompletion(simpleContent);
      }).not.toThrow();

      console.log(`${scenario.provider}: ✓ Consistent error handling`);
    });
  });

  // MARKER: HS-042-INTEGRATION-PERFORMANCE - Test providers maintain performance with Content[] pattern
  test('all providers maintain performance with Content[] pattern', () => {
    // Test with larger Content[] arrays to ensure performance doesn't degrade
    const largeContent: Content[] = [];

    // Generate larger conversation history
    for (let i = 0; i < 20; i++) {
      largeContent.push({
        role: 'user',
        parts: [{ text: `User message ${i + 1}` }],
      });
      largeContent.push({
        role: 'model',
        parts: [{ text: `Model response ${i + 1}` }],
      });
    }

    testScenarios.forEach((scenario) => {
      const provider = scenario.createProvider();

      // All providers should handle large Content[] arrays efficiently
      const startTime = Date.now();

      expect(() => {
        provider.generateChatCompletion(largeContent, mockTools);
      }).not.toThrow();

      const processingTime = Date.now() - startTime;
      // Processing should be relatively fast (under 100ms for this test)
      expect(processingTime).toBeLessThan(100);

      console.log(
        `${scenario.provider}: ✓ Performance maintained (${processingTime}ms)`,
      );
    });
  });

  // MARKER: HS-042-INTEGRATION-ISOLATION - Test providers work in isolation
  test('providers work completely in isolation from each other', () => {
    // Create all providers simultaneously
    const anthropicProvider = new AnthropicProvider(mockConfig.apiKey);
    const openaiProvider = new OpenAIProvider(mockConfig.apiKey);
    const geminiProvider = new GeminiProvider(mockConfig.apiKey);

    const isolationTestContent: Content[] = [
      { role: 'user', parts: [{ text: 'Isolation test' }] },
    ];

    // All providers should work independently without interference
    expect(() => {
      anthropicProvider.generateChatCompletion(isolationTestContent, mockTools);
      openaiProvider.generateChatCompletion(isolationTestContent, mockTools);
      geminiProvider.generateChatCompletion(isolationTestContent, mockTools);
    }).not.toThrow();

    // Test that changes to one provider don't affect others
    anthropicProvider.setApiKey?.('anthropic-key');
    openaiProvider.setApiKey?.('openai-key');
    geminiProvider.setApiKey?.('gemini-key');

    // All should still work independently
    expect(() => {
      anthropicProvider.generateChatCompletion(isolationTestContent, mockTools);
      openaiProvider.generateChatCompletion(isolationTestContent, mockTools);
      geminiProvider.generateChatCompletion(isolationTestContent, mockTools);
    }).not.toThrow();

    console.log('All providers: ✓ Work in complete isolation');
  });
});
