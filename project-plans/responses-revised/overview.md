# OpenAI Responses API Conversation Tracking - Overview

## Problem Statement

OpenAI's Responses API (used by GPT-5/O3 models) requires conversation tracking via:
- `conversation_id`: Stable identifier for entire conversation
- `previous_response_id`: ID from last response, chains requests together

Currently these are hardcoded to `undefined`, causing models to lose context and loop infinitely.

## Solution Architecture

### Core Principle: Use Existing Infrastructure

We will NOT create new caching systems. Instead, we'll use the existing Content[] metadata flow that already exists in the system.

### Key Architectural Decision: Pass SessionId as Parameter

**The Problem:**
- Config stores a sessionId for the conversation (accessible via config.getSessionId())
- GeminiChat has access to Config (passed in constructor)
- OpenAI Responses API needs this SAME sessionId as its conversation_id
- Currently no mechanism to pass sessionId through from GeminiChat to the provider

**The Solution: Add sessionId to generateChatCompletion signature**

```typescript
// Current signature:
generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string
): AsyncIterableIterator<Content>

// New signature:
generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string,
  sessionId?: string  // NEW: Pass through for providers that need it
): AsyncIterableIterator<Content>
```

**Important**: The provider doesn't "own" or store the sessionId. It's just passed through as needed for each request.

### The Data Flow

```
1. GeminiChat initiates request
   - Gets sessionId via this.config.getSessionId()
   - Passes it to ContentGenerator

2. ContentGenerator calls provider
   - Passes sessionId as parameter: 
     provider.generateChatCompletion(contents, tools, format, sessionId)

3. OpenAIProvider receives sessionId in generateChatCompletion
   - For Responses API models (GPT-5/O3):
     * Uses sessionId directly as conversation_id
     * Finds previousResponseId in last assistant message's metadata
     * Passes both to buildResponsesRequest
   - For regular models:
     * Ignores sessionId parameter completely

4. buildResponsesRequest creates request
   - Includes conversation_id (which IS the sessionId)
   - Includes previous_response_id (from metadata or null)

5. API returns response with new response ID
   - Response includes: { id: "resp_xyz789", ... }

6. parseResponsesStream extracts responseId
   - Adds to Content metadata: { responseId: "resp_xyz789" }
   - Yields Content with metadata

7. Content flows back with metadata
   - History stores Content[] including metadata
   - ResponseId now available for next turn

8. Next turn repeats
   - Same sessionId passed through again
   - Previous responseId found in metadata
   - Chain continues
```

## Implementation Details

### 1. Modify IProvider Interface

**File**: `packages/core/src/providers/IProvider.ts`

```typescript
generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string,
  sessionId?: string  // Optional - only some providers use it
): AsyncIterableIterator<Content>;
```

### 2. Update OpenAIProvider

**File**: `packages/core/src/providers/openai/OpenAIProvider.ts`

```typescript
async *generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string,
  sessionId?: string  // Received as parameter, NOT stored
): AsyncIterableIterator<Content> {
  // ... existing code ...
  
  if (this.shouldUseResponses(model)) {
    // Find previous response ID in message history
    const previousResponseId = this.findPreviousResponseId(contents);
    
    // Pass sessionId directly as conversation_id
    // If no sessionId provided, generate temporary one
    const conversationId = sessionId || `temp_${Date.now()}_${Math.random()}`;
    
    // Call responses endpoint with both IDs
    yield* this.callResponsesEndpoint(
      contents,
      options,
      conversationId,  // This IS the sessionId
      previousResponseId
    );
  } else {
    // Regular OpenAI models - ignore sessionId
    yield* this.callRegularEndpoint(contents, options);
  }
}

private findPreviousResponseId(contents: Content[]): string | null {
  // Look backwards for last assistant message with responseId in metadata
  for (let i = contents.length - 1; i >= 0; i--) {
    if ((contents[i].role === 'assistant' || contents[i].role === 'model') && 
        contents[i].metadata?.responseId) {
      return contents[i].metadata.responseId;
    }
  }
  return null;
}

private async *callResponsesEndpoint(
  contents: Content[],
  options: any,
  conversationId: string,  // The sessionId passed through
  previousResponseId: string | null
): AsyncIterableIterator<Content> {
  const requestBody = buildResponsesRequest(
    contents,
    options,
    conversationId,
    previousResponseId
  );
  
  // Make API call and parse response
  const response = await fetch(...);
  yield* parseResponsesStream(response.body);
}
```

### 3. Update buildResponsesRequest

**File**: `packages/core/src/providers/openai/buildResponsesRequest.ts`

```typescript
export function buildResponsesRequest(
  messages: Content[],
  options: any,
  conversationId: string,  // The sessionId
  previousResponseId: string | null
): object {
  return {
    model: options.model,
    conversation_id: conversationId,  // Using sessionId as conversation_id
    previous_response_id: previousResponseId,
    input: [...] // Process messages into API format
  };
}
```

### 4. Modify parseResponsesStream

**File**: `packages/core/src/providers/openai/parseResponsesStream.ts`

```typescript
export async function* parseResponsesStream(
  stream: ReadableStream<Uint8Array>
): AsyncIterable<Content> {  // Returns Content, not IMessage
  // ... parse stream events ...
  
  // When we see response.completed event:
  if (event.type === 'response.completed' && event.response) {
    const responseId = event.response.id;
    
    // Yield Content with metadata containing responseId
    yield {
      role: 'model',
      parts: [],  // Empty parts - just carrying metadata
      metadata: {
        responseId: responseId  // This will be used as previousResponseId next turn
      }
    };
  }
}
```

### 5. Update Other Providers

**Files**: 
- `packages/core/src/providers/anthropic/AnthropicProvider.ts`
- `packages/core/src/providers/gemini/GeminiProvider.ts`

Just add the sessionId parameter but ignore it:
```typescript
async *generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string,
  sessionId?: string  // Added but unused
): AsyncIterableIterator<Content> {
  // Existing implementation - sessionId ignored
}
```

### 6. Update ContentGenerator/Caller

GeminiChat needs to pass sessionId to ContentGenerator, which passes it to provider:
```typescript
// In GeminiChat when calling ContentGenerator:
const sessionId = this.config.getSessionId();

// ContentGenerator passes to provider:
yield* provider.generateChatCompletion(
  contents,
  tools,
  toolFormat,
  sessionId  // Pass it through
);
```

## Key Design Clarifications

### SessionId = ConversationId
- They are THE SAME value
- SessionId is what the system calls it
- conversation_id is what OpenAI's API calls it
- We're just passing the sessionId through to use as conversation_id

### No State Storage
- Provider does NOT store sessionId
- Provider does NOT have a sessionId field
- SessionId is ONLY a parameter passed per request
- Each request gets its sessionId passed in

### Previous ResponseId Lives in Metadata
- Stored in Content metadata after each response
- Found by searching backwards in message history
- No separate storage or caching needed

## What We're NOT Doing

- ❌ Storing sessionId in provider
- ❌ Creating ConversationCache 
- ❌ Adding state variables
- ❌ Making sessionId and conversationId different things
- ❌ Building any new storage mechanisms

## Success Criteria

1. SessionId flows through as parameter only
2. ResponseId stored in Content metadata
3. Previous responseId found in message history
4. No state variables added
5. Other providers unaffected (just ignore parameter)
6. Conversation context maintained for GPT-5/O3