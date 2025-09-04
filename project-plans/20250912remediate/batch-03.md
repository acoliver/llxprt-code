# Batch 03 - Core Improvements & Tool Fixes

## Commits (2)

### cb43bb9ca - Use IdeClient Directly
**Title:** `Use IdeClient directly instead of config.ideClient (#7627)`  
**Date:** Sep 4, 2025  
**Risk:** LOW - Architectural improvement  

### cda4280d7 - EditTool Diff Stats Fix  
**Title:** `fix(diffstats): Always return diff stats from EditTool (#7489)`  
**Date:** Sep 4, 2025  
**Risk:** LOW - Bug fix for edit tool  

## Execution Plan

```bash
# Cherry-pick commits in order
git cherry-pick cb43bb9ca  
git cherry-pick cda4280d7
```

## Verification Steps

1. **IDE Integration:** Test that IDE client access works correctly
2. **Edit Tool:** Verify edit operations return proper diff statistics
3. **Tool Tests:** Run tool-specific tests
4. **Integration Tests:** Ensure IDE integration still works

## Expected Issues

- **IdeClient usage:** Should integrate cleanly with our existing IDE setup
- **EditTool changes:** Low risk improvement to diff statistics
- **Minimal conflicts expected**

## Technical Notes

### IdeClient Direct Usage
- Removes indirection through config.ideClient  
- Should improve performance and code clarity
- May need verification that our IDE setup works the same way

### EditTool Diff Stats
- Ensures diff statistics are always returned
- Important for telemetry and user feedback
- Should integrate with our local telemetry logging

## Rollback Plan

If any cherry-pick fails:
```bash
git cherry-pick --abort
# Review IDE client usage patterns
# May need manual integration if conflicts arise
```