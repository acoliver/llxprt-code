# Phase 30e: Create and Pass Turn from useGeminiStream

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P30e  
**Prerequisites:** Phase 30d passed  
**Status:** Not Started  
**Type:** CRITICAL FIX - UI Integration

## Overview

This phase creates a Turn instance with HistoryService in useGeminiStream and passes it to useReactToolScheduler. This completes the UI-HistoryService connection with NO optional paths, NO compatibility modes, and NO feature flags.

## The Problem

useGeminiStream doesn't create or provide a Turn instance to useReactToolScheduler, so the tool execution pipeline cannot notify HistoryService about completions.

## Implementation Tasks

### EXACT CHANGES REQUIRED

#### File: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/cli/src/ui/hooks/useGeminiStream.ts`

### 1. Add imports (after line 30)

```typescript
import { Turn, HistoryService } from '@llxprt/llxprt-code-core';
```

### 2. Create HistoryService and Turn instances (after line 167, before useReactToolScheduler)

```typescript
// Create HistoryService instance
const historyService = useMemo(() => {
  return new HistoryService(`ui_session_${Date.now()}`);
}, []);

// Create Turn instance with HistoryService
const turn = useMemo(() => {
  // Note: We don't need the actual chat instance for tool tracking
  // Turn only uses it for streaming, not for tool execution
  const newTurn = new Turn(
    {} as any, // Minimal stub - UI doesn't use chat for tool tracking
    config.getSessionId(),
    'ui', // Provider name for UI context
    historyService,
    {
      conversationId: `ui_conv_${config.getSessionId()}`,
      messageId: `ui_msg_${Date.now()}`,
    }
  );
  return newTurn;
}, [config, historyService]);
```

### 3. Update useReactToolScheduler call (line 169-192)

**OLD:**
```typescript
const [toolCalls, scheduleToolCalls, markToolsAsSubmitted] =
  useReactToolScheduler(
    async (completedToolCallsFromScheduler) => {
      // ... existing callback code ...
    },
    config,
    setPendingHistoryItem,
    getPreferredEditor,
    onEditorClose,
  );
```

**NEW:**
```typescript
const [toolCalls, scheduleToolCalls, markToolsAsSubmitted] =
  useReactToolScheduler(
    async (completedToolCallsFromScheduler) => {
      // ... existing callback code ...
    },
    config,
    setPendingHistoryItem,
    getPreferredEditor,
    onEditorClose,
    turn,  // PASS THE TURN INSTANCE HERE
  );
```

### 4. OPTIONAL: If geminiClient exposes chat, use it instead

If `geminiClient` has a `getChat()` method, replace the Turn creation in step 2 with:

```typescript
// Create Turn instance with actual chat
const turn = useMemo(() => {
  const chat = geminiClient.getChat ? geminiClient.getChat() : {} as any;
  const newTurn = new Turn(
    chat,
    config.getSessionId(),
    'gemini',
    historyService,
    {
      conversationId: `ui_conv_${config.getSessionId()}`,
      messageId: `ui_msg_${Date.now()}`,
    }
  );
  return newTurn;
}, [geminiClient, config, historyService]);
```

## Success Criteria

1. **Imports added**: Turn and HistoryService are imported from core
2. **HistoryService created**: A HistoryService instance is created with useMemo
3. **Turn created**: A Turn instance is created with the HistoryService
4. **Turn passed**: Turn is passed to useReactToolScheduler
5. **No compatibility code**: NO checks for "if turn exists" or "if historyService exists"
6. **TypeScript compilation**: The code compiles without errors

## Validation

```bash
# Check imports are added
grep "import.*Turn.*HistoryService.*from.*core" packages/cli/src/ui/hooks/useGeminiStream.ts

# Check HistoryService is created
grep -A 3 "new HistoryService" packages/cli/src/ui/hooks/useGeminiStream.ts

# Check Turn is created with HistoryService
grep -A 10 "new Turn" packages/cli/src/ui/hooks/useGeminiStream.ts | grep "historyService"

# Check Turn is passed to useReactToolScheduler
grep -A 10 "useReactToolScheduler(" packages/cli/src/ui/hooks/useGeminiStream.ts | grep "turn,"

# Verify TypeScript compilation
cd packages/cli && npm run typecheck
```

## CRITICAL REQUIREMENTS

- **NO** optional parameters - Turn is ALWAYS created
- **NO** backward compatibility checks
- **NO** feature flags or alternate modes
- **NO** "if (historyService)" checks anywhere
- HistoryService is ALWAYS created and used
- Turn is ALWAYS created with HistoryService

## Data Flow After Implementation

1. Tool request comes from Gemini stream
2. useGeminiStream passes Turn to useReactToolScheduler
3. useReactToolScheduler passes Turn to CoreToolScheduler
4. CoreToolScheduler executes tool and calls `turn.handleToolExecutionComplete()`
5. Turn calls `historyService.commitToolResponses()`
6. HistoryService tracks the tool completion
7. No orphaned tools, no duplicate responses

## Notes

This completes the UI-HistoryService wiring. The Turn instance doesn't need a real chat object for tool tracking - it only needs HistoryService to record completions. This is a ~10 minute implementation that connects the existing infrastructure.