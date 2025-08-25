# Phase 12: CLI Command Integration Stub

## Phase ID

`PLAN-20250823-LOOPDETSET.P12`

## Prerequisites

- Required: Phase 11 completed
- Verification: `npm test -- loopDetectionService.settings.spec` (all pass)

## Implementation Tasks

### Files to Modify

- `packages/cli/src/ui/commands/setCommand.ts`
  - ADD handler for 'loop-detection-enabled' setting
  - ADD comment: `@plan:PLAN-20250823-LOOPDETSET.P12`
  - Implements: `@requirement:REQ-004`
  - Pseudocode reference: lines 60-115

### Stub Implementation

```typescript
// In the settings handlers object or switch statement:
/**
 * @plan PLAN-20250823-LOOPDETSET.P12
 * @requirement REQ-004
 * @pseudocode lines 60-115
 */
'loop-detection-enabled': async (value: string, context: CommandContext) => {
  // Stub: always return success for now
  return {
    type: 'message',
    messageType: 'success',
    content: 'Loop detection setting updated (stub)'
  };
}
```

### Integration Points

1. Add to existing set command handlers
2. Must handle true/false values
3. Must update current profile
4. Must provide user feedback

### Command Format

```
/set loop-detection-enabled true
/set loop-detection-enabled false
```

## Verification Commands

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-LOOPDETSET.P12" packages/cli/src/ui/commands/ | wc -l
# Expected: 1+ occurrences

# Check handler added
grep -q "loop-detection-enabled" packages/cli/src/ui/commands/setCommand.ts || exit 1

# TypeScript compiles
npm run typecheck || exit 1
```

## Success Criteria

- Handler stub created
- Returns success message
- TypeScript compiles
- Plan markers in place

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P12.md`