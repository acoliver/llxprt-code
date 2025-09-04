# Cherry-pick Remediation Execution Summary

## Complete Remediation Plan

This comprehensive plan safely cherry-picks 14 of 31 commits from af99989c9 to v0.4.1, while explicitly skipping 16 commits that conflict with llxprt's architecture or violate privacy principles.

## Phase 1: CAREFUL Commits (Individual Review Required)

**Execute these FIRST with individual attention:**

### 1. Settings Migration (MEDIUM RISK)
```bash
# Review and execute CAREFUL-settings-migration.md
git cherry-pick 04e6c1d44  # fix(settings): Add missing v1 settings to migration map  
git cherry-pick 3885f7b6a  # refactor(setting): Improve settings migration and tool loading
# Immediately verify ~/.llxprt paths preserved
```

### 2. OAuth Security (ALREADY COMPLETED)
```bash
# Review and execute CAREFUL-oauth-security.md
git cherry-pick 35a841f71  # Feat(security) - Make the OAuthTokenStorage non static
# Test all OAuth providers (anthropic, gemini, qwen)
```

### 3. Bundle Size (MEDIUM RISK)
```bash
# Review and execute CAREFUL-bundle-size.md  
git cherry-pick c38247ed5  # Reduce bundle size & check it in CI
# OR apply optimizations manually without CI integration
```

## Phase 2: Batch Commits (Lower Risk)

**Execute these in batches after CAREFUL commits succeed:**

### Batch 1: Auth & Performance (5 commits)
```bash
git cherry-pick 876d09160  # fix(auth): improve Google OAuth error handling
git cherry-pick 645133d9d  # Fix diff approval race between CLI and IDE  
git cherry-pick 987f08a61  # Add enforcedAuthType setting
git cherry-pick 6bb944f94  # feat: Add positional argument for prompt
git cherry-pick cfea46e9d  # fix: Update permissions for trustedFolders.json file
```

### Batch 2: Documentation, UI & VSCode (4 commits) 
```bash
git cherry-pick 931d9fae4  # Enhance json configuration docs
git cherry-pick e7a4142b2  # Handle cleaning up response text in UI when retry occurs  
git cherry-pick 45d494a8d  # improve performance of shell commands with lots of output
git cherry-pick b49410e1d  # feat(extension) - VSCode update notifications
```

### Batch 3: Core Improvements (2 commits)
```bash  
git cherry-pick cb43bb9ca  # Use IdeClient directly instead of config.ideClient
git cherry-pick cda4280d7  # fix(diffstats): Always return diff stats from EditTool
```

## Phase 3: Integration & Testing

### Full Verification Cycle
```bash
# 1. Format and lint
npm run format
git add -A  
npm run lint:ci

# 2. Type checking
npm run typecheck  

# 3. Build
npm run build
npm run bundle

# 4. Test suite  
npm run test:ci

# 5. Integration testing
llxprt auth status
llxprt "test basic functionality"  
llxprt config show
```

## Commit Summary

| Category | Count | Risk Level | Notes |
|----------|--------|------------|--------|
| **PICK (Batches)** | 10 | LOW | Straightforward improvements |
| **CAREFUL (Individual)** | 9 | MEDIUM-HIGH | Require llxprt adaptation |
| **SKIP (Explicit)** | 12 | N/A | Conflict with llxprt design |
| **TOTAL** | 31 | - | 100% coverage |

## Critical Success Checkpoints

After each phase, verify these remain intact:

### ✅ LLXPRT Identity Preserved
- [ ] OAuth tokens in ~/.llxprt/oauth/ (not ~/.gemini/)
- [ ] Settings reference llxprt (not gemini-cli)  
- [ ] Telemetry logs to ~/.llxprt/logs/ (not remote)
- [ ] No Google Analytics integration

### ✅ Core Functionality Works
- [ ] All auth providers work (anthropic, gemini, qwen)
- [ ] Tool calls execute properly  
- [ ] History service handles conversations
- [ ] Settings load and save correctly

### ✅ Quality Gates Pass
- [ ] `npm run lint:ci` passes (zero warnings)
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds  
- [ ] `npm run test:ci` passes (all tests)

## Emergency Rollback

If anything breaks during execution:
```bash
# Nuclear option - reset to starting point
git reset --hard HEAD~[number-of-commits]

# Verify clean state
npm run build && npm run test
llxprt --version
```

## Final Integration Commit  

After all cherry-picks complete successfully:
```bash
git add -A
git commit -S -m "integrate: Cherry-pick gemini-cli improvements af99989c9 to v0.4.1

- Enhanced OAuth security and error handling
- Improved settings migration system  
- Better telemetry logging (local-only)
- Performance improvements for shell commands
- Fixed diff approval races and tool statistics
- Added positional argument support

Adapted for llxprt: preserved ~/.llxprt paths, local telemetry only,
skipped NextSpeakerChecker and smart edit conflicts.

Cherry-picked commits: 876d09160, 645133d9d, 04e6c1d44, 987f08a61, 
6bb944f94, af522f21f, cfea46e9d, 931d9fae4, e7a4142b2, 3885f7b6a,
cae4cacd6, c31e37b30, 45d494a8d, cb43bb9ca, cda4280d7, 2aa25ba87,
35a841f71, c38247ed5"
```

## Success Metrics

- **19 beneficial commits integrated** 
- **12 conflicting commits safely excluded**
- **Zero regressions in llxprt functionality**
- **All quality gates passing**
- **Privacy and security maintained**