# Phase 17: Provider Implementation

## Phase ID
`PLAN-20250826-RESPONSES.P17`

## Task Description

Implement provider sessionId handling following pseudocode lines 10-32.

## Files to Modify

### `/packages/core/src/providers/openai/OpenAIProvider.ts`

Based on pseudocode lines 10-22:

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P17
 * @requirement REQ-001.4, REQ-002.3
 * @pseudocode lines 10-22
 */
async *generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string,
  sessionId?: string
): AsyncIterableIterator<Content> {
  // ... existing setup code ...
  
  // Line 12: IF this.shouldUseResponses(model) THEN
  if (this.shouldUseResponses(model)) {
    // Line 13: previousResponseId = CALL findPreviousResponseId(contents)
    const previousResponseId = this.findPreviousResponseId(contents);
    
    // Line 14: conversationId = sessionId OR generateTempId()
    const conversationId = sessionId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Line 15-17: Build and call responses endpoint
    const request = this.buildResponsesRequest(contents, options, conversationId, previousResponseId);
    yield* this.parseResponsesStream(await this.callResponsesAPI(request));
  } else {
    // Lines 19-20: Regular models ignore sessionId
    yield* this.callRegularEndpoint(contents, options);
  }
}

/**
 * @plan PLAN-20250826-RESPONSES.P17
 * @requirement REQ-002.3
 * @pseudocode lines 23-32
 */
private findPreviousResponseId(contents: Content[]): string | null {
  // Line 24: FOR i FROM contents.length - 1 TO 0 STEP -1
  for (let i = contents.length - 1; i >= 0; i--) {
    // Line 25: IF contents[i].role IN ['assistant', 'model'] THEN
    if (contents[i].role === 'assistant' || contents[i].role === 'model') {
      // Line 26-27: IF metadata.responseId EXISTS THEN RETURN it
      if (contents[i].metadata?.responseId) {
        return contents[i].metadata.responseId;
      }
    }
  }
  // Line 31: RETURN null
  return null;
}
```

### `/packages/core/src/providers/openai/buildResponsesRequest.ts`

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P17
 * @requirement REQ-001.4
 */
export function buildResponsesRequest(
  messages: Content[],
  options: any,
  conversationId: string,  // Now receives actual ID
  previousResponseId: string | null
): object {
  return {
    model: options.model,
    conversation_id: conversationId,  // Use the passed sessionId
    previous_response_id: previousResponseId,  // From metadata or null
    input: [...] // existing conversion logic
  };
}
```

## Requirements

1. Follow pseudocode EXACTLY (lines 10-32)
2. Reference pseudocode line numbers in comments
3. All Phase 07 tests must pass
4. No test modifications allowed
5. Handle both responses and regular models

## Success Criteria

- Pseudocode followed line-by-line
- All tests from Phase 07 pass
- SessionId properly used as conversation_id
- Previous responseId found in metadata
- Temp ID generated when needed

## Execution Instructions

```bash
# For subagent execution:
1. Open OpenAIProvider.ts
2. Implement generateChatCompletion following pseudocode lines 10-22
3. Implement findPreviousResponseId following lines 23-32
4. Update buildResponsesRequest to use real IDs
5. Run: npm test packages/core/src/providers/openai/OpenAIProvider.responses.test.ts
6. Verify all tests pass
```

## Output Status

Save to: `/project-plans/responses-revised/workers/phase-08.json`