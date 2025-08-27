import { describe, it, expect } from 'vitest';
import { buildResponsesRequest } from './buildResponsesRequest.js';
import { Content } from '@google/genai';

describe('buildResponsesRequest - parentId slicing', () => {
  it('should send only messages after the parentId message', () => {
    const messages: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'First message' }],
      },
      {
        role: 'model',
        parts: [{ text: 'First response' }],
        metadata: { responseId: 'resp_123' },
      } as Content & { metadata: { responseId: string } },
      {
        role: 'user',
        parts: [{ text: 'Second message' }],
      },
    ];

    const params = {
      messages,
      model: 'gpt-4o',
      parentId: 'resp_123',
    };

    const result = buildResponsesRequest(params);

    // Should only include messages after the assistant message with responseId
    expect(result.input).toHaveLength(1);
    expect(result.input![0]).toMatchObject({
      role: 'user',
      content: 'Second message',
    });
  });

  it('should send all messages if parentId not found', () => {
    const messages: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'First message' }],
      },
      {
        role: 'model',
        parts: [{ text: 'First response' }],
        // No responseId metadata
      },
      {
        role: 'user',
        parts: [{ text: 'Second message' }],
      },
    ];

    const params = {
      messages,
      model: 'gpt-4o',
      parentId: 'resp_not_found',
    };

    const result = buildResponsesRequest(params);

    // Should include all messages since parentId wasn't found
    expect(result.input).toHaveLength(3);
  });

  it('should handle multiple tool responses after parentId', () => {
    const messages: Content[] = [
      {
        role: 'model',
        parts: [
          { text: 'Let me search for that' },
          {
            functionCall: {
              name: 'search',
              args: { query: 'test1' },
              id: 'call_1',
            },
          },
          {
            functionCall: {
              name: 'search',
              args: { query: 'test2' },
              id: 'call_2',
            },
          },
          {
            functionCall: {
              name: 'search',
              args: { query: 'test3' },
              id: 'call_3',
            },
          },
        ],
        metadata: { responseId: 'resp_123' },
      } as Content & { metadata: { responseId: string } },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: 'search',
              response: { result: 'Tool result 1' },
              id: 'call_1',
            },
          },
          {
            functionResponse: {
              name: 'search',
              response: { result: 'Tool result 2' },
              id: 'call_2',
            },
          },
          {
            functionResponse: {
              name: 'search',
              response: { result: 'Tool result 3' },
              id: 'call_3',
            },
          },
        ],
      },
    ];

    const params = {
      messages,
      model: 'gpt-4o',
      parentId: 'resp_123',
    };

    const result = buildResponsesRequest(params);

    // Should include all 3 tool responses after the assistant message
    expect(result.input).toHaveLength(3);
    // All should be function_call_output type
    for (const msg of result.input!) {
      if ('type' in msg) {
        expect(msg.type).toBe('function_call_output');
      }
    }
  });

  it('should send empty array if parentId is the last message', () => {
    const messages: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'First message' }],
      },
      {
        role: 'model',
        parts: [{ text: 'First response' }],
        metadata: { responseId: 'resp_123' },
      } as Content & { metadata: { responseId: string } },
    ];

    const params = {
      messages,
      model: 'gpt-4o',
      parentId: 'resp_123',
    };

    const result = buildResponsesRequest(params);

    // No messages after parentId, should send empty array
    expect(result.input).toEqual([]);
  });

  it('should not mutate the original messages array', () => {
    const messages: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'First message' }],
      },
      {
        role: 'model',
        parts: [{ text: 'First response' }],
        metadata: { responseId: 'resp_123' },
      } as Content & { metadata: { responseId: string } },
      {
        role: 'user',
        parts: [{ text: 'Second message' }],
      },
    ];

    const originalLength = messages.length;
    const originalMessages = [...messages]; // Shallow copy for comparison

    const params = {
      messages,
      model: 'gpt-4o',
      parentId: 'resp_123',
    };

    buildResponsesRequest(params);

    // Original array should be unchanged
    expect(messages).toHaveLength(originalLength);
    expect(messages).toEqual(originalMessages);
    // No metadata should have been added
    messages.forEach((msg, idx) => {
      const original = originalMessages[idx] as Content & {
        metadata?: { sent?: boolean };
      };
      const current = msg as Content & { metadata?: { sent?: boolean } };
      if (!original.metadata?.sent) {
        // If it didn't have sent before, it shouldn't have it now
        expect(current.metadata?.sent).toBeUndefined();
      }
    });
  });
});
