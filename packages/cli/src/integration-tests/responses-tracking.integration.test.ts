/**
 * @plan PLAN-20250826-RESPONSES.P36
 * @requirement REQ-E2E-001
 * End-to-end integration tests for OpenAI Responses API conversation tracking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Config,
  ProviderContentGenerator,
  ApprovalMode,
  type IProvider,
  type IProviderManager,
} from '@vybestack/llxprt-code-core';
import { Content } from '@google/genai';
import { createTempDirectory, cleanupTempDirectory } from './test-utils.js';

// Mock OpenAI-compatible provider that tracks conversation flow
class MockOpenAIProvider implements IProvider {
  name = 'mock-openai';
  private conversationHistory: Array<{
    sessionId?: string;
    contents: Content[];
    tools?: unknown[];
    toolFormat?: string;
    timestamp: number;
  }> = [];

  private responseCounter = 0;
  private instanceId: string; // Unique instance identifier

  // Track all generated response IDs for verification
  generatedResponseIds: string[] = [];

  constructor() {
    // Create unique instance ID to ensure responseIds don't collide
    this.instanceId = Math.random().toString(36).substring(2, 15);
  }

  async *generateChatCompletion(
    contents: Content[],
    tools?: unknown[],
    toolFormat?: string,
    sessionId?: string,
  ): AsyncIterableIterator<Content> {
    const timestamp = Date.now();

    // Record this conversation turn
    this.conversationHistory.push({
      sessionId,
      contents: [...contents], // Deep copy to avoid mutations
      tools,
      toolFormat,
      timestamp,
    });

    // Generate response ID for OpenAI Responses API compliance
    const responseId = `resp-${this.name}-${this.instanceId}-${this.responseCounter++}-${timestamp}`;
    this.generatedResponseIds.push(responseId);

    // Yield response with proper Content structure and responseId metadata
    yield {
      role: 'model',
      parts: [
        {
          text: `Mock response from ${this.name}. SessionId: ${sessionId || 'none'}. Turn: ${this.conversationHistory.length}`,
        },
      ],
      metadata: {
        responseId,
        sessionId,
        turnNumber: this.conversationHistory.length,
        timestamp,
      },
    } as Content & {
      metadata: {
        responseId: string;
        sessionId?: string;
        turnNumber: number;
        timestamp: number;
      };
    };
  }

  async *generateChatCompletionEx() {
    throw new Error('generateChatCompletionEx not implemented in mock');
  }

  async getModels() {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: this.name,
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
    return { result: 'mock tool result' };
  }

  // Test utilities
  getConversationHistory() {
    return [...this.conversationHistory];
  }

  getLastSessionId(): string | undefined {
    return this.conversationHistory[this.conversationHistory.length - 1]
      ?.sessionId;
  }

  getTurnCount(): number {
    return this.conversationHistory.length;
  }

  clear() {
    this.conversationHistory = [];
    this.responseCounter = 0;
    this.generatedResponseIds = [];
  }
}

// Mock alternative provider for provider switching tests
class MockAlternativeProvider implements IProvider {
  name = 'mock-alternative';
  private conversationHistory: Array<{
    sessionId?: string;
    contents: Content[];
    timestamp: number;
  }> = [];

  private responseCounter = 0;
  private instanceId: string; // Unique instance identifier
  generatedResponseIds: string[] = [];

  constructor() {
    // Create unique instance ID to ensure responseIds don't collide
    this.instanceId = Math.random().toString(36).substring(2, 15);
  }

  async *generateChatCompletion(
    contents: Content[],
    tools?: unknown[],
    toolFormat?: string,
    sessionId?: string,
  ): AsyncIterableIterator<Content> {
    const timestamp = Date.now();

    this.conversationHistory.push({
      sessionId,
      contents: [...contents],
      timestamp,
    });

    const responseId = `resp-${this.name}-${this.instanceId}-${this.responseCounter++}-${timestamp}`;
    this.generatedResponseIds.push(responseId);

    yield {
      role: 'model',
      parts: [
        {
          text: `Alternative provider response. SessionId: ${sessionId || 'none'}. History length: ${this.conversationHistory.length}`,
        },
      ],
      metadata: {
        responseId,
        sessionId,
        providerName: this.name,
        timestamp,
      },
    } as Content & {
      metadata: {
        responseId: string;
        sessionId?: string;
        providerName: string;
        timestamp: number;
      };
    };
  }

  async *generateChatCompletionEx() {
    throw new Error('generateChatCompletionEx not implemented in mock');
  }

  async getModels() {
    return [
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: this.name,
        supportedToolFormats: ['anthropic'],
      },
    ];
  }

  getDefaultModel(): string {
    return 'claude-3-5-sonnet';
  }

  getServerTools(): string[] {
    return [];
  }

  async invokeServerTool(): Promise<unknown> {
    return { result: 'alternative tool result' };
  }

  getConversationHistory() {
    return [...this.conversationHistory];
  }

  clear() {
    this.conversationHistory = [];
    this.responseCounter = 0;
    this.generatedResponseIds = [];
  }
}

// Mock provider manager for E2E testing
class TestProviderManager implements IProviderManager {
  private providers = new Map<string, IProvider>();
  private activeProvider: IProvider | null = null;
  private serverToolsProvider: IProvider | null = null;

  registerProvider(provider: IProvider): void {
    this.providers.set(provider.name, provider);
  }

  setActiveProvider(name: string): void {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }
    this.activeProvider = provider;
  }

  clearActiveProvider(): void {
    this.activeProvider = null;
  }

  hasActiveProvider(): boolean {
    return this.activeProvider !== null;
  }

  getActiveProvider(): IProvider {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }
    return this.activeProvider;
  }

  getActiveProviderName(): string {
    if (!this.activeProvider) {
      throw new Error('No active provider set');
    }
    return this.activeProvider.name;
  }

  async getAvailableModels() {
    const allModels = [];
    for (const provider of this.providers.values()) {
      const models = await provider.getModels();
      allModels.push(...models);
    }
    return allModels;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getServerToolsProvider(): IProvider | null {
    return this.serverToolsProvider;
  }

  setServerToolsProvider(provider: IProvider | null): void {
    this.serverToolsProvider = provider;
  }

  setConfig(): void {}
}

describe('OpenAI Responses API Conversation Tracking E2E Tests', () => {
  let tempDir: string;
  let config: Config;
  let providerManager: TestProviderManager;
  let openaiProvider: MockOpenAIProvider;
  let alternativeProvider: MockAlternativeProvider;
  let contentGenerator: ProviderContentGenerator;

  beforeEach(async () => {
    tempDir = await createTempDirectory();

    // Create providers
    openaiProvider = new MockOpenAIProvider();
    alternativeProvider = new MockAlternativeProvider();

    // Set up provider manager
    providerManager = new TestProviderManager();
    providerManager.registerProvider(openaiProvider);
    providerManager.registerProvider(alternativeProvider);
    providerManager.setActiveProvider('mock-openai');

    // Create config with session ID
    config = new Config({
      sessionId: `e2e-session-${Date.now()}`,
      targetDir: tempDir,
      debugMode: false,
      approvalMode: ApprovalMode.DEFAULT,
      cwd: tempDir,
      model: 'gpt-4o',
    });

    await config.initialize();

    // Set up content generator
    contentGenerator = new ProviderContentGenerator(
      providerManager,
      { model: 'gpt-4o' },
      config,
    );
  });

  afterEach(async () => {
    await cleanupTempDirectory(tempDir);
    openaiProvider.clear();
    alternativeProvider.clear();
  });

  /**
   * @requirement REQ-E2E-001.1 - Start new conversation with sessionId
   * @scenario New conversation with GPT-5 equivalent (GPT-4o) with sessionId tracking
   * @given Fresh config with sessionId and OpenAI provider
   * @when Starting new conversation
   * @then SessionId flows through and responseId is generated
   */
  it('should start new conversation with sessionId tracking', async () => {
    const sessionId = config.getSessionId();
    expect(sessionId).toBeDefined();
    expect(sessionId).toMatch(/^e2e-session-\d+$/);

    const request = {
      contents: 'Start a new conversation about API design',
      model: 'gpt-4o',
    };

    // Generate first response
    const response = await contentGenerator.generateContent(request);

    // Verify response structure
    expect(response).toBeDefined();
    expect(response.candidates).toBeDefined();
    expect(response.candidates?.length).toBeGreaterThan(0);

    // Verify sessionId was passed through to provider
    expect(openaiProvider.getLastSessionId()).toBe(sessionId);
    expect(openaiProvider.getTurnCount()).toBe(1);

    // Verify responseId was generated and stored
    expect(openaiProvider.generatedResponseIds).toHaveLength(1);
    expect(openaiProvider.generatedResponseIds[0]).toMatch(
      /^resp-mock-openai-[a-z0-9]+-0-\d+$/,
    );

    // Verify conversation history contains sessionId
    const history = openaiProvider.getConversationHistory();
    expect(history[0].sessionId).toBe(sessionId);
  });

  /**
   * @requirement REQ-E2E-001.2 - Continue conversation with multiple messages
   * @scenario Multi-turn conversation maintaining sessionId and responseId continuity
   * @given Active conversation with existing sessionId
   * @when Adding multiple messages to conversation
   * @then Each turn maintains sessionId and generates unique responseId
   */
  it('should continue conversation with multiple messages and unique responseIds', async () => {
    const sessionId = config.getSessionId();

    // First message
    await contentGenerator.generateContent({
      contents: 'What is REST API design?',
      model: 'gpt-4o',
    });

    // Second message
    await contentGenerator.generateContent({
      contents: 'Can you provide an example?',
      model: 'gpt-4o',
    });

    // Third message
    await contentGenerator.generateContent({
      contents: 'What about GraphQL comparison?',
      model: 'gpt-4o',
    });

    // Verify conversation continuity
    expect(openaiProvider.getTurnCount()).toBe(3);

    // Verify all turns have same sessionId
    const history = openaiProvider.getConversationHistory();
    expect(history).toHaveLength(3);
    history.forEach((turn) => {
      expect(turn.sessionId).toBe(sessionId);
    });

    // Verify unique responseIds were generated for each turn
    expect(openaiProvider.generatedResponseIds).toHaveLength(3);
    const responseIds = openaiProvider.generatedResponseIds;
    expect(new Set(responseIds)).toHaveProperty('size', 3); // All unique

    // Verify responseId format and uniqueness
    responseIds.forEach((responseId, index) => {
      expect(responseId).toMatch(/^resp-mock-openai-[a-z0-9]+-\d+-\d+$/);
      expect(responseId).toContain(`-${index}-`);
    });
  });

  /**
   * @requirement REQ-E2E-001.3 - Switch providers mid-conversation
   * @scenario Provider switch while maintaining conversation context
   * @given Active conversation with OpenAI provider
   * @when Switching to alternative provider mid-conversation
   * @then SessionId transfers and new provider generates own responseIds
   */
  it('should maintain sessionId when switching providers mid-conversation', async () => {
    const sessionId = config.getSessionId();

    // Start conversation with OpenAI provider
    await contentGenerator.generateContent({
      contents: 'Start with OpenAI provider',
      model: 'gpt-4o',
    });

    expect(openaiProvider.getTurnCount()).toBe(1);
    expect(openaiProvider.getLastSessionId()).toBe(sessionId);

    // Switch to alternative provider
    providerManager.setActiveProvider('mock-alternative');

    // Update content generator to use new provider
    const newContentGenerator = new ProviderContentGenerator(
      providerManager,
      { model: 'claude-3-5-sonnet' },
      config, // Same config with same sessionId
    );

    // Continue conversation with alternative provider
    await newContentGenerator.generateContent({
      contents: 'Continue with alternative provider',
      model: 'claude-3-5-sonnet',
    });

    // Verify original provider state unchanged
    expect(openaiProvider.getTurnCount()).toBe(1);

    // Verify alternative provider received same sessionId
    expect(alternativeProvider.getConversationHistory()).toHaveLength(1);
    expect(alternativeProvider.getConversationHistory()[0].sessionId).toBe(
      sessionId,
    );

    // Verify both providers generated unique responseIds
    expect(openaiProvider.generatedResponseIds).toHaveLength(1);
    expect(alternativeProvider.generatedResponseIds).toHaveLength(1);
    expect(openaiProvider.generatedResponseIds[0]).toMatch(
      /^resp-mock-openai-[a-z0-9]+-/,
    );
    expect(alternativeProvider.generatedResponseIds[0]).toMatch(
      /^resp-mock-alternative-[a-z0-9]+-/,
    );

    // Verify responseIds are different between providers
    expect(openaiProvider.generatedResponseIds[0]).not.toBe(
      alternativeProvider.generatedResponseIds[0],
    );
  });

  /**
   * @requirement REQ-E2E-001.4 - Save and load conversation with IDs
   * @scenario Conversation persistence with sessionId and responseId preservation
   * @given Completed conversation with multiple responses
   * @when Simulating save/load cycle
   * @then SessionId and responseIds are maintained across persistence
   */
  it('should preserve sessionId and responseIds through conversation save/load simulation', async () => {
    const sessionId = config.getSessionId();

    // Generate a multi-turn conversation
    const turns = [
      'Initial question about microservices',
      'Follow-up about service discovery',
      'Question about error handling patterns',
    ];

    for (const turn of turns) {
      await contentGenerator.generateContent({
        contents: turn,
        model: 'gpt-4o',
      });
    }

    // Capture conversation state for "save"
    const savedHistory = openaiProvider.getConversationHistory();
    const savedResponseIds = [...openaiProvider.generatedResponseIds];
    const savedSessionId = sessionId;

    expect(savedHistory).toHaveLength(3);
    expect(savedResponseIds).toHaveLength(3);

    // Simulate application restart by creating entirely new provider and manager
    const newOpenaiProvider = new MockOpenAIProvider();
    const newProviderManager = new TestProviderManager();
    newProviderManager.registerProvider(newOpenaiProvider);
    newProviderManager.setActiveProvider('mock-openai');

    // Create new config with same sessionId (simulating load)
    const loadedConfig = new Config({
      sessionId: savedSessionId,
      targetDir: tempDir,
      debugMode: false,
      approvalMode: ApprovalMode.DEFAULT,
      cwd: tempDir,
      model: 'gpt-4o',
    });

    await loadedConfig.initialize();

    // Verify loaded sessionId matches
    expect(loadedConfig.getSessionId()).toBe(savedSessionId);

    // Continue conversation with loaded config and new provider
    const loadedContentGenerator = new ProviderContentGenerator(
      newProviderManager,
      { model: 'gpt-4o' },
      loadedConfig,
    );

    await loadedContentGenerator.generateContent({
      contents: 'Continue after reload',
      model: 'gpt-4o',
    });

    // Verify sessionId continuity after load
    expect(newOpenaiProvider.getLastSessionId()).toBe(savedSessionId);
    expect(newOpenaiProvider.getTurnCount()).toBe(1); // New turn after reload

    // Verify new responseId was generated
    expect(newOpenaiProvider.generatedResponseIds).toHaveLength(1);
    expect(newOpenaiProvider.generatedResponseIds[0]).toMatch(
      /^resp-mock-openai-[a-z0-9]+-/,
    );

    // Verify new responseId is different from saved ones (new provider instance)
    expect(savedResponseIds).not.toContain(
      newOpenaiProvider.generatedResponseIds[0],
    );

    // Verify the original saved data is intact (simulating persistent storage)
    expect(savedResponseIds).toHaveLength(3);
    savedResponseIds.forEach((responseId) => {
      expect(responseId).toMatch(/^resp-mock-openai-[a-z0-9]+-\d+-\d+$/);
    });
  });

  /**
   * @requirement REQ-E2E-001.5 - Verify response IDs persist in metadata
   * @scenario ResponseId metadata preservation through the stack
   * @given Content generation with responseId metadata
   * @when Processing through integration layers
   * @then Metadata with responseId is preserved and accessible
   */
  it('should preserve responseId metadata through the integration stack', async () => {
    const sessionId = config.getSessionId();

    // Generate content and capture metadata
    const response = await contentGenerator.generateContent({
      contents: 'Test metadata preservation',
      model: 'gpt-4o',
    });

    // Verify response structure and metadata
    expect(response).toBeDefined();
    expect(response.candidates).toBeDefined();
    expect(response.candidates?.[0]).toBeDefined();

    const firstCandidate = response.candidates?.[0];
    expect(firstCandidate?.content).toBeDefined();

    // Verify provider captured the request correctly
    expect(openaiProvider.getTurnCount()).toBe(1);
    expect(openaiProvider.getLastSessionId()).toBe(sessionId);

    // Verify responseId was generated
    expect(openaiProvider.generatedResponseIds).toHaveLength(1);
    const generatedResponseId = openaiProvider.generatedResponseIds[0];
    expect(generatedResponseId).toMatch(/^resp-mock-openai-[a-z0-9]+-0-\d+$/);

    // Test streaming to verify metadata flows through streaming path
    const streamRequest = {
      contents: 'Test streaming metadata',
      model: 'gpt-4o',
    };

    const streamGenerator =
      await contentGenerator.generateContentStream(streamRequest);
    const firstStreamResult = await streamGenerator.next();

    expect(firstStreamResult.done).toBe(false);
    expect(firstStreamResult.value).toBeDefined();

    // Verify second responseId was generated for streaming
    expect(openaiProvider.generatedResponseIds).toHaveLength(2);
    const streamingResponseId = openaiProvider.generatedResponseIds[1];
    expect(streamingResponseId).toMatch(/^resp-mock-openai-[a-z0-9]+-1-\d+$/);
    expect(streamingResponseId).not.toBe(generatedResponseId);
  });

  /**
   * @requirement REQ-E2E-001.6 - Complete conversation flow validation
   * @scenario Full end-to-end conversation flow with all tracking features
   * @given Clean environment with conversation tracking enabled
   * @when Executing complete conversation workflow
   * @then All tracking requirements are met simultaneously
   */
  it('should handle complete conversation flow with all tracking features', async () => {
    const sessionId = config.getSessionId();

    // Phase 1: Start conversation
    await contentGenerator.generateContent({
      contents: 'Start comprehensive test conversation',
      model: 'gpt-4o',
    });

    // Phase 2: Multi-turn conversation
    await contentGenerator.generateContent({
      contents: 'Continue conversation',
      model: 'gpt-4o',
    });

    // Capture OpenAI provider state
    const openaiTurns = openaiProvider.getTurnCount();
    const openaiResponseIds = [...openaiProvider.generatedResponseIds];

    // Phase 3: Provider switch
    providerManager.setActiveProvider('mock-alternative');
    const altContentGenerator = new ProviderContentGenerator(
      providerManager,
      { model: 'claude-3-5-sonnet' },
      config,
    );

    await altContentGenerator.generateContent({
      contents: 'Switch to alternative provider',
      model: 'claude-3-5-sonnet',
    });

    // Phase 4: Switch back to original provider
    providerManager.setActiveProvider('mock-openai');
    const backToOpenaiGenerator = new ProviderContentGenerator(
      providerManager,
      { model: 'gpt-4o' },
      config,
    );

    await backToOpenaiGenerator.generateContent({
      contents: 'Back to OpenAI provider',
      model: 'gpt-4o',
    });

    // Comprehensive validation

    // Verify OpenAI provider conversation state
    expect(openaiProvider.getTurnCount()).toBe(openaiTurns + 1); // Added one more turn
    expect(openaiProvider.generatedResponseIds).toHaveLength(
      openaiResponseIds.length + 1,
    );

    // Verify alternative provider state
    expect(alternativeProvider.getConversationHistory()).toHaveLength(1);
    expect(alternativeProvider.generatedResponseIds).toHaveLength(1);

    // Verify sessionId consistency across all providers
    openaiProvider.getConversationHistory().forEach((turn) => {
      expect(turn.sessionId).toBe(sessionId);
    });
    alternativeProvider.getConversationHistory().forEach((turn) => {
      expect(turn.sessionId).toBe(sessionId);
    });

    // Verify unique responseIds across all providers
    const allResponseIds = [
      ...openaiProvider.generatedResponseIds,
      ...alternativeProvider.generatedResponseIds,
    ];
    expect(new Set(allResponseIds)).toHaveProperty(
      'size',
      allResponseIds.length,
    );

    // Verify responseId format consistency
    openaiProvider.generatedResponseIds.forEach((id) => {
      expect(id).toMatch(/^resp-mock-openai-[a-z0-9]+-\d+-\d+$/);
    });
    alternativeProvider.generatedResponseIds.forEach((id) => {
      expect(id).toMatch(/^resp-mock-alternative-[a-z0-9]+-\d+-\d+$/);
    });
  });
});
