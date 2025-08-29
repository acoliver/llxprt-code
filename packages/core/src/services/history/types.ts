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
  editHistory?: EditHistoryEntry[];
  // Add other metadata properties as needed
}

export interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: number;
  metadata: MessageMetadata;
  conversationId: string;
}

// For update operations - only allow updating content and metadata
export type MessageUpdate = {
  content?: string;
  metadata?: Partial<MessageMetadata>;
};

export type HistoryState = 'READY' | 'PROCESSING' | 'TOOLS_PENDING' | 'TOOLS_EXECUTING' | 'TOOLS_COMPLETED' | 'ERROR';