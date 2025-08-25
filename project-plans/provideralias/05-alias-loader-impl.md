# Phase 05: Alias Loader Implementation

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P05`

## Prerequisites
- Required: Phase 04 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P04" .`
- Expected files from previous phase:
  - `packages/core/src/providers/test/ProviderAliasSchema.test.ts`
  - `packages/core/src/providers/test/AliasLoader.test.ts`

## Purpose
Implement the alias loader functionality to make all tests pass, following the pseudocode from phase 02.

## Implementation Tasks

### Files to Modify
- `packages/core/src/providers/AliasLoader.ts`
  - Line 15: Replace stub implementation with full functionality to load aliases
  - ADD comment: `@plan:PLAN-20250823-PROVIDERALIAS.P05`
  - Implements: `@requirement:REQ-002`
  - Reference pseudocode lines 1-18 from alias-loader.md

- `packages/core/src/providers/test/AliasLoader.test.ts`
  - Add comprehensive tests for alias loading functionality
  - ADD comment: `@plan:PLAN-20250823-PROVIDERALIAS.P05`
  - Implements: `@requirement:REQ-002`

### Required Implementation Components
Every implementation must reference specific pseudocode lines:

1. Reference pseudocode line 1: Create loadProviderAliases function
2. Reference pseudocode line 2: Initialize empty aliasRegistry map
3. Reference pseudocode lines 3-7: Implement loading of pre-configured aliases
4. Reference pseudocode lines 8-18: Implement loading and conflict resolution of user aliases

## Implementation Details

### Loading Pre-configured Aliases (pseudocode lines 3-7)
1. Read the pre-configured aliases directory from the CLI package
2. Iterate through each file in the directory
3. Parse JSON file into alias configuration object
4. Validate configuration against ProviderAliasSchema
5. Add to aliasRegistry with name as key

### Loading User Aliases with Conflict Resolution (pseudocode lines 8-18)
1. Attempt to read the user aliases directory at ~/.llxprt/provideraliases/
2. If directory exists, iterate through each file
3. Try to parse each JSON file
4. Validate configurations against ProviderAliasSchema
5. When validation passes, add to aliasRegistry (may overwrite pre-configured aliases)
6. Log a warning in debug mode when user aliases override pre-configured ones

## Verification Commands

### Automated Checks
```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P05" . | wc -l
# Expected: 4+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-002" packages/core/src/providers/ | wc -l
# Expected: 3+ occurrences

# Run all alias loader tests - should pass
npm test packages/core/src/providers/test/AliasLoader.test.ts
# Expected: All tests pass

# Run ProviderAliasSchema tests - should pass
npm test packages/core/src/providers/test/ProviderAliasSchema.test.ts
# Expected: All tests pass
```

### Manual Verification Checklist
- [ ] AliasLoader.ts file updated with full implementation
- [ ] All tests in AliasLoader.test.ts updated with complete scenarios
- [ ] Implementation follows pseudocode exactly
- [ ] ProviderAliasSchema.test.ts tests all pass
- [ ] User aliases properly override pre-configured ones
- [ ] No TODO comments or stub implementations remain

## Success Criteria
- All alias loader tests pass
- All ProviderAliasSchema tests pass
- Implementation follows pseudocode line by line
- No test modifications made during this phase
- User aliases properly override pre-configured aliases while logging warning

## Failure Recovery
If this phase fails:
1. Re-read pseudocode and requirements
2. Fix implementation to properly follow pseudocode steps
3. Ensure all validation is handled correctly
4. Cannot proceed to Phase 06 until tests pass

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P05.md`
Contents will include:
- Files modified with diff size
- Tests executed with pass/fail status
- Verification that no test files were modified