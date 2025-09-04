# Batch 02 - Documentation & UI Improvements

## Commits (4)

### 931d9fae4 - JSON Configuration Docs  
**Title:** `Enhance json configuration docs (#7628)`  
**Date:** Sep 2, 2025  
**Risk:** LOW - Documentation only  

### e7a4142b2 - Response Stream Retry Cleanup
**Title:** `Handle cleaning up the response text in the UI when a response stream retry occurs (#7416)`  
**Date:** Aug 30, 2025  
**Risk:** LOW - UI improvement  

### 45d494a8d - Shell Command Performance  
**Title:** `improve performance of shell commands with lots of output (#7680)`  
**Date:** Sep 4, 2025  
**Risk:** LOW - Performance fix  

### b49410e1d - VSCode Extension Update Notifications
**Title:** `feat(extension) - Notify users when there is a new version and update it (#7408)`  
**Date:** Aug 30, 2025  
**Risk:** LOW - VSCode extension feature we don't have yet

## Execution Plan

```bash
# Cherry-pick all 4 commits in order  
git cherry-pick 931d9fae4
git cherry-pick e7a4142b2
git cherry-pick 45d494a8d
git cherry-pick b49410e1d
```

## Verification Steps

1. **Documentation:** Verify JSON config docs are appropriate for llxprt
2. **UI Testing:** Test response streaming and retry scenarios  
3. **Shell Performance:** Test shell commands with large output (e.g., `ls -la /usr/bin`)
4. **Run tests:** Ensure no regressions

## Expected Issues

- **Documentation references:** May reference "gemini-cli" instead of "llxprt" - will need updates
- **UI components:** Should integrate without issues
- **Shell performance:** Low-risk performance improvement

## Adaptation Notes

- Update any documentation references from gemini-cli to llxprt
- Ensure shell output limiting doesn't interfere with our debug logging
- Verify UI changes work with llxprt theming

## Rollback Plan

If any cherry-pick fails:
```bash
git cherry-pick --abort
# Review conflicts in documentation files
# Manual merge if needed for doc references
```