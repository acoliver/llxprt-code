# Phase 03: Settings Schema Stub

## Phase ID

`PLAN-20250823-LOOPDETSET.P03`

## Prerequisites

- Required: Phase 02a completed
- Verification: `grep -r "@plan:PLAN-20250823-LOOPDETSET.P02" . || test -f project-plans/loopdetset/.completed/P02a-verification.md`

## Implementation Tasks

### Files to Modify

- `packages/core/src/types/modelParams.ts`
  - Line: Add to Profile interface
  - ADD: `loopDetectionEnabled?: boolean;`
  - ADD comment: `@plan:PLAN-20250823-LOOPDETSET.P03`
  - Implements: `@requirement:REQ-001.1`
  - Pseudocode reference: lines 120-127

- `packages/core/src/settings/types.ts` (or equivalent global settings file)
  - ADD: `loopDetectionEnabled?: boolean;` to settings interface
  - ADD comment: `@plan:PLAN-20250823-LOOPDETSET.P03`
  - Implements: `@requirement:REQ-001.2`
  - Pseudocode reference: lines 130-133

### Required Code Markers

```typescript
/**
 * @plan PLAN-20250823-LOOPDETSET.P03
 * @requirement REQ-001.1
 * @pseudocode lines 120-127
 */
loopDetectionEnabled?: boolean;
```

### Stub Requirements

1. Add optional fields only - no logic
2. Fields can be undefined (optional)
3. Must compile with strict TypeScript
4. No implementation logic yet

## Verification Commands

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-LOOPDETSET.P03" packages/core/src/types/ | wc -l
# Expected: 1+ occurrences

# Check field added
grep -q "loopDetectionEnabled.*boolean" packages/core/src/types/modelParams.ts || exit 1

# TypeScript compiles
npm run typecheck || exit 1
```

## Success Criteria

- Schema fields added as optional
- TypeScript compiles without errors
- Plan markers in place
- No logic implementation

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P03.md`