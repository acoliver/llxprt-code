/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PartListUnion,
  GenerateContentResponse,
  FunctionCall,
  FunctionDeclaration,
  FinishReason,
} from '@google/genai';
import {
  ToolCallConfirmationDetails,
  ToolResult,
  ToolResultDisplay,
} from '../tools/tools.js';
import { ToolErrorType } from '../tools/tool-error.js';
import {
  getResponseText,
  getFunctionCalls,
} from '../utils/generateContentResponseUtilities.js';
import { reportError } from '../utils/errorReporting.js';
import {
  getErrorMessage,
  UnauthorizedError,
  toFriendlyError,
} from '../utils/errors.js';
import { GeminiChat } from './geminiChat.js';

// @plan PLAN-20250128-HISTORYSERVICE.P26
// @requirement HS-050: Import HistoryService for integration
import { HistoryService } from '../services/history/HistoryService.js';
import type {
  ToolCall,
  ToolResponse,
  ToolCallStatus,
} from '../services/history/types.js';
import { HistoryState } from '../services/history/types.js';

// Define a structure for tools passed to the server
export interface ServerTool {
  name: string;
  schema: FunctionDeclaration;
  // The execute method signature might differ slightly or be wrapped
  execute(
    params: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<ToolResult>;
  shouldConfirmExecute(
    params: Record<string, unknown>,
    abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false>;
}

export enum GeminiEventType {
  Content = 'content',
  ToolCallRequest = 'tool_call_request',
  ToolCallResponse = 'tool_call_response',
  ToolCallConfirmation = 'tool_call_confirmation',
  UserCancelled = 'user_cancelled',
  Error = 'error',
  ChatCompressed = 'chat_compressed',
  Thought = 'thought',
  UsageMetadata = 'usage_metadata',
  MaxSessionTurns = 'max_session_turns',
  Finished = 'finished',
  LoopDetected = 'loop_detected',
}

export interface StructuredError {
  message: string;
  status?: number;
}

export interface GeminiErrorEventValue {
  error: StructuredError;
}

export interface ToolCallRequestInfo {
  callId: string;
  name: string;
  args: Record<string, unknown>;
  isClientInitiated: boolean;
  prompt_id: string;
}

export interface ToolCallResponseInfo {
  callId: string;
  responseParts: PartListUnion;
  resultDisplay: ToolResultDisplay | undefined;
  error: Error | undefined;
  errorType: ToolErrorType | undefined;
}

export interface ServerToolCallConfirmationDetails {
  request: ToolCallRequestInfo;
  details: ToolCallConfirmationDetails;
}

export type ThoughtSummary = {
  subject: string;
  description: string;
};

export type ServerGeminiContentEvent = {
  type: GeminiEventType.Content;
  value: string;
};

export type ServerGeminiThoughtEvent = {
  type: GeminiEventType.Thought;
  value: ThoughtSummary;
};

export type ServerGeminiToolCallRequestEvent = {
  type: GeminiEventType.ToolCallRequest;
  value: ToolCallRequestInfo;
};

export type ServerGeminiToolCallResponseEvent = {
  type: GeminiEventType.ToolCallResponse;
  value: ToolCallResponseInfo;
};

export type ServerGeminiToolCallConfirmationEvent = {
  type: GeminiEventType.ToolCallConfirmation;
  value: ServerToolCallConfirmationDetails;
};

export type ServerGeminiUserCancelledEvent = {
  type: GeminiEventType.UserCancelled;
};

export type ServerGeminiErrorEvent = {
  type: GeminiEventType.Error;
  value: GeminiErrorEventValue;
};

export interface ChatCompressionInfo {
  originalTokenCount: number;
  newTokenCount: number;
}

export type ServerGeminiChatCompressedEvent = {
  type: GeminiEventType.ChatCompressed;
  value: ChatCompressionInfo | null;
};

export type ServerGeminiUsageMetadataEvent = {
  type: GeminiEventType.UsageMetadata;
  value: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    cachedContentTokenCount?: number;
  };
};

export type ServerGeminiMaxSessionTurnsEvent = {
  type: GeminiEventType.MaxSessionTurns;
};

export type ServerGeminiFinishedEvent = {
  type: GeminiEventType.Finished;
  value: FinishReason;
};

export type ServerGeminiLoopDetectedEvent = {
  type: GeminiEventType.LoopDetected;
};
// The original union type, now composed of the individual types
export type ServerGeminiStreamEvent =
  | ServerGeminiContentEvent
  | ServerGeminiToolCallRequestEvent
  | ServerGeminiToolCallResponseEvent
  | ServerGeminiToolCallConfirmationEvent
  | ServerGeminiUserCancelledEvent
  | ServerGeminiErrorEvent
  | ServerGeminiChatCompressedEvent
  | ServerGeminiThoughtEvent
  | ServerGeminiUsageMetadataEvent
  | ServerGeminiMaxSessionTurnsEvent
  | ServerGeminiFinishedEvent
  | ServerGeminiLoopDetectedEvent;

// A turn manages the agentic loop turn within the server context.
export class Turn {
  readonly pendingToolCalls: ToolCallRequestInfo[];
  private debugResponses: GenerateContentResponse[];
  finishReason: FinishReason | undefined;

  // @plan PLAN-20250128-HISTORYSERVICE.P26
  // @requirement HS-050: Turn integration with HistoryService tool management
  private historyService?: HistoryService;

  constructor(
    private readonly chat: GeminiChat,
    private readonly prompt_id: string,
    private readonly providerName: string = 'backend',
    historyService?: HistoryService,
  ) {
    this.pendingToolCalls = [];
    this.debugResponses = [];
    this.finishReason = undefined;
    this.historyService = historyService;
  }

  // Method to enable HistoryService integration
  setHistoryService(historyService: HistoryService): void {
    this.historyService = historyService;
  }
  // The run method yields simpler events suitable for server logic
  async *run(
    req: PartListUnion,
    signal: AbortSignal,
  ): AsyncGenerator<ServerGeminiStreamEvent> {
    if (process.env.DEBUG) {
      console.log('DEBUG: Turn.run called');
      console.log('DEBUG: Turn.run req:', JSON.stringify(req, null, 2));
      console.log('DEBUG: Turn.run typeof req:', typeof req);
      console.log('DEBUG: Turn.run Array.isArray(req):', Array.isArray(req));
    }

    try {
      const responseStream = await this.chat.sendMessageStream(
        {
          message: req,
          config: {
            abortSignal: signal,
          },
        },
        this.prompt_id,
      );

      for await (const resp of responseStream) {
        if (signal?.aborted) {
          yield { type: GeminiEventType.UserCancelled };
          return;
        }
        this.debugResponses.push(resp);

        const thoughtPart = resp.candidates?.[0]?.content?.parts?.[0];
        if (thoughtPart?.thought) {
          // Thought always has a bold "subject" part enclosed in double asterisks
          // (e.g., **Subject**). The rest of the string is considered the description.
          const rawText = thoughtPart.text ?? '';
          const subjectStringMatches = rawText.match(/\*\*(.*?)\*\*/s);
          const subject = subjectStringMatches
            ? subjectStringMatches[1].trim()
            : '';
          const description = rawText.replace(/\*\*(.*?)\*\*/s, '').trim();
          const thought: ThoughtSummary = {
            subject,
            description,
          };

          yield {
            type: GeminiEventType.Thought,
            value: thought,
          };
          continue;
        }

        const text = getResponseText(resp);
        if (text) {
          yield { type: GeminiEventType.Content, value: text };
        }

        // Handle function calls (requesting tool execution)
        const functionCalls = getFunctionCalls(resp) ?? [];
        for (const fnCall of functionCalls) {
          const event = this.handlePendingFunctionCall(fnCall);
          if (event) {
            yield event;
          }
        }

        // Check if response was truncated or stopped for various reasons
        const finishReason = resp.candidates?.[0]?.finishReason;

        if (finishReason) {
          this.finishReason = finishReason;
          yield {
            type: GeminiEventType.Finished,
            value: finishReason as FinishReason,
          };
        }
      }
    } catch (e) {
      const error = toFriendlyError(e);
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      if (signal.aborted) {
        yield { type: GeminiEventType.UserCancelled };
        // Regular cancellation error, fail gracefully.
        return;
      }

      const contextForReport = [...this.chat.getHistory(/*curated*/ true), req];
      await reportError(
        error,
        `Error when talking to ${this.providerName} API`,
        contextForReport,
        'Turn.run-sendMessageStream',
      );
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status: unknown }).status === 'number'
          ? (error as { status: number }).status
          : undefined;
      const structuredError: StructuredError = {
        message: getErrorMessage(error),
        status,
      };
      yield { type: GeminiEventType.Error, value: { error: structuredError } };
      return;
    }
  }

  // @plan PLAN-20250128-HISTORYSERVICE.P26
  // @requirement HS-050: Integrate pending/commit pattern with existing tool flow
  // @requirement HS-009: Add pending tool calls before processing
  private handlePendingFunctionCall(
    fnCall: FunctionCall,
  ): ServerGeminiStreamEvent | null {
    const callId =
      fnCall.id ??
      `${fnCall.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const name = fnCall.name || 'undefined_tool_name';
    const args = (fnCall.args || {}) as Record<string, unknown>;

    const toolCallRequest: ToolCallRequestInfo = {
      callId,
      name,
      args,
      isClientInitiated: false,
      prompt_id: this.prompt_id,
    };

    // EXISTING: Add to pending tool calls array (preserve current behavior)
    this.pendingToolCalls.push(toolCallRequest);

    // NEW: Add pending tool call to HistoryService if enabled
    if (this.historyService) {
      try {
        const historyToolCall: ToolCall = {
          id: callId,
          name,
          arguments: args,
        };

        this.historyService.addPendingToolCalls([historyToolCall]);

        console.log(
          `Added pending tool call ${callId} (${name}) to HistoryService`,
        );
      } catch (error) {
        console.warn(
          `Error adding pending tool call ${callId} to HistoryService:`,
          error,
        );
      }
    }

    // EXISTING: Yield request event (preserve TurnEmitter pattern)
    return { type: GeminiEventType.ToolCallRequest, value: toolCallRequest };
  }

  getDebugResponses(): GenerateContentResponse[] {
    return this.debugResponses;
  }

  // @plan PLAN-20250128-HISTORYSERVICE.P26
  // @requirement HS-010: Commit tool responses after successful execution
  // @requirement HS-013: Tool state management integration
  async handleToolExecutionComplete(
    toolCallId: string,
    result: ToolResult,
  ): Promise<void> {
    if (this.historyService) {
      try {
        // Use type guards to safely access properties
        const resultData = result.summary ?? result.llmContent ?? result;

        const toolResponse: ToolResponse = {
          toolCallId,
          result: resultData,
        };

        this.historyService.commitToolResponses([toolResponse]);
        console.log(`Added tool response for ${toolCallId} to HistoryService`);
      } catch (error) {
        console.warn(
          `Failed to add tool response for ${toolCallId} to HistoryService:`,
          error,
        );
      }
    }
  }

  // @plan PLAN-20250128-HISTORYSERVICE.P26
  // @requirement HS-012: Handle tool execution failures
  async handleToolExecutionError(
    toolCallId: string,
    error: Error,
  ): Promise<void> {
    if (this.historyService) {
      try {
        const errorResponse: ToolResponse = {
          toolCallId,
          result: { error: error.message },
        };

        this.historyService.commitToolResponses([errorResponse]);
        console.log(`Added error response for ${toolCallId} to HistoryService`);
      } catch (historyError) {
        console.warn(
          `Failed to add error response for ${toolCallId} to HistoryService:`,
          historyError,
        );
      }
    }
  }

  // @plan PLAN-20250128-HISTORYSERVICE.P26
  // @requirement HS-011: Complete tool execution cycle
  async completeAllToolExecution(): Promise<void> {
    if (this.historyService && this.pendingToolCalls.length > 0) {
      try {
        // Note: completeToolExecution might be part of commitToolResponses flow
        // HistoryService manages the complete cycle internally
        const status = this.historyService.getToolCallStatus();
        console.log(
          `Tool execution status: ${status.completedCalls} completed, ${status.pendingCalls} pending`,
        );
      } catch (error) {
        console.warn(
          'Failed to complete tool execution cycle in HistoryService:',
          error,
        );
      }
    }
  }

  // @plan PLAN-20250128-HISTORYSERVICE.P26
  // @requirement HS-014: Tool call status querying
  getToolExecutionStatus(): ToolCallStatus | null {
    if (this.historyService) {
      try {
        return this.historyService.getToolCallStatus();
      } catch (error) {
        console.warn('Failed to get tool status from HistoryService:', error);
      }
    }

    // Fallback: Return basic status based on current Turn state
    return {
      pendingCalls: this.pendingToolCalls.length,
      responseCount: 0, // Cannot determine without HistoryService
      completedCalls: 0, // Cannot determine without HistoryService
      failedCalls: 0, // Cannot determine without HistoryService
      currentState:
        this.pendingToolCalls.length > 0
          ? HistoryState.TOOLS_EXECUTING
          : HistoryState.IDLE,
      executionOrder: [],
      details: [],
    };
  }

  // @requirement HS-050: Helper for external tool state management
  hasPendingTools(): boolean {
    return this.pendingToolCalls.length > 0;
  }
}
