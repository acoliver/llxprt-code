# CAREFUL - Settings Migration Improvements

## Commits (2)

### 3885f7b6a - Settings Migration & Tool Loading
**Title:** `refactor(setting): Improve settings migration and tool loading (#7445)`  
**Date:** Sep 3, 2025  
**Risk:** MEDIUM - Core settings changes  
**Files:** packages/cli/src/config/settings.test.ts, packages/cli/src/config/settings.ts, packages/cli/src/config/settingsSchema.ts, packages/cli/src/utils/deepMerge.test.ts, packages/cli/src/utils/deepMerge.ts, packages/core/src/config/config.test.ts, packages/core/src/config/config.ts

### 04e6c1d44 - Missing v1 Settings Migration  
**Title:** `fix(settings): Add missing v1 settings to migration map (#7678)`  
**Date:** Sep 3, 2025  
**Risk:** MEDIUM - Settings compatibility  
**Files:** packages/cli/src/config/settings.ts, packages/cli/src/config/settingsSchema.ts

## Analysis

### What These Commits Do
- **3885f7b6a:** Refactors settings migration system and improves tool loading
- **04e6c1d44:** Adds missing v1 settings to migration mapping for backward compatibility

### LLXPRT-Specific Concerns
1. **Settings Paths:** LLXPRT uses ~/.llxprt/ instead of ~/.gemini/
2. **Custom Settings:** We have llxprt-specific settings that shouldn't be overwritten
3. **OAuth Storage:** Our OAuth tokens are in ~/.llxprt/oauth/ not gemini locations  
4. **Branding:** Settings should reference llxprt not gemini-cli

## Pre-Cherry-Pick Analysis Required

### Step 1: Review Current Settings
```bash
# Check our current settings schema
cat packages/cli/src/config/settingsSchema.ts | grep -A5 -B5 "llxprt\|vybestack"

# Check our migration logic  
cat packages/cli/src/config/settings.ts | grep -A10 -B10 "migration\|migrate"
```

### Step 2: Review Upstream Changes
```bash  
# See what the commits actually change
git show 3885f7b6a --stat
git show 04e6c1d44 --stat

# Look at specific file changes
git show 3885f7b6a -- packages/cli/src/config/settingsSchema.ts
git show 04e6c1d44 -- packages/cli/src/config/settings.ts
```

## Execution Strategy

### Option A: Selective Cherry-Pick (RECOMMENDED)
1. Cherry-pick the commits
2. Immediately amend to preserve llxprt-specific settings
3. Test migration doesn't break llxprt paths

### Option B: Manual Integration  
1. Review the changes manually
2. Apply beneficial parts without cherry-picking
3. Maintain full control over settings schema

## Required Adaptations

### Settings Schema Updates Needed
- [ ] Preserve ~/.llxprt paths for all storage locations
- [ ] Keep llxprt-specific settings (telemetry, oauth paths, etc.)  
- [ ] Update any gemini references to llxprt
- [ ] Ensure OAuth token storage paths remain in ~/.llxprt/oauth/

### Migration Logic Updates Needed  
- [ ] Adapt migration maps for llxprt settings structure
- [ ] Preserve existing llxprt user configurations
- [ ] Test migration doesn't overwrite critical llxprt settings

## Testing Plan

### Pre-Cherry-Pick Tests
```bash
# Backup current settings
cp ~/.llxprt/settings.json ~/.llxprt/settings.json.backup

# Test current settings loading
npm test -- --grep "settings"
```

### Post-Cherry-Pick Tests  
```bash
# Test settings migration
npm test -- --grep "migration"

# Test settings loading with real config
llxprt config show

# Verify OAuth paths preserved
ls -la ~/.llxprt/oauth/

# Test tool loading
llxprt --version
```

## Success Criteria

- ✅ Settings migration improvements integrated
- ✅ All llxprt-specific paths preserved (~/.llxprt/)
- ✅ OAuth storage remains in ~/.llxprt/oauth/
- ✅ No gemini-cli branding leaks into settings
- ✅ Existing user settings not corrupted
- ✅ Tool loading still works correctly

## Risk Mitigation

- **Backup settings:** Always backup ~/.llxprt/ before testing
- **Gradual testing:** Test with minimal config first  
- **Rollback ready:** Keep commits separate for easy revert
- **User communication:** Document any required user action for settings migration

## Rollback Plan

If settings integration breaks:
```bash
# Revert the commits
git revert 04e6c1d44 3885f7b6a

# Restore user settings  
cp ~/.llxprt/settings.json.backup ~/.llxprt/settings.json

# Verify rollback worked
llxprt config show
```