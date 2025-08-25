# Anthropic Provider Integration with Unified Conversation System

## Current Implementation Overview

The Anthropic provider in LLxprt Code has its own message validation and tool processing mechanisms that need to be integrated with our unified system.

### Provider Implementation

1. **Core Implementation**:
   - Located at `packages/core/src/providers/anthropic/AnthropicProvider.ts`
   - Extends BaseProvider class
   - Implements special handling for OAuth vs API key authentication

2. **Function Call Handling**:
   - Implements `validateAndFixMessages()` for Anthropic-specific tool consistency (lines 440-502)
   - Converts ITool format to Anthropic tool format in generateChatCompletion()
   - Handles both streaming and non-streaming tool call responses

3. **Message Format Conversion**:
   - Special handling for system messages vs user messages in OAuth mode (lines 147-170)
   - Converts assistant tool calls to Anthropic's content block format (lines 172-190)
   - Converts tool responses to user messages with tool_result content (lines 162-168)

4. **Model Management**:
   - Implements model resolution for "-latest" aliases (lines 347-386)
   - Has model-specific token limit and context window handling (lines 388-422)
   - Manages model caching with TTL (lines 353-357)

5. **Error Handling and Retries**:
   - Implements retryable error detection specific to Anthropic (lines 424-438)
   - Handles various error response formats from Anthropic API

## Unified System Integration Points

### Services to Modify/Integrate

1. **ConversationManager**:
   - Will handle Anthropic-specific message formats
   - Will manage conversation context without requiring local caching
   - Will interface with SettingsService for persistence

2. **ToolCallTrackerService**:
   - Will replace `validateAndFixMessages()` functionality
   - Will handle tool call lifecycle for Anthropic provider
   - Will provide centralized tool consistency validation

3. **TokenUsageService** (new service):
   - Will handle token counting specific to Anthropic models
   - Will implement Anthropic's token estimation methods

## Specific Code Changes Required

### 1. AnthropicProvider.generateChatCompletion() method (lines 112-412)

This is the primary method that requires integration:

**Lines to modify:**
- Message validation call `this.validateAndFixMessages(messages)` (line 144)
- System message handling that injects llxprt prompts in OAuth mode (lines 147-170)
- Conversation ID usage pattern (no direct conversation ID usage in current implementation)

**Lines to remove:**
- Custom message validation/fixing logic (handled by unified ToolCallTrackerService)
- Local context injection for OAuth mode (will be handled centrally)

### 2. AnthropicProvider.validateAndFixMessages() method (lines 440-502)

This entire method will be replaced:

Changes needed:
- Replace with calls to ToolCallTrackerService for validation and fixing
- Remove local implementation of tool call tracking

### 3. AnthropicProvider.getModels() method (lines 249-314)

Need to identify specific areas that handle model information:

**Lines to note:**
- Special handling for OAuth mode vs API key (lines 262-268)
- Model resolution implementation for "-latest" aliases (lines 303-313)

### 4. AnthropicProvider.resolveLatestModel() method (lines 347-386)

Note implementation details:
- Uses local model cache with TTL (lines 353-357)
- Special fallback logic for when model fetching fails (lines 377-385)

### 5. AnthropicProvider.setModel() method (lines 316-330)

Changes needed:
- Replace direct SettingsService calls with unified conversation management

### 6. AnthropicProvider.getCurrentModel() method (lines 332-345)

Changes needed:
- Integration with unified conversation context for model tracking

## Integration Strategy for Anthropic Provider

1. **Stage 1**: Enhance ToolCallTrackerService with Anthropic-specific validation
   - Add method for Anthropic tool_call/tool_result consistency checking
   - Implement tool call lifecycle tracking for Anthropic format
   - Add cancellation notice generation for Anthropic tool calls

2. **Stage 2**: Enhance ConversationManager with Anthropic message format handling
   - Implement message conversion between unified format and Anthropic's special requirements
   - Add proper handling for system messages vs user messages in OAuth mode
   - Add support for Anthropic content block structures

3. **Stage 3**: Preserve model management functionality with unified storage
   - Maintain model resolution for "-latest" aliases
   - Keep model token limits and context window information
   - Migrate model caching to unified conversation context

4. **Stage 4**: Refactor generateChatCompletion() method in AnthropicProvider
   - Replace local validateAndFixMessages() with ToolCallTrackerService calls
   - Integrate with unified conversation context for state management
   - Preserve existing behavior for OAuth vs API key handling

5. **Stage 5**: Create TokenUsageService with Anthropic token counting
   - Implement token estimation methods specific to Anthropic models
   - Add context window tracking that works with Anthropic's token counting
   - Create unified token usage interface that works across providers

6. **Stage 6**: Add comprehensive tests for Anthropic provider with unified system
   - Test tool call consistency with validation service
   - Validate OAuth mode behavior with conversation context
   - Verify token counting accuracy for Anthropic models
   - Test model resolution and caching mechanisms