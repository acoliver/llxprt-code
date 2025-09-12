# Task 11-12: Folder Trust Security Batch 3 (Final)

## Commits to Cherry-pick
1. `001009d35` - Restart CLI on folder trust settings changes
2. `93820f833` - Remove Foldertrust Feature Flag

## Task Description
Cherry-pick the final batch of folder trust commits. These commits finalize the folder trust feature by adding automatic restart on trust changes and removing the feature flag to make it always enabled.

## Cherry-pick Process

```bash
# Apply each commit in order
git cherry-pick 001009d35  # Auto-restart on trust changes
git cherry-pick 93820f833  # Remove feature flag

# After each cherry-pick, verify with:
git log --oneline -1
```

## Key Changes by Commit

### 1. 001009d35 - Auto-restart on Trust Changes
- Automatically restarts the CLI when folder trust settings change
- Ensures new trust settings take effect immediately
- Prevents security gaps from outdated trust status

**Key Implementation:**
- Watches for changes to `trustedFolders.json`
- Triggers graceful restart when trust settings change
- Preserves user context across restart

### 2. 93820f833 - Remove Feature Flag
- Makes folder trust always enabled (no longer behind a flag)
- Removes `useFolderTrust` setting checks
- Folder trust becomes mandatory security feature

**Important Changes:**
```typescript
// Remove checks like:
if (settings.useFolderTrust) {
  // trust logic
}

// Trust is now always checked:
// trust logic runs unconditionally
```

## Expected Conflicts and Resolutions

### Branding in Restart Messages:
```typescript
// Change:
console.log('Restarting Gemini CLI due to trust changes...');
// To:
console.log('Restarting LLxprt Code due to trust changes...');
```

### Feature Flag Removal:
- Remove all `useFolderTrust` configuration options
- Remove conditional checks for the feature flag
- Update tests to assume folder trust is always enabled

## Testing After Each Commit

### Test Auto-restart:
```bash
# Start llxprt in one terminal
llxprt

# In another terminal, modify trust settings
echo '{}' > ~/.llxprt/trustedFolders.json

# The CLI should automatically restart
```

### Test Feature Flag Removal:
```bash
# Check no feature flag remains
grep -r "useFolderTrust" packages/ || echo "✓ Feature flag removed"

# Verify trust is always active
cd /tmp/new-untrusted-dir
llxprt  # Should always prompt for trust (not conditional on settings)
```

## Verification Steps

### Auto-restart Verification:
```bash
# Check file watcher implementation
grep -r "watch.*trustedFolders\|trustedFolders.*watch" packages/

# Check restart logic
grep -r "restart.*trust\|trust.*restart" packages/

# Test restart preserves state (manual test)
```

### Feature Flag Removal Verification:
```bash
# Ensure no feature flag references
grep -r "useFolderTrust" packages/ | grep -v "test\|spec" || echo "✓ Clean"

# Check settings schema doesn't include useFolderTrust
grep "useFolderTrust" packages/cli/src/config/settingsSchema.ts || echo "✓ Not in schema"

# Verify trust checks are unconditional
# Look for trust checks without surrounding conditionals
```

## Success Criteria

- [ ] Both commits successfully cherry-picked
- [ ] CLI auto-restarts when trust settings change
- [ ] Restart preserves user context appropriately
- [ ] Feature flag completely removed
- [ ] Folder trust is always active (not optional)
- [ ] No references to `useFolderTrust` remain
- [ ] All tests updated for always-on trust
- [ ] Branding updated to llxprt

## Full Test Suite

```bash
# Final comprehensive test
npm run lint
npm run typecheck
npm test -- --grep "trust|Trust"
npm run build

# Manual security validation
echo "Test complete folder trust flow:"
echo "1. Try untrusted directory - should prompt"
echo "2. Trust directory - should work"
echo "3. Change trust settings - should restart"
echo "4. Verify trust persists after restart"
```

## Important Security Note

After these commits, folder trust becomes a mandatory security feature that cannot be disabled. This is intentional - it ensures all users have protection against malicious code execution from untrusted directories.

## Migration Considerations

Users who had `useFolderTrust: false` in their settings will now have folder trust enabled. Consider:
1. Adding migration logic to handle this gracefully
2. Showing a one-time notification about the security feature
3. Pre-trusting the user's common working directories

## Final Verification Checklist

- [ ] Auto-restart works correctly
- [ ] Trust settings persist across restarts
- [ ] Feature flag completely removed
- [ ] Folder trust cannot be disabled
- [ ] Security boundaries enforced consistently
- [ ] User experience is smooth
- [ ] All tests pass
- [ ] No regressions in functionality