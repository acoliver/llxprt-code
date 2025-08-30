/**
 * Provider Response Fixtures for Integration Testing
 *
 * This module provides test data generation utilities for provider-specific
 * responses, including OpenAI and Anthropic message formats, cross-provider
 * scenarios, and provider switching test data.
 */

import {
  ConversationMessage,
  ConversationHistory,
  ProviderType,
  MessageRoleEnum,
} from '../../../src/services/history/types';

export class ProviderResponses {
  /**
   * Creates OpenAI-formatted messages for testing
   */
  static createOpenAIMessages(): ConversationMessage[] {
    return [
      {
        id: 'openai-msg-001',
        role: MessageRoleEnum.USER,
        content: 'Test OpenAI user message',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        provider: ProviderType.OPENAI,
        metadata: {
          model: 'gpt-4',
          tokens: 120,
          usage: {
            prompt_tokens: 20,
            completion_tokens: 100,
            total_tokens: 120,
          },
        },
      },
      {
        id: 'openai-msg-002',
        role: MessageRoleEnum.MODEL,
        content: 'Test OpenAI assistant response',
        timestamp: new Date('2024-01-01T10:00:05Z'),
        provider: ProviderType.OPENAI,
        metadata: {
          model: 'gpt-4',
          tokens: 250,
          usage: {
            prompt_tokens: 120,
            completion_tokens: 130,
            total_tokens: 250,
          },
          finish_reason: 'stop',
        },
      },
    ];
  }

  /**
   * Creates Anthropic-formatted messages for testing
   */
  static createAnthropicMessages(): ConversationMessage[] {
    return [
      {
        id: 'anthropic-msg-001',
        role: MessageRoleEnum.USER,
        content: 'Test Anthropic user message',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        provider: ProviderType.ANTHROPIC,
        metadata: {
          model: 'claude-3-opus-20240229',
          tokens: 115,
        },
      },
      {
        id: 'anthropic-msg-002',
        role: MessageRoleEnum.MODEL,
        content: 'Test Anthropic assistant response',
        timestamp: new Date('2024-01-01T10:00:05Z'),
        provider: ProviderType.ANTHROPIC,
        metadata: {
          model: 'claude-3-opus-20240229',
          tokens: 245,
          stop_reason: 'end_turn',
        },
      },
    ];
  }

  /**
   * Creates OpenAI conversation history for testing
   */
  static createOpenAIHistory(): ConversationHistory {
    return {
      id: 'openai-history-001',
      messages: this.createOpenAIMessages(),
      metadata: {
        created: new Date('2024-01-01T10:00:00Z'),
        lastUpdated: new Date('2024-01-01T10:00:05Z'),
        provider: ProviderType.OPENAI,
        totalTokens: 370,
        model: 'gpt-4',
      },
    };
  }

  /**
   * Creates Anthropic conversation history for testing
   */
  static createAnthropicHistory(): ConversationHistory {
    return {
      id: 'anthropic-history-001',
      messages: this.createAnthropicMessages(),
      metadata: {
        created: new Date('2024-01-01T10:00:00Z'),
        lastUpdated: new Date('2024-01-01T10:00:05Z'),
        provider: ProviderType.ANTHROPIC,
        totalTokens: 360,
        model: 'claude-3-opus-20240229',
      },
    };
  }

  /**
   * Creates OpenAI streaming response data for testing
   */
  static createOpenAIStreamingResponse(): ConversationMessage {
    return {
      id: 'openai-stream-001',
      role: MessageRoleEnum.MODEL,
      content: 'This is a streaming response from OpenAI',
      timestamp: new Date('2024-01-01T10:00:05Z'),
      provider: ProviderType.OPENAI,
      metadata: {
        model: 'gpt-4',
        streaming: true,
        chunks: [
          { content: 'This is ', timestamp: new Date('2024-01-01T10:00:05Z') },
          {
            content: 'a streaming ',
            timestamp: new Date('2024-01-01T10:00:06Z'),
          },
          {
            content: 'response from OpenAI',
            timestamp: new Date('2024-01-01T10:00:07Z'),
          },
        ],
      },
    };
  }

  /**
   * Creates OpenAI function calling history for testing
   */
  static createOpenAIFunctionCallHistory(): ConversationHistory {
    return {
      id: 'openai-function-call-001',
      messages: [
        {
          id: 'msg-001',
          role: MessageRoleEnum.USER,
          content: 'What is the weather like?',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          provider: ProviderType.OPENAI,
          metadata: {},
        },
        {
          id: 'msg-002',
          role: MessageRoleEnum.MODEL,
          content: '',
          timestamp: new Date('2024-01-01T10:00:05Z'),
          provider: ProviderType.OPENAI,
          metadata: {
            function_call: {
              name: 'get_weather',
              arguments: JSON.stringify({ location: 'current' }),
            },
          },
        },
        {
          id: 'msg-003',
          role: MessageRoleEnum.TOOL,
          content: JSON.stringify({ temperature: 72, condition: 'sunny' }),
          timestamp: new Date('2024-01-01T10:00:10Z'),
          provider: ProviderType.OPENAI,
          metadata: {
            name: 'get_weather',
          },
        },
      ],
      metadata: {
        created: new Date('2024-01-01T10:00:00Z'),
        lastUpdated: new Date('2024-01-01T10:00:10Z'),
        provider: ProviderType.OPENAI,
        hasFunctionCalls: true,
      },
    };
  }

  /**
   * Creates Anthropic tool use history for testing
   */
  static createAnthropicToolUseHistory(): ConversationHistory {
    return {
      id: 'anthropic-tool-use-001',
      messages: [
        {
          id: 'msg-001',
          role: MessageRoleEnum.USER,
          content: 'Can you check the current time?',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          provider: ProviderType.ANTHROPIC,
          metadata: {},
        },
        {
          id: 'msg-002',
          role: MessageRoleEnum.MODEL,
          content: '',
          timestamp: new Date('2024-01-01T10:00:05Z'),
          provider: ProviderType.ANTHROPIC,
          metadata: {
            tool_calls: [
              {
                id: 'tool-call-001',
                type: 'function',
                function: {
                  name: 'get_current_time',
                  arguments: '{}',
                },
              },
            ],
          },
        },
        {
          id: 'msg-003',
          role: MessageRoleEnum.TOOL,
          content: JSON.stringify({ current_time: '2024-01-01T10:00:10Z' }),
          timestamp: new Date('2024-01-01T10:00:10Z'),
          provider: ProviderType.ANTHROPIC,
          metadata: {
            tool_call_id: 'tool-call-001',
          },
        },
      ],
      metadata: {
        created: new Date('2024-01-01T10:00:00Z'),
        lastUpdated: new Date('2024-01-01T10:00:10Z'),
        provider: ProviderType.ANTHROPIC,
        hasToolUse: true,
      },
    };
  }

  /**
   * Creates Anthropic system messages for testing
   */
  static createAnthropicSystemMessages(): ConversationHistory {
    return {
      id: 'anthropic-system-001',
      messages: [
        {
          id: 'msg-001',
          role: MessageRoleEnum.SYSTEM,
          content:
            'You are a helpful assistant specialized in TypeScript development.',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          provider: ProviderType.ANTHROPIC,
          metadata: {},
        },
        {
          id: 'msg-002',
          role: MessageRoleEnum.USER,
          content: 'Help me with TypeScript types',
          timestamp: new Date('2024-01-01T10:00:05Z'),
          provider: ProviderType.ANTHROPIC,
          metadata: {},
        },
        {
          id: 'msg-003',
          role: MessageRoleEnum.MODEL,
          content:
            "I'd be happy to help you with TypeScript types. What specific aspect would you like to explore?",
          timestamp: new Date('2024-01-01T10:00:10Z'),
          provider: ProviderType.ANTHROPIC,
          metadata: {},
        },
      ],
      metadata: {
        created: new Date('2024-01-01T10:00:00Z'),
        lastUpdated: new Date('2024-01-01T10:00:10Z'),
        provider: ProviderType.ANTHROPIC,
        hasSystemMessage: true,
      },
    };
  }

  /**
   * Creates raw OpenAI history format for normalization testing
   */
  static createRawOpenAIHistory(): unknown {
    return {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1640995200,
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a raw OpenAI response format',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 30,
        total_tokens: 50,
      },
    };
  }

  /**
   * Creates raw Anthropic history format for normalization testing
   */
  static createRawAnthropicHistory(): unknown {
    return {
      id: 'msg_123abc',
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'This is a raw Anthropic response format',
        },
      ],
      model: 'claude-3-opus-20240229',
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: {
        input_tokens: 25,
        output_tokens: 35,
      },
    };
  }

  /**
   * Additional stub methods for comprehensive test coverage
   */
  static createMixedFormatHistory(): ConversationHistory {
    // TODO: Implement mixed format history generation
    return this.createOpenAIHistory();
  }

  static createMetadataRichHistory(): ConversationHistory {
    // TODO: Implement metadata-rich history generation
    return this.createOpenAIHistory();
  }

  static createCrossProviderConversation(): ConversationHistory {
    // TODO: Implement cross-provider conversation generation
    return this.createOpenAIHistory();
  }

  static createFormatTranslationScenario(): ConversationHistory {
    // TODO: Implement format translation scenario
    return this.createOpenAIHistory();
  }

  static createContextSwitchScenario(): ConversationHistory {
    // TODO: Implement context switch scenario
    return this.createOpenAIHistory();
  }

  static createCapabilityScenario(): ConversationHistory {
    // TODO: Implement capability scenario
    return this.createOpenAIHistory();
  }

  static createOpenAIToAnthropicSwitch(): ConversationHistory {
    // TODO: Implement OpenAI to Anthropic switch scenario
    return this.createOpenAIHistory();
  }

  static createAnthropicToOpenAISwitch(): ConversationHistory {
    // TODO: Implement Anthropic to OpenAI switch scenario
    return this.createAnthropicHistory();
  }

  static createRapidSwitchScenario(): ConversationHistory {
    // TODO: Implement rapid switch scenario
    return this.createOpenAIHistory();
  }

  static createIntegrityDuringSwitchScenario(): ConversationHistory {
    // TODO: Implement integrity during switch scenario
    return this.createOpenAIHistory();
  }

  static createSwitchFailureScenario(): ConversationHistory {
    // TODO: Implement switch failure scenario
    return this.createOpenAIHistory();
  }
}
