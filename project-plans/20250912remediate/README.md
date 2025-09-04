# Cherry-pick Remediation Plan: af99989c9 to v0.4.1

## Overview

This is a comprehensive remediation plan to safely cherry-pick commits from af99989c9 to v0.4.1 (0e210a4c6cc3a0277c05ebefcc1e69cae8ed5d04) into the llxprt codebase.

## Commit Range Analysis

**Total Commits to Process:** 31 commits  
**Date Range:** Aug 30, 2025 → Sep 11, 2025  
**Source:** gemini-cli upstream  
**Target:** llxprt-code (current branch: 20250908-gmerge)

## Research Summary

### History Service Differences
- **LLXPRT**: Has atomic tool call/response implementation preventing orphaned calls (findUnmatchedToolCalls returns empty array)
- **GEMINI**: Uses trimRecentHistory() in loop detection service to handle dangling function calls
- **DECISION**: SKIP c31e37b30 - Our atomic implementation is superior and prevents the issue entirely

### Settings Migration Differences  
- **LLXPRT**: Uses ~/.llxprt/oauth/ for OAuth tokens, custom Vybestack settings
- **GEMINI**: Has v1→v2 settings migration system  
- **DECISION**: Cherry-pick settings improvements but preserve llxprt-specific paths and branding

### Telemetry Strategy
- **LLXPRT**: Local file logging only, no Google telemetry
- **GEMINI**: Full Google Analytics/telemetry integration with OpenTelemetry
- **DECISION**: SKIP all telemetry commits to maintain privacy-first approach

## Categorization Strategy

### PICK (Batch Processing)
Safe commits that can be cherry-picked with minimal changes:
- Bug fixes for auth, performance, security
- Documentation improvements  
- CLI enhancements
- Tool improvements

### CAREFUL (Individual Review)
Commits requiring adaptation for llxprt:
- Settings migration (preserve llxprt paths)
- OAuth improvements (preserve llxprt token storage - already done)
- Bundle size optimization (review CI integration)

### SKIP (Explicitly Excluded)
Commits that conflict with llxprt design decisions:
- NextSpeakerChecker related (deleted from llxprt)
- Smart edit enablement (disabled for determinism)
- Google telemetry integration (privacy concerns)
- Release commits and version bumps

## File Structure

```
20250912remediate/
├── README.md (this file)
├── EXPLICITLYSKIPPED.md (documents what we're skipping and why)
├── batch-01.md (5 commits: auth & performance fixes)  
├── batch-02.md (4 commits: docs, UI, VSCode update notifications)
├── batch-03.md (2 commits: core improvements)
├── CAREFUL-settings-migration.md (3885f7b6a + 04e6c1d44)
├── CAREFUL-oauth-security.md (35a841f71 - already cherry-picked)
└── CAREFUL-bundle-size.md (c38247ed5)
```

## Execution Order

1. **Phase 1**: Review and execute CAREFUL commits individually
2. **Phase 2**: Execute PICK batches in order (1-4)  
3. **Phase 3**: Final integration testing and conflict resolution
4. **Phase 4**: Run full test suite and linting

## Risk Assessment

**LOW RISK**: Batched commits (mostly bug fixes, docs, VSCode updates)  
**MEDIUM RISK**: Settings migration, bundle size optimization  
**HIGH RISK**: None (history service and telemetry moved to SKIP)

## Success Criteria

- ✅ All cherry-picks complete without breaking changes
- ✅ Tests pass (npm run test:ci)  
- ✅ Linting passes (npm run lint:ci)
- ✅ Build succeeds (npm run build)
- ✅ No llxprt-specific functionality regressed
- ✅ Local telemetry preserved, no Google integration
- ✅ OAuth token storage remains in ~/.llxprt/oauth/