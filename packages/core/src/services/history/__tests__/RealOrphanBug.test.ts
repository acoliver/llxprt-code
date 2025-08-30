import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../HistoryService';
import { MessageRoleEnum } from '../types';
import type { ToolCall, ToolResponse } from '../types';

describe('Real Orphan Bug - How Tool Calls Actually Work', () => {
  let historyService: HistoryService;

  beforeEach(() => {
    historyService = new HistoryService('test-conversation');
  });

  it('should demonstrate how tool calls are actually stored and the orphan problem', () => {
    // Step 1: User asks something
    historyService.addMessage(
      'Search for information about TypeScript',
      MessageRoleEnum.USER,
    );

    // Step 2: Model responds and indicates it will use tools
    const modelMessageId = historyService.addMessage(
      "I'll search for TypeScript information for you.",
      MessageRoleEnum.MODEL,
    );

    // Step 3: Model makes tool calls (these go to pending, not directly to message)
    const toolCalls: ToolCall[] = [
      {
        id: 'toolu_01ABC',
        name: 'web_search',
        arguments: { query: 'TypeScript programming language' },
      },
      {
        id: 'toolu_02DEF',
        name: 'read_file',
        arguments: { path: '/docs/typescript.md' },
      },
    ];

    // This adds to pending but doesn't attach to message yet
    historyService.addPendingToolCalls(toolCalls);

    console.log('\n=== AFTER ADDING TOOL CALLS ===');
    console.log('Pending tool calls:', historyService.getPendingToolCalls());
    console.log('Has pending:', historyService.hasPendingToolCalls());

    // Check the message - it should NOT have tool calls yet
    const historyBefore = historyService.getHistory();
    const modelMessage = historyBefore.find((m) => m.id === modelMessageId);
    console.log('Model message has toolCalls?', modelMessage?.toolCalls);

    // Step 4: Simulate user cancellation BEFORE tool responses come back
    console.log('\n=== USER CANCELS - ABORTING TOOL CALLS ===');
    historyService.abortPendingToolCalls();

    console.log(
      'After abort - pending calls:',
      historyService.getPendingToolCalls(),
    );
    console.log(
      'After abort - has pending:',
      historyService.hasPendingToolCalls(),
    );

    // Step 5: User continues conversation
    historyService.addMessage(
      'Actually, never mind about that.',
      MessageRoleEnum.USER,
    );

    // Step 6: Model responds again with new tool calls
    historyService.addMessage(
      'Okay, let me help with something else.',
      MessageRoleEnum.MODEL,
    );

    const newToolCall: ToolCall = {
      id: 'toolu_03GHI',
      name: 'list_files',
      arguments: { directory: '/' },
    };
    historyService.addPendingToolCalls([newToolCall]);

    // Step 7: This time we complete the tool call with a response
    const toolResponse: ToolResponse = {
      toolCallId: 'toolu_03GHI',
      result: { files: ['file1.ts', 'file2.ts'] },
    };
    historyService.commitToolResponses([toolResponse]);

    // Now let's examine the full history
    const finalHistory = historyService.getHistory();
    console.log('\n=== FINAL HISTORY ===');
    finalHistory.forEach((msg, idx) => {
      console.log(
        `[${idx}] Role: ${msg.role}, Content: ${msg.content?.substring(0, 50)}...`,
      );
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        console.log(
          `     Tool Calls:`,
          msg.toolCalls.map((tc) => ({ id: tc.id, name: tc.name })),
        );
      }
      if (msg.toolResponses && msg.toolResponses.length > 0) {
        console.log(
          `     Tool Responses:`,
          msg.toolResponses.map((tr) => ({
            toolCallId: tr.toolCallId,
            hasResult: !!tr.result,
          })),
        );
      }
    });

    // The issue: The first two tool calls (toolu_01ABC and toolu_02DEF) were never executed
    // but they're also not in the history because addPendingToolCalls doesn't add them to messages
    // They just disappear when aborted!

    // This is actually OK for the internal state, but when we convert to provider format,
    // we need to check if there are any pending calls that got lost

    // Let's validate the history
    const validation = historyService.validateHistory();
    console.log('\n=== VALIDATION ===');
    console.log('Valid:', validation.isValid);
    console.log('Errors:', validation.errors);
    console.log('Warnings:', validation.warnings);

    // The history should be valid because the aborted calls never made it to messages
    expect(validation.isValid).toBe(true);
  });

  it('should show the REAL orphan problem - when tool calls are in Content but not responded to', () => {
    // This simulates what happens when geminiChat or a provider adds tool calls to Content
    // but then the user cancels before responses come back

    // Step 1: User message
    const userContent = {
      role: 'user',
      parts: [{ text: 'Search for something' }],
    };
    historyService.addMessage('Search for something', MessageRoleEnum.USER, {
      originalContent: userContent,
    });

    // Step 2: Model message WITH tool calls in the content
    const modelContent = {
      role: 'model',
      parts: [
        { text: 'Let me search for that.' },
        {
          functionCall: {
            id: 'toolu_ORPHAN1',
            name: 'search',
            args: { query: 'test' },
          },
        },
      ],
    };

    // This is where the problem happens - the model message has tool calls in its content
    // but no corresponding tool responses will be added if the user cancels
    historyService.addMessage(
      'Let me search for that.',
      MessageRoleEnum.MODEL,
      {
        originalContent: modelContent,
      },
    );

    // User cancels - no tool response is added
    historyService.addMessage('Cancel that', MessageRoleEnum.USER);

    // Now when we get the history and look at originalContent, we have orphaned tool calls
    const history = historyService.getHistory();

    console.log('\n=== CHECKING FOR ORPHANED TOOL CALLS IN CONTENT ===');
    history.forEach((msg, idx) => {
      if (msg.metadata?.originalContent) {
        const content = msg.metadata.originalContent as {
          parts?: Array<{
            functionCall?: { id: string; name: string };
            functionResponse?: unknown;
          }>;
        };
        if (content.parts) {
          const functionCalls = content.parts.filter((p) => p.functionCall);
          const functionResponses = content.parts.filter(
            (p) => p.functionResponse,
          );

          if (functionCalls.length > 0) {
            console.log(
              `Message ${idx} has ${functionCalls.length} function calls in content`,
            );
            functionCalls.forEach((fc) => {
              if (fc.functionCall) {
                console.log(
                  `  - ${fc.functionCall.id}: ${fc.functionCall.name}`,
                );
              }
            });
          }
          if (functionResponses.length > 0) {
            console.log(
              `Message ${idx} has ${functionResponses.length} function responses in content`,
            );
          }
        }
      }
    });

    // Check if we have orphaned function calls
    const allFunctionCallIds: string[] = [];
    const allFunctionResponseIds: string[] = [];

    history.forEach((msg) => {
      if (msg.metadata?.originalContent) {
        const content = msg.metadata.originalContent as {
          parts?: Array<{
            functionCall?: { id: string };
            functionResponse?: { id: string };
          }>;
        };
        if (content.parts) {
          content.parts.forEach((part) => {
            if (part.functionCall) {
              allFunctionCallIds.push(part.functionCall.id);
            }
            if (part.functionResponse) {
              allFunctionResponseIds.push(part.functionResponse.id);
            }
          });
        }
      }
    });

    console.log('\nAll function call IDs:', allFunctionCallIds);
    console.log('All function response IDs:', allFunctionResponseIds);

    const orphanedCalls = allFunctionCallIds.filter(
      (id) => !allFunctionResponseIds.includes(id),
    );
    console.log('ORPHANED CALLS:', orphanedCalls);

    // THIS is the real bug - function calls in originalContent without responses
    expect(orphanedCalls.length).toBeGreaterThan(0);
    console.log(
      '\n✅ Bug confirmed: Found',
      orphanedCalls.length,
      'orphaned function calls in content',
    );
  });
});
