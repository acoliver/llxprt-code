# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 12: OpenAI Provider Stub

## Phase ID

`PLAN-20250823-UNIFICATION.P12`

## Prerequisites

- Required: Phase 11 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P11" packages/core/src/providers/`
- Expected files from previous phase:
  - `packages/core/src/providers/ProviderManager.ts` (with full implementation)

## Implementation Tasks

### Files to Create

- `packages/core/src/providers/openai/OpenAIAdapter.ts` - Provider adapter for OpenAI format conversion
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P12`
  - MUST include: `@requirement:REQ-001.4`
  - MUST include: `@requirement:REQ-002.2`

### Files to Modify

- `packages/core/src/providers/openai/OpenAIProvider.ts`
  - Remove local conversation cache implementation
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P12`
  - Implements: `@requirement:REQ-003.1`
  - Line [reference]: Remove ConversationCache property
  - Line [reference]: Replace estimateContextUsage with calls to ConversationManager
  - Line [reference]: Replace SyntheticToolResponseHandler with ToolCallTrackerService
  - Line [reference]: Update setModel to use ConversationManager
  - Line [reference]: Update getCurrentModel to use ConversationManager
  - Line [reference]: Update clearState to preserve conversation context

- `packages/core/src/providers/openai/index.ts`
  - Line 1: Export OpenAIAdapter
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P12`
  - Implements: `@requirement:REQ-001.4`

## Required Code Markers

Every function/class created or modified in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P12
 * @requirement REQ-XXX
 * @pseudocode lines X-Y (from provider-adapter-pseudocode.md)
 */
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P12" packages/core/src/providers/openai/ | wc -l
# Expected: 3+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-3]" packages/core/src/providers/openai/ | wc -l
# Expected: 3+ occurrences

# Check for TypeScript compilation errors
npm run typecheck
# Expected: No compilation errors (stub implementations allowed)
```

### Manual Verification Checklist

- [ ] Phase 11 markers present (ProviderManager implementation)
- [ ] OpenAIAdapter.ts file created with proper plan markers
- [ ] OpenAIProvider.ts file modified to remove local conversation implementation
- [ ] All stub methods can throw "NotYetImplemented" or return appropriate empty values
- [ ] Index file exports new OpenAIAdapter
- [ ] TypeScript compiles without errors

## Success Criteria

- OpenAI adapter for format conversion created
- OpenAIProvider modified to remove local conversation management
- TypeScript compiles without errors
- Proper plan/requirement markers in place

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/providers/openai/OpenAIAdapter.ts
   git checkout -- packages/core/src/providers/openai/OpenAIProvider.ts
   git checkout -- packages/core/src/providers/openai/index.ts
   ```
2. Files to revert: OpenAI provider files
3. Cannot proceed to Phase 13 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P12.md`
Contents:

```markdown
Phase: P12
Completed: 2025-08-23
Files Created: 
- packages/core/src/providers/openai/OpenAIAdapter.ts
Files Modified: 
- packages/core/src/providers/openai/OpenAIProvider.ts
- packages/core/src/providers/openai/index.ts
Tests Added: 0
Verification: [paste of verification command outputs]
```