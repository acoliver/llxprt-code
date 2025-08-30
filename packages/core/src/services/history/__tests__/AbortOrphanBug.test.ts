import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../HistoryService';
import { MessageRoleEnum } from '../types';
import type { ToolCall, ToolResponse } from '../types';

describe('Abort Pending Tool Calls - Orphan Bug', () => {
  let historyService: HistoryService;

  beforeEach(() => {
    historyService = new HistoryService('test-conversation');
  });

  it.only('should demonstrate the orphaned tool call bug after abort', () => {
    // Step 1: Add a user message
    historyService.addMessage(
      'Can you search for something?',
      MessageRoleEnum.USER,
    );

    // Step 2: Add model response with tool calls
    historyService.addMessage('Let me search for that.', MessageRoleEnum.MODEL);

    // Step 3: Add pending tool calls (simulating model making tool calls)
    const toolCalls: ToolCall[] = [
      {
        id: 'call_123',
        name: 'search',
        arguments: { query: 'test query' },
      },
      {
        id: 'call_456',
        name: 'read_file',
        arguments: { path: '/test/file.txt' },
      },
    ];
    historyService.addPendingToolCalls(toolCalls);

    // Step 4: User cancels - abort the pending tool calls
    console.log(
      'Before abort - Pending tool calls:',
      historyService.getPendingToolCalls(),
    );
    historyService.abortPendingToolCalls();
    console.log(
      'After abort - Pending tool calls:',
      historyService.getPendingToolCalls(),
    );

    // Step 5: Add another user message (continuing conversation)
    historyService.addMessage(
      'Never mind, I found it myself.',
      MessageRoleEnum.USER,
    );

    // Step 6: Get the history and check for orphaned tool calls
    const history = historyService.getHistory();
    console.log('\n=== FULL HISTORY ===');
    history.forEach((msg, idx) => {
      console.log(`[${idx}] Role: ${msg.role}`);
      if (msg.toolCalls) {
        console.log(`     Tool Calls: ${JSON.stringify(msg.toolCalls)}`);
      }
      if (msg.toolResponses) {
        console.log(
          `     Tool Responses: ${JSON.stringify(msg.toolResponses)}`,
        );
      }
    });

    // Find messages with tool calls
    const messagesWithToolCalls = history.filter(
      (msg) => msg.toolCalls && msg.toolCalls.length > 0,
    );
    const messagesWithToolResponses = history.filter(
      (msg) => msg.toolResponses && msg.toolResponses.length > 0,
    );

    console.log('\n=== ANALYSIS ===');
    console.log('Messages with tool calls:', messagesWithToolCalls.length);
    console.log(
      'Messages with tool responses:',
      messagesWithToolResponses.length,
    );

    // Count total tool calls and responses
    const totalToolCalls = messagesWithToolCalls.reduce(
      (sum, msg) => sum + (msg.toolCalls?.length || 0),
      0,
    );
    const totalToolResponses = messagesWithToolResponses.reduce(
      (sum, msg) => sum + (msg.toolResponses?.length || 0),
      0,
    );

    console.log('Total tool calls:', totalToolCalls);
    console.log('Total tool responses:', totalToolResponses);

    // THE BUG: Tool calls exist without corresponding tool responses!
    // This will fail, proving the orphan bug exists
    if (totalToolResponses !== totalToolCalls) {
      throw new Error(
        `ORPHAN BUG DETECTED: ${totalToolCalls} tool calls but only ${totalToolResponses} tool responses!`,
      );
    }
    expect(totalToolResponses).toBe(totalToolCalls);

    // Additional check: Validate the history for orphans
    const validation = historyService.validateHistory();
    console.log('\n=== VALIDATION RESULT ===');
    console.log('Is Valid:', validation.isValid);
    console.log('Errors:', validation.errors);
    console.log('Warnings:', validation.warnings);

    // This should also fail due to orphaned tool calls
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should show how the bug affects provider conversion (Anthropic example)', () => {
    // Import the Anthropic converter to show the downstream effect
    import('../../../providers/converters/AnthropicContentConverter').then(
      ({ AnthropicContentConverter }) => {
        const converter = new AnthropicContentConverter();

        // Set up the same scenario
        historyService.addMessage('Search for something', MessageRoleEnum.USER);
        historyService.addMessage('Searching...', MessageRoleEnum.MODEL);

        const toolCall: ToolCall = {
          id: 'call_789',
          name: 'search',
          arguments: { query: 'test' },
        };
        historyService.addPendingToolCalls([toolCall]);

        // Abort without creating responses (the bug)
        historyService.abortPendingToolCalls();

        // Continue conversation
        historyService.addMessage('Cancel that', MessageRoleEnum.USER);

        // Get history and convert to Content[] format for provider
        const history = historyService.getHistory();
        const contents = history.map((msg) => ({
          role:
            msg.role === MessageRoleEnum.USER
              ? 'user'
              : msg.role === MessageRoleEnum.MODEL
                ? 'model'
                : 'system',
          parts: [
            ...(msg.content ? [{ text: msg.content }] : []),
            ...(msg.toolCalls
              ? msg.toolCalls.map((tc) => ({
                  functionCall: {
                    id: tc.id,
                    name: tc.name,
                    args: tc.arguments,
                  },
                }))
              : []),
            ...(msg.toolResponses
              ? msg.toolResponses.map((tr) => ({
                  functionResponse: {
                    id: tr.toolCallId,
                    name: 'unknown', // Would need to track this
                    response: tr.result,
                  },
                }))
              : []),
          ],
        }));

        // Try to convert to Anthropic format
        try {
          const anthropicMessages = converter.toProviderFormat(contents);

          console.log('\n=== ANTHROPIC CONVERSION ===');
          anthropicMessages.forEach((msg, idx) => {
            console.log(`[${idx}] Role: ${msg.role}`);
            if (Array.isArray(msg.content)) {
              msg.content.forEach((block) => {
                if (block.type === 'tool_use') {
                  console.log(`     tool_use: ${block.id}`);
                }
                if (block.type === 'tool_result') {
                  console.log(`     tool_result for: ${block.tool_use_id}`);
                }
              });
            }
          });

          // Check for orphaned tool_use blocks
          const toolUseBlocks: string[] = [];
          const toolResultBlocks: string[] = [];

          anthropicMessages.forEach((msg) => {
            if (Array.isArray(msg.content)) {
              msg.content.forEach((block) => {
                if (block.type === 'tool_use') {
                  toolUseBlocks.push(block.id);
                }
                if (block.type === 'tool_result') {
                  toolResultBlocks.push(block.tool_use_id);
                }
              });
            }
          });

          console.log('\nTool use IDs:', toolUseBlocks);
          console.log('Tool result IDs:', toolResultBlocks);

          // Find orphaned tool_use blocks
          const orphanedCalls = toolUseBlocks.filter(
            (id) => !toolResultBlocks.includes(id),
          );
          console.log('ORPHANED TOOL CALLS:', orphanedCalls);

          // This will show that we have orphaned tool_use blocks
          // which will cause Anthropic API to return 400 error
          expect(orphanedCalls).toHaveLength(0);
        } catch (error) {
          console.log('Conversion error:', error);
          // The conversion might even fail depending on implementation
        }
      },
    );
  });

  it('should work correctly if synthetic responses are added (the fix)', () => {
    // This test shows what SHOULD happen
    historyService.addMessage('Search for something', MessageRoleEnum.USER);
    historyService.addMessage('Searching...', MessageRoleEnum.MODEL);

    const toolCalls: ToolCall[] = [
      {
        id: 'call_abc',
        name: 'search',
        arguments: { query: 'test' },
      },
    ];
    historyService.addPendingToolCalls(toolCalls);

    // THE FIX: Instead of just clearing, create synthetic cancelled responses
    const pendingCalls = historyService.getPendingToolCalls();
    const syntheticResponses: ToolResponse[] = pendingCalls.map((call) => ({
      toolCallId: call.id,
      result: {
        error: '[Operation Cancelled] Tool call was interrupted by user',
      },
    }));

    // Commit the synthetic responses before aborting
    historyService.commitToolResponses(syntheticResponses);
    historyService.abortPendingToolCalls(); // This now just clears the already-handled calls

    // Continue conversation
    historyService.addMessage('Cancel that', MessageRoleEnum.USER);

    // Now validate - this should pass
    const validation = historyService.validateHistory();
    console.log('\n=== FIXED VERSION VALIDATION ===');
    console.log('Is Valid:', validation.isValid);
    console.log('Errors:', validation.errors);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Check that tool calls and responses are balanced
    const history = historyService.getHistory();
    const totalToolCalls = history.reduce(
      (sum, msg) => sum + (msg.toolCalls?.length || 0),
      0,
    );
    const totalToolResponses = history.reduce(
      (sum, msg) => sum + (msg.toolResponses?.length || 0),
      0,
    );

    expect(totalToolResponses).toBe(totalToolCalls);
  });
});
