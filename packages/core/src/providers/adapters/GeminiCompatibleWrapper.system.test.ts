/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Content } from '@google/genai';
import { GeminiCompatibleWrapper } from './GeminiCompatibleWrapper.js';
import { IProvider } from '../IProvider.js';

describe('GeminiCompatibleWrapper System Message Handling', () => {
  let mockGeminiProvider: IProvider;
  let mockOpenAIProvider: IProvider;
  let mockAnthropicProvider: IProvider;

  beforeEach(() => {
    mockGeminiProvider = {
      name: 'gemini',
      generateChatCompletion: vi.fn().mockImplementation(async function* (
        contents: Content[],
      ) {
        yield {
          role: 'model',
          parts: [{ text: `Gemini received ${contents.length} contents` }],
        };
      }),
      getModels: vi.fn(),
      getDefaultModel: vi.fn(),
      getServerTools: vi.fn(),
      invokeServerTool: vi.fn(),
      setTemporarySystemInstruction: vi.fn(),
    };

    mockOpenAIProvider = {
      name: 'openai',
      generateChatCompletion: vi.fn().mockImplementation(async function* (
        contents: Content[],
      ) {
        yield {
          role: 'model',
          parts: [{ text: `OpenAI received ${contents.length} contents` }],
        };
      }),
      getModels: vi.fn(),
      getDefaultModel: vi.fn(),
      getServerTools: vi.fn(),
      invokeServerTool: vi.fn(),
      setTemporarySystemInstruction: vi.fn(),
    };

    mockAnthropicProvider = {
      name: 'anthropic',
      generateChatCompletion: vi.fn().mockImplementation(async function* (
        contents: Content[],
      ) {
        yield {
          role: 'model',
          parts: [{ text: `Anthropic received ${contents.length} contents` }],
        };
      }),
      getModels: vi.fn(),
      getDefaultModel: vi.fn(),
      getServerTools: vi.fn(),
      invokeServerTool: vi.fn(),
      setTemporarySystemInstruction: vi.fn(),
    };
  });

  it('should filter out system messages for Gemini provider and pass via setTemporarySystemInstruction', async () => {
    const wrapper = new GeminiCompatibleWrapper(mockGeminiProvider);

    const contents: Content[] = [
      { role: 'system', parts: [{ text: 'You are a helpful assistant' }] },
      { role: 'user', parts: [{ text: 'Hello' }] },
    ];

    await wrapper.generateContent({
      model: 'gemini-pro',
      contents,
    });

    // Gemini should NOT receive system role content (it throws an error)
    expect(mockGeminiProvider.generateChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ role: 'user' })]),
      undefined, // tools
      undefined, // toolFormat
      undefined, // sessionId
    );

    const callArgs = (
      mockGeminiProvider.generateChatCompletion as ReturnType<typeof vi.fn>
    ).mock.calls[0][0] as Content[];
    expect(callArgs).toHaveLength(1);
    expect(callArgs[0].role).toBe('user');

    // System instruction should be passed via setTemporarySystemInstruction
    expect(
      mockGeminiProvider.setTemporarySystemInstruction,
    ).toHaveBeenCalledWith('You are a helpful assistant');
  });

  it('should filter out system messages for OpenAI provider', async () => {
    const wrapper = new GeminiCompatibleWrapper(mockOpenAIProvider);

    const contents: Content[] = [
      { role: 'system', parts: [{ text: 'You are a helpful assistant' }] },
      { role: 'user', parts: [{ text: 'Hello' }] },
    ];

    await wrapper.generateContent({
      model: 'gpt-4',
      contents,
    });

    // OpenAI should only receive user message (system handled by converter)
    expect(mockOpenAIProvider.generateChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ role: 'user' })]),
      undefined, // tools
      undefined, // toolFormat
      undefined, // sessionId
    );

    const callArgs = (
      mockOpenAIProvider.generateChatCompletion as ReturnType<typeof vi.fn>
    ).mock.calls[0][0] as Content[];
    expect(callArgs).toHaveLength(1);
    expect(callArgs[0].role).toBe('user');
  });

  it('should filter out system messages for Anthropic provider', async () => {
    const wrapper = new GeminiCompatibleWrapper(mockAnthropicProvider);

    const contents: Content[] = [
      { role: 'system', parts: [{ text: 'You are a helpful assistant' }] },
      { role: 'user', parts: [{ text: 'Hello' }] },
    ];

    await wrapper.generateContent({
      model: 'claude-3-sonnet',
      contents,
    });

    // Anthropic should only receive user message (system handled by converter)
    expect(mockAnthropicProvider.generateChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ role: 'user' })]),
      undefined, // tools
      undefined, // toolFormat
      undefined, // sessionId
    );

    const callArgs = (
      mockAnthropicProvider.generateChatCompletion as ReturnType<typeof vi.fn>
    ).mock.calls[0][0] as Content[];
    expect(callArgs).toHaveLength(1);
    expect(callArgs[0].role).toBe('user');
  });

  it('should handle systemInstruction from config for all providers', async () => {
    const wrapperGemini = new GeminiCompatibleWrapper(mockGeminiProvider);
    const wrapperOpenAI = new GeminiCompatibleWrapper(mockOpenAIProvider);
    const wrapperAnthropic = new GeminiCompatibleWrapper(mockAnthropicProvider);

    const contents: Content[] = [{ role: 'user', parts: [{ text: 'Hello' }] }];

    const config = {
      systemInstruction: 'You are a helpful assistant',
    };

    // Test all providers
    await Promise.all([
      wrapperGemini.generateContent({ model: 'gemini-pro', contents, config }),
      wrapperOpenAI.generateContent({ model: 'gpt-4', contents, config }),
      wrapperAnthropic.generateContent({
        model: 'claude-3-sonnet',
        contents,
        config,
      }),
    ]);

    // All providers should receive the user message
    // System instruction handling is provider-specific
    expect(mockGeminiProvider.generateChatCompletion).toHaveBeenCalled();
    expect(mockOpenAIProvider.generateChatCompletion).toHaveBeenCalled();
    expect(mockAnthropicProvider.generateChatCompletion).toHaveBeenCalled();
  });

  it('should handle combined systemInstruction and system content', async () => {
    const wrapper = new GeminiCompatibleWrapper(mockGeminiProvider);

    const contents: Content[] = [
      { role: 'system', parts: [{ text: 'You are helpful' }] },
      { role: 'user', parts: [{ text: 'Hello' }] },
    ];

    const config = {
      systemInstruction: 'Be concise',
    };

    await wrapper.generateContent({
      model: 'gemini-pro',
      contents,
      config,
    });

    // Gemini should NOT receive system role content, only user messages
    const callArgs = (
      mockGeminiProvider.generateChatCompletion as ReturnType<typeof vi.fn>
    ).mock.calls[0][0] as Content[];
    expect(callArgs).toHaveLength(1);
    expect(callArgs[0].role).toBe('user');

    // Both systemInstruction from config and system content should be combined and passed via setTemporarySystemInstruction
    expect(
      mockGeminiProvider.setTemporarySystemInstruction,
    ).toHaveBeenCalledWith('You are helpful\n\nBe concise');
  });

  it('should handle streaming with system messages', async () => {
    const wrapper = new GeminiCompatibleWrapper(mockOpenAIProvider);

    const contents: Content[] = [
      { role: 'system', parts: [{ text: 'You are a helpful assistant' }] },
      { role: 'user', parts: [{ text: 'Hello' }] },
    ];

    const stream = wrapper.generateContentStream({
      model: 'gpt-4',
      contents,
    });

    const responses = [];
    for await (const response of stream) {
      responses.push(response);
    }

    // Should receive responses
    expect(responses.length).toBeGreaterThan(0);

    // OpenAI should only receive user message (system filtered out)
    const callArgs = (
      mockOpenAIProvider.generateChatCompletion as ReturnType<typeof vi.fn>
    ).mock.calls[0][0] as Content[];
    expect(callArgs).toHaveLength(1);
    expect(callArgs[0].role).toBe('user');
  });
});
