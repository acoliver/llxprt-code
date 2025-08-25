# Phase 06: Alias Resolver Stub

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P06`

## Prerequisites
- Required: Phase 05 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P05" .`
- Expected files from previous phase:
  - Updated `packages/core/src/providers/AliasLoader.ts`
  - Updated `packages/core/src/providers/ProviderManager.ts` with alias registry field

## Purpose
Create stub implementations for alias resolution functionality to enable testing.

## Implementation Tasks

### Files to Create
- `packages/core/src/providers/ProviderAliasResolver.ts` - Service for resolving alias names to providers
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P06`
  - MUST include: `@requirement:REQ-003`
  - Stub methods for isAlias() and resolveProvider()
  - Reference pseudocode lines 1-11 from alias-resolver.md

### Files to Modify
- `packages/core/src/providers/ProviderManager.ts`
  - Line 30: Add import for ProviderAliasResolver
  - Line 100: Add alias resolution methods to provider manager interface
  - ADD comment: `@plan:PLAN-20250823-PROVIDERALIAS.P06`
  - Implements: `@requirement:REQ-003`

## Required Code Markers
Every function/class/test created in this phase MUST include:
```typescript
/**
 * @plan PLAN-20250823-PROVIDERALIAS.P06
 * @requirement REQ-XXX
 * @pseudocode lines X-Y from alias-resolver.md
 */
```

## Verification Commands

### Automated Checks
```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P06" . | wc -l
# Expected: 2+ occurrences

# Check TypeScript compiles
npx tsc --noEmit
# Expected: No errors

# Check unit tests still fail naturally (not with NotYetImplemented)
npm test -- --grep "alias resolver" 2>&1 | grep -E "(Cannot read|is not a function|Cannot find)"
# Expected: Test failures with natural error messages
```

### Manual Verification Checklist
- [ ] ProviderAliasResolver file created with minimal stub implementation
- [ ] ProviderManager updated with alias resolution integration points
- [ ] Pseudocode from alias-resolver.md clearly referenced
- [ ] No reverse testing patterns found
- [ ] No TODO comments in production code

## Success Criteria
- Compilation succeeds with strict TypeScript
- Stub implementation follows pseudocode structure
- ProviderManager properly integrates alias resolution functionality
- Tests fail naturally when calling stub methods

## Failure Recovery
If this phase fails:
1. `git checkout -- packages/core/src/providers/`
2. Re-implement stub files with proper plan markers
3. Cannot proceed to Phase 07 until stubs compile and are integrated

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P06.md`
Contents will include:
- Files created with line counts
- Files modified with diff stats
- Verification output