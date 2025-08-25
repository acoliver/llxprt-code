/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Content } from '@google/genai';
import { OpenAIContentConverter } from './OpenAIContentConverter.js';
import { AnthropicContentConverter } from './AnthropicContentConverter.js';

describe('System Message Handling', () => {
  describe('OpenAIContentConverter', () => {
    const converter = new OpenAIContentConverter();

    it('should handle Content with role="system"', () => {
      const contents: Content[] = [
        {
          role: 'system',
          parts: [{ text: 'You are a helpful assistant' }],
        },
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ];

      const result = converter.toProviderFormat(contents);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant',
      });
      expect(result[1]).toEqual({
        role: 'user',
        content: 'Hello',
      });
    });

    it('should handle multiple system messages', () => {
      const contents: Content[] = [
        {
          role: 'system',
          parts: [{ text: 'You are a helpful assistant' }],
        },
        {
          role: 'system',
          parts: [{ text: 'Be concise in your responses' }],
        },
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ];

      const result = converter.toProviderFormat(contents);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant',
      });
      expect(result[1]).toEqual({
        role: 'system',
        content: 'Be concise in your responses',
      });
    });

    it('should handle system messages with multiple parts', () => {
      const contents: Content[] = [
        {
          role: 'system',
          parts: [
            { text: 'You are a helpful assistant. ' },
            { text: 'Always be polite.' },
          ],
        },
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ];

      const result = converter.toProviderFormat(contents);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant. Always be polite.',
      });
    });
  });

  describe('AnthropicContentConverter', () => {
    const converter = new AnthropicContentConverter();

    it('should handle Content with role="system"', () => {
      const contents: Content[] = [
        {
          role: 'system',
          parts: [{ text: 'You are a helpful assistant' }],
        },
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ];

      const result = converter.toProviderFormat(contents);

      // Anthropic doesn't include system messages in the messages array
      // They are handled separately via the system parameter
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        role: 'user',
        content: 'Hello',
      });
    });

    it('should extract system messages separately', () => {
      // This will be tested via the enhanced converter interface
      const contents: Content[] = [
        {
          role: 'system',
          parts: [{ text: 'You are a helpful assistant' }],
        },
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ];

      // For now, test that system messages don't appear in regular conversion
      const result = converter.toProviderFormat(contents);
      expect(result.every((msg) => msg.role !== 'system')).toBe(true);
    });

    it('should handle multiple system messages', () => {
      const contents: Content[] = [
        {
          role: 'system',
          parts: [{ text: 'You are a helpful assistant' }],
        },
        {
          role: 'system',
          parts: [{ text: 'Be concise' }],
        },
        {
          role: 'user',
          parts: [{ text: 'Hello' }],
        },
      ];

      const result = converter.toProviderFormat(contents);

      // Only non-system messages should appear
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
    });
  });
});
