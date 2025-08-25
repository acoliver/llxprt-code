# Phase 09: Settings Applier Stub

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P09`

## Prerequisites
- Required: Phase 08 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P08" .`
- Expected files from previous phase:
  - `packages/core/src/providers/ProviderAliasResolver.ts`
  - Updated `packages/core/src/providers/ProviderManager.ts`

## Purpose
Create stub implementations for applying alias settings functionality to enable testing.

## Implementation Tasks

### Files to Create
- `packages/core/src/providers/ProviderAliasSettingsApplier.ts` - Service for applying settings from aliases
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P09`
  - MUST include: `@requirement:REQ-005`
  - Stub method for applyAliasSettings()
  - Reference pseudocode lines 1-18 from settings-applier.md

### Files to Modify
- `packages/core/src/providers/ProviderManager.ts`
  - Add integration for settings applier functionality
  - ADD comment: `@plan:PLAN-20250823-PROVIDERALIAS.P09`
  - Implements: `@requirement:REQ-005`

## Required Code Markers
Every function/class/test created in this phase MUST include:
```typescript
/**
 * @plan PLAN-20250823-PROVIDERALIAS.P09
 * @requirement REQ-XXX
 * @pseudocode lines X-Y from settings-applier.md
 */
```

## Verification Commands

### Automated Checks
```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P09" . | wc -l
# Expected: 2+ occurrences

# Check TypeScript compiles
npx tsc --noEmit
# Expected: No errors

# Check unit tests still fail naturally (not with NotYetImplemented)
npm test -- --grep "alias settings" 2>&1 | grep -E "(Cannot read|is not a function|Cannot find)"
# Expected: Test failures with natural error messages
```

### Manual Verification Checklist
- [ ] ProviderAliasSettingsApplier file created with minimal stub implementation
- [ ] ProviderManager updated with settings applier integration points
- [ ] Pseudocode from settings-applier.md clearly referenced
- [ ] No reverse testing patterns found
- [ ] No TODO comments in production code

## Success Criteria
- Compilation succeeds with strict TypeScript
- Stub implementation follows pseudocode structure
- ProviderManager properly integrates settings applier functionality
- Tests fail naturally when calling stub methods

## Failure Recovery
If this phase fails:
1. `git checkout -- packages/core/src/providers/`
2. Re-implement stub files with proper plan markers
3. Cannot proceed to Phase 10 until stubs compile and are integrated

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P09.md`
Contents will include:
- Files created with line counts
- Files modified with diff stats
- Verification output