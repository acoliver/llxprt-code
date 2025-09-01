import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageRole,
  MessageMetadata,
  MessageUpdate,
  HistoryState,
  ToolCall,
  ToolResponse,
  ToolCallDetail,
  HistoryDump,
  MessageRoleEnum,
  ValidationError,
  StateError,
  ToolTransaction,
} from './types.js';
import { StateManager } from './StateManager.js';
import { DebugLogger } from '../../debug/index.js';
import type { 
  IHistoryService,
  ToolExecutionStatus 
} from '../../historyservice/interfaces/IHistoryService.js';

/**
 * Tool Transaction implementation for Phase 35
 * @pseudocode tool-transactions.md:1-9
 */
class ToolTransactionImpl implements ToolTransaction {
  readonly id: string;
  assistantMessage: Message | null = null;
  readonly toolCalls: Map<string, ToolCall>;
  readonly toolResponses: Map<string, ToolResponse>;
  state: 'pending' | 'committed' | 'rolledback';
  readonly createdAt: number;

  constructor(id: string) {
    this.id = id;
    this.toolCalls = new Map();
    this.toolResponses = new Map();
    this.state = 'pending';
    this.createdAt = Date.now();
  }
}

/**
 * HistoryService - Centralized conversation history management
 *
 * NO EVENT SYSTEM - Events were removed as unnecessary overengineering.
 * Orphan tool prevention works through direct validation without events.
 * See EVENTS-WERE-UNNECESSARY.md for details.
 *
 * @plan PLAN-20250128-HISTORYSERVICE
 * @implements {IHistoryService}
 */
export class HistoryService implements IHistoryService {
  private readonly conversationId: string;
  private messages: Message[] = [];
  private readonly logger: DebugLogger;
  private state: HistoryState = HistoryState.IDLE;
  private stateManager: StateManager;

  // Transaction management properties (Phase 33)
  // @pseudocode tool-transactions.md:13-14
  private activeTransaction: ToolTransaction | null = null;
  private transactionHistory: ToolTransaction[] = [];

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
    this.state = HistoryState.IDLE;
    this.stateManager = new StateManager();
    this.logger = new DebugLogger('llxprt:history:service');

    // Log initialization (no events)
    this.logger.debug(
      () => `[HistoryService] Initialized for conversation: ${conversationId}`,
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
      // Handle active transaction semantics
      // If a user sends a new message while a transaction is active, we roll back
      // the transaction with a cancellation reason and then proceed to add the user message.
      // For any other role, prevent direct message addition during an active transaction.
      if (this.activeTransaction) {
        if (role === MessageRoleEnum.USER) {
          this.rollbackTransaction('User sent new message');
        } else {
          throw new StateError(
            'Cannot add messages during active transaction in progress',
          );
        }
      }

      // State validation guard in case of transition race
      // After rollback above, state should be IDLE. If still TRANSACTION_ACTIVE, block.
      if (this.state === HistoryState.TRANSACTION_ACTIVE) {
        throw new StateError(
          `Cannot add messages during active transaction (state: ${this.state})`,
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
      const validRoles: MessageRole[] = [
        'user',
        'assistant',
        'model',
        'system',
        'tool',
      ];
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

      // Check for potential duplicates (detection only, not prevention)
      const recentMessages = this.messages.slice(-5); // Check last 5 messages
      const duplicates = recentMessages.filter(
        (msg) =>
          msg.role === message.role &&
          msg.content === message.content &&
          msg.id !== message.id, // Different ID but same content
      );

      if (duplicates.length > 0) {
        this.logger.debug(
          () =>
            `[HistoryService] Duplicate message detected: role=${message.role}, source=${metadata?.source || 'unknown'}, duplicates=${duplicates.length}`,
        );
      }

      // Add message to array
      this.messages.push(message);

      // Track operation in debug queue
      this.operationQueue.push({
        operation: `addMessage(${role})`,
        timestamp: Date.now(),
        state: this.state,
      });

      // Log the operation (no events)
      this.logger.debug(
        () =>
          `[HistoryService] Message added: { id: '${message.id}', role: '${message.role}' }`,
      );

      // Transition back to IDLE for non-model messages
      if (role !== MessageRoleEnum.MODEL) {
        this.internalTransitionTo(HistoryState.IDLE, 'user message added');
      } else {
        // Transition to IDLE after model message added
        this.internalTransitionTo(HistoryState.IDLE, 'model message added');
      }

      return message.id;
    } catch (error) {
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
      this.logger.debug(
        () => `[HistoryService] Message updated: { id: '${messageId}' }`,
      );

      return updatedMessage;
    } catch (error) {
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
      this.logger.debug(
        () => `[HistoryService] Message deleted: { id: '${messageId}' }`,
      );

      return true;
    } catch (error) {
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
      this.internalTransitionTo(HistoryState.IDLE, 'history cleared');

      // Track operation in debug queue
      this.operationQueue.push({
        operation: 'clearHistory',
        timestamp: Date.now(),
        state: this.state,
      });

      // Log the operation (no events)
      this.logger.debug(
        () =>
          `[HistoryService] History cleared: { messageCount: ${messageCount} }`,
      );

      return messageCount;
    } catch (error) {
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
      this.logger.debug(
        () =>
          `[HistoryService] Service reset: { messageCount: ${messageCount} }`,
      );
    } catch (error) {
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
      this.logger.debug(
        () =>
          `[HistoryService] Last message undone: { id: '${lastMessage.id}' }`,
      );

      return lastMessage;
    } catch (error) {
      throw error;
    }
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

    // Transactions ensure no orphans, but verify anyway
    for (const message of this.messages) {
      if (message.role === MessageRoleEnum.TOOL) {
        // All tool messages should have matching calls/responses
        if (message.toolCalls?.length !== message.toolResponses?.length) {
          errors.push(
            `Tool message ${message.id} has mismatched calls/responses`,
          );
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
      pendingToolCalls: [],
      toolResponses: [],
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

    this.logger.debug(
      () =>
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
   * Begin a new tool transaction
   * @pseudocode tool-transactions.md:16-23
   */
  beginToolTransaction(): string {
    if (this.activeTransaction !== null) {
      throw new StateError('Transaction already in progress');
    }

    const txId = this.generateUUID();
    this.activeTransaction = new ToolTransactionImpl(txId);
    this.internalTransitionTo(
      HistoryState.TRANSACTION_ACTIVE,
      'tool transaction started',
    );

    this.logger.debug(
      () => `[HistoryService] Tool transaction started: ${txId}`,
    );

    return txId;
  }

  /**
   * Commit the active transaction
   * @pseudocode tool-transactions.md:48-70
   */
  commitTransaction(): void {
    if (!this.activeTransaction) {
      throw new StateError('No active transaction');
    }

    this.internalTransitionTo(
      HistoryState.TRANSACTION_COMMITTING,
      'committing transaction',
    );

    // Validate completeness
    for (const [callId] of this.activeTransaction.toolCalls) {
      if (!this.activeTransaction.toolResponses.has(callId)) {
        throw new ValidationError(`Missing response for tool call ${callId}`);
      }
    }

    // ATOMIC: Add assistant message with toolCalls if present
    if (this.activeTransaction.assistantMessage) {
      const assistantWithCalls: Message = {
        ...this.activeTransaction.assistantMessage,
        toolCalls: Array.from(this.activeTransaction.toolCalls.values()),
      };
      this.messages.push(assistantWithCalls);
    }

    // Create tool message with all responses if present
    if (this.activeTransaction.toolResponses.size > 0) {
      // Ensure responses are ordered to match tool calls
      const toolCalls = Array.from(this.activeTransaction.toolCalls.values());
      const toolResponses = toolCalls.map(
        (call) => this.activeTransaction!.toolResponses.get(call.id)!,
      );

      const toolMessage: Message = {
        id: this.generateUUID(),
        role: MessageRoleEnum.TOOL,
        content: '',
        toolCalls: toolCalls,
        toolResponses: toolResponses,
        timestamp: Date.now(),
        conversationId: this.conversationId,
        metadata: {},
      };
      this.messages.push(toolMessage);
    }

    // Archive and clear
    this.activeTransaction.state = 'committed';
    this.transactionHistory.push(this.activeTransaction);
    this.activeTransaction = null;

    this.internalTransitionTo(HistoryState.IDLE, 'transaction committed');
    this.logger.debug(
      () => '[HistoryService] Transaction committed successfully',
    );
  }

  /**
   * Rollback the active transaction
   * @pseudocode tool-transactions.md:71-82
   */
  rollbackTransaction(reason: string): void {
    if (!this.activeTransaction) {
      return; // Nothing to rollback
    }

    // Create cancellation responses for pending calls
    for (const [callId] of this.activeTransaction.toolCalls) {
      if (!this.activeTransaction.toolResponses.has(callId)) {
        const cancelResponse: ToolResponse = {
          toolCallId: callId,
          result: {
            error: `[Operation Cancelled] ${reason}`,
          },
          error: `[Operation Cancelled] ${reason}`, // Top-level error field for tests
        };
        this.activeTransaction.toolResponses.set(callId, cancelResponse);
      }
    }

    // ATOMIC: Add assistant message with toolCalls if present
    if (this.activeTransaction.assistantMessage) {
      const assistantWithCalls: Message = {
        ...this.activeTransaction.assistantMessage,
        toolCalls: Array.from(this.activeTransaction.toolCalls.values()),
      };
      this.messages.push(assistantWithCalls);
    }

    // Create tool message with all responses if present
    if (this.activeTransaction.toolResponses.size > 0) {
      // Ensure responses are ordered to match tool calls
      const toolCalls = Array.from(this.activeTransaction.toolCalls.values());
      const toolResponses = toolCalls.map(
        (call) => this.activeTransaction!.toolResponses.get(call.id)!,
      );

      const toolMessage: Message = {
        id: this.generateUUID(),
        role: MessageRoleEnum.TOOL,
        content: '',
        toolCalls: toolCalls,
        toolResponses: toolResponses,
        timestamp: Date.now(),
        conversationId: this.conversationId,
        metadata: {},
      };
      this.messages.push(toolMessage);
    }

    // Archive and clear as rolled back
    this.activeTransaction.state = 'rolledback';
    this.transactionHistory.push(this.activeTransaction);
    this.activeTransaction = null;

    this.internalTransitionTo(
      HistoryState.IDLE,
      `transaction rolled back: ${reason}`,
    );
    this.logger.debug(
      () => `[HistoryService] Transaction rolled back: ${reason}`,
    );
  }

  /**
   * Check if there is an active transaction
   */
  hasActiveTransaction(): boolean {
    return this.activeTransaction !== null;
  }

  /**
   * Add assistant message to active transaction
   * @pseudocode tool-transactions.md:24-37
   */
  addAssistantMessageToTransaction(
    content: string,
    toolCalls: ToolCall[],
  ): void {
    if (!this.activeTransaction) {
      throw new StateError('No active transaction');
    }
    if (this.activeTransaction.assistantMessage) {
      throw new StateError('Assistant message already set');
    }

    // Create message but DON'T add to history yet
    const message: Message = {
      id: this.generateUUID(),
      content,
      role:
        toolCalls.length === 0
          ? MessageRoleEnum.MODEL
          : MessageRoleEnum.ASSISTANT, // Use model role when no tool calls, assistant role when tool calls present
      timestamp: Date.now(),
      conversationId: this.conversationId,
      metadata: {},
    };

    this.activeTransaction.assistantMessage = message;

    // Track tool calls
    for (const call of toolCalls) {
      this.activeTransaction.toolCalls.set(call.id, call);
    }

    this.logger.debug(
      () =>
        `[HistoryService] Added assistant message to transaction with ${toolCalls.length} tool calls`,
    );
  }

  /**
   * Add tool response to active transaction
   * @pseudocode tool-transactions.md:38-47
   */
  addToolResponseToTransaction(
    toolCallId: string,
    response: ToolResponse,
  ): void {
    if (!this.activeTransaction) {
      throw new StateError('No active transaction');
    }
    if (!this.activeTransaction.toolCalls.has(toolCallId)) {
      throw new ValidationError(`Tool call ${toolCallId} not found`);
    }
    if (this.activeTransaction.toolResponses.has(toolCallId)) {
      throw new StateError(`Response already recorded for ${toolCallId}`);
    }

    // Ensure toolCallId is set correctly on the response
    const fullResponse: ToolResponse = {
      ...response,
      toolCallId: toolCallId,
    };

    this.activeTransaction.toolResponses.set(toolCallId, fullResponse);
    this.logger.debug(
      () => `[HistoryService] Added response for tool ${toolCallId}`,
    );
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

  /**
   * Get tool call status - implements IHistoryService
   * Returns the current status of tool calls with extended information
   * 
   * @requirement HS-050: Turn integration with HistoryService tool management
   * @requirement HS-014: Tool call status querying
   */
  getToolCallStatus(): ToolExecutionStatus {
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
    
    // Return ToolCallStatus that satisfies both internal needs and IHistoryService
    return {
      pendingCalls: 0,
      responseCount: completedCalls + failedCalls,
      currentState: this.state,
      completedCalls,
      failedCalls,
      executionOrder,
      details,
    };
  }

  /**
   * IHistoryService implementation - Add pending tool calls from OpenAI/other providers
   * This bridges the gap between Turn's expectations and HistoryService's transaction model
   * 
   * @requirement HS-050: Turn integration with HistoryService tool management
   */
  addPendingToolCalls(calls: ToolCall[]): void {
    this.logger.debug(
      () => `[addPendingToolCalls] Adding ${calls.length} pending tool calls`,
    );

    // Start a transaction if not already active
    if (!this.activeTransaction) {
      const transactionId = this.beginToolTransaction();
      this.logger.debug(
        () => `[addPendingToolCalls] Started transaction ${transactionId}`,
      );
    }

    // Add assistant message with tool calls to the transaction
    if (this.activeTransaction) {
      // Create a simple assistant message
      const message = "I'll help you with that.";
      this.addAssistantMessageToTransaction(message, calls);
      this.logger.debug(
        () => `[addPendingToolCalls] Added assistant message with ${calls.length} tool calls to transaction`,
      );
    } else {
      this.logger.error(
        () => `[addPendingToolCalls] Failed to start transaction for tool calls`,
      );
    }
  }

  /**
   * IHistoryService implementation - Commit tool responses from OpenAI/other providers
   * This bridges the gap between Turn's expectations and HistoryService's transaction model
   * 
   * @requirement HS-050: Turn integration with HistoryService tool management
   */
  commitToolResponses(responses: ToolResponse[]): void {
    this.logger.debug(
      () => `[commitToolResponses] Committing ${responses.length} tool responses`,
    );

    // Add each response to the active transaction
    if (this.activeTransaction) {
      for (const response of responses) {
        this.addToolResponseToTransaction(response.toolCallId, response);
        this.logger.debug(
          () => `[commitToolResponses] Added response for tool ${response.toolCallId}`,
        );
      }

      // Commit the transaction
      this.commitTransaction();
      this.logger.debug(
        () => `[commitToolResponses] Transaction committed successfully`,
      );
    } else {
      // No active transaction - this might happen if tools are returned directly from provider
      // Create a new transaction just for the responses
      this.logger.warn(
        () => `[commitToolResponses] No active transaction, creating one for responses`,
      );
      
      const transactionId = this.beginToolTransaction();
      for (const response of responses) {
        this.addToolResponseToTransaction(response.toolCallId, response);
      }
      this.commitTransaction();
      this.logger.debug(
        () => `[commitToolResponses] Created and committed transaction ${transactionId} for responses`,
      );
    }
  }
}
