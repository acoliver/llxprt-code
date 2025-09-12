# Cherry-pick Remediation Tracker

## Overview
This plan addresses the remaining valuable commits that were initially skipped or marked as "careful" during the main cherry-pick process.

## Tasks to Complete

### OAuth Architecture (1 commit)
- [ ] Task 01: Cherry-pick OAuth MCP instance-based storage (35a841f71)
- [ ] Task 02: Verify OAuth changes

### Folder Trust Security Feature (10 commits)
- [ ] Task 03: Cherry-pick folder trust base (ecdea602a)
- [ ] Task 04: Cherry-pick folder trust settings fix (1fc1c2b4e)
- [ ] Task 05: Cherry-pick refuse extensions from untrusted (2fc857092)
- [ ] Task 06: Cherry-pick disable commands untrusted (10c6af7e4)
- [ ] Task 07: Cherry-pick skip MCP untrusted (a0fbe000e)
- [ ] Task 08: Cherry-pick update config trusted folder (2a0e69d83)
- [ ] Task 09: Cherry-pick respect trust for LLXPRT.md (5e5f2dffc)
- [ ] Task 10: Cherry-pick parent name in trust prompt (421f989fa)
- [ ] Task 11: Cherry-pick restart CLI on trust changes (001009d35)
- [ ] Task 12: Cherry-pick remove folder trust feature flag (93820f833)
- [ ] Task 13: Verify all folder trust features

### Final Verification
- [ ] Task 14: Final build and test verification
- [ ] Task 15: Create summary report

## Commits Being Applied

### OAuth
1. `35a841f71` - Make the OAuthTokenStorage non static

### Folder Trust
1. `ecdea602a` - Refuse to load from untrusted process.cwd() sources
2. `1fc1c2b4e` - Settings in Folder trust hook
3. `2fc857092` - Refuse to load extensions from untrusted workspaces
4. `10c6af7e4` - Disable commands from untrusted directories
5. `a0fbe000e` - Skip MCP server connections in untrusted folders
6. `2a0e69d83` - Update config.isTrustedFolder
7. `5e5f2dffc` - Respect folder trust setting when reading GEMINI.md
8. `421f989fa` - Show parent name in trust folder confirmation
9. `001009d35` - Restart CLI on folder trust settings changes
10. `93820f833` - Remove Foldertrust Feature Flag

## Key Adaptations Needed

1. **Branding Changes**:
   - `GEMINI.md` → `LLXPRT.md`
   - `gemini-cli` → `llxprt-code`
   - `.gemini/` → `.llxprt/`

2. **Path Updates**:
   - `~/.config/gemini-cli/` → `~/.config/llxprt-code/`
   - Package imports from `@google/gemini-cli-core` → `@vybestack/llxprt-code-core`

3. **Multi-Provider Considerations**:
   - Ensure folder trust works with all authentication providers
   - Test with OpenAI, Anthropic, Gemini providers

## Success Criteria

- [ ] All commits successfully applied or adapted
- [ ] No regressions in existing functionality
- [ ] All tests pass (lint, typecheck, test, build)
- [ ] Folder trust security feature fully functional
- [ ] OAuth MCP storage improved
- [ ] Multi-provider architecture preserved