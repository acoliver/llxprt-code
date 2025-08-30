export type MessageRole = 'user' | 'model' | 'system' | 'tool';

// MessageRole enum to match test expectations
export const MessageRoleEnum = {
  USER: 'user' as MessageRole,
  ASSISTANT: 'model' as MessageRole,
  MODEL: 'model' as MessageRole,
  SYSTEM: 'system' as MessageRole,
  TOOL: 'tool' as MessageRole,
};

export interface EditHistoryEntry {
  timestamp: number;
  previousContent: string;
  editor?: string;
}

export interface MessageMetadata {
  toolCallId?: string;
  timestamp?: number;
  locked?: boolean;
  protected?: boolean;
  validationState?: string;
  lastModified?: number;
  lastUpdated?: number; // Added for update tracking
  editHistory?: EditHistoryEntry[];
  source?: string; // Source of the message (e.g., 'geminiChat', 'client', 'subagent')
  originalContent?: unknown; // Original content format before conversion
  contentType?: string; // Type of content (e.g., 'text', 'media', 'multimodal')
  // Add other metadata properties as needed
}

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: number;
  metadata: MessageMetadata;
  conversationId: string;
  toolCalls?: ToolCall[];
  toolResponses?: ToolResponse[];
}

// For update operations - only allow updating content and metadata
export type MessageUpdate = {
  content?: string;
  metadata?: Partial<MessageMetadata>;
};

// @plan PLAN-20250128-HISTORYSERVICE.P09
// @requirement HS-015: Conversation state tracking
export enum HistoryState {
  IDLE = 'IDLE',
  MODEL_RESPONDING = 'MODEL_RESPONDING',
  TOOLS_PENDING = 'TOOLS_PENDING',
  TOOLS_EXECUTING = 'TOOLS_EXECUTING',
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown; // Changed from 'args' to 'arguments' to match usage
}

export interface ToolCallFunction {
  name: string;
  arguments?: string;
}

export interface ToolCallDetail {
  callId: string;
  functionName?: string;
  hasResponse: boolean;
  responseStatus: 'success' | 'error';
  timestamp?: number;
}

export interface ToolResponse {
  toolCallId: string; // Changed from 'id' to 'toolCallId' to match usage
  result: unknown;
}

export interface ToolCallStatus {
  pendingCalls: number;
  responseCount: number;
  currentState: HistoryState;
  completedCalls: number;
  failedCalls: number;
  executionOrder: string[];
  details: ToolCallDetail[];
}

export interface HistoryDump {
  conversationId: string;
  timestamp: number;
  messageCount: number;
  messages: Message[];
  pendingToolCalls: ToolCall[];
  toolResponses: ToolResponse[];
  state: HistoryState;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}

// EVENT SYSTEM REMOVED - Events were unnecessary overengineering
// NO production code uses events - only tests subscribed to them
// Orphan tool prevention works through direct validation in commitToolResponses()
// See EVENTS-WERE-UNNECESSARY.md for details
