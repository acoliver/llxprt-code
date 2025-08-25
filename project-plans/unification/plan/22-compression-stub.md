# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 22: Compression Integration Stub

## Phase ID

`PLAN-20250823-UNIFICATION.P22`

## Prerequisites

- Required: Phase 21 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P21" packages/core/src/`
- Expected files from previous phase:
  - `packages/core/src/conversation/ConversationManager.integration.test.ts`
  - `packages/core/src/tools/ToolCallTrackerService.integration.test.ts`

## Implementation Tasks

### Files to Create

- `packages/core/src/conversation/CompressionIntegration.ts` - Integration layer for conversation compression
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P22`
  - MUST include: `@requirement:REQ-001.3`
  - MUST include: `@requirement:REQ-003.4`

### Files to Modify

- `packages/core/src/conversation/ConversationManager.ts`
  - Line [reference]: Add integration hooks for compression service
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P22`
  - Implements: `@requirement:REQ-001.3`

- `packages/core/src/conversation/index.ts`
  - Line 1: Export CompressionIntegration
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P22`
  - Implements: `@requirement:REQ-001.3`

## Required Code Markers

Every function/class created or modified in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P22
 * @requirement REQ-XXX
 * @pseudocode lines X-Y (from conversation-manager-pseudocode.md)
 */
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P22" packages/core/src/conversation/ | wc -l
# Expected: 3+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-4]" packages/core/src/conversation/ | wc -l
# Expected: 2+ occurrences

# Check for TypeScript compilation errors
npm run typecheck
# Expected: No compilation errors (stub implementations allowed)
```

### Manual Verification Checklist

- [ ] Phase 21 markers present (integration verification tests)
- [ ] CompressionIntegration.ts file created with proper plan markers
- [ ] ConversationManager.ts file modified with stub compression integration
- [ ] All stub methods can throw "NotYetImplemented" or return appropriate empty values
- [ ] Index file exports new CompressionIntegration
- [ ] TypeScript compiles without errors

## Success Criteria

- Compression integration layer created
- ConversationManager modified with stub compression integration
- TypeScript compiles without errors
- Proper plan/requirement markers in place

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/conversation/CompressionIntegration.ts
   git checkout -- packages/core/src/conversation/ConversationManager.ts
   git checkout -- packages/core/src/conversation/index.ts
   ```
2. Files to revert: Conversation compression integration files
3. Cannot proceed to Phase 23 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P22.md`
Contents:

```markdown
Phase: P22
Completed: 2025-08-23
Files Created: 
- packages/core/src/conversation/CompressionIntegration.ts
Files Modified: 
- packages/core/src/conversation/ConversationManager.ts
- packages/core/src/conversation/index.ts
Tests Added: 0
Verification: [paste of verification command outputs]
```