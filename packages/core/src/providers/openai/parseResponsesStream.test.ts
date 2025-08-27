import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  parseResponsesStream,
  parseErrorResponse,
} from './parseResponsesStream.js';
import { Content } from '@google/generative-ai';

function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (index < chunks.length) {
        const chunk = chunks[index++];
        controller.enqueue(encoder.encode(chunk));
      } else {
        controller.close();
      }
    },
  });
}

/**
 * @plan PLAN-20250826-RESPONSES.P21
 * @requirement REQ-002.1, REQ-002.2, REQ-003.2
 * Behavioral tests for parseResponsesStream response ID extraction
 */
describe('parseResponsesStream', () => {
  /**
   * @requirement REQ-002.1 - Extract response ID from SSE
   * @behavior Should extract responseId from response.completed event
   * @given Stream with response.completed event containing response.id
   * @when parseResponsesStream processes the event
   * @then Should extract and store responseId
   */
  it('should extract response ID from response.completed event', async () => {
    const chunks = [
      'data: {"type":"response.output_text.delta","delta":"Hello"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp-abc123","object":"response","status":"completed"}}\n\n',
    ];

    const stream = createSSEStream(chunks);
    const results = [];

    for await (const result of parseResponsesStream(stream)) {
      results.push(result);
    }

    // Should have at least one result with responseId
    const responseWithId = results.find((r) => r.id === 'resp-abc123');
    expect(responseWithId).toBeDefined();
    expect(responseWithId?.id).toBe('resp-abc123');
  });

  /**
   * @requirement REQ-002.2 - Store response ID in Content metadata
   * @behavior Should store responseId in Content metadata when implemented
   * @given Stream with response.completed event
   * @when parseResponsesStream creates Content objects
   * @then Content metadata should contain responseId
   * @note This test will fail until Phase 23 implementation
   */
  it('should store response ID in Content metadata', async () => {
    const chunks = [
      'data: {"type":"response.output_text.delta","delta":"Test response"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp-xyz789","object":"response","status":"completed"}}\n\n',
    ];

    const stream = createSSEStream(chunks);
    const results: Array<Content & { metadata?: { responseId: string } }> = [];

    for await (const result of parseResponsesStream(stream)) {
      // TODO: This will fail until Phase 23 - parser currently returns IMessage, not Content
      results.push(result as Content & { metadata?: { responseId: string } });
    }

    // When implemented, should have Content with metadata.responseId
    const metadataContent = results.find((r) => r.metadata?.responseId);
    expect(metadataContent).toBeDefined();
    expect(metadataContent?.metadata?.responseId).toBe('resp-xyz789');
    expect(metadataContent?.role).toBe('model');
    expect(metadataContent?.parts).toEqual([]);
  });

  /**
   * @requirement REQ-003.2 - Return Content[] not IMessage
   * @behavior Should return Content objects in Google AI format
   * @given Any valid SSE stream
   * @when parseResponsesStream processes events
   * @then Should return Content objects with role, parts structure
   * @note This test will fail until Phase 23 implementation
   */
  it('should return Content[] not IMessage', async () => {
    const chunks = [
      'data: {"type":"response.output_text.delta","delta":"Hello world"}\n\n',
      'data: {"type":"response.completed","response":{"id":"resp-test","object":"response"}}\n\n',
    ];

    const stream = createSSEStream(chunks);
    const results = [];

    for await (const result of parseResponsesStream(stream)) {
      results.push(result);
    }

    // When implemented, should return Content objects
    for (const content of results) {
      // TODO: This will fail until Phase 23 - currently returns IMessage format
      expect(content).toHaveProperty('role');
      expect(content).toHaveProperty('parts');
      expect(content.role).toBe('model');
      expect(Array.isArray(content.parts)).toBe(true);

      // Should not have IMessage properties
      expect(content).not.toHaveProperty('content');
    }
  });

  /**
   * @requirement REQ-002.1 - Handle missing response ID gracefully
   * @behavior Should not break when response.completed has no ID
   * @given Stream with response.completed but no response.id
   * @when parseResponsesStream processes the event
   * @then Should continue processing without error
   */
  it('should handle missing response ID gracefully', async () => {
    const chunks = [
      'data: {"type":"response.output_text.delta","delta":"Hello"}\n\n',
      'data: {"type":"response.completed","response":{"object":"response","status":"completed"}}\n\n',
    ];

    const stream = createSSEStream(chunks);
    const results = [];

    // Should not throw error
    for await (const result of parseResponsesStream(stream)) {
      results.push(result);
    }

    expect(results.length).toBeGreaterThan(0);
    // Should still process content even without responseId
  });

  /**
   * Property-based test (30% minimum requirement)
   * @behavior Should always return valid Content objects for any SSE stream
   * @given Any valid response ID string
   * @when Creating responseId events
   * @then Should handle all responseId values correctly
   */
  it('should always return valid Content objects for any SSE stream', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter(
            (s) =>
              !s.includes('"') &&
              !s.includes('\\') &&
              !s.includes('\n') &&
              !s.includes('\r'),
          ),
        async (responseId) => {
          const chunks = [
            `data: {"type":"response.output_text.delta","delta":"Test"}\n\n`,
            `data: {"type":"response.completed","response":{"id":"${responseId}","object":"response"}}\n\n`,
          ];

          const stream = createSSEStream(chunks);
          const results = [];

          for await (const result of parseResponsesStream(stream)) {
            results.push(result);
          }

          // All results should be valid objects
          for (const result of results) {
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('role');
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property-based test (30% minimum requirement)
   * @behavior Should preserve all response IDs from stream
   * @given Multiple response.completed events with different IDs
   * @when Processing stream
   * @then All responseIds should be captured
   */
  it('should preserve all response IDs from stream', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter(
              (s) =>
                !s.includes('"') &&
                !s.includes('\\') &&
                !s.includes('\n') &&
                !s.includes('\r'),
            ),
          { minLength: 1, maxLength: 5 },
        ),
        async (responseIds) => {
          const chunks = [];
          for (const id of responseIds) {
            // Escape the ID for safe JSON inclusion
            const escapedId = id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            chunks.push(
              `data: {"type":"response.completed","response":{"id":"${escapedId}","object":"response"}}\n\n`,
            );
          }

          const stream = createSSEStream(chunks);
          const results = [];

          for await (const result of parseResponsesStream(stream)) {
            results.push(result);
          }

          // Should have captured all responseIds
          const capturedIds = results.map((r) => r.id).filter(Boolean);
          expect(capturedIds.length).toBe(responseIds.length);
          for (const expectedId of responseIds) {
            expect(capturedIds).toContain(expectedId);
          }
        },
      ),
      { numRuns: 10 },
    );
  });
});

describe('parseErrorResponse', () => {
  it('should parse 409 conflict error', () => {
    const error = parseErrorResponse(
      409,
      '{"error":{"message":"Conversation already exists"}}',
      'Responses',
    );
    expect(error.message).toBe('Conflict: Conversation already exists');
  });

  it('should parse 410 gone error', () => {
    const error = parseErrorResponse(
      410,
      '{"error":{"message":"Conversation expired"}}',
      'Responses',
    );
    expect(error.message).toBe('Gone: Conversation expired');
  });

  it('should parse 429 rate limit error', () => {
    const error = parseErrorResponse(
      429,
      '{"error":{"message":"Too many requests"}}',
      'Responses',
    );
    expect(error.message).toBe('Rate limit exceeded: Too many requests');
  });

  it('should parse 5xx server errors', () => {
    const error500 = parseErrorResponse(
      500,
      '{"error":{"message":"Internal error"}}',
      'Responses',
    );
    expect(error500.message).toBe('Server error: Internal error');

    const error503 = parseErrorResponse(
      503,
      '{"error":{"message":"Service unavailable"}}',
      'Responses',
    );
    expect(error503.message).toBe('Server error: Service unavailable');
  });

  it('should handle invalid JSON in error response', () => {
    const error = parseErrorResponse(500, 'Not JSON', 'Responses');
    expect(error.message).toBe('Server error: Responses API error: 500');
  });

  it('should handle unknown status codes', () => {
    const error = parseErrorResponse(
      418,
      '{"error":{"message":"I am a teapot"}}',
      'Responses',
    );
    expect(error.message).toBe('I am a teapot');
  });
});
