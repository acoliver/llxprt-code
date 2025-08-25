# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 15: Anthropic Provider Stub

## Phase ID

`PLAN-20250823-UNIFICATION.P15`

## Prerequisites

- Required: Phase 14 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P14" packages/core/src/providers/openai/`
- Expected files from previous phase:
  - `packages/core/src/providers/openai/OpenAIProvider.ts` (with unified implementation)

## Implementation Tasks

### Files to Create

- `packages/core/src/providers/anthropic/AnthropicAdapter.ts` - Provider adapter for Anthropic format conversion
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P15`
  - MUST include: `@requirement:REQ-001.4`
  - MUST include: `@requirement:REQ-002.2`

### Files to Modify

- `packages/core/src/providers/anthropic/AnthropicProvider.ts`
  - Remove local validateAndFixMessages implementation
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P15`
  - Implements: `@requirement:REQ-003.1`
  - Line [reference]: Replace validateAndFixMessages with ToolCallTrackerService
  - Line [reference]: Update setModel to use ConversationManager
  - Line [reference]: Update getCurrentModel to use ConversationManager
  - Line [reference]: Update clearState to preserve conversation context

- `packages/core/src/providers/anthropic/index.ts`
  - Line 1: Export AnthropicAdapter
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P15`
  - Implements: `@requirement:REQ-001.4`

## Required Code Markers

Every function/class created or modified in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P15
 * @requirement REQ-XXX
 * @pseudocode lines X-Y (from provider-adapter-pseudocode.md)
 */
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P15" packages/core/src/providers/anthropic/ | wc -l
# Expected: 3+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-3]" packages/core/src/providers/anthropic/ | wc -l
# Expected: 3+ occurrences

# Check for TypeScript compilation errors
npm run typecheck
# Expected: No compilation errors (stub implementations allowed)
```

### Manual Verification Checklist

- [ ] Phase 14 markers present (OpenAI implementation)
- [ ] AnthropicAdapter.ts file created with proper plan markers
- [ ] AnthropicProvider.ts file modified to remove local conversation implementation
- [ ] All stub methods can throw "NotYetImplemented" or return appropriate empty values
- [ ] Index file exports new AnthropicAdapter
- [ ] TypeScript compiles without errors

## Success Criteria

- Anthropic adapter for format conversion created
- AnthropicProvider modified to remove local conversation management
- TypeScript compiles without errors
- Proper plan/requirement markers in place

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/providers/anthropic/AnthropicAdapter.ts
   git checkout -- packages/core/src/providers/anthropic/AnthropicProvider.ts
   git checkout -- packages/core/src/providers/anthropic/index.ts
   ```
2. Files to revert: Anthropic provider files
3. Cannot proceed to Phase 16 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P15.md`
Contents:

```markdown
Phase: P15
Completed: 2025-08-23
Files Created: 
- packages/core/src/providers/anthropic/AnthropicAdapter.ts
Files Modified: 
- packages/core/src/providers/anthropic/AnthropicProvider.ts
- packages/core/src/providers/anthropic/index.ts
Tests Added: 0
Verification: [paste of verification command outputs]
```