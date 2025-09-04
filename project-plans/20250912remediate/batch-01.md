# Batch 01 - Auth & Performance Fixes

## Commits (5)

### 876d09160 - Google OAuth Error Handling  
**Title:** `fix(auth): improve Google OAuth error handling and prevent empty error messages (#7539)`  
**Date:** Aug 30, 2025  
**Risk:** LOW - Auth improvement  

### 645133d9d - Fix Diff Approval Race  
**Title:** `Fix diff approval race between CLI and IDE (#7609)`  
**Date:** Sep 2, 2025  
**Risk:** LOW - Bug fix  

### 987f08a61 - Enforced Auth Type Setting
**Title:** `Add enforcedAuthType setting (#6564)`  
**Date:** Sep 3, 2025  
**Risk:** LOW - New optional setting  

### 6bb944f94 - Positional Argument for Prompt  
**Title:** `feat: Add positional argument for prompt (#7668)`  
**Date:** Sep 3, 2025  
**Risk:** LOW - CLI enhancement  

### cfea46e9d - Trusted Folders Permissions  
**Title:** `fix: Update permissions for trustedFolders.json file to make it more … (#7685)`  
**Date:** Sep 3, 2025  
**Risk:** LOW - Security fix  

## Execution Plan

```bash
# Cherry-pick all 5 commits in order
git cherry-pick 876d09160
git cherry-pick 645133d9d  
git cherry-pick 987f08a61
git cherry-pick 6bb944f94
git cherry-pick cfea46e9d
```

## Verification Steps

1. **Test auth flows:** Ensure Google OAuth still works with improved error handling
2. **Test CLI:** Verify positional argument works: `llxprt "some prompt here"`
3. **Check file permissions:** Verify trustedFolders.json has correct permissions  
4. **Run tests:** `npm run test` to ensure no regressions

## Expected Issues

- **Minimal conflicts expected** - these are mostly isolated improvements
- **OAuth paths:** May need to adapt paths from ~/.gemini to ~/.llxprt if referenced
- **Settings schema:** New enforcedAuthType setting should integrate cleanly

## Rollback Plan

If any cherry-pick fails:
```bash
git cherry-pick --abort
# Address conflict or skip problematic commit
# Continue with remaining commits
```