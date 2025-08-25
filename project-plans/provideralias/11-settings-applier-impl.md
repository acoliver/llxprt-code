# Phase 11: Settings Applier Implementation

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P11`

## Prerequisites
- Required: Phase 10 completed
- Verification: `grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P10" .`
- Expected files from previous phase:
  - `packages/core/src/providers/test/ProviderAliasSettingsApplier.test.ts`

## Purpose
Implement the settings applier functionality to make all tests pass, following the pseudocode from phase 02.

## Implementation Tasks

### Files to Modify
- `packages/core/src/providers/ProviderAliasSettingsApplier.ts`
  - Line 15: Replace stub implementation for applyAliasSettings method
  - ADD comment: `@plan:PLAN-20250823-PROVIDERALIAS.P11`
  - Implements: `@requirement:REQ-005`
  - Reference pseudocode lines 1-18 from settings-applier.md

- `packages/core/src/providers/ProviderManager.ts`
  - Add settings applier functionality to provider switching logic
  - Reference pseudocode lines 1-18 from settings-applier.md
  - ADD comment: `@plan:PLAN-20250823-PROVIDERALIAS.P11`
  - Implements: `@requirement:REQ-005`

- `packages/core/src/providers/test/ProviderAliasSettingsApplier.test.ts`
  - Add comprehensive behavioral tests for settings application functionality
  - ADD comment: `@plan:PLAN-20250823-PROVIDERALIAS.P11`
  - Implements: `@requirement:REQ-005`

## Required Implementation Components
Every implementation must reference specific pseudocode lines:

1. Reference pseudocode line 1-3: Implement applyAliasSettings resolution step
2. Reference pseudocode line 4-6: Implement provider switching
3. Reference pseudocode line 7-10: Implement provider settings application
4. Reference pseudocode line 11-14: Implement ephemeral settings application
5. Reference pseudocode line 15-18: Implement model parameters application

## Implementation Details

### applyAliasSettings Resolution (pseudocode lines 1-3)
1. Resolve aliasName to provider configuration using alias resolver
2. Extract baseProvider, providerSettings, ephemeralSettings, and modelParameters

### Provider Switching (pseudocode lines 4-6)
1. Switch to baseProvider using existing provider switching mechanism

### Provider Settings Application (pseudocode lines 7-10)
1. For each key-value pair in providerSettings:
   - Call SettingsService.setProviderSetting(providerName, key, value)

### Ephemeral Settings Application (pseudocode lines 11-14)
1. For each key-value pair in ephemeralSettings:
   - Call SettingsService.set(key, value)

### Model Parameters Application (pseudocode lines 15-18)
1. Call provider.setModelParams(modelParameters)

## Verification Commands

### Automated Checks
```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P11" . | wc -l
# Expected: 4+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-005" packages/core/src/providers/ | wc -l
# Expected: 5+ occurrences

# Run all settings applier tests - should pass
npm test packages/core/src/providers/test/ProviderAliasSettingsApplier.test.ts
# Expected: All tests pass
```

### Manual Verification Checklist
- [ ] ProviderAliasSettingsApplier.ts file updated with full implementation
- [ ] All tests in ProviderAliasSettingsApplier.test.ts updated with complete scenarios
- [ ] Implementation follows pseudocode exactly
- [ ] ProviderManager.ts properly integrates settings application
- [ ] No TODO comments or stub implementations remain

## Success Criteria
- All settings applier tests pass
- Implementation follows pseudocode line by line
- No test modifications made during this phase
- Proper application of all settings types through existing services

## Failure Recovery
If this phase fails:
1. Re-read pseudocode and requirements
2. Fix implementation to properly follow pseudocode steps
3. Ensure all validation is handled correctly
4. Cannot proceed to Phase 12 until tests pass

## Phase Completion Marker
Create: `project-plans/provideralias/.completed/P11.md`
Contents will include:
- Files modified with diff size
- Tests executed with pass/fail status
- Verification that no test files were modified