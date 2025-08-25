/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Content } from '@google/genai';
import { ServerGeminiStreamEvent } from '../core/turn.js';

/**
 * Interface for adapting provider-specific streams to Gemini event format
 */
export interface IStreamAdapter {
  /**
   * Adapts a provider's stream format to Gemini's event stream format
   * @param providerStream The provider-specific stream of messages
   * @returns An async iterator of Gemini events
   */
  adaptStream(
    providerStream: AsyncIterableIterator<Content>,
  ): AsyncIterableIterator<ServerGeminiStreamEvent>;
}
