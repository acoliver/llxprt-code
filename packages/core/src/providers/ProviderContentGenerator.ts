/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContentGenerator,
  ContentGeneratorConfig,
} from '../core/contentGenerator.js';
import type { Config } from '../config/config.js';
import {
  GenerateContentParameters,
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  Content,
  Part,
} from '@google/genai';
import type { IProviderManager as ProviderManager } from './IProviderManager.js';
import { GeminiCompatibleWrapper } from './adapters/GeminiCompatibleWrapper.js';

/**
 * ContentGenerator implementation that delegates to external providers
 */
export class ProviderContentGenerator implements ContentGenerator {
  constructor(
    private providerManager: ProviderManager,
    private _config: ContentGeneratorConfig,
    private config?: Config,
  ) {
    // Config parameter is reserved for future use
    void this._config;
  }

  private getWrapper(): GeminiCompatibleWrapper {
    const provider = this.providerManager.getActiveProvider();
    if (!provider) {
      throw new Error('No active provider');
    }
    return new GeminiCompatibleWrapper(provider);
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    const sessionId = this.config?.getSessionId?.();
    return this.getWrapper().generateContent({
      ...request,
      sessionId,
    });
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const sessionId = this.config?.getSessionId?.();
    return this.getWrapper().generateContentStream({
      ...request,
      sessionId,
    });
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // Rough estimation for providers that don't support token counting
    let text = '';
    if (typeof request.contents === 'string') {
      text = request.contents;
    } else if (Array.isArray(request.contents)) {
      text = request.contents
        .flatMap((c: Content) => c.parts || [])
        .map((p: Part) => (p as { text: string }).text || '')
        .join(' ');
    }
    // Very rough approximation: ~4 characters per token
    const estimatedTokens = Math.ceil(text.length / 4);
    return {
      totalTokens: estimatedTokens,
    };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    throw new Error('Embeddings not supported for providers');
  }
}
