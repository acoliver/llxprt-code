# Phase 28: Integration Implementation

## Phase ID
`PLAN-20250826-RESPONSES.P28`

## Task Description
Implement sessionId flow through all integration points.

## Dependencies
- Phase 27 completed

## Implementation
Based on `/project-plans/responses-revised/analysis/pseudocode/integration.md` lines 150-202

## Files Modified

### 1. `/packages/core/src/core/geminiChat.ts`

Based on pseudocode lines 150-166:

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P28
 * @requirement REQ-001.2
 * @pseudocode lines 150-166
 */
private async *sendMessage(userInput: string): AsyncIterableIterator<Content> {
  // Line 153: REQ-001.2 - Get sessionId from config
  const sessionId = this.config.getSessionId();
  
  // Line 156: Prepare contents with history
  const contents = [...this.history, { role: 'user', parts: [{ text: userInput }] }];
  
  // Line 159: Call content generator with sessionId
  const generator = this.contentGenerator.generate(
    contents,
    this.tools,
    this.toolFormat,
    sessionId  // Pass sessionId through
  );
  
  // Lines 162-165: Process responses
  for await (const content of generator) {
    this.history.push(content);
    yield content;
  }
}
```

### 2. `/packages/core/src/core/contentGenerator.ts`

Based on pseudocode lines 170-182:

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P28
 * @requirement REQ-001.3
 * @pseudocode lines 170-182
 */
async *generate(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string,
  sessionId?: string  // NEW parameter
): AsyncIterableIterator<Content> {
  // Line 173: Get current provider
  const provider = this.getProvider();
  
  // Lines 176-181: REQ-001.3 - Pass sessionId to provider
  yield* provider.generateChatCompletion(
    contents,
    tools,
    toolFormat,
    sessionId  // Pass through to provider
  );
}
```

### 3. `/packages/core/src/providers/LoggingProviderWrapper.ts`

Based on pseudocode lines 185-202:

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P28
 * @requirement REQ-INT-001.2
 * @pseudocode lines 185-202
 */
async *generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string,
  sessionId?: string  // NEW parameter
): AsyncIterableIterator<Content> {
  // Line 188: Log the request
  this.logger.logRequest(contents, sessionId);
  
  // Lines 191-196: REQ-INT-001.2 - Pass sessionId through wrapper
  const result = yield* this.wrappedProvider.generateChatCompletion(
    contents,
    tools,
    toolFormat,
    sessionId  // Pass through to wrapped provider
  );
  
  // Line 199: Log the response
  this.logger.logResponse(result);
  
  // Line 201: Yield result
  yield result;
}
```

## Success Criteria
- SessionId flows end-to-end
- All integration tests pass
- No regressions