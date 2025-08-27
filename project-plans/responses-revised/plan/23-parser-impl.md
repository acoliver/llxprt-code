# Phase 23: Parser Implementation

## Phase ID
`PLAN-20250826-RESPONSES.P23`

## Task Description
Implement parseResponsesStream to extract and store response IDs.

## Dependencies
- Phase 22 completed

## Implementation
Based on `/project-plans/responses-revised/analysis/pseudocode/parser-update.md` lines 80-128

## Files Modified

### `/packages/core/src/providers/openai/parseResponsesStream.ts`

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P23
 * @requirement REQ-002.1, REQ-002.2, REQ-003.2
 * @pseudocode lines 80-128
 */
async *parseResponsesStream(stream: ReadableStream): AsyncIterableIterator<Content> {
  let accumulator = '';
  let responseId: string | null = null;
  
  // Line 84: WHILE stream has data
  while (/* stream has data */) {
    // Line 85-86: Read and accumulate chunks
    const chunk = await readChunk(stream);
    accumulator += chunk;
    
    // Line 89: Parse SSE events
    const events = this.parseSSE(accumulator);
    
    // Line 91: FOR EACH event IN events
    for (const event of events) {
      // Lines 93-105: REQ-002.1 - Extract response ID
      if (event.type === 'response.completed') {
        if (event.response?.id) {
          responseId = event.response.id;
          
          // Lines 97-104: REQ-002.2 - Create Content with metadata
          const metadataContent: Content = {
            role: 'model',
            parts: [],
            metadata: { responseId }
          };
          
          // Line 104: REQ-003.2 - Yield Content not IMessage
          yield metadataContent;
        }
      } else if (event.type === 'content.part.delta') {
        // Lines 107-114: Regular content streaming
        const content: Content = {
          role: 'model',
          parts: [{ text: event.delta.text }]
        };
        yield content;
      } else if (event.type === 'tool_call.delta') {
        // Lines 116-121: Handle tool calls
        const content: Content = {
          role: 'model',
          parts: [this.createFunctionCall(event)]
        };
        yield content;
      }
    }
    
    // Line 126: Clear processed events
    accumulator = this.removeProcessed(accumulator);
  }
}

/**
 * @pseudocode lines 130-146
 */
private parseSSE(text: string): any[] {
  // Line 131-132: Initialize
  const events = [];
  const lines = text.split('\n');
  
  // Line 135: FOR EACH line IN lines
  for (const line of lines) {
    // Line 136-141: Parse SSE data
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      if (data !== '[DONE]') {
        events.push(JSON.parse(data));
      }
    }
  }
  
  // Line 145: Return events
  return events;
}
```

## Success Criteria
- All parser tests pass
- Response IDs extracted correctly
- Content metadata populated