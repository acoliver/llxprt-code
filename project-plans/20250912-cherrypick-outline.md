# Cherry-pick Outline: LLxprt main to upstream v0.4.1

**Date**: 2025-09-13  
**Commits Available**: 120 commits from origin/main to upstream/v0.4.1  
**Source Analysis**: project-plans/20250912-cherrypick-analysis.md

## Executive Summary

From the original 267 commits between v0.2.2 and v0.4.1:
- **ALREADY_PICKED**: 35 commits (already in our codebase)
- **PICK**: 89 commits should be cherry-picked directly
- **SKIP**: 47 commits must be skipped (telemetry, release, emoji, NextSpeaker)
- **CAREFUL**: 78 commits need careful review and adaptation
- **PORT**: 18 commits need conceptual porting (not direct cherry-pick)

**Remaining work** (accounting for already picked):
- 120 commits still to process (matches our git count)
- Focus on the 89 PICK commits first
- Then review 78 CAREFUL commits
- Skip all 47 SKIP commits
- Port concepts from 18 PORT commits

## Priority Order for Cherry-picking

### Phase 1: High-Priority Safe Picks (Start Here)
These provide immediate value with minimal conflict risk (from the 89 PICK commits):

1. `cda4280d7` - Always return diff stats from EditTool (tool improvement)
2. `45d494a8d` - Improve performance of shell commands (performance boost)
3. `876d09160` - Improve Google OAuth error handling (auth robustness)
4. `645133d9d` - Fix diff approval race between CLI and IDE (critical bug fix)
5. `6bb944f94` - Add positional argument for prompt (CLI UX improvement)
6. `b49410e1d` - Notify users when there is a new version (user experience)
7. `c31e37b30` - Tend to history with dangling function calls (bug fix)
8. `3885f7b6a` - Improve settings migration and tool loading (stability)
9. `e7a4142b2` - Handle cleaning up response text on retry (bug fix)
10. `c38247ed5` - Reduce bundle size & check it in CI (performance/CI)

### Phase 2: Additional Safe Picks 
Continue with remaining PICK commits (79 more from the 89 total):

11. `70900799d` - Enable smart edit by default on main
12. `04e6c1d44` - Fix missing v1 settings to migration map
13. `931d9fae4` - Enhance json configuration docs
14. `4c3822725` - Run e2e tests on pull requests
15. `cb43bb9ca` - Use IdeClient directly instead of config.ideClient
16. `89213699b` - Final Changes for stable release
17. `4aef2fa5d` - Temp disable windows e2e tests (CI improvement)
18. `deda119be` - Takethree (bug fix)
19. `e133acd29` - Remove command from extension docs (docs improvement)
20. `af99989c9` - Make read_many_files test more reliable (test improvement)

(Plus 69 more PICK commits from the analysis - all should be cherry-picked)

### Phase 3: Careful Review Required (78 commits total)
Need modification for llxprt multi-provider architecture:

**Key commits requiring adaptation:**

1. `35a841f71` - **CAREFUL** - Make OAuthTokenStorage non static
   - Adapt for multi-provider token storage
   
2. `987f08a61` - **CAREFUL** - Add enforcedAuthType setting
   - Modify to support USE_PROVIDER pattern
   
3. `7c667e100` - **CAREFUL** - Override Gemini CLI trust with VScode workspace trust
   - Ensure IDE trust works with llxprt branding
   
4. `d2ae869bb` - **CAREFUL** - Simplify MCP server timeout configuration
   - Verify MCP compatibility with multi-provider
   
5. `7395ab63a` - **CAREFUL** - Correctly pass file filtering settings
   - Core functionality, test thoroughly
   
6. `abddd2b6e` - **CAREFUL** - Handle nested gitignore files
   - Core functionality, test thoroughly

7. `de53b30e6` - **CAREFUL** - Custom witty message
   - Adapt for llxprt branding
   
8. `93ec574f6` - **CAREFUL** - Fix gemini-cli-vscode-ide-companion package script
   - Update for llxprt package names
   
9. `5c2bb990d` - **CAREFUL** - Prevent crash when processing malformed file paths
   - Important error handling
   
10. `edb346d4e` - **CAREFUL** - Rename smart_edit to replace
    - Check tool naming consistency

(Plus 68 more CAREFUL commits from the analysis - each needs individual review)

### Phase 4: Conceptual Ports (18 commits - Don't Cherry-pick Directly)
Reimplement these concepts in llxprt style:

1. `15c62bade` - **PORT** - Reuse CoreToolScheduler for nonInteractiveToolExecutor
   - llxprt has superior parallel batching, adapt concept only
   
2. `720eb8189` - **PORT** - At Command Race Condition Bugfix
   - Implement fix using llxprt's command handling
   
3. `4642de2a5` - **PORT** - Fixing at command race condition
   - Related to above, implement together
   
4. `1049d3884` - **PORT** - Update .gitignore in /setup-github
   - Check if applicable to llxprt project structure

(Plus 14 more PORT commits from the analysis - each needs conceptual adaptation)

## Already Cherry-picked (35 commits)

These commits are already in our codebase with equivalent functionality:

1. `cfea46e9d` - Fix permissions for trustedFolders.json (as `a01276815`)
2. `5cc23f0cd` - Fix screen reader config bug (as `49fbd02b9`)
3. `4d07cb7db` - Add support for Ctrl+Backspace (as `6f5d3f97f`)
4. `5e1651954` - Fix Arrow Keys and Kitty Protocol (as `bfbb38a67`)
5. `70938eda1` - Support installing extensions with org/repo (as `a34a0ebd7`)
6. `c9bd3ecf6` - Fix IDE race condition (as `3ad16a54e`)
7. `5cc23f0cd` - Log exact model version (as `5b2bf9852`)
8. `4e49ee4c7` - Make config non optional (as `cd08b0ddd`)
9. `52dae2c58` - Add --allowed-tools flag (as `850d52fd2`)
10. `c33a0da1d` - Add OIDC fallback (as `650e72678`)

(Plus 25 more already integrated - see analysis file for complete list)

## Never Cherry-pick (47 commits - Permanent Skip List)

### Telemetry/ClearcutLogger (Privacy Violation)
- `2aa25ba87` - Add OTel logging for FileOperationEvent
- `cae4cacd6` - Rename ai_lines to model_lines
- `af522f21f` - Add character counts to diff stats
- `044c3a0e1` - Log config.useSmartEdit to Clearcut
- `c7fc48900` - Log Gemini CLI OS/Process platform
- `08bdd0841` - Clearcut Logging of Content Error Metrics
- `415d3413c` - Add email to telemetry prompt
- `cd75d9426` - Log yolo mode + number of turns
- `1918f4466` - Add OTel logging for MalformedJsonEvent
- `5030ced9e` - Retry Message Stream on Empty Chunks
- `240830afa` - Log MCP request with error
- `528227a0f` - Add programming language to CLI events
- `6b843ca3a` - Add MCP tool count and name as dimension
- `4b2c99036` - Fix more logging issues

### NextSpeaker Feature (Permanently Disabled)
- `70ff7a36b` - Default skipNextSpeakerCheck to true
- `82b6a2f5d` - Skip the next speaker check by default
- `415a36a19` - Do not call nextSpeakerCheck if error

### Emoji-related (LLxprt is Emoji-free)
- `348fa6c7c` - Fix debug icon rendering
- `a64394a4f` - Change broken emojis

### Release Commits
- `0e210a4c6` - chore(release): v0.4.1
- `0b7abe97c` - chore(release): v0.4.0
- `c173f7705` - chore(release): v0.4.0-preview
- `e088c06a9` - chore(release): v0.3.1
- `59cdf5933` - chore(release): v0.2.1
- `4b60cba66` - chore(release): v0.2.2

### Gemini-specific Workflows
- `18bb04c80` - Update gemini-automated-issue-triage.yml
- `96707b588` - Update Issue Triage
- `ab1b74802` - Improve issue triage

### Already Reimplemented in LLxprt
- `b5dd6f9ea` - Integrate chat recording (llxprt has own privacy-first logging)

## Verification Process

After each batch of 5 commits:

```bash
# 1. Verify commits were applied
git log --oneline -5

# 2. Run full verification suite
npm run lint
npm run build
npm test
npm run format
git add -A  # Stage formatted changes

# 3. Fix any issues and commit
git add -A
git commit -m "fix: resolve issues from batch N cherry-picks"
```

## Expected Outcomes

After completing all phases (accounting for already picked):
- 89 direct cherry-picks improving performance, stability, and features (PICK)
- 78 adapted commits maintaining llxprt's multi-provider architecture (CAREFUL)
- 18 conceptually ported improvements (PORT)
- 47 permanently skipped commits that violate llxprt principles (SKIP)
- 35 commits already integrated into our codebase (ALREADY_PICKED)

Total commits to process: 232 (89+78+18+47)
Already completed: 35
Remaining work: ~197 commits (120 shown in git diff)

## Critical Reminders

1. **NEVER** cherry-pick ClearcutLogger/telemetry commits
2. **NEVER** re-enable NextSpeaker functionality
3. **NEVER** add emoji support
4. **ALWAYS** preserve multi-provider architecture
5. **ALWAYS** maintain llxprt branding and package names
6. **VERIFY** after each batch of 5 commits
7. Work on dedicated branch (20250908-gmerge), never directly on main