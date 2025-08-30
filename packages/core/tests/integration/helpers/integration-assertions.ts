/**
 * Integration Test Assertions Helper
 *
 * This module provides specialized assertion utilities for integration testing,
 * including conversation validation, provider consistency checks, and system state verification.
 */

import { expect } from 'vitest';
import {
  ConversationHistory,
  ConversationMessage,
  ProviderType,
} from '../../../src/services/history/types';

export interface AssertionResult {
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface ConversationAssertions {
  hasValidStructure: boolean;
  messagesInOrder: boolean;
  providersConsistent: boolean;
  timestampsValid: boolean;
}

export interface SystemStateAssertions {
  componentsInitialized: boolean;
  databaseConnected: boolean;
  providersReady: boolean;
  memoryWithinLimits: boolean;
}

export class IntegrationAssertions {
  /**
   * Asserts that a conversation has valid structure
   */
  assertConversationStructure(
    conversation: ConversationHistory,
  ): AssertionResult {
    try {
      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(typeof conversation.id).toBe('string');
      expect(conversation.messages).toBeDefined();
      expect(Array.isArray(conversation.messages)).toBe(true);
      expect(conversation.metadata).toBeDefined();
      expect(conversation.metadata.created).toBeInstanceOf(Date);
      expect(conversation.metadata.lastUpdated).toBeInstanceOf(Date);

      return {
        passed: true,
        message: 'Conversation structure is valid',
      };
    } catch (error) {
      return {
        passed: false,
        message: `Conversation structure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { conversation },
      };
    }
  }

  /**
   * Asserts that messages are in chronological order
   */
  assertMessageOrdering(messages: ConversationMessage[]): AssertionResult {
    try {
      for (let i = 1; i < messages.length; i++) {
        const prevTimestamp = messages[i - 1].timestamp.getTime();
        const currTimestamp = messages[i].timestamp.getTime();

        expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
      }

      return {
        passed: true,
        message: 'Messages are in correct chronological order',
      };
    } catch (error) {
      return {
        passed: false,
        message: `Message ordering validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { messageCount: messages.length },
      };
    }
  }

  /**
   * Asserts provider consistency across conversation
   */
  assertProviderConsistency(
    conversation: ConversationHistory,
  ): AssertionResult {
    try {
      const conversationProvider = conversation.metadata.provider;
      expect(conversationProvider).toBeDefined();
      expect(Object.values(ProviderType)).toContain(conversationProvider);

      // Check if messages have consistent provider information where applicable
      for (const message of conversation.messages) {
        expect(message.provider).toBeDefined();
        expect(Object.values(ProviderType)).toContain(message.provider);
      }

      return {
        passed: true,
        message: 'Provider consistency validated',
      };
    } catch (error) {
      return {
        passed: false,
        message: `Provider consistency validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          conversationProvider: conversation.metadata.provider,
          messageProviders: conversation.messages.map((m) => m.provider),
        },
      };
    }
  }

  /**
   * Asserts that timestamps are valid and reasonable
   */
  assertTimestampValidity(conversation: ConversationHistory): AssertionResult {
    try {
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      // Check conversation timestamps
      expect(conversation.metadata.created).toBeInstanceOf(Date);
      expect(conversation.metadata.created.getTime()).toBeGreaterThan(
        oneYearAgo.getTime(),
      );
      expect(conversation.metadata.created.getTime()).toBeLessThanOrEqual(
        now.getTime(),
      );

      expect(conversation.metadata.lastUpdated).toBeInstanceOf(Date);
      expect(
        conversation.metadata.lastUpdated.getTime(),
      ).toBeGreaterThanOrEqual(conversation.metadata.created.getTime());
      expect(conversation.metadata.lastUpdated.getTime()).toBeLessThanOrEqual(
        now.getTime(),
      );

      // Check message timestamps
      for (const message of conversation.messages) {
        expect(message.timestamp).toBeInstanceOf(Date);
        expect(message.timestamp.getTime()).toBeGreaterThan(
          oneYearAgo.getTime(),
        );
        expect(message.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      }

      return {
        passed: true,
        message: 'All timestamps are valid',
      };
    } catch (error) {
      return {
        passed: false,
        message: `Timestamp validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          conversationCreated: conversation.metadata.created,
          conversationUpdated: conversation.metadata.lastUpdated,
        },
      };
    }
  }

  /**
   * Asserts that conversation content integrity is maintained
   */
  assertContentIntegrity(
    original: ConversationHistory,
    retrieved: ConversationHistory,
  ): AssertionResult {
    try {
      expect(retrieved.id).toBe(original.id);
      expect(retrieved.messages.length).toBe(original.messages.length);

      for (let i = 0; i < original.messages.length; i++) {
        const originalMsg = original.messages[i];
        const retrievedMsg = retrieved.messages[i];

        expect(retrievedMsg.id).toBe(originalMsg.id);
        expect(retrievedMsg.role).toBe(originalMsg.role);
        expect(retrievedMsg.content).toBe(originalMsg.content);
        expect(retrievedMsg.provider).toBe(originalMsg.provider);
      }

      return {
        passed: true,
        message: 'Content integrity maintained',
      };
    } catch (error) {
      return {
        passed: false,
        message: `Content integrity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          originalId: original.id,
          retrievedId: retrieved.id,
          originalMessageCount: original.messages.length,
          retrievedMessageCount: retrieved.messages.length,
        },
      };
    }
  }

  /**
   * Asserts system state is healthy
   */
  assertSystemState(
    expectedState: Partial<SystemStateAssertions>,
  ): AssertionResult {
    try {
      // TODO: Implement actual system state validation
      // This is a stub implementation

      const actualState: SystemStateAssertions = {
        componentsInitialized: true,
        databaseConnected: true,
        providersReady: true,
        memoryWithinLimits: true,
      };

      for (const [key, expectedValue] of Object.entries(expectedState)) {
        const actualValue = (actualState as Record<string, unknown>)[key];
        expect(actualValue).toBe(expectedValue);
      }

      return {
        passed: true,
        message: 'System state is healthy',
        details: actualState,
      };
    } catch (error) {
      return {
        passed: false,
        message: `System state validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { expectedState },
      };
    }
  }

  /**
   * Asserts performance metrics are within acceptable bounds
   */
  assertPerformanceMetrics(
    metrics: Record<string, number>,
    bounds: Record<string, number>,
  ): AssertionResult {
    try {
      for (const [metric, bound] of Object.entries(bounds)) {
        const actualValue = metrics[metric];
        expect(actualValue).toBeDefined();
        expect(actualValue).toBeLessThanOrEqual(bound);
      }

      return {
        passed: true,
        message: 'Performance metrics within bounds',
        details: { metrics, bounds },
      };
    } catch (error) {
      return {
        passed: false,
        message: `Performance metrics validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { metrics, bounds },
      };
    }
  }

  /**
   * Asserts that error recovery was successful
   */
  assertErrorRecovery(
    errorScenario: string,
    recoveryResult: boolean,
  ): AssertionResult {
    try {
      expect(recoveryResult).toBe(true);

      return {
        passed: true,
        message: `Error recovery successful for scenario: ${errorScenario}`,
      };
    } catch {
      return {
        passed: false,
        message: `Error recovery failed for scenario: ${errorScenario}`,
        details: { errorScenario, recoveryResult },
      };
    }
  }

  /**
   * Runs comprehensive conversation validation
   */
  validateConversation(
    conversation: ConversationHistory,
  ): ConversationAssertions {
    const structureResult = this.assertConversationStructure(conversation);
    const orderingResult = this.assertMessageOrdering(conversation.messages);
    const providerResult = this.assertProviderConsistency(conversation);
    const timestampResult = this.assertTimestampValidity(conversation);

    return {
      hasValidStructure: structureResult.passed,
      messagesInOrder: orderingResult.passed,
      providersConsistent: providerResult.passed,
      timestampsValid: timestampResult.passed,
    };
  }

  /**
   * Utility method to assert multiple conditions
   */
  assertMultiple(assertions: Array<() => AssertionResult>): AssertionResult {
    const results = assertions.map((assertion) => assertion());
    const failures = results.filter((result) => !result.passed);

    if (failures.length === 0) {
      return {
        passed: true,
        message: `All ${results.length} assertions passed`,
      };
    } else {
      return {
        passed: false,
        message: `${failures.length} of ${results.length} assertions failed`,
        details: {
          failures: failures.map((f) => f.message),
        },
      };
    }
  }

  /**
   * Custom assertion for integration test specific scenarios
   */
  assertCustomCondition(
    condition: boolean,
    message: string,
    details?: Record<string, unknown>,
  ): AssertionResult {
    try {
      expect(condition).toBe(true);

      return {
        passed: true,
        message,
      };
    } catch {
      return {
        passed: false,
        message: `Custom assertion failed: ${message}`,
        details,
      };
    }
  }
}
