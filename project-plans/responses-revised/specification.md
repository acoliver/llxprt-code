# Feature Specification: OpenAI Responses API Conversation Tracking

## Purpose

Enable conversation context tracking for OpenAI's Responses API (GPT-5/O3 models) by properly managing conversation_id and previous_response_id through the existing Content[] metadata system. This fixes the current issue where models lose context and loop infinitely due to hardcoded undefined values.

## Architectural Decisions

- **Pattern**: Parameter passing with metadata-based state tracking
- **Technology Stack**: TypeScript, Node.js 20.x (existing)
- **Data Flow**: SessionId passed as parameter, ResponseId stored in metadata
- **Integration Points**: Minimal changes to existing interfaces

## Project Structure

```
packages/core/src/
  providers/
    IProvider.ts                  # Add sessionId parameter to interface
    openai/
      OpenAIProvider.ts           # Use sessionId parameter, find responseId in metadata
      buildResponsesRequest.ts    # Accept conversation tracking parameters
      parseResponsesStream.ts     # Convert to Content[] with metadata
    anthropic/
      AnthropicProvider.ts        # Add sessionId parameter (ignored)
    gemini/
      GeminiProvider.ts           # Add sessionId parameter (ignored)
  providers/
    IMessage.ts                   # ALREADY DELETED - just remove imports
```

## Technical Environment

- **Type**: Library Enhancement (not new feature)
- **Runtime**: Node.js 20.x
- **Dependencies**: No new dependencies, uses existing infrastructure

## Integration Points (MANDATORY SECTION)

### Existing Code That Will Use This Feature

- `/packages/core/src/core/geminiChat.ts` - Gets sessionId via `this.config.getSessionId()` and passes to ContentGenerator
- `/packages/core/src/config/config.ts` - Already stores sessionId, provides `getSessionId()` method
- `/packages/core/src/core/contentGenerator.ts` - Passes sessionId to provider.generateChatCompletion()
- `/packages/core/src/core/logger.ts` - Already uses sessionId for logging (via `config.getSessionId()`)
- `/packages/cli/src/ui/streamManager.ts` - Handles Content[] with metadata unchanged
- All integration tests using OpenAI provider with responses models

### Existing Code To Be Replaced

- All IMessage type imports throughout codebase - Replace with Content[] (IMessage.ts already deleted)
- Hardcoded undefined for conversation_id in OpenAIProvider - Replace with sessionId parameter
- Hardcoded undefined for previous_response_id in OpenAIProvider - Replace with value from metadata
- parseResponsesStream return type - Change from IMessage to Content[]

### User Access Points

- CLI: Any command using `/provider openai /model gpt-5` or `/model o3`
- Save/Load: `/chat save` and `/chat load` preserve metadata automatically
- History: Conversation history maintains response IDs in metadata

### Migration Requirements

- Remove all IMessage imports and replace with Content[]
- Ensure all tests use Content[] format
- No data migration needed - metadata system already exists

## Formal Requirements

[REQ-001] SessionId Parameter Flow
  [REQ-001.1] Add optional sessionId parameter to IProvider.generateChatCompletion()
  [REQ-001.2] GeminiChat retrieves sessionId via config.getSessionId() and passes to ContentGenerator
  [REQ-001.3] ContentGenerator passes sessionId to provider as parameter
  [REQ-001.4] OpenAIProvider uses sessionId as conversation_id for Responses API
  [REQ-001.5] Generate temporary ID if sessionId not provided

[REQ-002] Response ID Tracking via Metadata
  [REQ-002.1] Extract response ID from API response.completed event
  [REQ-002.2] Add responseId to Content metadata before yielding
  [REQ-002.3] Find previous responseId by searching backwards in contents
  [REQ-002.4] Use null as previous_response_id when no responseId found

[REQ-003] Content Format Unification  
  [REQ-003.1] Remove all IMessage imports (file already deleted)
  [REQ-003.2] Convert parseResponsesStream to return Content[] not IMessage
  [REQ-003.3] Add metadata field to returned Content
  [REQ-003.4] Preserve existing Content structure (don't modify Google's type)

[REQ-INT-001] Integration Requirements
  [REQ-INT-001.1] Provider remains stateless - sessionId only as parameter
  [REQ-INT-001.2] Metadata flows through existing wrapper/history unchanged
  [REQ-INT-001.3] Work with existing save/load functionality
  [REQ-INT-001.4] Support provider switching (null previous_response_id on switch)

## Data Schemas

```typescript
// IProvider interface change
interface IProvider {
  generateChatCompletion(
    contents: Content[],
    tools?: ITool[],
    toolFormat?: string,
    sessionId?: string  // NEW: Optional parameter
  ): AsyncIterableIterator<Content>;
}

// Content with metadata (existing structure, just documenting usage)
interface Content {
  role: string;
  parts: Part[];
  metadata?: {
    responseId?: string;      // Add this for responses API
    [key: string]: any;       // Other metadata preserved
  };
}

// Request to Responses API
const ResponsesRequestBody = {
  model: string,
  conversation_id: string,        // The sessionId parameter
  previous_response_id: string | null,  // From metadata or null
  input: Array<{
    type: 'message' | 'function_call' | 'function_call_output',
    role?: string,
    content?: Array<{ type: string, text: string }>,
    // ... other fields
  }>
};

// Response from API (partial)
const ResponseEvent = {
  type: 'response.completed',
  response: {
    id: string,  // This becomes responseId in metadata
    conversation_id: string
  }
};
```

## Example Data

```json
// First request (no previous context)
{
  "geminiChat_gets_sessionId": "this.config.getSessionId() returns 'sess_abc123'",
  "generateChatCompletion_params": {
    "contents": [
      { "role": "user", "parts": [{"text": "Hello"}] }
    ],
    "tools": null,
    "toolFormat": null,
    "sessionId": "sess_abc123"
  },
  "api_request": {
    "model": "gpt-5",
    "conversation_id": "sess_abc123",
    "previous_response_id": null,
    "input": [...]
  },
  "api_response": {
    "id": "resp_xyz789",
    "conversation_id": "sess_abc123"
  },
  "yielded_content": {
    "role": "model",
    "parts": [{"text": "Hi there!"}],
    "metadata": {
      "responseId": "resp_xyz789"
    }
  }
}

// Second request (has previous context)
{
  "generateChatCompletion_params": {
    "contents": [
      { "role": "user", "parts": [{"text": "Hello"}] },
      { 
        "role": "model", 
        "parts": [{"text": "Hi there!"}],
        "metadata": {"responseId": "resp_xyz789"}
      },
      { "role": "user", "parts": [{"text": "What's 2+2?"}] }
    ],
    "sessionId": "sess_abc123"
  },
  "findPreviousResponseId_result": "resp_xyz789",
  "api_request": {
    "model": "gpt-5",
    "conversation_id": "sess_abc123",
    "previous_response_id": "resp_xyz789",
    "input": [...]
  }
}
```

## Constraints

- Must not modify Google's Content type definition
- Must work with existing save/load system
- Must not create new state storage (use metadata only)
- Provider must remain stateless (sessionId as parameter only)
- Must handle missing sessionId gracefully
- Must support provider switching mid-conversation

## Performance Requirements

- Metadata lookup: O(n) where n is assistant message count (acceptable)
- No additional memory overhead beyond metadata object
- No new async operations or API calls
- Zero impact on non-Responses API models
- No state storage or caching

## Security Guidelines

- SessionId must not be logged in production
- Response IDs are not sensitive (can be logged)
- No PII should be added to metadata
- Temporary sessionIds should be cryptographically random

## Testing Requirements

- Unit tests for findPreviousResponseId logic
- Unit tests for sessionId parameter passing
- Unit tests for metadata extraction from response
- Integration tests for full conversation flow
- Tests for provider switching scenarios
- Tests for missing sessionId handling
- No mock theater - test real behavior

## Success Criteria

1. SessionId flows as parameter only (no state storage)
2. Response IDs stored in Content metadata
3. Previous response ID found in message history
4. Conversation context maintained for GPT-5/O3
5. All IMessage references removed
6. Other providers unaffected by sessionId parameter
7. Save/load preserves metadata automatically
8. Provider switching works correctly