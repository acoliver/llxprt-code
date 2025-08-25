# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 18: Gemini Provider Stub

## Phase ID

`PLAN-20250823-UNIFICATION.P18`

## Prerequisites

- Required: Phase 17 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P17" packages/core/src/providers/anthropic/`
- Expected files from previous phase:
  - `packages/core/src/providers/anthropic/AnthropicProvider.ts` (with unified implementation)

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/gemini/GeminiProvider.ts`
  - Update to use ConversationManager for conversation persistence
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P18`
  - Implements: `@requirement:REQ-003.1`
  - Line [reference]: Replace local tool call tracking with ToolCallTrackerService
  - Line [reference]: Replace direct SettingsService calls with ConversationManager
  - Line [reference]: Update clearState to preserve conversation context

- `packages/core/src/providers/gemini/index.ts`
  - Line 1: Export GeminiAdapter (if needed)
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P18`
  - Implements: `@requirement:REQ-001.4`

## Required Code Markers

Every function/class modified in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P18
 * @requirement REQ-XXX
 * @pseudocode lines X-Y (from provider-adapter-pseudocode.md)
 */
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P18" packages/core/src/providers/gemini/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-3]" packages/core/src/providers/gemini/ | wc -l
# Expected: 2+ occurrences

# Check for TypeScript compilation errors
npm run typecheck
# Expected: No compilation errors (stub implementations allowed)
```

### Manual Verification Checklist

- [ ] Phase 17 markers present (Anthropic implementation)
- [ ] GeminiProvider.ts file modified for unified conversation integration
- [ ] All stub methods can throw "NotYetImplemented" or return appropriate empty values
- [ ] Index file updated with proper exports
- [ ] TypeScript compiles without errors

## Success Criteria

- Gemini provider modified to integrate with unified conversation system
- TypeScript compiles without errors
- Proper plan/requirement markers in place

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   git checkout -- packages/core/src/providers/gemini/GeminiProvider.ts
   git checkout -- packages/core/src/providers/gemini/index.ts
   ```
2. Files to revert: Gemini provider files
3. Cannot proceed to Phase 19 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P18.md`
Contents:

```markdown
Phase: P18
Completed: 2025-08-23
Files Created: 
Files Modified: 
- packages/core/src/providers/gemini/GeminiProvider.ts
- packages/core/src/providers/gemini/index.ts
Tests Added: 0
Verification: [paste of verification command outputs]
```