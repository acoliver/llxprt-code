/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// @plan PLAN-20250128-HISTORYSERVICE.P24
// @requirement HS-050: HistoryService interface for Turn integration

// Fix circular import - import directly from the source
import type {
  Message,
  MessageRole,
  MessageMetadata,
} from '../../services/history/types.js';

export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface ToolResponse {
  toolCallId: string;
  result: unknown;
}

export interface ToolExecutionStatus {
  pendingCalls: number;
  completedCalls: number;
  failedCalls: number;
  currentState: string;
  [key: string]: unknown;
}

export interface IHistoryService {
  // Tool management methods
  addPendingToolCalls(calls: ToolCall[]): void;
  commitToolResponses(responses: ToolResponse[]): void;
  getToolCallStatus(): ToolExecutionStatus;

  // Message management methods (used by GeminiChat)
  addMessage(
    content: string,
    role: MessageRole,
    metadata?: MessageMetadata,
  ): string;
  addModelMessage(content: string, metadata?: MessageMetadata): string;
  addUserMessage(content: string, metadata?: MessageMetadata): string;
  getHistory(): Message[];
  getMessages(): Message[];
  getCuratedHistory(): Message[];
  getLastMessage(): Message | null;
  getLastMessage(role: MessageRole): Message | null;
  getLastUserMessage(): Message | null;
  getLastModelMessage(): Message | null;
  clearHistory(): number;
  clearMessages(): number;
  reset(): void;

  // State management
  getState(): string;

  // Utility methods
  isEmpty(): boolean;
  getMessageCount(): number;
  getConversationId(): string;
}
