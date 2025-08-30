/**
 * Tool Execution Data Fixtures for Integration Testing
 *
 * This module provides test data generation utilities for tool execution
 * scenarios, including tool calls, results, chains, and error conditions.
 */

import {
  ToolCall,
  ToolResult,
  ToolExecutionChain,
} from '../../../src/services/history/types';

export interface IToolExecutionData {
  id: string;
  calls: ToolCall[];
  results: ToolResult[];
  metadata?: Record<string, unknown>;
}

export class ToolExecutionData {
  /**
   * Creates a single tool call execution for testing
   */
  static createSingleToolCall(): IToolExecutionData {
    const toolCall: ToolCall = {
      id: 'tool-call-001',
      name: 'get_weather',
      arguments: { location: 'San Francisco', units: 'celsius' },
      timestamp: new Date('2024-01-01T10:00:00Z'),
    };

    const toolResult: ToolResult = {
      id: 'tool-result-001',
      callId: 'tool-call-001',
      success: true,
      result: { temperature: 18, condition: 'partly cloudy', humidity: 65 },
      timestamp: new Date('2024-01-01T10:00:05Z'),
      executionTime: 5000,
    };

    return {
      id: 'single-tool-execution-001',
      calls: [toolCall],
      results: [toolResult],
      metadata: {
        type: 'single_call',
        provider: 'openai',
      },
    };
  }

  /**
   * Creates parallel tool call executions for testing
   */
  static createParallelToolCalls(): IToolExecutionData {
    const baseTime = new Date('2024-01-01T10:00:00Z');

    const toolCalls: ToolCall[] = [
      {
        id: 'tool-call-001',
        name: 'get_weather',
        arguments: { location: 'San Francisco' },
        timestamp: baseTime,
      },
      {
        id: 'tool-call-002',
        name: 'get_time',
        arguments: { timezone: 'America/Los_Angeles' },
        timestamp: baseTime,
      },
      {
        id: 'tool-call-003',
        name: 'get_stock_price',
        arguments: { symbol: 'AAPL' },
        timestamp: baseTime,
      },
    ];

    const toolResults: ToolResult[] = [
      {
        id: 'tool-result-001',
        callId: 'tool-call-001',
        success: true,
        result: { temperature: 18, condition: 'sunny' },
        timestamp: new Date(baseTime.getTime() + 3000),
        executionTime: 3000,
      },
      {
        id: 'tool-result-002',
        callId: 'tool-call-002',
        success: true,
        result: { time: '10:00:00', timezone: 'PST' },
        timestamp: new Date(baseTime.getTime() + 1000),
        executionTime: 1000,
      },
      {
        id: 'tool-result-003',
        callId: 'tool-call-003',
        success: true,
        result: { price: 150.25, change: 2.15 },
        timestamp: new Date(baseTime.getTime() + 5000),
        executionTime: 5000,
      },
    ];

    return {
      id: 'parallel-tool-execution-001',
      calls: toolCalls,
      results: toolResults,
      metadata: {
        type: 'parallel_calls',
        executionMode: 'concurrent',
      },
    };
  }

  /**
   * Creates parametrized tool calls with various argument types
   */
  static createParametrizedToolCalls(): IToolExecutionData {
    const toolCall: ToolCall = {
      id: 'tool-call-param-001',
      name: 'complex_calculation',
      arguments: {
        numbers: [1, 2, 3, 4, 5],
        operation: 'statistical_analysis',
        options: {
          include_median: true,
          include_mode: false,
          precision: 2,
        },
        metadata: {
          source: 'user_input',
          validation_required: true,
        },
      },
      timestamp: new Date('2024-01-01T10:00:00Z'),
    };

    const toolResult: ToolResult = {
      id: 'tool-result-param-001',
      callId: 'tool-call-param-001',
      success: true,
      result: {
        mean: 3.0,
        median: 3.0,
        standard_deviation: 1.58,
        count: 5,
      },
      timestamp: new Date('2024-01-01T10:00:10Z'),
      executionTime: 10000,
    };

    return {
      id: 'parametrized-tool-execution-001',
      calls: [toolCall],
      results: [toolResult],
      metadata: {
        type: 'parametrized_call',
        complexity: 'high',
      },
    };
  }

  /**
   * Creates tool calls with rich metadata
   */
  static createMetadataRichToolCalls(): IToolExecutionData {
    const toolCall: ToolCall = {
      id: 'tool-call-meta-001',
      name: 'file_analyzer',
      arguments: { path: '/tmp/test.txt', analysis_type: 'full' },
      timestamp: new Date('2024-01-01T10:00:00Z'),
      metadata: {
        user_id: 'user-123',
        session_id: 'session-456',
        request_id: 'req-789',
        source_ip: '192.168.1.100',
        user_agent: 'TestClient/1.0',
        permissions: ['read', 'analyze'],
        rate_limit_remaining: 95,
      },
    };

    const toolResult: ToolResult = {
      id: 'tool-result-meta-001',
      callId: 'tool-call-meta-001',
      success: true,
      result: {
        file_size: 1024,
        line_count: 50,
        word_count: 200,
        encoding: 'utf-8',
      },
      timestamp: new Date('2024-01-01T10:00:15Z'),
      executionTime: 15000,
      metadata: {
        cache_hit: false,
        processing_node: 'node-01',
        memory_used: 512000,
        cpu_time: 12000,
      },
    };

    return {
      id: 'metadata-rich-tool-execution-001',
      calls: [toolCall],
      results: [toolResult],
      metadata: {
        type: 'metadata_rich',
        tracking_enabled: true,
      },
    };
  }

  /**
   * Additional stub methods for comprehensive test coverage
   */
  static createSuccessfulToolResults(): IToolExecutionData {
    // TODO: Implement successful tool results generation
    return this.createSingleToolCall();
  }

  static createFailedToolResults(): IToolExecutionData {
    // TODO: Implement failed tool results generation
    return this.createSingleToolCall();
  }

  static createStreamingToolResults(): IToolExecutionData {
    // TODO: Implement streaming tool results generation
    return this.createSingleToolCall();
  }

  static createLinkedToolExecutions(): IToolExecutionData {
    // TODO: Implement linked tool executions generation
    return this.createSingleToolCall();
  }

  static createContextualToolExecution(): IToolExecutionData {
    // TODO: Implement contextual tool execution generation
    return this.createSingleToolCall();
  }

  static createStatefulToolCalls(): IToolExecutionData {
    // TODO: Implement stateful tool calls generation
    return this.createSingleToolCall();
  }

  static createEnvironmentalToolCalls(): IToolExecutionData {
    // TODO: Implement environmental tool calls generation
    return this.createSingleToolCall();
  }

  static createSerializableToolContext(): IToolExecutionData {
    // TODO: Implement serializable tool context generation
    return this.createSingleToolCall();
  }

  static createSimpleToolChain(): ToolExecutionChain {
    // TODO: Implement simple tool chain generation
    return {
      id: 'simple-chain-001',
      steps: [],
      metadata: {},
    };
  }

  static createComplexToolWorkflow(): ToolExecutionChain {
    // TODO: Implement complex tool workflow generation
    return {
      id: 'complex-workflow-001',
      steps: [],
      metadata: {},
    };
  }

  static createConditionalToolPaths(): ToolExecutionChain {
    // TODO: Implement conditional tool paths generation
    return {
      id: 'conditional-paths-001',
      steps: [],
      metadata: {},
    };
  }

  static createDependentToolChain(): ToolExecutionChain {
    // TODO: Implement dependent tool chain generation
    return {
      id: 'dependent-chain-001',
      steps: [],
      metadata: {},
    };
  }

  static createToolInvocationErrors(): IToolExecutionData {
    // TODO: Implement tool invocation errors generation
    return this.createSingleToolCall();
  }

  static createToolTimeoutScenarios(): IToolExecutionData {
    // TODO: Implement tool timeout scenarios generation
    return this.createSingleToolCall();
  }

  static createToolPermissionErrors(): IToolExecutionData {
    // TODO: Implement tool permission errors generation
    return this.createSingleToolCall();
  }

  static createToolErrorIntegrityScenarios(): IToolExecutionData {
    // TODO: Implement tool error integrity scenarios generation
    return this.createSingleToolCall();
  }

  static createToolRecoveryScenarios(): IToolExecutionData {
    // TODO: Implement tool recovery scenarios generation
    return this.createSingleToolCall();
  }

  static createNestedToolCalls(): IToolExecutionData {
    // TODO: Implement nested tool calls generation
    return this.createSingleToolCall();
  }

  static createRecursiveToolCalls(): IToolExecutionData {
    // TODO: Implement recursive tool calls generation
    return this.createSingleToolCall();
  }

  static createLargeDataToolCalls(): IToolExecutionData {
    // TODO: Implement large data tool calls generation
    return this.createSingleToolCall();
  }

  static createConcurrentToolSessions(): IToolExecutionData {
    // TODO: Implement concurrent tool sessions generation
    return this.createSingleToolCall();
  }
}
