# Unified Conversation Management - Plan B

## Executive Summary

This plan creates a unified conversation management system that ALL providers will use, eliminating the current problem where each provider maintains its own conversation cache and tool call tracking. Unlike Plan A, this plan directly integrates with existing code, uses existing utilities, and avoids creating unnecessary abstraction layers.

## Problem Statement

Currently:
- Each provider has its own conversation cache (OpenAI has ConversationCache, Anthropic validates inline)
- Tool call/response pairs get mismatched causing "tool_use without tool_result" errors
- Context is lost when switching between providers
- No centralized token counting across providers
- Compression/summarization is inconsistently applied

## Solution Architecture

### Core Components (NEW)

1. **ConversationManager** (`packages/core/src/conversation/ConversationManager.ts`)
   - Stores ALL conversations in Gemini Content format
   - Includes tool calls and responses as part of conversation history
   - Tracks token counts using EXISTING tokenizers
   - Handles compression using EXISTING summarizeToolOutput

2. **Enhanced ToolCallTrackerService** (`packages/core/src/tools/ToolCallTrackerService.ts`)
   - Validates tool call/response pairs within conversations
   - Generates synthetic responses for cancelled tools
   - Fixes mismatches in conversation history
   - Does NOT store tool calls separately - they're part of conversation

### What Gets REPLACED/MODIFIED

1. **OpenAIProvider** (`packages/core/src/providers/openai/OpenAIProvider.ts`)
   - REMOVE: ConversationCache usage
   - REMOVE: Local conversation tracking
   - ADD: Use ConversationManager.getConversation()
   - ADD: Use ConversationManager.addContent()

2. **AnthropicProvider** (`packages/core/src/providers/anthropic/AnthropicProvider.ts`)
   - REMOVE: validateAndFixMessages method
   - REMOVE: Local message validation
   - ADD: Use ConversationManager.getConversation()
   - ADD: Use ToolCallTrackerService.validateConversation()

3. **ProviderManager** (`packages/core/src/providers/ProviderManager.ts`)
   - ADD: Initialize ConversationManager
   - ADD: Pass ConversationManager to providers
   - MODIFY: switchProvider() to preserve conversation via ConversationManager

### What We REUSE (Not Recreate)

1. **Token Counting** - Use existing:
   - `OpenAITokenizer.countTokens()`
   - `AnthropicTokenizer.countTokens()`
   - Provider-specific token counting logic

2. **Compression** - Use existing:
   - `summarizeToolOutput()` from `utils/summarizer.ts`
   - Existing Gemini Flash calls for summarization

3. **Format Conversion** - Done directly in providers:
   - OpenAI converts Gemini→OpenAI format in generateContent()
   - Anthropic converts Gemini→Anthropic format in generateContent()
   - No separate adapter manager needed

## Data Flow

```
User Input
    ↓
Provider.generateContent()
    ↓
ConversationManager.addContent(userMessage)
    ↓
ConversationManager.getConversation() → Gemini Content[]
    ↓
Provider converts to its format (inline)
    ↓
API Call
    ↓
Response with tool calls
    ↓
ConversationManager.addContent(assistantMessage + toolCalls)
    ↓
Tool Execution
    ↓
ConversationManager.addContent(toolResponse)
    ↓
ToolCallTrackerService.validateConversation()
    ↓
Continue or return to user
```

## Key Differences from Plan A

| Aspect | Plan A (Failed) | Plan B (This Plan) |
|--------|-----------------|-------------------|
| Abstractions | Created ProviderAdapterManager, CompressionService, TokenCounterService | Uses existing code directly |
| Tool Tracking | Separate from conversation | Part of conversation history |
| Token Counting | New TokenCounterService with hardcoded "10" | Uses existing OpenAITokenizer, AnthropicTokenizer |
| Compression | New CompressionService with TODO | Uses existing summarizeToolOutput |
| Format Conversion | Complex adapter system | Direct conversion in each provider |
| Integration | Built in isolation | Modifies existing provider code |
| Phases | 35 phases with many stubs | ~15 phases of actual integration |
| TODOs | Left unresolved | No TODOs - everything implemented |

## Phase Structure Overview

### Phase 1-3: ConversationManager Core
- Create ConversationManager with Gemini Content storage
- TDD tests for conversation operations
- Implement using existing tokenizers and summarization

### Phase 4-6: ToolCallTrackerService Enhancement
- Enhance existing service to work with ConversationManager
- Add validation and synthetic response generation
- Test tool call/response matching

### Phase 7-9: OpenAI Provider Integration
- Remove ConversationCache
- Integrate with ConversationManager
- Test conversation persistence

### Phase 10-12: Anthropic Provider Integration
- Remove validateAndFixMessages
- Integrate with ConversationManager
- Test tool call validation

### Phase 13-14: ProviderManager Integration
- Wire up ConversationManager initialization
- Test provider switching preserves context

### Phase 15: End-to-End Testing
- Test full flow across providers
- Verify context preservation
- Confirm tool calls work correctly

## Success Criteria

1. **Conversation Persistence**: Switch providers without losing context
2. **Tool Call Integrity**: No more "tool_use without tool_result" errors
3. **Token Accuracy**: Correct token counts using real tokenizers
4. **Compression Works**: Large conversations compressed with summarizeToolOutput
5. **No Parallel Systems**: Old caches removed, not left alongside new system
6. **User Accessible**: Works through existing CLI/API without changes

## Integration Points

### Files That Will Import ConversationManager
- `/packages/core/src/providers/openai/OpenAIProvider.ts`
- `/packages/core/src/providers/anthropic/AnthropicProvider.ts`
- `/packages/core/src/providers/gemini/GeminiProvider.ts`
- `/packages/core/src/providers/ProviderManager.ts`

### Code To Be Removed
- `/packages/core/src/providers/openai/ConversationCache.ts` - entire file
- `/packages/core/src/providers/openai/syntheticToolResponses.ts` - functionality moved
- `AnthropicProvider.validateAndFixMessages()` method
- Direct SettingsService calls in providers for conversation storage

### User Access (No Changes Needed)
- CLI commands work identically
- API endpoints unchanged
- Provider switching transparent to user

## Risk Mitigation

1. **Risk**: Breaking existing provider functionality
   - **Mitigation**: Comprehensive integration tests before removing old code

2. **Risk**: Performance degradation from centralized storage
   - **Mitigation**: Keep provider-local caching for optimization if needed

3. **Risk**: Format conversion errors
   - **Mitigation**: Extensive testing of Gemini↔Provider format conversion

## What This Plan Does NOT Do

- Does NOT create new abstraction layers
- Does NOT leave TODOs for "future phases"
- Does NOT build features in isolation
- Does NOT create V2 or parallel implementations
- Does NOT ignore existing utilities
- Does NOT separate tool calls from conversation context

## Next Steps

1. Create detailed phase plans (01-analysis.md through 15-e2e-testing.md)
2. Write pseudocode for ConversationManager operations
3. Begin Phase 1 implementation with TDD approach
4. Ensure each phase integrates with existing code

This plan focuses on INTEGRATION over ABSTRACTION, using what exists rather than recreating it.