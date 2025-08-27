/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Content } from '@google/genai';
import { DebugLogger } from '../../debug/DebugLogger.js';

/**
 * Interface for cancelled tool information
 */
export interface CancelledToolInfo {
  toolCallId: string;
  toolName?: string;
  timestamp?: string;
}

/**
 * Creates synthetic tool responses for cancelled tool calls to maintain
 * API compliance with OpenAI's Responses format requirements.
 *
 * The OpenAI API requires that every tool_call in an assistant message
 * must have a corresponding tool message with matching tool_call_id.
 * When tools are cancelled (e.g., via ESC key), we need to create
 * synthetic responses to satisfy this requirement.
 */
// Create logger instance for this module
const logger = new DebugLogger('llxprt:providers:openai:synthetic');

export class SyntheticToolResponseHandler {
  /**
   * Creates synthetic tool responses for cancelled tools
   * @param cancelledTools Array of cancelled tool information
   * @returns Array of synthetic tool response messages
   */
  static createSyntheticResponses(
    cancelledTools: CancelledToolInfo[],
  ): Content[] {
    return cancelledTools.map((tool) => ({
      role: 'user' as const,
      parts: [
        {
          functionResponse: {
            id: tool.toolCallId,
            name: tool.toolName || 'unknown',
            response: {
              error: 'Tool execution cancelled by user',
            },
          },
        },
      ],
      // Mark as synthetic for debugging/filtering
      _synthetic: true,
      _cancelled: true,
    })) as Content[];
  }

  /**
   * Identifies tool calls that need synthetic responses by comparing
   * model messages with functionCall parts against existing functionResponse parts
   * @param messages The conversation history
   * @returns Array of tool call IDs that need synthetic responses
   */
  static identifyMissingToolResponses(messages: Content[]): string[] {
    const toolCallIds = new Set<string>();
    const toolResponseIds = new Set<string>();
    const syntheticResponseIds = new Set<string>();

    // Collect all tool call IDs from model messages
    messages.forEach((msg) => {
      if (msg.role === 'model' && msg.parts) {
        msg.parts.forEach((part) => {
          if ('functionCall' in part && part.functionCall?.id) {
            toolCallIds.add(part.functionCall.id);
          }
        });
      }
    });

    // Collect all tool response IDs (including synthetic ones)
    messages.forEach((msg) => {
      if (msg.role === 'user' && msg.parts) {
        msg.parts.forEach((part) => {
          if ('functionResponse' in part && part.functionResponse) {
            const responseId = (part.functionResponse as { id?: string }).id;
            if (responseId) {
              toolResponseIds.add(responseId);

              // Track synthetic responses separately for debugging
              if (
                (msg as Content & { _synthetic?: boolean })._synthetic ||
                (typeof part.functionResponse.response === 'object' &&
                  part.functionResponse.response?.error ===
                    'Tool execution cancelled by user')
              ) {
                syntheticResponseIds.add(responseId);
              }
            }
          }
        });
      }
    });

    // Log if we found existing synthetic responses
    if (syntheticResponseIds.size > 0) {
      logger.debug(
        () =>
          `Found ${syntheticResponseIds.size} existing synthetic responses: ${Array.from(syntheticResponseIds).join(', ')}`,
      );
    }

    // Find tool calls without responses
    const missingIds: string[] = [];
    toolCallIds.forEach((id) => {
      if (!toolResponseIds.has(id)) {
        missingIds.push(id);
      }
    });

    return missingIds;
  }

  /**
   * Patches a message history to include synthetic responses for any
   * tool calls that don't have corresponding tool responses
   * @param messages The original message history
   * @returns Patched message history with synthetic responses added
   */
  static patchMessageHistory(messages: Content[]): Content[] {
    logger.debug(
      () => `patchMessageHistory called with ${messages.length} messages`,
    );
    logger.debug(
      () =>
        `Message roles: ${messages
          .map((m) => {
            const functionCallCount =
              m.parts?.filter((p) => 'functionCall' in p).length || 0;
            const functionResponseCount =
              m.parts?.filter((p) => 'functionResponse' in p).length || 0;
            return `${m.role}${functionCallCount > 0 ? `(${functionCallCount} calls)` : ''}${functionResponseCount > 0 ? `(${functionResponseCount} responses)` : ''}`;
          })
          .join(', ')}`,
    );

    // First identify missing tool responses from original messages
    const missingToolIds = this.identifyMissingToolResponses(messages);
    logger.debug(() => `Missing tool IDs: ${JSON.stringify(missingToolIds)}`);

    // Create a deep copy of messages with proper structure cloning
    const deepCopyMessages: Content[] = messages.map((msg) => ({
      ...msg,
      // Ensure parts are properly cloned if they exist
      ...(msg.parts && {
        parts: msg.parts.map((part) => ({ ...part })),
      }),
    }));

    if (missingToolIds.length === 0) {
      return deepCopyMessages;
    }

    // Find the last model message with function calls
    let lastModelIndex = -1;
    for (let i = deepCopyMessages.length - 1; i >= 0; i--) {
      if (
        deepCopyMessages[i].role === 'model' &&
        deepCopyMessages[i].parts?.some((p) => 'functionCall' in p)
      ) {
        lastModelIndex = i;
        break;
      }
    }

    if (lastModelIndex === -1) {
      return deepCopyMessages;
    }

    // Extract tool names from the model message
    const toolNameMap = new Map<string, string>();
    const modelMsg = deepCopyMessages[lastModelIndex];
    if (modelMsg.parts) {
      modelMsg.parts.forEach((part) => {
        if ('functionCall' in part && part.functionCall) {
          const call = part.functionCall;
          if (call.id && call.name) {
            toolNameMap.set(call.id, call.name);
          }
        }
      });
    }

    // Create synthetic responses with tool names
    const cancelledTools: CancelledToolInfo[] = missingToolIds.map((id) => ({
      toolCallId: id,
      toolName: toolNameMap.get(id),
    }));

    const syntheticResponses = this.createSyntheticResponses(cancelledTools);
    logger.debug(
      () => `Created ${syntheticResponses.length} synthetic responses`,
    );
    syntheticResponses.forEach((sr) => {
      const firstPart = sr.parts?.[0];
      if (firstPart && 'functionResponse' in firstPart) {
        logger.debug(
          () =>
            `Synthetic response: ${JSON.stringify({
              role: sr.role,
              functionResponse_id: firstPart.functionResponse?.id,
              functionResponse_name: firstPart.functionResponse?.name,
              _synthetic: (sr as Content & { _synthetic?: boolean })._synthetic,
              _cancelled: (sr as Content & { _cancelled?: boolean })._cancelled,
            })}`,
        );
      }
    });

    // Insert synthetic responses right after the model message
    deepCopyMessages.splice(lastModelIndex + 1, 0, ...syntheticResponses);
    logger.debug(
      () => `Final message count after patching: ${deepCopyMessages.length}`,
    );

    return deepCopyMessages;
  }

  /**
   * Adds a user-facing cancellation notice to the message history
   * @param messages The message history
   * @param cancelledCount Number of tools that were cancelled
   * @returns Message history with cancellation notice added
   */
  static addCancellationNotice(
    messages: Content[],
    cancelledCount: number,
  ): Content[] {
    const notice: Content = {
      role: 'model',
      parts: [
        {
          text: `${cancelledCount} tool execution${cancelledCount > 1 ? 's were' : ' was'} cancelled. You can retry specific tools or continue with the conversation.`,
        },
      ],
    };

    return [...messages, notice];
  }
}
