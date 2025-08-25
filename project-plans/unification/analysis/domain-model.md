# Unified Context and Tool Management Domain Model

<!--
 * @plan PLAN-20250823-UNIFICATION.P01
 * @requirement REQ-001
 * @requirement REQ-002
 * @requirement REQ-003
 -->

## Core Entities

### ConversationContext

The central entity for storing and managing conversation history.

Properties:
- conversationId: string - Unique identifier for the conversation
- contents: Content[] - Array of content items in Gemini format (lingua franca)
- tokenCount: number - Current token count for the conversation
- activeToolCalls: Map<string, ToolCallInfo> - Map of tool call IDs to their info while executing
- completedToolCalls: Set<string> - Set of completed tool call IDs
- cancelledToolCalls: Set<string> - Set of cancelled tool call IDs
- metadata: Record<string, unknown> - Additional conversation metadata

Behavior:
- Stores conversation in a unified format (Gemini's Content)
- Preserves conversation history when switching providers
- Automatically counts tokens for all providers
- Handles lazy format conversion at API call boundaries

### ToolCallInfo

An entity representing a tool call's lifecycle information.

Properties:
- id: string - Unique identifier for the tool call
- name: string - Name of the tool being called
- arguments: string - Arguments passed to the tool
- provider: string - Provider that made the tool call
- conversationId: string - Conversation this tool call belongs to
- timestamp: number - When the tool call was made
- status: 'pending' | 'executing' | 'completed' | 'cancelled' | 'failed' - Current status
- metadata: Record<string, unknown> - Additional tool call metadata

Behavior:
- Tracks the lifecycle of tool calls across providers
- Supports validation and automatic fixing of mismatches
- Provides synthetic response generation for cancellations

### ProviderManager

Coordinates between different AI providers and the unified conversation system.

Properties:
- activeProvider: Provider - Currently active provider
- conversationManager: ConversationManager - Centralized conversation storage
- settingsService: SettingsService - For configuration management

Behavior:
- Manages provider switching
- Integrates with ConversationManager for context preservation
- Coordinates tool call tracking across providers

## Relationships

1. ConversationContext contains multiple Content items
2. ToolCallInfo associates with a ConversationContext
3. ProviderManager coordinates with ConversationManager
4. Each provider integrates with the unified system

## State Transitions

### Provider States
- Idle → Processing Request
- Processing Request → Idle (after completion)
- Processing Request → Error (on failure)

### Tool Call Lifecycle States
- Pending → Executing (when tool call is processed)
- Executing → Completed (when tool response is received)
- Executing → Cancelled (when tool call is cancelled)
- Executing → Failed (when tool call encounters an error)
- Pending → Cancelled (cancelled before execution)

### Conversation States
- Empty → Contains Messages
- Contains Messages → Compressed (when token threshold exceeded)
- Contains Messages → Cleared (explicitly cleared by user)

## Business Rules

1. All conversation contexts are stored in Gemini's Content format as lingua franca
2. When switching providers, existing conversation history is preserved
3. Token counting is automatically performed for all provider interactions
4. Format conversion happens at API call boundaries, not when storing
5. Tool calls can be cancelled during execution
6. Tool call/response mismatches are validated and automatically fixed
7. Each provider must have an adapter to convert to/from Gemini format
8. No breaking changes to public API are allowed

## Edge Cases

1. Switching providers during an active tool call
2. Token limits exceeded during a conversation
3. Malformed tool calls from different providers
4. Cancellation signals during streaming responses
5. Failure to convert between formats

## Error Scenarios

1. Failure to preserve conversation context when switching providers
2. Incorrect token counting leading to improper compression decisions
3. Tool call tracking mismatches causing lost or duplicated calls
4. Format conversion errors breaking provider interactions
5. Cancellation not properly handled leading to resource leaks