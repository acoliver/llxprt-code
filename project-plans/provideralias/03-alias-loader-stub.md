# Phase 03: Alias Loader Stub Implementation

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P03`

## Prerequisites
- Required: Phase 02 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P02" project-plans/provideralias/pseudocode/`
- Expected files from previous phase:
  - `project-plans/provideralias/pseudocode/alias-loader.md`

## Purpose
Create a minimal stub implementation for loading provider aliases from both pre-configured 
and user directories, following the pseudocode in `alias-loader.md`.

## Implementation Tasks

### Files to Create
- `packages/core/src/providers/ProviderAliasSchema.ts` - Zod schema for validating alias configurations
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P03`
  - MUST include: `@requirement:REQ-007.1`

- `packages/core/src/providers/AliasLoader.ts` - Service for loading aliases from file system
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P03`
  - MUST include: `@requirement:REQ-002`

### Files to Modify
- `packages/core/src/providers/ProviderManager.ts`
  - Line 1: Add import for alias loading functionality
  - Line 2: Add alias registry initialization during provider manager setup
  - ADD comment: `@plan:PLAN-20250823-PROVIDERALIAS.P03`
  - Implements: `@requirement:REQ-003.1`

## Required Code Markers
Every function/class/test created in this phase MUST include:
```typescript
/**
 * @plan PLAN-20250823-PROVIDERALIAS.P03
 * @requirement REQ-XXX
 * @pseudocode lines 1-18 from alias-loader.md
 */
```

## Verification Commands

### Automated Checks
```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P03" . | wc -l
# Expected: 3+ occurrences

# Check TypeScript compiles
npx tsc --noEmit
# Expected: No errors

# Check unit tests still fail naturally (not with NotYetImplemented)
npm test -- --grep "alias loader" 2>&1 | grep -E "(Cannot read|is not a function|Cannot find)"
# Expected: Test failures with natural error messages, not stub exceptions
```

### Manual Verification Checklist
- [ ] Pseudocode file exists at `project-plans/provideralias/pseudocode/alias-loader.md`
- [ ] All lines numbered 1-18 in pseudocode file
- [ ] ProviderAliasSchema file created with Zod validation
- [ ] AliasLoader file created implementing basic functionality
- [ ] ProviderManager updated with alias loading integration
- [ ] No TODO or placeholder comments in production code
- [ ] No reverse testing in any new test files

## Success Criteria
- Compilation succeeds with strict TypeScript
- Tests fail naturally when calling stub methods
- ProviderAliasSchema provides basic structure validation
- AliasLoader provides skeleton for loading aliases
- ProviderManager integrates with alias loading

## Failure Recovery
If this phase fails:
1. `git checkout -- packages/core/src/providers/`
2. Re-implement stub files with proper plan markers
3. Cannot proceed to Phase 04 until all stubs compile and are integrated

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P03.md`
Contents will include:
- Files created with line counts
- Files modified with diff stats
- Tests added
- Verification output