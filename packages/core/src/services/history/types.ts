export type MessageRole = 'user' | 'assistant' | 'model' | 'system' | 'tool';

// MessageRole enum to match test expectations
export const MessageRoleEnum = {
  USER: 'user' as MessageRole,
  ASSISTANT: 'assistant' as MessageRole,
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
  [key: string]: unknown; // Allow additional metadata properties for extensibility and testing
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
  TRANSACTION_ACTIVE = 'TRANSACTION_ACTIVE',
  TRANSACTION_COMMITTING = 'TRANSACTION_COMMITTING',
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown; // Changed from 'args' to 'arguments' to match usage
  timestamp?: Date; // Optional timestamp for integration tests
  metadata?: Record<string, unknown>; // Optional metadata for integration tests
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
  error?: string; // Optional error field for cancellations/failures
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

// Integration test types for Phase 30
export enum ProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
}

// Separate interface for integration tests with Date timestamps
export interface ConversationMessage {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: Date; // Use Date for integration tests
  metadata: MessageMetadata & { [key: string]: unknown };
  conversationId?: string;
  provider: ProviderType;
  toolCalls?: ToolCall[];
  toolResponses?: ToolResponse[];
}

export interface ConversationHistory {
  id: string;
  messages: ConversationMessage[];
  metadata: {
    created: Date;
    lastUpdated: Date;
    provider: ProviderType;
    [key: string]: unknown;
  };
}

export interface ToolResult {
  id: string;
  callId: string;
  success: boolean;
  result: unknown;
  timestamp: Date;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutionChain {
  id: string;
  steps: Array<{
    toolCall: ToolCall;
    result?: ToolResult;
    timestamp: Date;
  }>;
  metadata: Record<string, unknown>;
}

// Tool Transaction interfaces for Phase 33
export interface ToolTransaction {
  id: string;
  assistantMessage: Message | null;
  toolCalls: Map<string, ToolCall>;
  toolResponses: Map<string, ToolResponse>;
  state: 'pending' | 'committed' | 'rolledback';
  createdAt: number;
}

// EVENT SYSTEM REMOVED - Events were unnecessary overengineering
// NO production code uses events - only tests subscribed to them
// Orphan tool prevention works through direct validation in commitToolResponses()
// See EVENTS-WERE-UNNECESSARY.md for details
