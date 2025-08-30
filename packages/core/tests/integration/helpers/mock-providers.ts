/**
 * Mock Provider Services for Integration Testing
 *
 * This module provides mock implementations of AI providers (OpenAI, Anthropic)
 * for integration testing, including response simulation and failure scenarios.
 */

import { EventEmitter } from 'events';
import { ProviderType } from '../../../src/services/history/types';

export interface MockProviderConfig {
  responseDelay?: number;
  failureRate?: number;
  enableStreaming?: boolean;
  enableFunctionCalling?: boolean;
}

export interface MockResponse {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface MockProvider {
  type: ProviderType;
  generateResponse(prompt: string): Promise<MockResponse>;
  simulateFailure(): void;
  reset(): void;
}

export class MockOpenAIProvider extends EventEmitter implements MockProvider {
  public type: ProviderType = ProviderType.OPENAI;
  private config: MockProviderConfig;
  private callCount: number = 0;
  private shouldFail: boolean = false;

  constructor(config: MockProviderConfig = {}) {
    super();
    this.config = {
      responseDelay: 100,
      failureRate: 0,
      enableStreaming: false,
      enableFunctionCalling: false,
      ...config,
    };
  }

  async generateResponse(prompt: string): Promise<MockResponse> {
    this.callCount++;

    if (
      this.shouldFail ||
      (this.config.failureRate && Math.random() < this.config.failureRate)
    ) {
      throw new Error('Mock OpenAI provider failure');
    }

    if (this.config.responseDelay && this.config.responseDelay > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.responseDelay),
      );
    }

    const response: MockResponse = {
      id: `openai-resp-${this.callCount}`,
      content: `Mock OpenAI response to: ${prompt.substring(0, 50)}...`,
      metadata: {
        model: 'gpt-4',
        tokens: this.estimateTokens(prompt),
        usage: {
          prompt_tokens: this.estimateTokens(prompt),
          completion_tokens: 150,
          total_tokens: this.estimateTokens(prompt) + 150,
        },
        finish_reason: 'stop',
      },
      timestamp: new Date(),
    };

    this.emit('response', response);
    return response;
  }

  simulateFailure(): void {
    this.shouldFail = true;
  }

  reset(): void {
    this.shouldFail = false;
    this.callCount = 0;
    this.removeAllListeners();
  }

  getCallCount(): number {
    return this.callCount;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export class MockAnthropicProvider
  extends EventEmitter
  implements MockProvider
{
  public type: ProviderType = ProviderType.ANTHROPIC;
  private config: MockProviderConfig;
  private callCount: number = 0;
  private shouldFail: boolean = false;

  constructor(config: MockProviderConfig = {}) {
    super();
    this.config = {
      responseDelay: 120,
      failureRate: 0,
      enableStreaming: false,
      enableFunctionCalling: false,
      ...config,
    };
  }

  async generateResponse(prompt: string): Promise<MockResponse> {
    this.callCount++;

    if (
      this.shouldFail ||
      (this.config.failureRate && Math.random() < this.config.failureRate)
    ) {
      throw new Error('Mock Anthropic provider failure');
    }

    if (this.config.responseDelay && this.config.responseDelay > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.responseDelay),
      );
    }

    const response: MockResponse = {
      id: `anthropic-resp-${this.callCount}`,
      content: `Mock Anthropic response to: ${prompt.substring(0, 50)}...`,
      metadata: {
        model: 'claude-3-opus-20240229',
        tokens: this.estimateTokens(prompt) + 140,
        usage: {
          input_tokens: this.estimateTokens(prompt),
          output_tokens: 140,
        },
        stop_reason: 'end_turn',
      },
      timestamp: new Date(),
    };

    this.emit('response', response);
    return response;
  }

  simulateFailure(): void {
    this.shouldFail = true;
  }

  reset(): void {
    this.shouldFail = false;
    this.callCount = 0;
    this.removeAllListeners();
  }

  getCallCount(): number {
    return this.callCount;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export class MockProviders {
  private openAIProvider: MockOpenAIProvider | null = null;
  private anthropicProvider: MockAnthropicProvider | null = null;
  private initialized: boolean = false;

  /**
   * Initializes mock provider services
   */
  async initialize(): Promise<void> {
    this.openAIProvider = new MockOpenAIProvider();
    this.anthropicProvider = new MockAnthropicProvider();
    this.initialized = true;
  }

  /**
   * Initializes mock OpenAI provider
   */
  async initializeMockOpenAI(
    config?: MockProviderConfig,
  ): Promise<MockOpenAIProvider> {
    this.openAIProvider = new MockOpenAIProvider(config);
    return this.openAIProvider;
  }

  /**
   * Initializes mock Anthropic provider
   */
  async initializeMockAnthropic(
    config?: MockProviderConfig,
  ): Promise<MockAnthropicProvider> {
    this.anthropicProvider = new MockAnthropicProvider(config);
    return this.anthropicProvider;
  }

  /**
   * Creates OpenAI provider instance for testing
   */
  createOpenAIProvider(config?: MockProviderConfig): MockOpenAIProvider {
    return new MockOpenAIProvider(config);
  }

  /**
   * Creates Anthropic provider instance for testing
   */
  createAnthropicProvider(config?: MockProviderConfig): MockAnthropicProvider {
    return new MockAnthropicProvider(config);
  }

  /**
   * Simulates response patterns for testing
   */
  async simulateResponsePatterns(): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Mock providers not initialized');
    }

    // TODO: Implement response pattern simulation
    // This is a stub implementation
    return true;
  }

  /**
   * Simulates failure scenarios for testing
   */
  async simulateFailureScenarios(): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Mock providers not initialized');
    }

    if (this.openAIProvider) {
      this.openAIProvider.simulateFailure();
    }

    if (this.anthropicProvider) {
      this.anthropicProvider.simulateFailure();
    }

    return true;
  }

  /**
   * Validates mock provider consistency
   */
  async validateConsistency(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    // TODO: Implement consistency validation
    // This is a stub implementation
    return this.openAIProvider !== null && this.anthropicProvider !== null;
  }

  /**
   * Gets OpenAI provider instance
   */
  getOpenAIProvider(): MockOpenAIProvider | null {
    return this.openAIProvider;
  }

  /**
   * Gets Anthropic provider instance
   */
  getAnthropicProvider(): MockAnthropicProvider | null {
    return this.anthropicProvider;
  }

  /**
   * Gets provider by type
   */
  getProvider(type: ProviderType): MockProvider | null {
    switch (type) {
      case ProviderType.OPENAI:
        return this.openAIProvider;
      case ProviderType.ANTHROPIC:
        return this.anthropicProvider;
      default:
        return null;
    }
  }

  /**
   * Resets all mock providers
   */
  reset(): void {
    if (this.openAIProvider) {
      this.openAIProvider.reset();
    }

    if (this.anthropicProvider) {
      this.anthropicProvider.reset();
    }
  }

  /**
   * Cleans up mock provider resources
   */
  async cleanup(): Promise<void> {
    this.reset();
    this.openAIProvider = null;
    this.anthropicProvider = null;
    this.initialized = false;
  }

  /**
   * Gets statistics from all providers
   */
  getStatistics(): Record<string, number> {
    return {
      openai_calls: this.openAIProvider?.getCallCount() || 0,
      anthropic_calls: this.anthropicProvider?.getCallCount() || 0,
      total_calls:
        (this.openAIProvider?.getCallCount() || 0) +
        (this.anthropicProvider?.getCallCount() || 0),
    };
  }

  /**
   * Simulates network latency for provider calls
   */
  simulateNetworkLatency(minMs: number = 50, maxMs: number = 500): void {
    const delay = Math.random() * (maxMs - minMs) + minMs;

    if (this.openAIProvider) {
      (
        this.openAIProvider as { config: { responseDelay: number } }
      ).config.responseDelay = delay;
    }

    if (this.anthropicProvider) {
      (
        this.anthropicProvider as { config: { responseDelay: number } }
      ).config.responseDelay = delay;
    }
  }

  /**
   * Sets failure rate for all providers
   */
  setFailureRate(rate: number): void {
    if (this.openAIProvider) {
      (
        this.openAIProvider as { config: { failureRate: number } }
      ).config.failureRate = rate;
    }

    if (this.anthropicProvider) {
      (
        this.anthropicProvider as { config: { failureRate: number } }
      ).config.failureRate = rate;
    }
  }
}
