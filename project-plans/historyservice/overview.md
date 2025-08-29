# HistoryService Overview

## Problem Statement

Currently, conversation history management is scattered across multiple components with complex interactions:
- History array is directly manipulated in `GeminiChat`
- Tool responses can be "lost" due to error handling that pops history entries
- Provider switching can create orphaned tool calls/responses
- Empty stream detection incorrectly removes valid tool responses from history
- Complex merging logic for multiple tool responses is mixed with core chat logic
- No centralized validation or debugging of history state

This has led to bugs where:
- Tool responses disappear from history after errors
- Orphaned tool calls cause provider API errors (especially Anthropic)
- Model responses after tool execution get lost
- History state becomes inconsistent during provider switches

## Solution: HistoryService

A centralized service that owns and manages all conversation history with atomic operations to prevent invalid states.

### Core Principles

1. **Single Source of Truth** - Only HistoryService can modify the history array
2. **Atomic Operations** - Tool calls and responses are added together or not at all
3. **Provider Agnostic** - History structure is independent of provider requirements
4. **Validation Built-in** - Invalid states are prevented, not detected after the fact
5. **Observable** - All changes emit events for debugging and UI updates

### Key Features

#### Pending Tool Pattern
Prevents orphaned tool calls/responses by holding tool calls in a pending state until their responses are ready:

```typescript
// Tool calls are staged but not added to history
historyService.addPendingToolCalls(toolCalls);

// Execute tools (may fail, be cancelled, etc.)
const responses = await executeTools(toolCalls);

// Atomically add both calls and responses
// If this is never called, no orphans can exist
historyService.commitToolTurn(responses);
```

#### State Machine
Tracks conversation state to prevent invalid operations:
- `IDLE` - Ready for new messages
- `MODEL_RESPONDING` - Model is generating response
- `TOOLS_PENDING` - Tool calls identified but not executed
- `TOOLS_EXECUTING` - Tools are running

#### Validation
- Structural validation (no orphans, proper role alternation)
- Content validation (no empty messages, valid tool IDs)
- Pure functions that don't know about specific providers

#### Event System
```typescript
interface HistoryEvents {
  change: { type: 'add' | 'pop' | 'clear', entries: Content[] };
  turnComplete: { userMessage: Content, modelResponse: Content };
  toolTurnComplete: { calls: ToolCall[], responses: ToolResponse[] };
}
```

## Integration Points

### GeminiChat Changes

**Current State:**
- Owns history array directly
- Complex `recordHistory()` method with special cases
- `extractCuratedHistory()` for filtering
- `shouldMergeToolResponses()` logic
- Direct history manipulation in `sendMessage()`/`sendMessageStream()`

**Final State:**
```typescript
class GeminiChat {
  private historyService: HistoryService;
  
  // Simplified - no direct history access
  async sendMessageStream(params) {
    const userContent = createUserContent(params.message);
    
    // History service handles all complexity
    this.historyService.addUserMessage(userContent);
    
    // Get properly formatted history for API
    const requestContents = this.historyService.getHistory();
    
    // Make API call...
    // Process response...
    
    // Add model response
    this.historyService.addModelMessage(modelContent);
  }
  
  // No more: recordHistory, shouldMergeToolResponses, history array
  // Delegates to: historyService.getHistory(curated)
}
```

### Provider Changes

#### Anthropic Provider
**Current Issues:**
- Receives orphaned tool calls/responses
- Has to validate and error on invalid history

**After HistoryService:**
- Always receives valid history (no orphans possible)
- No changes needed to provider itself
- Errors become impossible rather than handled

#### OpenAI Provider
**Current Issues:**
- Silently handles orphaned tool calls (may degrade quality)
- Less strict validation masks bugs

**After HistoryService:**
- Benefits from same validation as Anthropic
- More predictable behavior
- No provider changes needed

#### Gemini Provider
**Current Issues:**
- Native provider, less affected by conversion issues

**After HistoryService:**
- Simplified interface
- No provider changes needed

### Turn.ts Changes

**Current:** Manages tool execution and adds responses individually

**After:**
```typescript
class Turn {
  async handlePendingFunctionCalls() {
    // Add pending tool calls
    this.historyService.addPendingToolCalls(toolCalls);
    
    // Execute all tools
    const results = await this.executeTools(toolCalls);
    
    // Commit complete turn atomically
    this.historyService.commitToolTurn(results);
  }
}
```

### Client.ts Changes

#### Compression
- Move compression logic to HistoryService
- Initially disabled but ready for future use
- `historyService.compress(beforeIndex)` instead of direct manipulation

#### Provider Switching
- History automatically persists through switches
- No need to save/restore history
- Validation ensures history is valid for any provider

## Non-Interactive Mode Implications

### Benefits
1. **Simpler Implementation** - NonInteractiveToolExecutor doesn't need special history handling
2. **Consistent Behavior** - Same history management in both modes
3. **Better Testing** - Can test history logic without UI complexity

### Changes Required
- NonInteractiveToolExecutor uses same `commitToolTurn()` pattern
- Subagents get their own HistoryService instance
- Tool execution remains unchanged, just history recording differs

## Migration Benefits

### Immediate Fixes
1. Tool responses no longer lost after empty streams
2. No more orphaned tool calls/responses
3. Model responses after tool execution preserved
4. Provider switching maintains valid history

### Long-term Benefits
1. **Maintainability** - History logic in one place
2. **Debuggability** - Every change is logged with context
3. **Testability** - Pure functions, clear interfaces
4. **Extensibility** - Easy to add features like history branching, undo/redo
5. **Reliability** - Invalid states prevented by design

## Success Criteria

1. All provider errors related to orphaned tool calls/responses eliminated
2. Tool responses persist correctly even after errors
3. Model responses after tool execution never lost
4. History remains valid across provider switches
5. Simplified GeminiChat with < 50% of current history-related code
6. Comprehensive test coverage of history operations

## Future Possibilities

Once HistoryService is established:
- History branching for exploring alternatives
- Undo/redo functionality
- History persistence/resume
- Advanced compression strategies
- History analytics and insights
- Provider-specific history optimization (while maintaining compatibility)