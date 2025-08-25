# Phase 02: Pseudocode Development

## Phase ID
`PLAN-20250823-PROVIDERALIAS.P02`

## Prerequisites
- Required: Phase 01 completed
- Expected files from previous phase:
  - `project-plans/provideralias/01-domain-model.md`

## Purpose
Create detailed pseudocode for implementing the provider alias system based on domain model analysis.

## Implementation Tasks

### Files to Create
- `project-plans/provideralias/pseudocode/alias-loader.md` - Pseudocode for loading alias configuration files
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P02`
  - MUST include: `@requirement:REQ-002`
  - Pseudocode for loading pre-configured aliases from codebase
  - Pseudocode for loading user aliases from ~/.llxprt/provideralias/
  - Pseudocode for handling naming conflicts between pre-configured and user aliases

- `project-plans/provideralias/pseudocode/alias-resolver.md` - Pseudocode for resolving alias names to providers
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P02`
  - MUST include: `@requirement:REQ-003`
  - Pseudocode for checking if a name is an alias vs concrete provider
  - Pseudocode for resolving an alias to its base provider and settings

- `project-plans/provideralias/pseudocode/settings-applier.md` - Pseudocode for applying alias settings
  - MUST include: `@plan:PLAN-20250823-PROVIDERALIAS.P02`
  - MUST include: `@requirement:REQ-005`
  - Pseudocode for applying providerSettings through SettingsService
  - Pseudocode for applying ephemeralSettings through SettingsService
  - Pseudocode for applying modelParameters through provider

## Pseudocode Details

### alias-loader.md
01: FUNCTION loadProviderAliases()
02:   INITIALIZE empty aliasRegistry map
03:   TRY to read pre-configured aliases directory
04:   FOR each file in pre-configured aliases directory
05:     PARSE JSON file into alias configuration object
06:     VALIDATE configuration against ProviderAliasSchema
07:     ADD to aliasRegistry with name as key
08:   TRY to read user aliases directory (~/.llxprt/provideraliases/)
09:   IF user directory exists
10:     FOR each file in user aliases directory
11:       TRY to parse JSON file
12:       VALIDATE configuration against ProviderAliasSchema
13:       IF validation passes
14:         ADD to aliasRegistry (overwrite pre-configured with same name)
15:         LOG warning in debug mode about overridden alias
16:       ELSE
17:         LOG validation error
18:   RETURN aliasRegistry

### alias-resolver.md
01: FUNCTION isAlias(providerName)
02:   RETURN true IF providerName exists in aliasRegistry
03:   ELSE RETURN false

04: FUNCTION resolveProvider(aliasName)
05:   IF aliasName not found in aliasRegistry
06:     THROW ProviderNotFoundError with aliasName
07:   RETURN object with:
08:     baseProvider: aliasRegistry[aliasName].baseProvider
09:     providerSettings: aliasRegistry[aliasName].providerSettings
10:     ephemeralSettings: aliasRegistry[aliasName].ephemeralSettings
11:     modelParameters: aliasRegistry[aliasName].modelParameters

### settings-applier.md
01: FUNCTION applyAliasSettings(aliasName)
02:   RESOLVE aliasName to provider configuration
03:   EXTRACT baseProvider, providerSettings, ephemeralSettings, modelParameters
04:   
05:   SWITCH to baseProvider using existing system
06:   
07:   APPLY providerSettings through SettingsService.setProviderSetting()
08:     FOR each key-value pair in providerSettings
09:       CALL SettingsService.setProviderSetting(providerName, key, value)
10:   
11:   APPLY ephemeralSettings through SettingsService.set()
12:     FOR each key-value pair in ephemeralSettings
13:       CALL SettingsService.set(key, value)
14:   
15:   APPLY modelParameters through provider.setModelParams()
16:     CALL provider.setModelParams(modelParameters)
17:   
18:   RETURN success status

## Verification Commands

### Automated Checks
```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-PROVIDERALIAS.P02" . | wc -l
# Expected: 0 occurrences (pseudocode files don't add code markers)

# Check pseudocode files created
find project-plans/provideralias/pseudocode -name "*.md" | wc -l
# Expected: 3 files
```

## Manual Verification Checklist
- [ ] Pseudocode files created for alias-loader, alias-resolver, and settings-applier components
- [ ] Each pseudocode file includes numbered steps for implementation
- [ ] Every requirement has associated pseudocode
- [ ] Error and edge cases covered in pseudocode
- [ ] Integration points with existing systems clearly identified
- [ ] Implementation steps are unambiguous and actionable

## Success Criteria
- Pseudocode for loading aliases from both pre-configured and user directories
- Pseudocode for resolving alias names to base providers and settings
- Pseudocode for applying all settings types through existing services
- Clear line numbers that can be referenced in implementation phases

## Failure Recovery
If this phase fails:
1. Re-read specification and domain analysis
2. Re-identify key components requiring implementation
3. Recreate pseudocode with clear, numbered steps
4. Cannot proceed to Phase 03 until pseudocode is fixed