# Gemini Provider Integration with Unified Conversation System

## Current Implementation Overview

The Gemini provider in LLxprt Code already uses Gemini's Content/Part format as its internal representation, which aligns with our unified system's planned lingua franca. However, we need to integrate it with our new centralized ConversationManager and enhanced ToolCallTrackerService.

### Provider Implementation

1. **Core Implementation**:
   - Located at `packages/core/src/providers/gemini/GeminiProvider.ts`
   - Extends BaseProvider class
   - Uses Gemini's native Content/Part format for messages via convertMessagesToGeminiFormat method

2. **Function Call Tracking**:
   - Tracks function calls and responses in the `convertMessagesToGeminiFormat` method (lines 265-271)
   - Local tracking using Maps:
     ```typescript
     const functionCalls = new Map<string, {name: string, contentIndex: number, partIndex: number, messageIndex: number}>();
     const functionResponses = new Map<string, {name: string, contentIndex: number, messageIndex: number}>();
     ```
   - Automatically adds placeholder responses for unmatched calls (lines 334-357)

3. **Server-Side Tools**:
   - Supports native server tools `web_search` and `web_fetch`
   - Implements specific handling in `invokeServerTool` method (lines 572-711)

4. **State Management**:
   - Has auth-related state in `clearState` method (lines 530-540)
   - Uses local toolSchemas property (line 36) for tool format storage

## Unified System Integration Points

### Classes and Services to Modify/Integrate

1. **ConversationManager** (new service to be created)
   - Will provide conversion of messages from unified format to provider-specific formats
   - Will handle token counting and automatic compression when thresholds are reached
   - Will store conversation state centrally via SettingsService

2. **ToolCallTrackerService** (existing service to be enhanced)
   - Enhance with additional methods for cancellation handling and synthetic responses
   - Add tracking of tool call states (pending, executing, completed, cancelled, failed)
   - Enhance validation and automatic fixing mechanisms

3. **GeminiProvider**:
   - Replace local conversation management with calls to ConversationManager
   - Register/track tool calls with ToolCallTrackerService instead of local Maps
   - Use ToolCallTrackerService for synthetic response generation on cancellations

4. **ProviderManager**:
   - Modify to properly initialize ConversationManager with current provider
   - Handle context preservation when switching between providers

## Specific Code Changes Required

### 1. ConversationManager Service

This new service will:
- Store all conversations in a standardized format that preserves provider differences
- Handle token counting and compression triggering
- Interface with SettingsService for persistence
- Provide methods for getting messages in provider-specific formats

### 2. Enhanced ToolCallTrackerService

Modify existing ToolCallTrackerService to add:
- Cancellation tracking and synthetic response generation methods
- Validation of tool calls against conversation context
- Automatic fixing of mismatches between tool calls and responses

The methods to be added:
- `cancelToolCall(toolCallId: string): Promise<Content>` - Creates and returns synthetic response
- `validateContext(conversationId: string): boolean` - Checks for mismatches between tool calls and responses
- `autoFixContext(conversationId: string): void` - Automatically adds synthetic responses when needed

### 3. GeminiProvider.convertMessagesToGeminiFormat() method (lines 260-434)

Changes needed:
- Remove local Maps for function call tracking (lines 265-271)
- Remove automatic placeholder generation (lines 334-357)
- Remove detailed mismatch logging at the end of the method (lines 393-433)
- Replace with calls to ToolCallTrackerService for validation

### 4. GeminiProvider.generateChatCompletion() method (lines 151-371)

Changes needed:
- Replace direct call to `convertMessagesToGeminiFormat(messages)` (lines 227 and 314) with:
  ```typescript
  const contents = ConversationManager.getProviderMessages(conversationId, "gemini");
  ```
- Add registrations with ToolCallTrackerService when function calls are detected:
  ```typescript
  ToolCallTrackerService.startTrackingToolCall(conversationId, call.name, call.args, "gemini");
  ```
- Add calls to `ToolCallTrackerService.completeToolCallTracking()` when tool calls complete

### 5. GeminiProvider.invokeServerTool() method (lines 572-711)

Changes needed:
- Add registration with ToolCallTrackerService for web_search and web_fetch tools:
  ```typescript
  const toolCallId = ToolCallTrackerService.startTrackingToolCall(conversationId, "web_search", params, "gemini");
  ```
- Add completion or failure tracking through ToolCallTrackerService after execution

### 6. GeminiProvider.clearState() method (lines 530-540)

Changes needed:
- Modify to preserve conversation context during provider switches
- Only clear auth-related state but maintain message and tool call history
- Ensure conversation remains consistent when switching to/from Gemini provider

## Implementation Strategy

1. **First Stage**: Implement ConversationManager service with basic functionality
   - Standardize conversation format storage
   - Implement provider format conversion methods
   - Set up SettingsService integration for persistence

2. **Second Stage**: Enhance ToolCallTrackerService with new capabilities
   - Add cancellation tracking and synthetic response methods
   - Implement validation mechanisms for tool call consistency
   - Add automatic fixing capabilities

3. **Third Stage**: Refactor GeminiProvider to use new services
   - Replace local tracking mechanisms with centralized services
   - Integrate with ConversationManager for message acquisition
   - Modify state management to preserve context during switches

4. **Fourth Stage**: Modify ProviderManager to coordinate with new services
   - Handle conversation initialization with appropriate provider
   - Manage context preservation during provider switches

5. **Fifth Stage**: Update integration tests to verify unified behavior
   - Test conversation persistence across provider switches
   - Test tool call cancellation with synthetic response generation
   - Test automatic context compression when thresholds are exceeded