# Phase 30d: Wire Turn into useReactToolScheduler

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P30d  
**Prerequisites:** Phase 30c passed  
**Status:** Not Started  
**Type:** CRITICAL FIX - UI Integration

## Overview

This phase fixes the missing connection between the UI layer and HistoryService by wiring Turn into useReactToolScheduler. This is a surgical fix with NO optional paths, NO compatibility modes, and NO feature flags.

## The Problem

CoreToolScheduler in the UI doesn't receive a Turn instance, so tool completions don't notify HistoryService. This causes orphaned tool calls and potential duplicate responses.

## Implementation Tasks

### EXACT CHANGES REQUIRED

#### File: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/cli/src/ui/hooks/useReactToolScheduler.ts`

### 1. Add Turn import (after line 22)

```typescript
import { Turn } from '@llxprt/llxprt-code-core';
```

### 2. Change function signature (line 65-73)

**OLD:**
```typescript
export function useReactToolScheduler(
  onComplete: (tools: CompletedToolCall[]) => void,
  config: Config,
  setPendingHistoryItem: React.Dispatch<
    React.SetStateAction<HistoryItemWithoutId | null>
  >,
  getPreferredEditor: () => EditorType | undefined,
  onEditorClose: () => void,
): [TrackedToolCall[], ScheduleFn, MarkToolsAsSubmittedFn] {
```

**NEW:**
```typescript
export function useReactToolScheduler(
  onComplete: (tools: CompletedToolCall[]) => void,
  config: Config,
  setPendingHistoryItem: React.Dispatch<
    React.SetStateAction<HistoryItemWithoutId | null>
  >,
  getPreferredEditor: () => EditorType | undefined,
  onEditorClose: () => void,
  turn: Turn,  // REQUIRED - not optional
): [TrackedToolCall[], ScheduleFn, MarkToolsAsSubmittedFn] {
```

### 3. Pass Turn to CoreToolScheduler (line 139-148)

**OLD:**
```typescript
const scheduler = useMemo(
  () =>
    new CoreToolScheduler({
      toolRegistry: config.getToolRegistry(),
      outputUpdateHandler,
      onAllToolCallsComplete: allToolCallsCompleteHandler,
      onToolCallsUpdate: toolCallsUpdateHandler,
      getPreferredEditor,
      config,
      onEditorClose,
    }),
```

**NEW:**
```typescript
const scheduler = useMemo(
  () =>
    new CoreToolScheduler({
      toolRegistry: config.getToolRegistry(),
      outputUpdateHandler,
      onAllToolCallsComplete: allToolCallsCompleteHandler,
      onToolCallsUpdate: toolCallsUpdateHandler,
      getPreferredEditor,
      config,
      onEditorClose,
      turn,  // PASS THE TURN HERE
    }),
```

### 4. Add turn to useMemo dependencies (line 149-156)

**OLD:**
```typescript
  [
    config,
    outputUpdateHandler,
    allToolCallsCompleteHandler,
    toolCallsUpdateHandler,
    getPreferredEditor,
    onEditorClose,
  ],
```

**NEW:**
```typescript
  [
    config,
    outputUpdateHandler,
    allToolCallsCompleteHandler,
    toolCallsUpdateHandler,
    getPreferredEditor,
    onEditorClose,
    turn,  // ADD TO DEPENDENCIES
  ],
```

## Success Criteria

1. **Function signature requires Turn**: The `turn: Turn` parameter is NOT optional
2. **Turn is imported**: Import statement exists for Turn from core
3. **Turn passed to CoreToolScheduler**: The turn parameter is in the constructor options
4. **Dependencies updated**: Turn is in the useMemo dependency array
5. **No compatibility code**: NO checks for "if turn exists"
6. **TypeScript compilation**: The code compiles without errors

## Validation

```bash
# Check the function signature requires Turn
grep -A 5 "export function useReactToolScheduler" packages/cli/src/ui/hooks/useReactToolScheduler.ts | grep "turn: Turn"

# Check Turn is imported
grep "import.*Turn.*from.*core" packages/cli/src/ui/hooks/useReactToolScheduler.ts

# Check Turn is passed to CoreToolScheduler
grep -A 10 "new CoreToolScheduler" packages/cli/src/ui/hooks/useReactToolScheduler.ts | grep "turn,"

# Verify TypeScript compilation
cd packages/cli && npm run typecheck
```

## CRITICAL REQUIREMENTS

- **NO** optional parameters - Turn is REQUIRED
- **NO** backward compatibility checks
- **NO** feature flags or alternate modes
- **NO** "if (turn)" checks anywhere
- The system should FAIL TO COMPILE if Turn is not provided

## Notes

This is a surgical fix that takes ~5 minutes to implement. The infrastructure already exists in CoreToolScheduler to use Turn - we're just passing it through from the UI layer.