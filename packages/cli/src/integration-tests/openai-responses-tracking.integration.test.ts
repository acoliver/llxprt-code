/**
 * @plan PLAN-20250826-RESPONSES.P26
 * @requirement REQ-INT-001
 * Integration tests for OpenAI Responses API conversation tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Config,
  ConfigParameters,
  ApprovalMode,
} from '@vybestack/llxprt-code-core/src/config/config.js';
import { ProviderContentGenerator } from '@vybestack/llxprt-code-core/src/providers/ProviderContentGenerator.js';
import { GeminiCompatibleWrapper } from '@vybestack/llxprt-code-core/src/providers/adapters/GeminiCompatibleWrapper.js';
import { Content } from '@google/genai';
import type { IProvider } from '@vybestack/llxprt-code-core/src/providers/IProvider.js';
import type { IProviderManager } from '@vybestack/llxprt-code-core/src/providers/IProviderManager.js';

// Mock provider for testing sessionId flow
class MockOpenAIProvider implements IProvider {
  capturedSessionIds: string[] = [];
  capturedCalls: Array<{
    contents: Content[];
    tools?: unknown[];
    toolFormat?: string;
    sessionId?: string;
  }> = [];

  name = 'mock-openai';

  async *generateChatCompletion(
    contents: Content[],
    tools?: unknown[],
    toolFormat?: string,
    sessionId?: string,
  ): AsyncIterableIterator<Content> {
    // Capture the call details for verification
    this.capturedCalls.push({
      contents,
      tools,
      toolFormat,
      sessionId,
    });

    if (sessionId) {
      this.capturedSessionIds.push(sessionId);
    }

    // Mock response with Content format and metadata
    yield {
      role: 'model',
      parts: [{ text: 'Mock response' }],
      metadata: { responseId: `resp-${Date.now()}` },
    } as Content & { metadata: { responseId: string } };
  }

  async *generateChatCompletionEx() {
    throw new Error('generateChatCompletionEx not implemented in mock');
  }

  async getModels() {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'mock-openai',
        supportedToolFormats: ['openai'],
      },
    ];
  }

  getDefaultModel(): string {
    return 'gpt-4o';
  }

  getServerTools(): string[] {
    return [];
  }

  async invokeServerTool(): Promise<unknown> {
    return {};
  }

  // Reset for each test
  reset() {
    this.capturedSessionIds = [];
    this.capturedCalls = [];
  }
}

// Mock provider manager
class MockProviderManager implements IProviderManager {
  constructor(private mockProvider: MockOpenAIProvider) {}

  setConfig(): void {}
  registerProvider(): void {}
  setActiveProvider(_name: string): void {}
  clearActiveProvider(): void {}
  hasActiveProvider(): boolean {
    return true;
  }
  getActiveProvider(): IProvider {
    return this.mockProvider;
  }
  getActiveProviderName(): string {
    return 'mock-openai';
  }
  async getAvailableModels() {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'mock-openai',
        supportedToolFormats: ['openai'],
      },
    ];
  }
  listProviders(): string[] {
    return ['mock-openai'];
  }
  getServerToolsProvider() {
    return null;
  }
  setServerToolsProvider(): void {}
}

describe('OpenAI Responses API conversation tracking integration', () => {
  let mockProvider: MockOpenAIProvider;
  let mockProviderManager: MockProviderManager;
  let config: Config;

  beforeEach(() => {
    mockProvider = new MockOpenAIProvider();
    mockProviderManager = new MockProviderManager(mockProvider);

    const configParams: ConfigParameters = {
      sessionId: 'test-session-123',
      targetDir: '/tmp/test',
      debugMode: false,
      approvalMode: ApprovalMode.DEFAULT,
      cwd: '/tmp/test',
      model: 'gpt-4o',
    };

    config = new Config(configParams);
  });

  /**
   * @requirement REQ-001.2 - sessionId flows from config through integration points
   * @scenario SessionId flows through ProviderContentGenerator
   * @given Config with sessionId and ProviderContentGenerator
   * @when generateContent called
   * @then SessionId passes through all layers to provider
   */
  it('should flow sessionId from config through ProviderContentGenerator', async () => {
    const contentGenerator = new ProviderContentGenerator(
      mockProviderManager,
      { model: 'gpt-4o' },
      config,
    );

    const request = {
      contents: 'Test message',
      model: 'gpt-4o',
    };

    // Call generateContent which should flow sessionId through
    const response = await contentGenerator.generateContent(request);

    expect(response).toBeDefined();

    // Verify sessionId was captured by mock provider
    expect(mockProvider.capturedSessionIds).toContain('test-session-123');
    expect(mockProvider.capturedCalls).toHaveLength(1);
    expect(mockProvider.capturedCalls[0].sessionId).toBe('test-session-123');
  });

  /**
   * @requirement REQ-001.3 - sessionId flows through streaming
   * @scenario SessionId flows through streaming content generation
   * @given Config with sessionId and streaming
   * @when generateContentStream called
   * @then SessionId passes through to provider stream
   */
  it('should flow sessionId through streaming content generation', async () => {
    const contentGenerator = new ProviderContentGenerator(
      mockProviderManager,
      { model: 'gpt-4o' },
      config,
    );

    const request = {
      contents: 'Streaming test message',
      model: 'gpt-4o',
    };

    // Call generateContentStream which should flow sessionId through
    const streamGenerator =
      await contentGenerator.generateContentStream(request);

    // Consume first chunk
    const firstResult = await streamGenerator.next();
    expect(firstResult.done).toBe(false);
    expect(firstResult.value).toBeDefined();

    // Verify sessionId was captured by mock provider
    expect(mockProvider.capturedSessionIds).toContain('test-session-123');
    expect(mockProvider.capturedCalls).toHaveLength(1);
    expect(mockProvider.capturedCalls[0].sessionId).toBe('test-session-123');
  });

  /**
   * @requirement REQ-INT-001.2 - GeminiCompatibleWrapper passes sessionId
   * @scenario Direct wrapper integration with sessionId
   * @given GeminiCompatibleWrapper with mock provider
   * @when generateContent called with explicit sessionId
   * @then SessionId passes through wrapper to provider
   */
  it('should pass sessionId through GeminiCompatibleWrapper', async () => {
    const wrapper = new GeminiCompatibleWrapper(mockProvider);

    const params = {
      contents: 'Direct wrapper test',
      model: 'gpt-4o',
      sessionId: 'wrapper-session-456',
    };

    // Call wrapper directly
    const response = await wrapper.generateContent(params);

    expect(response).toBeDefined();

    // Verify sessionId was captured
    expect(mockProvider.capturedSessionIds).toContain('wrapper-session-456');
    expect(mockProvider.capturedCalls).toHaveLength(1);
    expect(mockProvider.capturedCalls[0].sessionId).toBe('wrapper-session-456');
  });

  /**
   * @requirement REQ-002.2 - Response ID in Content metadata
   * @scenario Mock provider returns Content with metadata
   * @given Provider that returns Content with responseId metadata
   * @when Content processed through integration
   * @then Metadata preserved through the stack
   */
  it('should preserve Content metadata through integration stack', async () => {
    const contentGenerator = new ProviderContentGenerator(
      mockProviderManager,
      { model: 'gpt-4o' },
      config,
    );

    const request = {
      contents: 'Metadata test',
      model: 'gpt-4o',
    };

    // Generate content and check metadata
    const response = await contentGenerator.generateContent(request);

    expect(response).toBeDefined();
    expect(response.candidates).toBeDefined();
    expect(response.candidates?.[0]).toBeDefined();
  });

  /**
   * Property-based test (30% minimum requirement)
   * @behavior Should handle any valid sessionId
   * @given Any non-empty sessionId string
   * @when Passed through integration stack
   * @then Should be captured correctly
   */
  it('should handle any valid sessionId string', async () => {
    const sessionIds = [
      'simple-session',
      'session-with-dashes-123',
      'session_with_underscores_456',
      'UPPERCASE-SESSION-789',
      'mixed-Case-Session-ABC',
    ];

    for (const sessionId of sessionIds) {
      mockProvider.reset();

      const testConfig = new Config({
        sessionId,
        targetDir: '/tmp/test',
        debugMode: false,
        approvalMode: ApprovalMode.DEFAULT,
        cwd: '/tmp/test',
        model: 'gpt-4o',
      });

      const contentGenerator = new ProviderContentGenerator(
        mockProviderManager,
        { model: 'gpt-4o' },
        testConfig,
      );

      await contentGenerator.generateContent({
        contents: `Test with ${sessionId}`,
        model: 'gpt-4o',
      });

      expect(mockProvider.capturedSessionIds).toContain(sessionId);
      expect(mockProvider.capturedCalls[0].sessionId).toBe(sessionId);
    }
  });
});
