# Feature Specification: Unified Context and Tool Management

## Purpose

This feature unifies the conversation context and tool call management across all providers in LLxprt Code. Currently, each provider maintains its own conversation cache and has inconsistent approaches to tracking tool calls and handling cancellations. This leads to multiple problems:

1. Context is lost when switching providers
2. Tool call/response mismatches occur frequently
3. Redundant implementations exist for similar functionality
4. No centralized token counting or compression when switching providers

This unified system will solve these problems by creating a centralized conversation management system and enhanced tool call tracking that works consistently across all providers.

## Architectural Decisions

- **Pattern**: Service-based architecture with provider adapters
- **Technology Stack**: TypeScript, Node.js, existing SettingsService
- **Data Flow**: Conversations stored in Gemini's Content format as lingua franca, converted to provider-specific formats at API boundaries
- **Integration Points**: All providers, SettingsService, existing compression system

## Project Structure

```
src/
  conversation/
    ConversationManager.ts      # Centralized conversation storage and management
    ConversationManager.test.ts # Unit tests for conversation management
  tools/
    ToolCallTrackerService.ts      # Enhanced tool call lifecycle tracking
    ToolCallTrackerService.test.ts # Unit tests for tool tracking
    provider-adapters/             # Provider-specific adapters for format conversion
      OpenAIAdapter.ts
      AnthropicAdapter.ts
      GeminiAdapter.ts
test/
  integration/
    unified-conversation.test.ts # Integration tests across providers
  e2e/
    conversation-switching.test.ts # E2E tests for provider switching behavior
```

## Technical Environment

- **Type**: CLI Tool
- **Runtime**: Node.js 20.x
- **Dependencies**: 
  - @anthropic-ai/sdk: ^0.27.2
  - openai: ^4.52.6
  - zod: ^3.23.8

## Integration Points

### Existing Code That Will Use This Feature

- `packages/core/src/providers/ProviderManager.ts` - Will call ConversationManager during provider switching
- `packages/core/src/providers/openai/OpenAIProvider.ts` - Will use ConversationManager and ToolCallTrackerService
- `packages/core/src/providers/anthropic/AnthropicProvider.ts` - Will use ConversationManager and ToolCallTrackerService
- `packages/core/src/providers/gemini/GeminiProvider.ts` - Will use ConversationManager

### Existing Code To Be Replaced

- `packages/core/src/providers/openai/ConversationCache.ts` - Local conversation caching
- `packages/core/src/providers/openai/syntheticToolResponses.ts` - Synthetic response generation
- `packages/core/src/providers/anthropic/AnthropicProvider.ts` validateAndFixMessages method - Local tool validation
- Direct SettingsService calls in provider setModel methods - Centralized in ConversationManager

### User Access Points

- CLI: Implicit through all conversation interactions
- API: Through provider switching mechanisms
- UI: Through conversation history persistence

### Migration Requirements

- Existing conversation context needs to be converted to Gemini format
- Provider-specific tool call tracking needs consolidation
- SettingsService conversation storage needs schema update
- Existing compression thresholds preserved

## Formal Requirements

[REQ-001] Unified Conversation Management
  [REQ-001.1] Store conversations in a single format (Gemini's Content)
  [REQ-001.2] Preserve conversation history when switching providers
  [REQ-001.3] Automatic token counting for all providers
  [REQ-001.4] Lazy format conversion at API call boundaries
  
[REQ-002] Tool Call Tracking and Cancellation
  [REQ-002.1] Unified tool call lifecycle tracking (pending, executing, completed, cancelled, failed)
  [REQ-002.2] Provider-specific synthetic response generation for cancellations
  [REQ-002.3] Streaming-aware cancellation handling
  [REQ-002.4] Validation and automatic fixing of tool call/response mismatches
  
[REQ-003] Integration Requirements
  [REQ-003.1] Replace existing conversation caches in all providers
  [REQ-003.2] Enhance existing ToolCallTrackerService with cancellation capabilities
  [REQ-003.3] Update ProviderManager to coordinate with unified system
  [REQ-003.4] Preserve existing compression token thresholds

[REQ-004] System Constraints
  [REQ-004.1] No breaking changes to public API
  [REQ-004.2] No performance degradation in provider operations
  [REQ-004.3] Maintain existing tool call/response patterns during streaming
  [REQ-004.4] Preserve meaningful content detection logic

## Data Schemas

```typescript
// Conversation entity
interface ConversationContext {
  conversationId: string;
  contents: Content[]; // Gemini Content format as lingua franca
  tokenCount: number;
  activeToolCalls: Map<string, ToolCallInfo>;
  completedToolCalls: Set<string>;
  cancelledToolCalls: Set<string>;
  metadata: Record<string, unknown>;
}

// Tool call entity
interface ToolCallInfo {
  id: string;
  name: string;
  arguments: string;
  provider: string;
  conversationId: string;
  timestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'cancelled' | 'failed';
  metadata: Record<string, unknown>;
}
```

## Example Data

```json
{
  "simpleConversation": {
    "conversationId": "conv-12345",
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Hello, how can you help me today?"
          }
        ]
      },
      {
        "role": "model",
        "parts": [
          {
            "text": "I can help you with coding tasks, research, and more. What would you like to work on?"
          }
        ]
      }
    ],
    "tokenCount": 25
  },
  "toolCallConversation": {
    "conversationId": "conv-tool-67890",
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Can you list the files in the current directory?"
          }
        ]
      },
      {
        "role": "model",
        "parts": [
          {
            "functionCall": {
              "name": "list_directory",
              "args": {
                "path": "."
              }
            }
          }
        ]
      },
      {
        "role": "user",
        "parts": [
          {
            "functionResponse": {
              "name": "list_directory",
              "response": {
                "filePaths": ["package.json", "README.md", "src/"]
              }
            }
          }
        ]
      },
      {
        "role": "model",
        "parts": [
          {
            "text": "I've listed the files in the current directory. Here are the results: package.json, README.md, and src/ directory."
          }
        ]
      }
    ],
    "tokenCount": 78
  }
}
```

## Constraints

- No external HTTP calls in unit tests
- All async operations must have timeouts
- Maintain existing function call/response pairings during compression
- Preserve existing meaningful content detection

## Performance Requirements

- Conversation storage operations: <50ms
- Format conversion at API boundaries: <20ms
- Token counting operations: <10ms
- Compression triggering during provider switching: <100ms