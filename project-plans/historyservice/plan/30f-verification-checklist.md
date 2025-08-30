# Phase 30f: Verification Checklist for UI-HistoryService Integration

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P30f  
**Prerequisites:** Phase 30d and 30e completed  
**Status:** Not Started  
**Type:** VERIFICATION - Automated Checks

## Overview

This phase provides a mechanical checklist to verify that Phase 30d and 30e were implemented correctly and that tool completions properly reach HistoryService through the UI layer.

## Section 1: Static Code Verification

### 1.1 Verify Turn Integration in useReactToolScheduler

```bash
# Check 1: Turn is imported
grep "import.*Turn.*from.*[@'].*core" packages/cli/src/ui/hooks/useReactToolScheduler.ts
# EXPECTED: Line with "import { Turn } from"

# Check 2: Function signature includes Turn parameter (not optional)
grep -A 7 "export function useReactToolScheduler" packages/cli/src/ui/hooks/useReactToolScheduler.ts | grep "turn: Turn,"
# EXPECTED: Line with "turn: Turn," (no question mark)

# Check 3: Turn is passed to CoreToolScheduler
grep -A 12 "new CoreToolScheduler" packages/cli/src/ui/hooks/useReactToolScheduler.ts | grep "turn,"
# EXPECTED: Line with "turn," in constructor options

# Check 4: Turn is in useMemo dependencies
grep -A 10 "onEditorClose," packages/cli/src/ui/hooks/useReactToolScheduler.ts | grep "turn,"
# EXPECTED: Line with "turn," in dependency array
```

### 1.2 Verify Turn Creation in useGeminiStream

```bash
# Check 5: Turn and HistoryService are imported
grep "import.*Turn.*HistoryService.*from.*[@'].*core" packages/cli/src/ui/hooks/useGeminiStream.ts
# EXPECTED: Line with both Turn and HistoryService imports

# Check 6: HistoryService is created
grep "new HistoryService" packages/cli/src/ui/hooks/useGeminiStream.ts
# EXPECTED: Line creating new HistoryService instance

# Check 7: Turn is created with HistoryService
grep -A 8 "new Turn" packages/cli/src/ui/hooks/useGeminiStream.ts | grep "historyService"
# EXPECTED: Line passing historyService to Turn constructor

# Check 8: Turn is passed to useReactToolScheduler
grep -B 5 -A 10 "useReactToolScheduler" packages/cli/src/ui/hooks/useGeminiStream.ts | grep "turn,"
# EXPECTED: Line with "turn," as parameter
```

### 1.3 Verify CoreToolScheduler Integration

```bash
# Check 9: CoreToolScheduler has turn property
grep "private turn\?:" packages/core/src/core/coreToolScheduler.ts
# EXPECTED: Line with "private turn?: Turn"

# Check 10: CoreToolScheduler calls handleToolExecutionComplete
grep "this\.turn\.handleToolExecutionComplete" packages/core/src/core/coreToolScheduler.ts
# EXPECTED: Line calling turn.handleToolExecutionComplete

# Check 11: CoreToolScheduler calls handleToolExecutionError
grep "this\.turn\.handleToolExecutionError" packages/core/src/core/coreToolScheduler.ts
# EXPECTED: At least 2 lines calling turn.handleToolExecutionError
```

### 1.4 Verify Turn-HistoryService Methods

```bash
# Check 12: Turn has handleToolExecutionComplete method
grep "handleToolExecutionComplete" packages/core/src/core/turn.ts
# EXPECTED: Method definition for handleToolExecutionComplete

# Check 13: Turn has handleToolExecutionError method
grep "handleToolExecutionError" packages/core/src/core/turn.ts
# EXPECTED: Method definition for handleToolExecutionError

# Check 14: Turn methods call HistoryService
grep "this\.historyService\.commitToolResponses" packages/core/src/core/turn.ts
# EXPECTED: Line calling historyService.commitToolResponses
```

## Section 2: Type Checking Verification

```bash
# Check 15: Core package compiles
cd packages/core && npm run typecheck
# EXPECTED: Exit code 0, no type errors

# Check 16: CLI package compiles
cd packages/cli && npm run typecheck
# EXPECTED: Exit code 0, no type errors

# Check 17: Full project build succeeds
cd /Users/acoliver/projects/claude-llxprt/llxprt-code && npm run build
# EXPECTED: Build completes successfully
```

## Section 3: Runtime Verification

### 3.1 Test Tool Execution Flow

```bash
# Check 18: Kill any existing vitest processes
ps -ef | grep -i vitest | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

# Check 19: Run unit tests for Turn-HistoryService integration
cd packages/core && npm test -- --run turn.test.ts
# EXPECTED: All Turn tests pass, including handleToolExecutionComplete tests

# Check 20: Run CoreToolScheduler tests
cd packages/core && npm test -- --run coreToolScheduler.test.ts
# EXPECTED: All tests pass, including Turn integration tests
```

## Section 4: Integration Test Verification

```bash
# Check 21: Run HistoryService tests to verify in-memory tracking
cd packages/core && npm test -- --run services/history/__tests__/HistoryService.test.ts
# EXPECTED: All HistoryService tests pass

# Check 22: Run CLI tests
cd packages/cli && npm test -- --run
# EXPECTED: All tests pass

# Check 23: Kill any leftover test processes
ps -ef | grep -i vitest | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
# EXPECTED: Processes killed or no processes found
```

## Section 5: Anti-Pattern Search

```bash
# Check 24: No optional Turn parameters
grep -r "turn\?:" packages/cli/src/ui/hooks/ | grep -v "node_modules"
# EXPECTED: Empty result (Turn is never optional in UI)

# Check 25: No "if turn exists" checks in UI
grep -r "if.*turn" packages/cli/src/ui/hooks/ | grep -v "node_modules" | grep -v "return"
# EXPECTED: Empty or only legitimate uses

# Check 26: No backward compatibility modes
grep -r "compatibility\|backward\|legacy\|fallback" packages/cli/src/ui/hooks/useReactToolScheduler.ts packages/cli/src/ui/hooks/useGeminiStream.ts
# EXPECTED: Empty result

# Check 27: No feature flags for HistoryService
grep -r "feature.*flag\|enable.*history\|disable.*history" packages/cli/src/ui/hooks/
# EXPECTED: Empty result

# Check 28: No debug console.logs in modified files
grep "console\.\(log\|debug\|warn\|error\)" packages/cli/src/ui/hooks/useReactToolScheduler.ts packages/cli/src/ui/hooks/useGeminiStream.ts
# EXPECTED: Empty or only production error handling
```

## Summary Checklist

### Phase 30d Implementation
- [ ] Turn imported in useReactToolScheduler
- [ ] Turn parameter is REQUIRED (not optional)
- [ ] Turn passed to CoreToolScheduler
- [ ] Turn in useMemo dependencies

### Phase 30e Implementation
- [ ] Turn and HistoryService imported in useGeminiStream
- [ ] HistoryService instance created
- [ ] Turn instance created with HistoryService
- [ ] Turn passed to useReactToolScheduler

### Type Safety
- [ ] Core package compiles without errors
- [ ] CLI package compiles without errors
- [ ] Full project builds successfully

### Test Verification
- [ ] Turn tests pass (handleToolExecutionComplete works)
- [ ] CoreToolScheduler tests pass (Turn integration works)
- [ ] HistoryService tests pass (in-memory tracking works)
- [ ] CLI tests pass

### Code Quality
- [ ] No optional Turn parameters in UI
- [ ] No compatibility modes
- [ ] No feature flags
- [ ] No unnecessary debug code

## Success Criteria

All 28 checks must pass for the implementation to be considered complete and correct. If any check fails, the specific failure indicates what needs to be fixed.

## Failure Remediation

If checks fail:
1. Checks 1-14: Implementation incomplete - review Phase 30d/30e
2. Checks 15-17: Type errors - fix TypeScript issues
3. Checks 18-23: Test failures - fix broken tests
4. Checks 24-28: Anti-patterns present - remove compatibility code

## Notes

This verification can be run by an automated agent or manually. Each check has a specific command and expected output, making it mechanical to verify correctness.