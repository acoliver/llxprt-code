/**
 * Clean Start Test Data Fixtures for Integration Testing
 *
 * This module provides test data generation utilities for clean start
 * scenarios, including initialization states, empty configurations,
 * and first-run test data.
 */

import {
  ConversationMessage,
  ProviderType,
  MessageRoleEnum,
} from '../../../src/services/history/types';

export interface CleanStartState {
  id: string;
  initialized: boolean;
  components: string[];
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface InitializationData {
  databases: string[];
  providers: ProviderType[];
  configurations: Record<string, unknown>;
  services: string[];
}

export class CleanStartTestData {
  /**
   * Creates clean initialization data for testing
   */
  static createCleanInitializationData(): CleanStartState {
    return {
      id: 'clean-init-001',
      initialized: false,
      components: [],
      timestamp: new Date('2024-01-01T10:00:00Z'),
      metadata: {
        environment: 'test',
        version: '1.0.0',
        cleanStart: true,
      },
    };
  }

  /**
   * Creates clean provider setup data for testing
   */
  static createCleanProviderSetup(): InitializationData {
    return {
      databases: [],
      providers: [],
      configurations: {
        openai: { enabled: false, configured: false },
        anthropic: { enabled: false, configured: false },
        database: { connected: false, initialized: false },
      },
      services: [],
    };
  }

  /**
   * Creates clean database setup data for testing
   */
  static createCleanDatabaseSetup(): InitializationData {
    return {
      databases: [],
      providers: [],
      configurations: {
        database: {
          type: 'test',
          url: ':memory:',
          schema_version: null,
          tables_created: false,
          indexes_created: false,
          migrations_applied: [],
        },
      },
      services: [],
    };
  }

  /**
   * Creates clean environment validation data for testing
   */
  static createCleanEnvironmentValidation(): CleanStartState {
    return {
      id: 'clean-env-validation-001',
      initialized: false,
      components: [],
      timestamp: new Date('2024-01-01T10:00:00Z'),
      metadata: {
        environment_checks: {
          node_version: 'verified',
          dependencies: 'verified',
          permissions: 'verified',
          storage: 'available',
          memory: 'sufficient',
        },
      },
    };
  }

  /**
   * Creates empty history initialization data for testing
   */
  static createEmptyHistoryInit(): CleanStartState {
    return {
      id: 'empty-history-init-001',
      initialized: true,
      components: ['HistoryService'],
      timestamp: new Date('2024-01-01T10:00:00Z'),
      metadata: {
        history: {
          conversation_count: 0,
          message_count: 0,
          storage_size: 0,
          compression_enabled: false,
        },
      },
    };
  }

  /**
   * Creates empty state consistency data for testing
   */
  static createEmptyStateConsistency(): CleanStartState {
    return {
      id: 'empty-state-consistency-001',
      initialized: true,
      components: ['HistoryService', 'StateManager', 'MessageValidator'],
      timestamp: new Date('2024-01-01T10:00:00Z'),
      metadata: {
        state_checks: {
          memory_consistent: true,
          storage_consistent: true,
          cache_empty: true,
          indexes_empty: true,
        },
      },
    };
  }

  /**
   * Creates empty history query data for testing
   */
  static createEmptyHistoryQueries(): {
    queries: Array<{ query: string; expected_result: unknown }>;
  } {
    return {
      queries: [
        {
          query: 'getAllConversations',
          expected_result: [],
        },
        {
          query: 'getMessageCount',
          expected_result: 0,
        },
        {
          query: 'getLatestMessage',
          expected_result: null,
        },
        {
          query: 'searchMessages',
          expected_result: [],
        },
      ],
    };
  }

  /**
   * Creates first message preparation data for testing
   */
  static createFirstMessagePrep(): CleanStartState {
    return {
      id: 'first-message-prep-001',
      initialized: true,
      components: [
        'HistoryService',
        'StateManager',
        'MessageValidator',
        'ErrorHandler',
      ],
      timestamp: new Date('2024-01-01T10:00:00Z'),
      metadata: {
        ready_for_messages: true,
        providers_available: true,
        storage_ready: true,
        validation_ready: true,
      },
    };
  }

  /**
   * Creates first user message data for testing
   */
  static createFirstUserMessage(): ConversationMessage {
    return {
      id: 'first-user-msg-001',
      role: MessageRoleEnum.USER,
      content: 'Hello, this is my first message!',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      provider: ProviderType.OPENAI,
      metadata: {
        first_message: true,
        session_start: true,
      },
    };
  }

  /**
   * Creates first assistant response data for testing
   */
  static createFirstAssistantResponse(): ConversationMessage {
    return {
      id: 'first-assistant-resp-001',
      role: MessageRoleEnum.MODEL,
      content: 'Hello! Welcome to the system. How can I help you today?',
      timestamp: new Date('2024-01-01T10:00:05Z'),
      provider: ProviderType.OPENAI,
      metadata: {
        first_response: true,
        tokens: 15,
        model: 'gpt-4',
      },
    };
  }

  /**
   * Creates initial context establishment data for testing
   */
  static createInitialContextEstablishment(): {
    context: Record<string, unknown>;
    session: Record<string, unknown>;
  } {
    return {
      context: {
        conversation_id: 'conv-001',
        established: true,
        initial_context: {},
        user_preferences: {},
        session_metadata: {},
      },
      session: {
        id: 'session-001',
        started: new Date('2024-01-01T10:00:00Z'),
        provider: ProviderType.OPENAI,
        active: true,
      },
    };
  }

  /**
   * Creates first turn completion data for testing
   */
  static createFirstTurnCompletion(): {
    turn: Record<string, unknown>;
    validation: Record<string, boolean>;
  } {
    return {
      turn: {
        id: 'turn-001',
        user_message: 'first-user-msg-001',
        assistant_response: 'first-assistant-resp-001',
        completed: true,
        duration_ms: 5000,
      },
      validation: {
        user_message_stored: true,
        assistant_response_stored: true,
        context_preserved: true,
        state_consistent: true,
      },
    };
  }

  /**
   * Additional stub methods for comprehensive test coverage
   */
  static createInternalStateInit(): CleanStartState {
    // TODO: Implement internal state initialization generation
    return this.createCleanInitializationData();
  }

  static createMemoryManagementInit(): CleanStartState {
    // TODO: Implement memory management initialization generation
    return this.createCleanInitializationData();
  }

  static createCompressionSystemInit(): CleanStartState {
    // TODO: Implement compression system initialization generation
    return this.createCleanInitializationData();
  }

  static createErrorHandlingInit(): CleanStartState {
    // TODO: Implement error handling initialization generation
    return this.createCleanInitializationData();
  }

  static createStateManagerInit(): CleanStartState {
    // TODO: Implement StateManager initialization generation
    return this.createCleanInitializationData();
  }

  static createMessageValidatorInit(): CleanStartState {
    // TODO: Implement MessageValidator initialization generation
    return this.createCleanInitializationData();
  }

  static createErrorHandlerInit(): CleanStartState {
    // TODO: Implement ErrorHandler initialization generation
    return this.createCleanInitializationData();
  }

  static createComponentInterdependency(): CleanStartState {
    // TODO: Implement component interdependency generation
    return this.createCleanInitializationData();
  }

  static createMultipleCleanStarts(): CleanStartState[] {
    // TODO: Implement multiple clean starts generation
    return [this.createCleanInitializationData()];
  }

  static createPartialDataCleanStart(): CleanStartState {
    // TODO: Implement partial data clean start generation
    return this.createCleanInitializationData();
  }

  static createPostFailureCleanStart(): CleanStartState {
    // TODO: Implement post-failure clean start generation
    return this.createCleanInitializationData();
  }

  static createResourceAvailabilityCleanStart(): CleanStartState {
    // TODO: Implement resource availability clean start generation
    return this.createCleanInitializationData();
  }

  static createCleanStartTiming(): CleanStartState {
    // TODO: Implement clean start timing generation
    return this.createCleanInitializationData();
  }

  static createMemoryFootprintValidation(): CleanStartState {
    // TODO: Implement memory footprint validation generation
    return this.createCleanInitializationData();
  }

  static createResourceUtilizationMeasurement(): CleanStartState {
    // TODO: Implement resource utilization measurement generation
    return this.createCleanInitializationData();
  }
}
