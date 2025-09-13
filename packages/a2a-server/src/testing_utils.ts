/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Task as SDKTask,
  TaskStatusUpdateEvent,
  SendStreamingMessageSuccessResponse,
} from '@a2a-js/sdk';
import { ApprovalMode } from '@vybestack/llxprt-code-core';
import type { Config } from '@vybestack/llxprt-code-core';
import type {
  BaseToolInvocation,
  ToolCallConfirmationDetails,
  ToolInvocation,
  ToolResult,
  Kind,
} from '@vybestack/llxprt-code-core';
import { expect, vi } from 'vitest';

// Simple MockTool implementation for testing
class MockToolInvocation implements BaseToolInvocation<
  { [key: string]: unknown },
  ToolResult
> {
  toolLocations = () => [];
  
  constructor(
    private readonly tool: MockTool,
    public readonly params: { [key: string]: unknown },
  ) {}

  async execute(_abortSignal: AbortSignal): Promise<ToolResult> {
    const result = this.tool.executeFn(this.params);
    return (
      result ?? {
        llmContent: `Tool ${this.tool.name} executed successfully.`,
        returnDisplay: `Tool ${this.tool.name} executed successfully.`,
      }
    );
  }

  async shouldConfirmExecute(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    if (this.tool.shouldConfirm) {
      return {
        type: 'exec' as const,
        title: `Confirm ${this.tool.displayName}`,
        command: this.tool.name,
        rootCommand: this.tool.name,
        onConfirm: async () => {},
      };
    }
    return false;
  }

  getDescription(): string {
    return `A mock tool invocation for ${this.tool.name}`;
  }
}

export class MockTool {
  executeFn = vi.fn();
  shouldConfirm = false;
  public readonly name: string;
  public readonly displayName: string;
  public readonly description: string;
  public readonly kind = 'Other' as Kind;
  public readonly params: any;
  public readonly schema: any;
  public readonly parameterSchema: any;

  constructor(
    name = 'mock-tool',
    displayName?: string,
    description = 'A mock tool for testing.',
    params = {
      type: 'object',
      properties: { param: { type: 'string' } },
    },
  ) {
    this.name = name;
    this.displayName = displayName ?? name;
    this.description = description;
    this.params = params;
    this.schema = {
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      kind: this.kind,
      parameters: params,
      parametersJsonSchema: params,
    };
    this.parameterSchema = params;
  }

  // Required methods from BaseDeclarativeTool interface
  build(params: { [key: string]: unknown }): ToolInvocation<{ [key: string]: unknown }, ToolResult> {
    return this.createInvocation(params);
  }

  validateToolParams(params: unknown): string | null {
    return null; // Mock always validates successfully
  }

  validateToolParamValues(params: unknown): string | null {
    return null; // Mock always validates successfully
  }

  getFullDescription(): string {
    return this.description;
  }

  getSchemaForModel(modelName: string): any {
    return this.schema;
  }

  isAvailable(): boolean {
    return true;
  }

  createInvocation(params: {
    [key: string]: unknown;
  }): ToolInvocation<{ [key: string]: unknown }, ToolResult> {
    return new MockToolInvocation(this, params);
  }
}

export function createMockConfig(
  overrides: Partial<Config> = {},
): Partial<Config> {
  const mockConfig = {
    getToolRegistry: vi.fn().mockReturnValue({
      getTool: vi.fn(),
      getAllToolNames: vi.fn().mockReturnValue([]),
    }),
    getApprovalMode: vi.fn().mockReturnValue(ApprovalMode.DEFAULT),
    getIdeMode: vi.fn().mockReturnValue(false),
    getAllowedTools: vi.fn().mockReturnValue([]),
    getWorkspaceContext: vi.fn().mockReturnValue({
      isPathWithinWorkspace: () => true,
    }),
    getTargetDir: () => '/test',
    getGeminiClient: vi.fn(),
    getDebugMode: vi.fn().mockReturnValue(false),
    getContentGeneratorConfig: vi.fn().mockReturnValue({ model: 'gemini-pro' }),
    getModel: vi.fn().mockReturnValue('gemini-pro'),
    getUsageStatisticsEnabled: vi.fn().mockReturnValue(false),
    setFlashFallbackHandler: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
    getProxy: vi.fn().mockReturnValue(undefined),
    getHistory: vi.fn().mockReturnValue([]),
    getEmbeddingModel: vi.fn().mockReturnValue('text-embedding-004'),
    getSessionId: vi.fn().mockReturnValue('test-session-id'),
    ...overrides,
  };
  return mockConfig;
}

export function createStreamMessageRequest(
  text: string,
  messageId: string,
  taskId?: string,
) {
  const request: {
    jsonrpc: string;
    id: string;
    method: string;
    params: {
      message: {
        kind: string;
        role: string;
        parts: [{ kind: string; text: string }];
        messageId: string;
      };
      metadata: {
        coderAgent: {
          kind: string;
          workspacePath: string;
        };
      };
      taskId?: string;
    };
  } = {
    jsonrpc: '2.0',
    id: '1',
    method: 'message/stream',
    params: {
      message: {
        kind: 'message',
        role: 'user',
        parts: [{ kind: 'text', text }],
        messageId,
      },
      metadata: {
        coderAgent: {
          kind: 'agent-settings',
          workspacePath: '/tmp',
        },
      },
    },
  };

  if (taskId) {
    request.params.taskId = taskId;
  }

  return request;
}

export function assertUniqueFinalEventIsLast(
  events: SendStreamingMessageSuccessResponse[],
) {
  // Final event is input-required & final
  const finalEvent = events[events.length - 1].result as TaskStatusUpdateEvent;
  expect(finalEvent.metadata?.['coderAgent']).toMatchObject({
    kind: 'state-change',
  });
  expect(finalEvent.status?.state).toBe('input-required');
  expect(finalEvent.final).toBe(true);

  // There is only one event with final and its the last
  expect(
    events.filter((e) => (e.result as TaskStatusUpdateEvent).final).length,
  ).toBe(1);
  expect(
    events.findIndex((e) => (e.result as TaskStatusUpdateEvent).final),
  ).toBe(events.length - 1);
}

export function assertTaskCreationAndWorkingStatus(
  events: SendStreamingMessageSuccessResponse[],
) {
  // Initial task creation event
  const taskEvent = events[0].result as SDKTask;
  expect(taskEvent.kind).toBe('task');
  expect(taskEvent.status.state).toBe('submitted');

  // Status update: working
  const workingEvent = events[1].result as TaskStatusUpdateEvent;
  expect(workingEvent.kind).toBe('status-update');
  expect(workingEvent.status.state).toBe('working');
}
