# Tool Call Flow Analysis - Transaction Bug

## Overview
When a user types a request and the LLM (OpenAI/Qwen) responds with a tool call, the system fails with "No active transaction" error. This happens on the VERY FIRST tool call.

## Current Flow (BROKEN)

### 1. User Input → CLI
- User types: "look through the code and map for me the entire lifecycle..."
- `InputPrompt.tsx` captures input
- `useGeminiStream.ts` → `submitQuery()` is called

### 2. CLI → Core Client
- `submitQuery()` calls `geminiClient.sendMessageStream()`
- Located in: `packages/core/src/core/client.ts`

### 3. Core Client → Provider
```typescript
// client.ts
async sendMessageStream(request, signal) {
  // Creates a Turn instance
  const turn = new Turn(chat, promptId, providerName, historyService);
  
  // For OpenAI: Goes through GeminiCompatibleWrapper
  // The wrapper converts to OpenAI format and calls provider
  const stream = await provider.generateChatCompletionEx(messages);
  
  // OpenAI returns with tool_calls in response
}
```

### 4. Provider Returns Tool Calls
When OpenAI returns a response with `tool_calls`:
```json
{
  "choices": [{
    "message": {
      "tool_calls": [{
        "id": "call_4ebd93c63",
        "type": "function", 
        "function": {
          "name": "glob",
          "arguments": "{\"pattern\":\"**/*.ts\"}"
        }
      }]
    }
  }]
}
```

### 5. Tool Scheduling (WHERE IT BREAKS)
- The tool calls are extracted and scheduled via `CoreToolScheduler.schedule()`
- `CoreToolScheduler` has a reference to the `Turn` instance
- When tool completes, it calls `turn.handleToolExecutionComplete()`

### 6. The Bug
```typescript
// turn.ts - handleToolExecutionComplete()
if (this.historyService && this.currentTransactionId) {
  // This FAILS because currentTransactionId is undefined!
  // Transaction was never started because handlePendingFunctionCall was never called
  historyService.addToolResponseToTransaction(toolCallId, toolResponse);
}
```

## Why It's Broken

### The Gemini Path (WORKS)
1. Turn.run() is called
2. Processes stream from Gemini
3. When tool call detected: calls `handlePendingFunctionCall()`
4. `handlePendingFunctionCall()` starts transaction:
   ```typescript
   if (!this.currentTransactionId) {
     this.currentTransactionId = historyService.beginToolTransaction();
   }
   ```
5. Tool executes
6. `handleToolExecutionComplete()` adds response to transaction
7. `completeAllToolExecution()` commits transaction

### The OpenAI Path (BROKEN)
1. OpenAI returns tool_calls directly in response
2. Tools are scheduled via CoreToolScheduler
3. **handlePendingFunctionCall() is NEVER called**
4. No transaction is started
5. Tool executes
6. `handleToolExecutionComplete()` tries to add to non-existent transaction
7. ERROR: "No active transaction"

## The Root Cause

The transaction system was designed assuming all tool calls would go through `Turn.run()` and `handlePendingFunctionCall()`. But OpenAI (and other providers) return tool calls in a different format that bypasses this flow entirely.

## What Needs to be Fixed

### Option 1: Start transaction in CoreToolScheduler
When `CoreToolScheduler.schedule()` is called, it should ensure a transaction exists:
```typescript
// In CoreToolScheduler.schedule()
if (this.turn && !this.turn.hasActiveTransaction()) {
  this.turn.startToolTransaction(toolRequests);
}
```

### Option 2: Start transaction in handleToolExecutionComplete
If no transaction exists when a tool completes, start one:
```typescript
// In turn.ts handleToolExecutionComplete()
if (!this.currentTransactionId) {
  this.currentTransactionId = historyService.beginToolTransaction();
  // Add assistant message with tool call
  historyService.addAssistantMessageToTransaction(...);
}
```

### Option 3: Unify the flow
Make OpenAI responses go through the same path as Gemini, converting them to functionCall events that trigger `handlePendingFunctionCall()`.

## The Test That Proves It

```typescript
// first-tool-call-failure.test.ts
it('should handle the FIRST tool call from OpenAI without error', async () => {
  const historyService = new HistoryService('test');
  const turn = new Turn(mockChat, 'prompt', 'openai', historyService);
  
  // Simulate OpenAI scheduling a tool directly
  const scheduler = new CoreToolScheduler({ turn });
  await scheduler.schedule({
    callId: 'call_123',
    name: 'glob',
    args: { pattern: '**/*.ts' }
  });
  
  // Tool completes
  await turn.handleToolExecutionComplete('call_123', { output: 'result' });
  
  // Should NOT throw "No active transaction"
  // Should have both assistant message and tool response in history
});
```

## Impact

This affects ALL tool calls when using OpenAI, Anthropic, or any provider that returns tool calls in the OpenAI format. The transaction system is completely bypassed, meaning:
1. Tool calls and responses aren't properly paired in history
2. The history sent back to the LLM is incomplete/malformed
3. Potential for orphaned tool responses (causing 400 errors)

## My Changes That Made It Worse

I added logic to auto-commit transactions when:
- Turn finishes
- All tools complete
- Errors occur

But this assumes a transaction EXISTS. When it doesn't, we get additional errors trying to commit non-existent transactions.