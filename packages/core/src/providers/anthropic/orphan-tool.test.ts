import { describe, it, expect } from 'vitest';
import { Content } from '@google/genai';
import { AnthropicContentConverter } from '../converters/AnthropicContentConverter';

describe('Orphaned Tool Call Handling', () => {
  const converter = new AnthropicContentConverter();

  it('should handle orphaned tool calls by inserting synthetic responses', () => {
    // Simulate a conversation with an orphaned tool call
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Hello, can you help me?' }],
      },
      {
        role: 'model',
        parts: [
          { text: 'Sure! Let me search for that.' },
          {
            functionCall: {
              id: 'toolu_01DxqYsWhhmhA6SBDj7iqFJk',
              name: 'search',
              args: { query: 'test' },
            },
          },
        ],
      },
      // Missing tool response here - this creates an orphan!
      {
        role: 'user',
        parts: [{ text: 'Never mind, I found it myself.' }],
      },
    ];

    // Convert to Anthropic format
    const anthropicMessages = converter.toProviderFormat(contents);

    // Check the converted messages
    console.log(
      'Converted messages:',
      JSON.stringify(anthropicMessages, null, 2),
    );

    // The conversion should detect the orphaned tool call
    // and either insert a synthetic response or handle it gracefully

    // Find the tool_use message
    const toolUseMessage = anthropicMessages.find(
      (msg) =>
        Array.isArray(msg.content) &&
        msg.content.some((block) => block.type === 'tool_use'),
    );

    expect(toolUseMessage).toBeDefined();

    // There should be a corresponding tool_result
    const toolUseId = toolUseMessage?.content?.find(
      (block) => block.type === 'tool_use',
    )?.id;

    const toolResultMessage = anthropicMessages.find(
      (msg) =>
        Array.isArray(msg.content) &&
        msg.content.some(
          (block) =>
            block.type === 'tool_result' && block.tool_use_id === toolUseId,
        ),
    );

    // This will likely fail without proper orphan handling
    expect(toolResultMessage).toBeDefined();
  });

  it('should handle multiple consecutive orphaned tool calls', () => {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Do multiple things' }],
      },
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              id: 'toolu_001',
              name: 'tool1',
              args: {},
            },
          },
          {
            functionCall: {
              id: 'toolu_002',
              name: 'tool2',
              args: {},
            },
          },
        ],
      },
      // User cancels - no tool responses!
      {
        role: 'user',
        parts: [{ text: 'Stop!' }],
      },
    ];

    const anthropicMessages = converter.toProviderFormat(contents);
    console.log(
      'Multiple orphans:',
      JSON.stringify(anthropicMessages, null, 2),
    );

    // Both tool calls should have synthetic responses
    const toolResults = anthropicMessages.filter(
      (msg) =>
        Array.isArray(msg.content) &&
        msg.content.some((block) => block.type === 'tool_result'),
    );

    expect(toolResults.length).toBeGreaterThan(0);
  });
});
