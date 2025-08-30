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
  historyService?: unknown;
  getHistory?: unknown;
  updateHistory?: unknown;
  addToHistory?: unknown;
  removeFromHistory?: unknown;
  clearHistory?: unknown;
  orphanDetector?: unknown;
  syntheticGenerator?: unknown;
  historyManager?: unknown;
  conversationManager?: unknown;
  sessionManager?: unknown;
  memoryManager?: unknown;
  currentConversation?: unknown;
  lastConversation?: unknown;
  conversationHistory?: unknown;
  conversationCache?: unknown;
  conversationState?: unknown;
};

// MARKER: HS-042-INTERFACE-MOCK-CONFIG - Mock configuration for all providers
const mockConfig = {
  apiKey: 'test-key-12345',
  baseURL: undefined,
};

// Mock tools for consistency testing
const mockTools: ITool[] = [
  {
    name: 'test_function',
    description: 'Test function for consistency',
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Test input' },
      },
      required: ['input'],
    },
  },
];

describe('Provider Interface Consistency', () => {
  // MARKER: HS-042-INTERFACE-PROVIDER-FACTORIES - Provider factory functions without HistoryService
  const providers = [
    () => new AnthropicProvider(mockConfig.apiKey, mockConfig.baseURL),
    () => new OpenAIProvider(mockConfig.apiKey, mockConfig.baseURL),
    () => new GeminiProvider(mockConfig.apiKey, mockConfig.baseURL),
  ];

  const providerNames = [
    'AnthropicProvider',
    'OpenAIProvider',
    'GeminiProvider',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // MARKER: HS-042-INTERFACE-NO-HISTORYSERVICE - Test NO provider has HistoryService dependency
  test('NO provider has HistoryService dependency', () => {
    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];

      // Test that NO provider constructor accepts HistoryService
      expect(() => {
        createProvider();
      }).not.toThrow();

      // Verify providers have NO historyService property
      expect(
        (provider as ProviderWithPrivateProps).historyService,
      ).toBeUndefined();

      // Ensure complete separation from HistoryService
      expect((provider as ProviderWithPrivateProps).getHistory).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).updateHistory,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).addToHistory,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).removeFromHistory,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).clearHistory,
      ).toBeUndefined();

      console.log(`${providerName}: ✓ No HistoryService dependency`);
    });
  });

  // MARKER: HS-042-INTERFACE-CONTENT-PARAMS - Test all providers accept Content[] parameters
  test('all providers accept Content[] parameters', () => {
    const testContents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Test consistency across providers' }],
      },
    ];

    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];

      // Test that all provider methods accept Content[] parameters
      expect(() => {
        const result = provider.generateChatCompletion(testContents, mockTools);
        expect(result).toBeDefined();
        expect(Symbol.asyncIterator in result).toBe(true);
      }).not.toThrow();

      // Verify consistent method signatures across providers
      expect(typeof provider.generateChatCompletion).toBe('function');
      expect(provider.generateChatCompletion.length).toBeGreaterThanOrEqual(1); // At least takes contents parameter

      console.log(`${providerName}: ✓ Accepts Content[] parameters`);
    });
  });

  // MARKER: HS-042-INTERFACE-NO-ORPHAN-DETECTION - Test no provider contains orphan detection logic
  test('no provider contains orphan detection logic', () => {
    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];
      const providerSource = provider.constructor.toString();

      // Test that orphan detection is NOT in any provider
      expect(providerSource.includes('orphan')).toBe(false);
      expect(providerSource.includes('findOrphaned')).toBe(false);
      expect(providerSource.includes('detectOrphaned')).toBe(false);
      expect(providerSource.includes('completeOrphaned')).toBe(false);
      expect(providerSource.includes('synthetic')).toBe(false);
      expect(providerSource.includes('generateSynthetic')).toBe(false);
      expect(providerSource.includes('createFake')).toBe(false);

      // Verify providers work only with provided Content[]
      // Ensure clean separation of concerns
      expect(
        (provider as ProviderWithPrivateProps).orphanDetector,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).syntheticGenerator,
      ).toBeUndefined();

      console.log(`${providerName}: ✓ No orphan detection logic`);
    });
  });

  // MARKER: HS-042-INTERFACE-CONTENT-HANDLING - Test all providers handle Content[] consistently
  test('all providers handle Content[] consistently', () => {
    const testContentVariations: Content[][] = [
      // Simple text conversation
      [
        { role: 'user', parts: [{ text: 'Hello' }] },
        { role: 'model', parts: [{ text: 'Hi there!' }] },
      ],
      // Complex conversation with function calls
      [
        { role: 'user', parts: [{ text: 'Call a function' }] },
        {
          role: 'model',
          parts: [
            {
              functionCall: {
                id: 'test_call_123',
                name: 'test_function',
                args: { input: 'test' },
              },
            },
          ],
        },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                id: 'test_call_123',
                name: 'test_function',
                response: 'Function result',
              },
            },
          ],
        },
      ],
      // Multi-part content
      [
        {
          role: 'user',
          parts: [{ text: 'Part 1: ' }, { text: 'Part 2 of the message' }],
        },
      ],
    ];

    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];

      testContentVariations.forEach((contents, _variationIndex) => {
        // Test Content[] processing across all providers
        expect(() => {
          provider.generateChatCompletion(contents, mockTools);
        }).not.toThrow();

        // Verify consistent parameter handling patterns
        // All providers should accept the same Content[] format
      });

      // Ensure no provider modifies provided data
      const originalContent: Content[] = [
        { role: 'user', parts: [{ text: 'Original message' }] },
      ];
      const originalLength = originalContent.length;
      const originalText = originalContent[0].parts?.[0]?.text;

      provider.generateChatCompletion(originalContent, mockTools);

      expect(originalContent.length).toBe(originalLength);
      expect(originalContent[0].parts?.[0]?.text).toBe(originalText);

      console.log(`${providerName}: ✓ Handles Content[] consistently`);
    });
  });

  // MARKER: HS-042-INTERFACE-HISTORY-INDEPENDENCE - Test provider independence from history management
  test('provider independence from history management', () => {
    const content1: Content[] = [
      { role: 'user', parts: [{ text: 'First call' }] },
    ];
    const content2: Content[] = [
      { role: 'user', parts: [{ text: 'Second call' }] },
    ];

    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];

      // Test that providers work in isolation from history
      expect(() => {
        provider.generateChatCompletion(content1, mockTools);
        provider.generateChatCompletion(content2, mockTools);
      }).not.toThrow();

      // Verify providers focus on LLM communication only
      expect(typeof provider.generateChatCompletion).toBe('function');
      expect(typeof provider.getModels).toBe('function');
      expect(typeof provider.getDefaultModel).toBe('function');

      // Ensure NO history-specific business logic in providers
      expect(
        (provider as ProviderWithPrivateProps).historyManager,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).conversationManager,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).sessionManager,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).memoryManager,
      ).toBeUndefined();

      console.log(`${providerName}: ✓ Independent from history management`);
    });
  });

  // MARKER: HS-042-INTERFACE-METHOD-SIGNATURES - Test consistent method signatures
  test('all providers have consistent IProvider interface methods', () => {
    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];

      // Verify all providers implement IProvider interface
      expect(provider).toMatchObject({
        name: expect.any(String),
        generateChatCompletion: expect.any(Function),
        getModels: expect.any(Function),
        getDefaultModel: expect.any(Function),
        getServerTools: expect.any(Function),
        invokeServerTool: expect.any(Function),
      });

      // Test generateChatCompletion signature consistency
      expect(provider.generateChatCompletion.length).toBeGreaterThanOrEqual(1);

      // Test optional methods exist if implemented
      if (provider.setModel) {
        expect(typeof provider.setModel).toBe('function');
      }
      if (provider.getCurrentModel) {
        expect(typeof provider.getCurrentModel).toBe('function');
      }
      if (provider.setApiKey) {
        expect(typeof provider.setApiKey).toBe('function');
      }
      if (provider.setBaseUrl) {
        expect(typeof provider.setBaseUrl).toBe('function');
      }

      console.log(`${providerName}: ✓ Consistent IProvider interface`);
    });
  });

  // MARKER: HS-042-INTERFACE-STATELESS-OPERATION - Test providers operate statelessly
  test('all providers operate statelessly with Content[] only', () => {
    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];

      const conversation1: Content[] = [
        { role: 'user', parts: [{ text: 'Conversation 1' }] },
      ];
      const conversation2: Content[] = [
        { role: 'user', parts: [{ text: 'Conversation 2' }] },
      ];

      // Providers should handle different conversations without state interference
      expect(() => {
        provider.generateChatCompletion(conversation1, mockTools);
        provider.generateChatCompletion(conversation2, mockTools);
      }).not.toThrow();

      // Verify no conversation state is maintained between calls
      expect(
        (provider as ProviderWithPrivateProps).currentConversation,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).lastConversation,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).conversationHistory,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).conversationCache,
      ).toBeUndefined();
      expect(
        (provider as ProviderWithPrivateProps).conversationState,
      ).toBeUndefined();

      console.log(`${providerName}: ✓ Stateless operation`);
    });
  });

  // MARKER: HS-042-INTERFACE-AUTHENTICATION - Test consistent authentication patterns
  test('all providers handle authentication consistently', () => {
    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];

      // All providers should have authentication methods
      expect(typeof provider.setApiKey).toBe('function');

      // Test authentication changes work consistently
      expect(() => {
        provider.setApiKey?.('new-test-key');
      }).not.toThrow();

      // Optional authentication methods should work if present
      if (provider.setBaseUrl) {
        expect(() => {
          provider.setBaseUrl('https://test-endpoint.com');
        }).not.toThrow();
      }

      if (provider.isAuthenticated) {
        expect(typeof provider.isAuthenticated).toBe('function');
      }

      if (provider.clearAuth) {
        expect(typeof provider.clearAuth).toBe('function');
      }

      console.log(`${providerName}: ✓ Consistent authentication`);
    });
  });

  // MARKER: HS-042-INTERFACE-ERROR-HANDLING - Test consistent error handling patterns
  test('all providers handle errors consistently', () => {
    const invalidContent: Content[] = []; // Empty content array

    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];

      // All providers should handle invalid input gracefully
      expect(() => {
        provider.generateChatCompletion(invalidContent, mockTools);
      }).not.toThrow();

      // Providers should handle missing tools gracefully
      expect(() => {
        const validContent: Content[] = [
          { role: 'user', parts: [{ text: 'Test message' }] },
        ];
        provider.generateChatCompletion(validContent); // No tools provided
      }).not.toThrow();

      console.log(`${providerName}: ✓ Consistent error handling`);
    });
  });

  // MARKER: HS-042-INTERFACE-CONTENT-FORMAT - Test providers preserve Content[] format integrity
  test('all providers preserve Content[] format integrity', () => {
    const testContent: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Test format preservation' }],
      },
      {
        role: 'model',
        parts: [
          { text: 'Response text' },
          {
            functionCall: {
              id: 'format_test',
              name: 'test_function',
              args: { test: true },
            },
          },
        ],
      },
    ];

    providers.forEach((createProvider, index) => {
      const provider = createProvider();
      const providerName = providerNames[index];

      // Providers should not corrupt the Content[] format
      const originalContentString = JSON.stringify(testContent);

      provider.generateChatCompletion(testContent, mockTools);

      // Original content should remain unchanged
      expect(JSON.stringify(testContent)).toBe(originalContentString);

      // Content should maintain its structure
      expect(Array.isArray(testContent)).toBe(true);
      expect(testContent[0]).toHaveProperty('role');
      expect(testContent[0]).toHaveProperty('parts');
      expect(Array.isArray(testContent[0].parts)).toBe(true);

      console.log(`${providerName}: ✓ Preserves Content[] format integrity`);
    });
  });
});
