/**
 * @plan PLAN-20250120-DEBUGLOGGING.P15
 * @requirement REQ-INT-001.1
 */
// PHASE: PLAN-20250826-RESPONSES.P19 - Parser Content[] stub
import { DebugLogger } from '../../debug/index.js';
import { Content } from '@google/genai';
import { safeJsonParse } from '../../utils/jsonUtils.js';

/**
 * Usage metadata for compatibility with IMessage format
 */
type UsageMetadata = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

/**
 * Content with additional fields for backward compatibility
 */
type ContentWithMetadata = Content & {
  usage?: UsageMetadata;
  id?: string;
};

const MAX_ACCUMULATOR_SIZE = 10000; // Prevent unbounded accumulator growth

// Helper function to convert O3 model's answer/response fields to strings
function formatArrayResponse(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    // Handle numeric arrays like [4, 1] -> "4.1"
    if (value.every((item) => typeof item === 'number')) {
      return value.join('.');
    }

    // Handle mixed arrays like ["gpt", 4.1] -> "gpt 4.1"
    return value.map((item) => String(item)).join(' ');
  }

  // Handle other types by converting to string
  return String(value);
}

// Response API event types
interface ResponsesApiEvent {
  type: string;
  sequence_number?: number;
  item_id?: string;
  output_index?: number;
  content_index?: number;
  delta?: string;
  text?: string;
  arguments?: string;
  logprobs?: unknown[];
  response?: {
    id: string;
    object: string;
    model: string;
    status: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
    output?: Array<{
      id: string;
      type: string;
      status?: string;
      arguments?: string;
      call_id?: string;
      name?: string;
    }>;
  };
  item?: {
    id: string;
    type: string;
    status?: string;
    content?: Array<{
      type: string;
      text?: string;
    }>;
    role?: string;
    // Function call fields
    name?: string;
    call_id?: string;
    arguments?: string;
  };
  part?: {
    type: string;
    text?: string;
  };
}

/** Return true if the chunk starts with "{" or "[".  Used to decide
    whether it even makes sense to call JSON.parse on the chunk. */
function looksLikeJSONObjectOrArray(s: string): boolean {
  return /^[[{]/.test(s.trim());
}

// Create a single logger instance for the module (following singleton pattern)
const logger = new DebugLogger('llxprt:providers:openai');

/**
 * @plan PLAN-20250826-RESPONSES.P23
 * @requirement REQ-002.2 - Create Content with responseId metadata
 * @pseudocode lines 89-96
 */
function createContentWithMetadata(
  responseId: string,
): Content & { metadata: { responseId: string }; id: string } {
  return {
    role: 'model',
    parts: [], // Empty parts for metadata-only content
    metadata: { responseId },
    id: responseId,
  } as Content & { metadata: { responseId: string }; id: string };
}

// PHASE: PLAN-20250826-RESPONSES.P19 - Parser Content[] stub helpers

/**
 * @plan PLAN-20250826-RESPONSES.P23
 * @requirement REQ-003.2 - Create Content from text delta
 * @pseudocode lines 97-104
 */
function createContentFromDelta(deltaText: string): Content {
  return {
    role: 'model',
    parts: [{ text: deltaText }],
  };
}

/**
 * @plan PLAN-20250826-RESPONSES.P23
 * @requirement REQ-003.2 - Create Content from function call
 */
function createContentFromFunctionCall(call: {
  id: string;
  name: string;
  arguments: string;
}): Content {
  return {
    role: 'model',
    parts: [
      {
        functionCall: {
          id: call.id,
          name: call.name,
          args: safeJsonParse(call.arguments || '{}', {}),
        },
      },
    ],
  };
}

/**
 * @plan PLAN-20250826-RESPONSES.P23
 * @requirement REQ-002.1, REQ-002.2, REQ-003.2
 * @pseudocode lines 80-128
 */
export async function* parseResponsesStream(
  stream: ReadableStream<Uint8Array>,
): AsyncIterableIterator<Content> {
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  let buffer = '';

  // Track function calls being assembled
  const functionCalls = new Map<
    string,
    {
      id: string;
      name: string;
      arguments: string;
      output_index: number;
    }
  >();

  // Track accumulated text to detect reasoning JSON
  let textAccumulator = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;

        // Parse event type
        if (line.startsWith('event: ')) {
          continue;
        } else if (line.startsWith('data: ')) {
          const dataLine = line.slice(6);

          if (dataLine === '[DONE]') {
            continue;
          }

          try {
            const event: ResponsesApiEvent = JSON.parse(dataLine);

            // Handle different event types
            switch (event.type) {
              case 'response.output_text.delta':
                // Accumulate and check for reasoning JSON
                if (event.delta) {
                  // Fast-path: If delta is just a number, yield it immediately
                  if (/^\d+(\.\d+)?$/.test(event.delta.trim())) {
                    yield createContentFromDelta(event.delta);
                    continue;
                  }

                  textAccumulator += event.delta;

                  // Only try to parse if accumulator looks like JSON
                  if (looksLikeJSONObjectOrArray(textAccumulator)) {
                    // Check if we have complete reasoning JSON
                    try {
                      const parsed = JSON.parse(textAccumulator);
                      if (parsed.reasoning && parsed.next_speaker) {
                        // Format reasoning nicely
                        yield createContentFromDelta(
                          `Thinking: ${parsed.reasoning}\n\n`,
                        );
                        // Check if there's an answer/response field
                        if (parsed.answer || parsed.response) {
                          yield createContentFromDelta(
                            formatArrayResponse(
                              parsed.answer || parsed.response,
                            ),
                          );
                        }
                        // Reset accumulator
                        textAccumulator = '';
                        continue;
                      }
                    } catch {
                      // Not complete JSON yet or not reasoning
                      // Check if this looks like the start of JSON
                      if (
                        textAccumulator.trim().startsWith('{') &&
                        textAccumulator.includes('"reasoning"')
                      ) {
                        // Still accumulating reasoning JSON, don't yield yet
                        if (textAccumulator.length > MAX_ACCUMULATOR_SIZE) {
                          yield createContentFromDelta(textAccumulator);
                          textAccumulator = '';
                        }
                        continue;
                      }
                    }
                  }

                  // Check if the delta itself is complete JSON (only if it looks like an object/array)
                  if (looksLikeJSONObjectOrArray(event.delta)) {
                    try {
                      const parsed = JSON.parse(event.delta);
                      if (
                        parsed.reasoning !== undefined &&
                        parsed.next_speaker !== undefined
                      ) {
                        // This is complete O3 JSON in a single delta
                        yield createContentFromDelta(
                          `Thinking: ${parsed.reasoning}\n\n`,
                        );
                        // Check if there's an answer/response field
                        if (parsed.answer || parsed.response) {
                          yield createContentFromDelta(
                            formatArrayResponse(
                              parsed.answer || parsed.response,
                            ),
                          );
                        }
                        // Reset accumulator
                        textAccumulator = '';
                        continue;
                      }
                    } catch {
                      // Not JSON, continue with regular text handling
                    }
                  }

                  // Regular text, yield it
                  yield createContentFromDelta(event.delta);
                  // Reset accumulator since we're in regular text mode
                  textAccumulator = '';
                }
                break;

              case 'response.message_content.delta':
                // Handle message content deltas (might contain reasoning)
                if (event.delta) {
                  // Fast-path: If delta is just a number, yield it immediately
                  if (/^\d+(\.\d+)?$/.test(event.delta.trim())) {
                    yield createContentFromDelta(event.delta);
                    continue;
                  }

                  textAccumulator += event.delta;

                  // Only try to parse if accumulator looks like JSON
                  if (looksLikeJSONObjectOrArray(textAccumulator)) {
                    // Check if we have complete reasoning JSON
                    try {
                      const parsed = JSON.parse(textAccumulator);
                      if (parsed.reasoning && parsed.next_speaker) {
                        // Format reasoning nicely
                        yield createContentFromDelta(
                          `Thinking: ${parsed.reasoning}\n\n`,
                        );
                        // Check if there's an answer/response field
                        if (parsed.answer || parsed.response) {
                          yield createContentFromDelta(
                            formatArrayResponse(
                              parsed.answer || parsed.response,
                            ),
                          );
                        }
                        // Reset accumulator
                        textAccumulator = '';
                        continue;
                      }
                    } catch {
                      // Not complete JSON yet or not reasoning
                      // Check if this looks like the start of JSON
                      if (
                        textAccumulator.trim().startsWith('{') &&
                        textAccumulator.includes('"reasoning"')
                      ) {
                        // Still accumulating reasoning JSON, don't yield yet
                        if (textAccumulator.length > MAX_ACCUMULATOR_SIZE) {
                          yield createContentFromDelta(textAccumulator);
                          textAccumulator = '';
                        }
                        continue;
                      }
                    }
                  }

                  // Check if the delta itself is complete JSON (only if it looks like an object/array)
                  if (looksLikeJSONObjectOrArray(event.delta)) {
                    try {
                      const parsed = JSON.parse(event.delta);
                      if (
                        parsed.reasoning !== undefined &&
                        parsed.next_speaker !== undefined
                      ) {
                        // This is complete O3 JSON in a single delta
                        yield createContentFromDelta(
                          `Thinking: ${parsed.reasoning}\n\n`,
                        );
                        // Check if there's an answer/response field
                        if (parsed.answer || parsed.response) {
                          yield createContentFromDelta(
                            formatArrayResponse(
                              parsed.answer || parsed.response,
                            ),
                          );
                        }
                        // Reset accumulator
                        textAccumulator = '';
                        continue;
                      }
                    } catch {
                      // Not JSON, continue with regular text handling
                    }
                  }

                  // If we have accumulated text that's not JSON, yield it all
                  if (
                    textAccumulator &&
                    !looksLikeJSONObjectOrArray(textAccumulator)
                  ) {
                    yield createContentFromDelta(textAccumulator);
                    textAccumulator = '';
                  } else if (!textAccumulator) {
                    // No accumulator, just yield the delta
                    yield createContentFromDelta(event.delta);
                  }
                }
                break;

              case 'response.output_item.added':
                // A new function call is starting
                if (event.item?.type === 'function_call' && event.item.id) {
                  // Use item.id as the map key (what we'll get in later events)
                  // Store call_id as the actual ID for the function call
                  const callId = event.item.call_id || event.item.id;

                  functionCalls.set(event.item.id, {
                    id: callId, // This is what goes in the Content
                    name: event.item.name || '',
                    arguments: event.item.arguments || '',
                    output_index: event.output_index || 0,
                  });

                  console.debug(
                    `[parseResponsesStream] Tracking function call: map_key=${event.item.id}, call_id=${callId}, name=${event.item.name}`,
                  );
                } else if (event.item?.type === 'message') {
                  // Handle message-type items that might contain reasoning
                  // These should be handled but not stop the stream
                  if (event.item.content?.length) {
                    const content = event.item.content[0];
                    if (content?.type === 'text' && content.text) {
                      // Check if this is reasoning JSON
                      try {
                        const parsed = JSON.parse(content.text);
                        if (parsed.reasoning && parsed.next_speaker) {
                          // This is reasoning JSON - format it nicely
                          yield createContentFromDelta(
                            `Thinking: ${parsed.reasoning}\n\n`,
                          );
                          // Check if there's an answer/response field
                          if (parsed.answer || parsed.response) {
                            yield createContentFromDelta(
                              formatArrayResponse(
                                parsed.answer || parsed.response,
                              ),
                            );
                          }
                        } else {
                          // Valid JSON but not reasoning
                          yield createContentFromDelta(content.text);
                        }
                      } catch {
                        // Not JSON, treat as regular text
                        yield createContentFromDelta(content.text);
                      }
                    }
                  }
                }
                // Reset accumulator after processing output_item.added
                textAccumulator = '';
                break;

              case 'response.function_call_arguments.delta':
                // Accumulate function call arguments
                if (
                  event.item_id &&
                  event.delta &&
                  functionCalls.has(event.item_id)
                ) {
                  const call = functionCalls.get(event.item_id)!;
                  call.arguments += event.delta;
                }
                break;

              case 'response.output_item.done':
                // Handle completed output items
                if (event.item?.type === 'function_call' && event.item.id) {
                  // Function call is complete, yield it
                  if (functionCalls.has(event.item.id)) {
                    const call = functionCalls.get(event.item.id)!;

                    // Update with final data from the done event
                    if (event.item.arguments) {
                      call.arguments = event.item.arguments;
                    }

                    // Convert to Content format with function call
                    yield createContentFromFunctionCall(call);

                    // Remove the completed call
                    functionCalls.delete(event.item.id);
                  }
                } else if (event.item?.type === 'message') {
                  // Reset accumulator at message boundaries
                  textAccumulator = '';
                  // Handle completed message items
                  if (event.item.content?.length) {
                    const content = event.item.content[0];
                    if (content?.type === 'text' && content.text) {
                      // Check if this is reasoning JSON
                      try {
                        const parsed = JSON.parse(content.text);
                        if (parsed.reasoning && parsed.next_speaker) {
                          // This is reasoning JSON - format it nicely
                          yield createContentFromDelta(
                            `Thinking: ${parsed.reasoning}\n\n`,
                          );
                          // Check if there's an answer/response field
                          if (parsed.answer || parsed.response) {
                            yield createContentFromDelta(
                              formatArrayResponse(
                                parsed.answer || parsed.response,
                              ),
                            );
                          }
                        } else {
                          // Valid JSON but not reasoning
                          yield createContentFromDelta(content.text);
                        }
                      } catch {
                        // Not JSON, treat as regular text
                        yield createContentFromDelta(content.text);
                      }
                    }
                  }
                }
                // Reset textAccumulator after processing response.output_item.done
                textAccumulator = '';
                break;

              case 'response.completed':
                // Reset accumulator when response is completed
                textAccumulator = '';
                // Extract usage data and the final response ID
                if (event.response) {
                  /**
                   * @plan PLAN-20250826-RESPONSES.P23
                   * @requirement REQ-002.1, REQ-002.2
                   * @pseudocode lines 63-68
                   */
                  if (event.response.id) {
                    // REQ-002.2: Create Content with responseId metadata
                    const contentWithMetadata = createContentWithMetadata(
                      event.response.id,
                    );
                    yield contentWithMetadata;
                    logger.debug(
                      () => `Response ID extracted: ${event.response!.id}`,
                    );
                  } else {
                    // Handle missing response ID gracefully
                    logger.debug(
                      () => 'Response completed but no response ID found',
                    );
                  }

                  // Handle usage data by creating a final message with IMessage format for backward compatibility
                  if (event.response.usage) {
                    const finalMessage: ContentWithMetadata = {
                      role: 'model',
                      parts: [],
                      usage: {
                        prompt_tokens: event.response.usage.input_tokens || 0,
                        completion_tokens:
                          event.response.usage.output_tokens || 0,
                        total_tokens: event.response.usage.total_tokens || 0,
                      },
                    };
                    if (event.response.id) {
                      finalMessage.id = event.response.id;
                    }
                    yield finalMessage;
                  }
                }
                break;

              default:
                // Ignore other event types for now
                break;
            }
          } catch (parseError) {
            logger.debug(() => `Failed to parse event: ${parseError}`);
          }
        }
      }
    }

    // Yield any remaining accumulated text
    if (textAccumulator) {
      yield createContentFromDelta(textAccumulator);
    }
  } finally {
    reader.releaseLock();
  }
}

export function parseErrorResponse(
  status: number,
  body: string,
  providerName: string,
): Error {
  try {
    const errorData = JSON.parse(body);
    const message =
      errorData.error?.message || errorData.message || 'Unknown error';

    // Format error message based on status code
    let errorPrefix: string;
    if (status === 409) {
      errorPrefix = 'Conflict';
    } else if (status === 410) {
      errorPrefix = 'Gone';
    } else if (status === 429) {
      errorPrefix = 'Rate limit exceeded';
    } else if (status >= 500 && status < 600) {
      errorPrefix = 'Server error';
    } else {
      // For unknown status codes, just return the message without prefix
      const error = new Error(message);
      (error as { status?: number }).status = status;
      (error as { code?: string }).code =
        errorData.error?.code || errorData.code;
      return error;
    }

    const error = new Error(`${errorPrefix}: ${message}`);
    (error as { status?: number }).status = status;
    (error as { code?: string }).code = errorData.error?.code || errorData.code;
    return error;
  } catch {
    // For invalid JSON, use a consistent format
    const errorPrefix =
      status >= 500 && status < 600 ? 'Server error' : 'API Error';
    const error = new Error(
      `${errorPrefix}: ${providerName} API error: ${status}`,
    );
    (error as { status?: number }).status = status;
    return error;
  }
}
