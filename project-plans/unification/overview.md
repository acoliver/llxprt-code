# Unified Context and Tool Management System

## Overview

This document outlines a comprehensive redesign of the context storage and tool execution/cancellation management in LLxprt Code. The current implementation has various provider-specific mechanisms for handling context retention and tool call tracking, which leads to inconsistencies and errors when switching between providers.

The proposed solution replaces existing systems entirely with a unified approach that:
1. Uses Gemini's Content/Part message format as lingua franca for all providers
2. Extends ToolCallTrackerService to handle the complete tool call lifecycle
3. Leverages existing token-based conversation compression during provider switches

## Conversation Context Management Design

### Current Issues

1. **Provider Isolation**: Each provider maintains its own conversation cache
2. **State Clearing**: Context is cleared when switching between most providers due to format incompatibilities
3. **Fragmented Implementation**: No centralized management of conversation history and token counting
4. **Token Management**: Inconsistent token counting and no automatic context compression when switching providers

### Proposed Solution

Create a `ConversationManager` service that stores all conversation context in Gemini's Content format and leverages existing compression mechanisms when token thresholds are exceeded:

```typescript
interface ConversationContext {
  conversationId: string;
  contents: Content[]; // Gemini Content format as lingua franca
  tokenCount: number;
  activeToolCalls: Map<string, ToolCallInfo>;
  completedToolCalls: Set<string>;
  cancelledToolCalls: Set<string>;
  // Provider-specific metadata not part of Gemini format
  metadata: Record<string, unknown>;
}

class ConversationManager {
  private conversations: Map<string, ConversationContext>;
  
  // Get conversation context in Gemini format
  getConversation(conversationId: string): ConversationContext;
  
  // Add messages to conversation (in Gemini format)
  addMessages(conversationId: string, contents: Content[]): void;
  
  // Get messages in provider-specific format
  getProviderMessages(conversationId: string, providerName: string): IMessage[];
  
  // Check if token threshold is exceeded for target provider/model
  needsCompression(conversationId: string, providerName: string, modelId: string): boolean;
  
  // Compress conversation when thresholds are exceeded using existing summarization system
  compressConversation(conversationId: string): Promise<void>;
  
  // Store conversation in SettingsService
  persistConversation(conversationId: string): Promise<void>;
  
  // Load conversation during initialization
  loadConversation(conversationId: string): Promise<void>;
}
```

### Key Features

1. **Gemini Format as Lingua Franca**: All conversation storage uses Gemini's Content/Part format, which can naturally represent function calls and responses
2. **Automatic State Persistence**: Conversations are preserved when switching providers without clearing context
3. **Provider Adapters**: Lightweight adapters convert between Gemini and provider-specific formats at API call boundaries
4. **Automatic Token Management**: When switching providers, automatically compress conversations that exceed token limits using the existing system
5. **Centralized Tool Call Tracking**: All tool calls are tracked in a unified system
6. **Storage Integration**: Conversations stored in SettingsService for persistence across sessions
7. **Meaningful Content Preservation**: Existing logic for determining meaningful content is maintained

### Implementation Details

- Replace all provider-specific conversation caches with centralized ConversationManager
- Each provider implements an adapter that converts to/from its specific format only at API boundaries
- Leverage existing token threshold and summarization system for compression when switching providers
- Preserve function call/response pairs together during compression as the existing system already does
- Store conversations in SettingsService when they're complete or reach thresholds
- Maintain existing meaningful content detection logic during streaming responses

## Integrated Tool Execution and Cancellation Management

### Current Issues

1. **Inconsistent Handling**: Each provider has its own approach to handling cancellations
2. **Synthetic Response Generation**: Different approaches to creating synthetic responses for cancelled tools
3. **Concurrency Problems**: Race conditions occur when cancelling tool execution during streaming
4. **Error Recovery**: Mismatch errors are not properly handled or recovered from
5. **State Management**: Tool states are not consistently tracked across all components

### Proposed Solution

Completely replace existing tool tracking with an enhanced `ToolCallTrackerService` that handles the entire tool lifecycle:

```typescript
interface ToolCallInfo {
  id: string;
  name: string;
  arguments: string;
  provider: string;
  conversationId: string;
  timestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'cancelled' | 'failed';
  // Provider-specific metadata needed for synthetic response generation
  metadata: Record<string, unknown>;
}

class ToolCallTrackerService {
  private toolCalls: Map<string, ToolCallInfo>;
  private conversationManager: ConversationManager;
  
  // Register a tool call before it is executed
  static startTrackingToolCall(
    conversationId: string,
    toolName: string,
    parameters: Record<string, unknown>,
    provider: string
  ): string;
  
  // Handle tool cancellation request and generate synthetic response
  static cancelToolCall(toolCallId: string): Promise<Content>;
  
  // Mark a tool call as completed
  static completeToolCallTracking(conversationId: string, toolCallId: string): Promise<void>;
  
  // Mark a tool call as failed
  static failToolCallTracking(conversationId: string, toolCallId: string): void;
  
  // Validate consistency of tool calls in a conversation
  static validateContext(conversationId: string): boolean;
  
  // Automatically fix mismatched tool calls in context
  static autoFixContext(conversationId: string): void;
  
  // Get synthetic response content for cancelled tool using existing patterns
  static createSyntheticResponse(toolCallId: string): Content;
  
  // Get tool call info
  static getToolCallInfo(toolCallId: string): ToolCallInfo | undefined;
}
```

### Key Features

1. **Unified Tool Tracking**: Single service tracks all tool calls across providers with consistent lifecycles
2. **Provider-Specific Synthetic Responses**: Each provider's adapter generates appropriate synthetic response content building on existing implementations
3. **Streaming-Aware Cancellation**: Proper handling of interruptions during streaming with existing patterns
4. **Automatic Consistency Validation**: Detect and fix tool call/response mismatches without manual intervention
5. **Enhanced State Management**: Complete lifecycle tracking including cancellation and failure states

## Integration Architecture

```
┌────────────────────────────────────┐
│      ConversationManager           │
├────────────────────────────────────┤
│ - Stores all conversations in     │
│   Gemini's Content format          │
│ - Manages token counts             │
│ - Leverages existing compression  │
│ - Preserves history on switching   │
└────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────┐
│   ToolCallTrackerService           │
├────────────────────────────────────┤
│ - Tracks complete tool lifecycle   │
│ - Generates synthetic responses    │
│ - Handles cancellations/interrupts │
│ - Validates consistency            │
└────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────┐
│      ProviderManager               │
├────────────────────────────────────┤
│ - Orchestrates provider switching  │
│ - Interfaces with context systems  │
└────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────┐   ┌────────────────────────────────┐
│      OpenAI Provider (Adapter)     │   │   Anthropic Provider (Adapter) │
├────────────────────────────────────┤   ├────────────────────────────────┤
│ - Converts to OpenAI format        │   │ - Converts to Anthropic format │
│ - Uses centralized context         │   │ - Uses centralized context     │
│ - Interfaces with tool tracker     │   │ - Interfaces with tool tracker │
│ - Generates synthetic responses    │   │ - Generates synthetic responses│
└────────────────────────────────────┘   └────────────────────────────────┘
                │                                       │
                ▼                                       ▼
┌────────────────────────────────────┐   ┌────────────────────────────────┐
│     Gemini Provider (Native)       │   │    Other Providers (Adapter)   │
├────────────────────────────────────┤   ├────────────────────────────────┤
│ - Uses centralized context         │   │ - Convert to provider formats  │
│ - Generates synthetic responses    │   │ - Interface with tool tracker  │
│ - Native server tools              │   │ - Generate synthetic responses │
└────────────────────────────────────┘   └────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────┐
│        Tool Registry               │
├────────────────────────────────────┤
│ - Discovers tools                  │
│ - Registers tool definitions       │
│ - Provides schemas to providers    │
└────────────────────────────────────┘
```

## Benefits of Unified System

1. **Consistent Tool Handling**: Same approach works across all providers for both execution and cancellation using existing patterns
2. **Context Preservation**: Conversations persist seamlessly across provider switches
3. **Reduced Errors**: Centralized management prevents tool call/response mismatches with existing validation
4. **Automatic Token Management**: Conversations are automatically compressed when switching providers using existing system
5. **Enhanced Integration**: Seamless coordination between tool execution tracking and conversation context
6. **Cleaner Implementation**: Eliminates fragmented systems in favor of unified architecture
7. **Better Performance**: Avoids redundant format conversions with lazy conversion at API boundaries

## Implementation Steps

1. **Create ConversationManager service**
   - Implement conversation storage using Gemini Content format
   - Add automatic token counting and threshold evaluation
   - Integrate with existing summarization system for compression
   - Ensure proper preservation of function call/response pairs
   - Integrate with SettingsService for persistence

2. **Replace ToolCallTrackerService**
   - Implement complete tool call lifecycle tracking
   - Add cancellation and synthetic response generation capabilities based on current patterns
   - Create validation and automatic fixing mechanisms leveraging existing error handling
   - Ensure integration with new ConversationManager

3. **Refactor ProviderManager**
   - Remove all provider-specific context clearing behaviors
   - Add automatic compression triggering during provider switches using existing thresholds
   - Wire up conversation management to provider lifecycle events ensuring proper timing

4. **Refactor all Providers**
   - Remove existing conversation caching implementations
   - Create adapter pattern implementations that interface with ConversationManager
   - Implement provider-specific synthetic response generation based on existing patterns
   - Handle format conversion only at API call boundaries (lazy conversion)
   - Preserve meaningful content detection logic

5. **Update Tool Registry**
   - Ensure proper schema management across provider adapters
   - Validate compatibility between tools and all provider formats

6. **Add Comprehensive Tests**
   - Test conversation persistence during provider switching
   - Test tool call execution and cancellation scenarios across providers leveraging existing tests
   - Validate automatic compression triggers work with existing summarization system
   - Test synthetic response generation maintains existing quality and patterns

7. **Documentation Updates**
   - Create documentation for the new unified system
   - Remove references to deprecated provider-specific caching
   - Document adapter interface requirements building on existing patterns

This approach completely replaces existing provider-specific systems with a unified architecture that leverages Gemini's format as lingua franca while maintaining clean adapter interfaces for all providers. It builds on our existing proven compression and cancellation handling systems rather than adding complexity.