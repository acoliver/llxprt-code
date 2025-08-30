import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageRole,
  MessageMetadata,
  MessageUpdate,
  HistoryState,
  ToolCall,
  ToolResponse,
  ToolCallStatus,
  ToolCallDetail,
  HistoryDump,
  MessageRoleEnum,
  ValidationError,
  StateError,
} from './types.js';
import { StateManager } from './StateManager.js';

/**
 * HistoryService - Centralized conversation history management
 *
 * NO EVENT SYSTEM - Events were removed as unnecessary overengineering.
 * Orphan tool prevention works through direct validation without events.
 * See EVENTS-WERE-UNNECESSARY.md for details.
 *
 * @plan PLAN-20250128-HISTORYSERVICE
 */
export class HistoryService {
  private readonly conversationId: string;
  private messages: Message[] = [];
  private pendingToolCalls: Map<string, ToolCall> = new Map();
  private toolResponses: Map<string, ToolResponse> = new Map();
  private state: HistoryState = HistoryState.IDLE;
  private stateManager: StateManager;

  // State tracking properties
  private stateHistory: Array<{
    fromState: HistoryState;
    toState: HistoryState;
    timestamp: number;
    context?: string;
  }> = [];

  // Operation queue for debugging (required by tests)
  private operationQueue: Array<{
    operation: string;
    timestamp: number;
    state: HistoryState;
  }> = [];

  /**
   * @requirement HS-001: Single authoritative history array
   * @pseudocode history-service.md:21-36
   */
  constructor(conversationId: string) {
    if (!conversationId || conversationId.trim().length === 0) {
      throw new ValidationError('ConversationId cannot be empty');
    }

    this.conversationId = conversationId;
    this.messages = [];
    this.pendingToolCalls = new Map();
    this.toolResponses = new Map();
    this.state = HistoryState.IDLE;
    this.stateManager = new StateManager();

    // Log initialization (no events)
    console.log(
      '[HistoryService] Initialized for conversation:',
      conversationId,
    );
  }

  /**
   * @requirement HS-002: Add message to conversation history
   * @pseudocode history-service.md:38-63
   */
  addMessage(
    content: string,
    role: MessageRole,
    metadata?: MessageMetadata,
  ): string {
    try {
      // Prevent adding messages during tool execution
      if (this.state === HistoryState.TOOLS_EXECUTING) {
        throw new StateError(
          `Cannot add messages during tool execution (state: ${this.state})`,
        );
      }

      // State validation before processing
      const targetState =
        role === MessageRoleEnum.MODEL
          ? HistoryState.MODEL_RESPONDING
          : this.stateManager.getCurrentState();
      if (!this.validateTransition(targetState)) {
        throw new Error(
          `Invalid state transition from ${this.stateManager.getCurrentState()} to ${targetState}`,
        );
      }

      // If we're adding a model message, transition to MODEL_RESPONDING
      if (role === MessageRoleEnum.MODEL) {
        this.internalTransitionTo(
          HistoryState.MODEL_RESPONDING,
          'adding model message',
        );
      }

      // Validate message content and role
      if (!content || content.trim().length === 0) {
        throw new ValidationError('Message content cannot be empty');
      }

      // Validate message role
      const validRoles: MessageRole[] = ['user', 'model', 'system', 'tool'];
      if (!validRoles.includes(role)) {
        throw new ValidationError(`Invalid message role: ${role}`);
      }

      // Create message object
      const message: Message = {
        id: this.generateUUID(),
        content,
        role,
        timestamp: Date.now(),
        metadata: metadata || {},
        conversationId: this.conversationId,
      };

      // Add message to array
      this.messages.push(message);

      // Track operation in debug queue
      this.operationQueue.push({
        operation: `addMessage(${role})`,
        timestamp: Date.now(),
        state: this.state,
      });

      // Log the operation (no events)
      console.log('[HistoryService] Message added:', {
        id: message.id,
        role: message.role,
      });

      // Transition back to IDLE for non-model messages
      if (role !== MessageRoleEnum.MODEL) {
        this.internalTransitionTo(HistoryState.IDLE, 'user message added');
      }
      // Transition back to IDLE after model message is added
      this.internalTransitionTo(HistoryState.IDLE, 'model message added');

      return message.id;
    } catch (error) {
      console.error('[HistoryService] Error adding message:', error);
      throw error;
    }
  }

  /**
   * @requirement HS-003: Add model message to history
   */
  addModelMessage(content: string, metadata?: MessageMetadata): string {
    return this.addMessage(content, MessageRoleEnum.MODEL, metadata);
  }

  /**
   * @requirement HS-002: Add user message to history
   */
  addUserMessage(content: string, metadata?: MessageMetadata): string {
    return this.addMessage(content, MessageRoleEnum.USER, metadata);
  }

  /**
   * Update an existing message in history
   * @requirement HS-003: Modify existing messages
   */
  updateMessage(messageId: string, update: MessageUpdate): Message {
    try {
      const messageIndex = this.messages.findIndex(
        (msg) => msg.id === messageId,
      );
      if (messageIndex === -1) {
        throw new ValidationError(`Message not found with id: ${messageId}`);
      }

      const existingMessage = this.messages[messageIndex];
      const updatedMessage: Message = {
        ...existingMessage,
        ...update,
        id: existingMessage.id,
        conversationId: this.conversationId,
        timestamp: existingMessage.timestamp,
        metadata: {
          ...existingMessage.metadata,
          ...(update.metadata || {}),
          lastUpdated: existingMessage.timestamp + 1,
        },
      };

      this.messages[messageIndex] = updatedMessage;

      // Track operation in debug queue
      this.operationQueue.push({
        operation: 'updateMessage',
        timestamp: Date.now(),
        state: this.state,
      });

      // Log the operation (no events)
      console.log('[HistoryService] Message updated:', { id: messageId });

      return updatedMessage;
    } catch (error) {
      console.error('[HistoryService] Error updating message:', error);
      throw error;
    }
  }

  /**
   * Delete a message from history
   * @requirement HS-023: Remove messages from history
   */
  deleteMessage(messageId: string): boolean {
    try {
      const messageIndex = this.messages.findIndex(
        (msg) => msg.id === messageId,
      );
      if (messageIndex === -1) {
        throw new ValidationError(`Message not found with id: ${messageId}`);
      }

      this.messages.splice(messageIndex, 1);

      // Track operation in debug queue
      this.operationQueue.push({
        operation: 'deleteMessage',
        timestamp: Date.now(),
        state: this.state,
      });

      // Log the operation (no events)
      console.log('[HistoryService] Message deleted:', { id: messageId });

      return true;
    } catch (error) {
      console.error('[HistoryService] Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Clear all history
   * @requirement HS-008: Clear all history
   */
  clearHistory(): number {
    try {
      // Only allow clearing in IDLE or MODEL_RESPONDING states
      if (
        this.state !== HistoryState.IDLE &&
        this.state !== HistoryState.MODEL_RESPONDING
      ) {
        throw new StateError(`Cannot clear history in state ${this.state}`);
      }

      if (!this.validateTransition(HistoryState.IDLE)) {
        throw new StateError(
          `Cannot clear history in state ${this.stateManager.getCurrentState()}`,
        );
      }

      const messageCount = this.messages.length;

      this.messages = [];
      this.pendingToolCalls.clear();
      this.toolResponses.clear();
      this.internalTransitionTo(HistoryState.IDLE, 'history cleared');

      // Track operation in debug queue
      this.operationQueue.push({
        operation: 'clearHistory',
        timestamp: Date.now(),
        state: this.state,
      });

      // Log the operation (no events)
      console.log('[HistoryService] History cleared:', { messageCount });

      return messageCount;
    } catch (error) {
      console.error('[HistoryService] Error clearing history:', error);
      throw error;
    }
  }

  /**
   * Alias for clearHistory to match test expectations
   */
  clearMessages(): number {
    return this.clearHistory();
  }

  /**
   * Reset the service to initial state
   */
  reset(): void {
    try {
      if (!this.validateTransition(HistoryState.IDLE)) {
        throw new StateError(
          `Cannot reset in state ${this.stateManager.getCurrentState()}`,
        );
      }

      const messageCount = this.messages.length;

      this.messages = [];
      this.pendingToolCalls.clear();
      this.toolResponses.clear();
      this.state = HistoryState.IDLE;
      this.stateHistory = [];
      this.operationQueue = []; // Reset operation queue too

      // Track operation in debug queue
      this.operationQueue.push({
        operation: 'reset',
        timestamp: Date.now(),
        state: this.state,
      });

      // Log the operation (no events)
      console.log('[HistoryService] Service reset:', { messageCount });
    } catch (error) {
      console.error('[HistoryService] Error resetting service:', error);
      throw error;
    }
  }

  /**
   * @requirement HS-005: Retrieve complete history
   */
  getHistory(): Message[] {
    return [...this.messages];
  }

  /**
   * Alias for getHistory to match test expectations
   */
  getMessages(): Message[] {
    return this.getHistory();
  }

  /**
   * @requirement HS-006: Retrieve curated history
   */
  getCuratedHistory(): Message[] {
    return this.messages.filter((msg) => {
      // Filter out empty or invalid messages
      if (!msg.content || msg.content.trim().length === 0) {
        return false;
      }
      // Include all valid messages
      return true;
    });
  }

  /**
   * @requirement HS-007: Get last message
   */
  getLastMessage(): Message | null;
  getLastMessage(role: MessageRole): Message | null;
  getLastMessage(role?: MessageRole): Message | null {
    if (role === undefined) {
      return this.messages.length > 0
        ? this.messages[this.messages.length - 1]
        : null;
    }

    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === role) {
        return this.messages[i];
      }
    }
    return null;
  }

  /**
   * @requirement HS-007: Get last user message
   */
  getLastUserMessage(): Message | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === MessageRoleEnum.USER) {
        return this.messages[i];
      }
    }
    return null;
  }

  /**
   * @requirement HS-007: Get last model message
   */
  getLastModelMessage(): Message | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === MessageRoleEnum.MODEL) {
        return this.messages[i];
      }
    }
    return null;
  }

  /**
   * Remove and return the last message if it matches expected content
   * @requirement HS-023: Conditional removal
   */
  undoLastMessage(expectedContent?: string): Message | null {
    try {
      if (this.messages.length === 0) {
        return null;
      }

      const lastMessage = this.messages[this.messages.length - 1];

      if (
        expectedContent !== undefined &&
        lastMessage.content !== expectedContent
      ) {
        return null;
      }

      this.messages.pop();

      // Log the operation (no events)
      console.log('[HistoryService] Last message undone:', {
        id: lastMessage.id,
      });

      return lastMessage;
    } catch (error) {
      console.error('[HistoryService] Error undoing last message:', error);
      throw error;
    }
  }

  /**
   * @requirement HS-009: Add pending tool calls
   */
  addPendingToolCalls(toolCalls: ToolCall[]): void {
    this.validateStateTransition('ADD_TOOL_CALLS');

    for (const toolCall of toolCalls) {
      if (!this.validateToolCall(toolCall)) {
        throw new ValidationError(
          `Invalid tool call: ${JSON.stringify(toolCall)}`,
        );
      }
      this.pendingToolCalls.set(toolCall.id, toolCall);
    }

    // Only transition to TOOLS_PENDING if not already there
    if (this.state !== HistoryState.TOOLS_PENDING) {
      this.internalTransitionTo(HistoryState.TOOLS_PENDING, 'tool calls added');
    }
    console.log('[HistoryService] Pending tool calls added:', toolCalls.length);
  }

  /**
   * @requirement HS-010: Commit tool responses atomically
   * This is the CRITICAL method that prevents orphan tool calls/responses
   */
  commitToolResponses(responses: ToolResponse[]): void {
    // Allow empty responses array (no-op)
    if (responses.length === 0) {
      return;
    }

    // CRITICAL: Validate all responses have matching pending calls FIRST
    for (const response of responses) {
      if (!this.pendingToolCalls.has(response.toolCallId)) {
        throw new ValidationError(
          `No pending tool call found for response: ${response.toolCallId}`,
        );
      }
      if (!this.validateToolResponse(response)) {
        throw new ValidationError(
          `Invalid tool response: ${JSON.stringify(response)}`,
        );
      }
    }

    this.validateStateTransition('ADD_TOOL_RESPONSES');

    // ATOMIC OPERATION: Add both calls and responses to history
    const toolMessage: Message = {
      id: this.generateUUID(),
      role: MessageRoleEnum.TOOL,
      content: '',
      toolCalls: Array.from(this.pendingToolCalls.values()),
      toolResponses: responses,
      timestamp: Date.now(),
      conversationId: this.conversationId,
      metadata: {},
    };

    this.messages.push(toolMessage);

    // Clear pending state
    this.pendingToolCalls.clear();
    for (const response of responses) {
      this.toolResponses.set(response.toolCallId, response);
    }

    this.internalTransitionTo(HistoryState.IDLE, 'tool responses committed');
    console.log('[HistoryService] Tool responses committed:', responses.length);
  }

  /**
   * @requirement HS-012: Abort pending tool calls
   */
  abortPendingToolCalls(): void {
    const count = this.pendingToolCalls.size;
    this.pendingToolCalls.clear();

    if (
      this.state === HistoryState.TOOLS_PENDING ||
      this.state === HistoryState.TOOLS_EXECUTING
    ) {
      this.internalTransitionTo(HistoryState.IDLE, 'tool calls aborted');
    }

    console.log('[HistoryService] Pending tool calls aborted:', count);
  }

  /**
   * Get current pending tool calls
   */
  getPendingToolCalls(): ToolCall[] {
    return Array.from(this.pendingToolCalls.values());
  }

  /**
   * Check if there are pending tool calls
   */
  hasPendingToolCalls(): boolean {
    return this.pendingToolCalls.size > 0;
  }

  /**
   * @requirement HS-021: Validate history structure
   */
  validateHistory(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for orphaned tool calls
    for (const message of this.messages) {
      if (message.toolCalls && message.toolCalls.length > 0) {
        if (!message.toolResponses || message.toolResponses.length === 0) {
          errors.push(`Message ${message.id} has tool calls but no responses`);
        } else {
          // Check each call has a response
          for (const call of message.toolCalls) {
            const hasResponse = message.toolResponses.some(
              (r) => r.toolCallId === call.id,
            );
            if (!hasResponse) {
              errors.push(`Tool call ${call.id} has no matching response`);
            }
          }
        }
      }

      if (message.toolResponses && message.toolResponses.length > 0) {
        if (!message.toolCalls || message.toolCalls.length === 0) {
          errors.push(`Message ${message.id} has tool responses but no calls`);
        }
      }
    }

    // Check role alternation
    let lastRole: MessageRole | null = null;
    for (const message of this.messages) {
      if (message.role === MessageRoleEnum.TOOL) {
        continue; // Tool messages don't affect alternation
      }

      if (
        lastRole === message.role &&
        message.role !== MessageRoleEnum.SYSTEM
      ) {
        warnings.push(`Consecutive ${message.role} messages at ${message.id}`);
      }
      lastRole = message.role;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * @requirement HS-034: Dump complete history for debugging
   */
  dumpHistory(): HistoryDump {
    return {
      conversationId: this.conversationId,
      messageCount: this.messages.length,
      messages: [...this.messages],
      state: this.state,
      pendingToolCalls: Array.from(this.pendingToolCalls.values()),
      toolResponses: Array.from(this.toolResponses.values()),
      timestamp: Date.now(),
    };
  }

  /**
   * Get current conversation state
   * @requirement HS-015: Track conversation state
   */
  getState(): HistoryState {
    return this.stateManager?.getCurrentState() || this.state;
  }

  /**
   * Get current conversation state (alias for getState for test compatibility)
   * @requirement HS-015: Track conversation state
   */
  getCurrentState(): HistoryState {
    return this.getState();
  }

  /**
   * Transition to a new state (public version for testing)
   */
  async transitionTo(newState: HistoryState, context?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.validateTransition(newState)) {
          reject(
            new StateError(
              `Invalid transition from ${this.state} to ${newState}`,
            ),
          );
          return;
        }
        this.internalTransitionTo(newState, context || 'manual transition');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Internal transition to a new state
   */
  private internalTransitionTo(newState: HistoryState, context: string): void {
    const oldState = this.state;
    this.state = newState;

    this.stateHistory.push({
      fromState: oldState,
      toState: newState,
      timestamp: Date.now(),
      context,
    });

    // Update state manager if available
    if (this.stateManager) {
      this.stateManager.transitionTo(newState);
    }

    console.log(
      `[HistoryService] State transition: ${oldState} -> ${newState} (${context})`,
    );
  }

  /**
   * Validate if a state transition is allowed
   */
  validateTransition(newState: HistoryState): boolean {
    if (!this.stateManager) {
      return true; // Allow if no state manager
    }
    return this.stateManager.canTransition(
      this.state, // Use HistoryService's current state
      newState,
    );
  }

  /**
   * Generate a UUID for messages
   */
  private generateUUID(): string {
    return uuidv4();
  }

  /**
   * Validate a tool call object
   */
  private validateToolCall(toolCall: ToolCall): boolean {
    return !!(
      toolCall &&
      toolCall.id &&
      toolCall.name &&
      toolCall.arguments !== undefined
    );
  }

  /**
   * Validate a tool response object
   */
  private validateToolResponse(toolResponse: ToolResponse): boolean {
    return !!(
      toolResponse &&
      toolResponse.toolCallId &&
      toolResponse.result !== undefined
    );
  }

  /**
   * Validate state transition for an operation
   */
  private validateStateTransition(operation: string): void {
    // Allow adding tool calls in IDLE, MODEL_RESPONDING, or TOOLS_PENDING states
    if (
      operation === 'ADD_TOOL_CALLS' &&
      this.state !== HistoryState.IDLE &&
      this.state !== HistoryState.MODEL_RESPONDING &&
      this.state !== HistoryState.TOOLS_PENDING // Allow accumulating calls
    ) {
      throw new StateError(`Cannot add tool calls in state ${this.state}`);
    }

    // Allow tool responses in TOOLS_PENDING or TOOLS_EXECUTING
    if (
      operation === 'ADD_TOOL_RESPONSES' &&
      this.state !== HistoryState.TOOLS_PENDING &&
      this.state !== HistoryState.TOOLS_EXECUTING
    ) {
      throw new StateError(`Cannot add tool responses in state ${this.state}`);
    }
  }

  /**
   * Get the conversation ID
   */
  getConversationId(): string {
    return this.conversationId;
  }

  /**
   * Get conversation metadata
   */
  getConversationMetadata(): {
    conversationId: string;
    messageCount: number;
    state: HistoryState;
  } {
    return {
      conversationId: this.conversationId,
      messageCount: this.messages.length,
      state: this.state,
    };
  }

  /**
   * Get message by ID
   */
  getMessageById(messageId: string): Message | null {
    const message = this.messages.find((msg) => msg.id === messageId);
    if (!message) {
      throw new ValidationError(`Message not found with id: ${messageId}`);
    }
    return message;
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Check if history is empty
   */
  isEmpty(): boolean {
    return this.messages.length === 0;
  }

  /**
   * Get tool call execution status
   * @requirement HS-014: Tool call status querying
   */
  getToolCallStatus(): ToolCallStatus {
    // Count completed calls from tool messages
    let completedCalls = 0;
    let failedCalls = 0;

    for (const message of this.messages) {
      if (message.role === MessageRoleEnum.TOOL && message.toolResponses) {
        for (const response of message.toolResponses) {
          if (
            response.result &&
            typeof response.result === 'object' &&
            'error' in response.result
          ) {
            failedCalls++;
          } else {
            completedCalls++;
          }
        }
      }
    }

    // Build execution order based on CALL order, not response order
    const executionOrder: string[] = [];
    const details: ToolCallDetail[] = [];

    for (const message of this.messages) {
      if (message.role === MessageRoleEnum.TOOL && message.toolCalls) {
        // Order by tool calls first (call order), then match responses
        for (const call of message.toolCalls) {
          executionOrder.push(call.id);

          // Find corresponding response
          const response = message.toolResponses?.find(
            (r) => r.toolCallId === call.id,
          );
          if (response) {
            const isError =
              response.result &&
              typeof response.result === 'object' &&
              'error' in response.result;
            details.push({
              callId: call.id,
              functionName: call.name,
              hasResponse: true,
              responseStatus: isError ? 'error' : 'success',
              timestamp: message.timestamp,
            });
          } else {
            details.push({
              callId: call.id,
              functionName: call.name,
              hasResponse: false,
              responseStatus: 'error', // no response means error
            });
          }
        }
      }
    }

    // Add pending calls to details (not in executionOrder until executed)
    for (const [callId, toolCall] of this.pendingToolCalls) {
      if (!executionOrder.includes(callId)) {
        details.push({
          callId,
          functionName: toolCall.name,
          hasResponse: false,
          responseStatus: 'error', // pending calls haven't succeeded yet
        });
      }
    }

    return {
      pendingCalls: this.pendingToolCalls.size,
      responseCount: completedCalls + failedCalls,
      completedCalls,
      failedCalls,
      currentState: this.state as HistoryState,
      executionOrder,
      details,
    };
  }

  /**
   * Determines if tool responses should be merged with the previous message.
   * This handles the case where multiple tool responses from the same assistant message
   * are sent in separate iterations.
   *
   * @requirement HS-049: Integration with GeminiChat
   */
  shouldMergeToolResponses(newMessage: Message, lastMessage: Message): boolean {
    // If either message is null, don't merge
    if (!newMessage || !lastMessage) return false;

    // Check if both messages are tool responses with the same conversationId
    if (
      newMessage.role === 'tool' &&
      lastMessage.role === 'tool' &&
      newMessage.conversationId === lastMessage.conversationId
    ) {
      return true;
    }

    // If the last message is a user message and the new message is a model message
    // from the same conversation, they should be merged
    if (
      lastMessage.role === 'user' &&
      newMessage.role === 'model' &&
      newMessage.conversationId === lastMessage.conversationId
    ) {
      return true;
    }

    // Default to not merge
    return false;
  }
}
