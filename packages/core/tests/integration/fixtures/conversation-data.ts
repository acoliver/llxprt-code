/**
 * Conversation Data Fixtures for Integration Testing
 *
 * This module provides test data generation utilities for conversation-based
 * integration tests, including sample conversations, multi-turn scenarios,
 * and various conversation flow patterns.
 */

import {
  ConversationMessage,
  ConversationHistory,
  ProviderType,
  MessageRoleEnum,
} from '../../../src/services/history/types';

export class ConversationData {
  /**
   * Creates a basic sample conversation with user/assistant exchanges
   */
  static createSampleConversation(): ConversationHistory {
    return {
      id: 'sample-conversation-001',
      messages: [
        {
          id: 'msg-001',
          role: MessageRoleEnum.USER,
          content: 'Hello, can you help me with TypeScript?',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          provider: ProviderType.OPENAI,
          metadata: {},
        },
        {
          id: 'msg-002',
          role: MessageRoleEnum.MODEL,
          content:
            "Of course! I'd be happy to help you with TypeScript. What specific topic would you like to explore?",
          timestamp: new Date('2024-01-01T10:00:05Z'),
          provider: ProviderType.OPENAI,
          metadata: {},
        },
      ],
      metadata: {
        created: new Date('2024-01-01T10:00:00Z'),
        lastUpdated: new Date('2024-01-01T10:00:05Z'),
        provider: ProviderType.OPENAI,
      },
    };
  }

  /**
   * Creates a multi-turn conversation for context preservation testing
   */
  static createMultiTurnConversation(): ConversationHistory {
    const messages: ConversationMessage[] = [];
    const baseTime = new Date('2024-01-01T10:00:00Z');

    for (let i = 0; i < 10; i++) {
      messages.push({
        id: `msg-${String(i + 1).padStart(3, '0')}`,
        role: i % 2 === 0 ? MessageRoleEnum.USER : MessageRoleEnum.MODEL,
        content: `Message ${i + 1} content for multi-turn conversation`,
        timestamp: new Date(baseTime.getTime() + i * 30000),
        provider: ProviderType.OPENAI,
        metadata: {},
      });
    }

    return {
      id: 'multi-turn-conversation-001',
      messages,
      metadata: {
        created: baseTime,
        lastUpdated: new Date(baseTime.getTime() + 9 * 30000),
        provider: ProviderType.OPENAI,
      },
    };
  }

  /**
   * Creates an interrupted conversation scenario for resumption testing
   */
  static createInterruptedConversation(): ConversationHistory {
    return {
      id: 'interrupted-conversation-001',
      messages: [
        {
          id: 'msg-001',
          role: MessageRoleEnum.USER,
          content: 'I was working on a complex problem...',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          provider: ProviderType.OPENAI,
          metadata: {},
        },
        {
          id: 'msg-002',
          role: MessageRoleEnum.MODEL,
          content:
            'I understand you were working on something complex. Could you tell me more about',
          timestamp: new Date('2024-01-01T10:00:05Z'),
          provider: ProviderType.OPENAI,
          metadata: { interrupted: true },
        },
      ],
      metadata: {
        created: new Date('2024-01-01T10:00:00Z'),
        lastUpdated: new Date('2024-01-01T10:00:05Z'),
        provider: ProviderType.OPENAI,
        interrupted: true,
      },
    };
  }

  /**
   * Creates provider switching scenario data
   */
  static createProviderSwitchScenario(): ConversationHistory {
    return {
      id: 'provider-switch-001',
      messages: [
        {
          id: 'msg-001',
          role: MessageRoleEnum.USER,
          content: 'Starting with OpenAI',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          provider: ProviderType.OPENAI,
          metadata: {},
        },
        {
          id: 'msg-002',
          role: MessageRoleEnum.MODEL,
          content: 'Response from OpenAI',
          timestamp: new Date('2024-01-01T10:00:05Z'),
          provider: ProviderType.OPENAI,
          metadata: {},
        },
        {
          id: 'msg-003',
          role: MessageRoleEnum.USER,
          content: 'Continuing with Anthropic',
          timestamp: new Date('2024-01-01T10:01:00Z'),
          provider: ProviderType.ANTHROPIC,
          metadata: {},
        },
        {
          id: 'msg-004',
          role: MessageRoleEnum.MODEL,
          content: 'Response from Anthropic',
          timestamp: new Date('2024-01-01T10:01:05Z'),
          provider: ProviderType.ANTHROPIC,
          metadata: {},
        },
      ],
      metadata: {
        created: new Date('2024-01-01T10:00:00Z'),
        lastUpdated: new Date('2024-01-01T10:01:05Z'),
        provider: ProviderType.ANTHROPIC,
        providerSwitches: [
          {
            from: ProviderType.OPENAI,
            to: ProviderType.ANTHROPIC,
            at: new Date('2024-01-01T10:01:00Z'),
          },
        ],
      },
    };
  }

  /**
   * Creates ordered message flow data for validation testing
   */
  static createOrderedMessageFlow(): ConversationHistory {
    const messages: ConversationMessage[] = [];
    const baseTime = new Date('2024-01-01T10:00:00Z');

    for (let i = 0; i < 20; i++) {
      messages.push({
        id: `ordered-msg-${String(i + 1).padStart(3, '0')}`,
        role: i % 2 === 0 ? MessageRoleEnum.USER : MessageRoleEnum.MODEL,
        content: `Ordered message ${i + 1}`,
        timestamp: new Date(baseTime.getTime() + i * 10000),
        provider: ProviderType.OPENAI,
        metadata: { sequenceNumber: i + 1 },
      });
    }

    return {
      id: 'ordered-flow-001',
      messages,
      metadata: {
        created: baseTime,
        lastUpdated: new Date(baseTime.getTime() + 19 * 10000),
        provider: ProviderType.OPENAI,
        messageCount: 20,
      },
    };
  }

  /**
   * Creates unordered message flow for edge case testing
   */
  static createUnorderedMessageFlow(): ConversationHistory {
    const baseTime = new Date('2024-01-01T10:00:00Z');

    return {
      id: 'unordered-flow-001',
      messages: [
        {
          id: 'msg-003',
          role: MessageRoleEnum.MODEL,
          content: 'Third message (out of order)',
          timestamp: new Date(baseTime.getTime() + 20000),
          provider: ProviderType.OPENAI,
          metadata: {},
        },
        {
          id: 'msg-001',
          role: MessageRoleEnum.USER,
          content: 'First message',
          timestamp: baseTime,
          provider: ProviderType.OPENAI,
          metadata: {},
        },
        {
          id: 'msg-002',
          role: MessageRoleEnum.USER,
          content: 'Second message',
          timestamp: new Date(baseTime.getTime() + 10000),
          provider: ProviderType.OPENAI,
          metadata: {},
        },
      ],
      metadata: {
        created: baseTime,
        lastUpdated: new Date(baseTime.getTime() + 20000),
        provider: ProviderType.OPENAI,
        orderingIssue: true,
      },
    };
  }

  /**
   * Additional stub methods for comprehensive test coverage
   */
  static createIntegrityTestMessages(): ConversationHistory {
    // TODO: Implement integrity test message generation
    return this.createSampleConversation();
  }

  static createContextualConversation(): ConversationHistory {
    // TODO: Implement contextual conversation generation
    return this.createSampleConversation();
  }

  static createStoredConversation(): ConversationHistory {
    // TODO: Implement stored conversation generation
    return this.createSampleConversation();
  }

  static createCompressibleConversation(): ConversationHistory {
    // TODO: Implement compressible conversation generation
    return this.createSampleConversation();
  }

  static createProviderErrorScenario(): ConversationHistory {
    // TODO: Implement provider error scenario generation
    return this.createSampleConversation();
  }

  static createStorageFailureScenario(): ConversationHistory {
    // TODO: Implement storage failure scenario generation
    return this.createSampleConversation();
  }

  static createIntegrityErrorScenario(): ConversationHistory {
    // TODO: Implement integrity error scenario generation
    return this.createSampleConversation();
  }

  // Additional stub methods for compression testing
  static createLargeConversation(): ConversationHistory {
    // TODO: Implement large conversation generation
    return this.createSampleConversation();
  }

  static createHighVolumeConversation(): ConversationHistory {
    // TODO: Implement high volume conversation generation
    return this.createSampleConversation();
  }

  static createAgeBasedHistory(): ConversationHistory {
    // TODO: Implement age-based history generation
    return this.createSampleConversation();
  }

  static createConfigurableCompressionScenario(): ConversationHistory {
    // TODO: Implement configurable compression scenario
    return this.createSampleConversation();
  }

  static createTokenCompressibleHistory(): ConversationHistory {
    // TODO: Implement token compressible history
    return this.createSampleConversation();
  }

  static createSemanticCompressibleHistory(): ConversationHistory {
    // TODO: Implement semantic compressible history
    return this.createSampleConversation();
  }

  static createHybridCompressibleHistory(): ConversationHistory {
    // TODO: Implement hybrid compressible history
    return this.createSampleConversation();
  }

  static createAlgorithmSelectionScenario(): ConversationHistory {
    // TODO: Implement algorithm selection scenario
    return this.createSampleConversation();
  }

  static createCompressedHistory(): ConversationHistory {
    // TODO: Implement compressed history generation
    return this.createSampleConversation();
  }

  static createOnDemandDecompressionScenario(): ConversationHistory {
    // TODO: Implement on-demand decompression scenario
    return this.createSampleConversation();
  }

  static createQueryableCompressedHistory(): ConversationHistory {
    // TODO: Implement queryable compressed history
    return this.createSampleConversation();
  }

  static createPartialDecompressionScenario(): ConversationHistory {
    // TODO: Implement partial decompression scenario
    return this.createSampleConversation();
  }

  static createPerformanceTestHistory(): ConversationHistory {
    // TODO: Implement performance test history
    return this.createSampleConversation();
  }

  static createDecompressionPerformanceScenario(): ConversationHistory {
    // TODO: Implement decompression performance scenario
    return this.createSampleConversation();
  }

  static createCompressionRatioScenario(): ConversationHistory {
    // TODO: Implement compression ratio scenario
    return this.createSampleConversation();
  }

  static createStorageSavingsBenchmark(): ConversationHistory {
    // TODO: Implement storage savings benchmark
    return this.createSampleConversation();
  }

  static createCompressionFailureScenario(): ConversationHistory {
    // TODO: Implement compression failure scenario
    return this.createSampleConversation();
  }

  static createDecompressionCorruptionScenario(): ConversationHistory {
    // TODO: Implement decompression corruption scenario
    return this.createSampleConversation();
  }

  static createCompressionStorageFailureScenario(): ConversationHistory {
    // TODO: Implement compression storage failure scenario
    return this.createSampleConversation();
  }

  static createUncompressedFallbackScenario(): ConversationHistory {
    // TODO: Implement uncompressed fallback scenario
    return this.createSampleConversation();
  }

  static createIncrementalCompressionScenario(): ConversationHistory {
    // TODO: Implement incremental compression scenario
    return this.createSampleConversation();
  }

  static createMixedContentCompressionScenario(): ConversationHistory {
    // TODO: Implement mixed content compression scenario
    return this.createSampleConversation();
  }

  static createConcurrentCompressionScenario(): ConversationHistory {
    // TODO: Implement concurrent compression scenario
    return this.createSampleConversation();
  }

  static createCompressionMigrationScenario(): ConversationHistory {
    // TODO: Implement compression migration scenario
    return this.createSampleConversation();
  }
}
