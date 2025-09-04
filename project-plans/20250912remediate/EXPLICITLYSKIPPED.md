# Explicitly Skipped Commits

## Overview

This document lists all commits from af99989c9..0e210a4c6 that we are intentionally skipping and the rationale for each decision.

## Skipped Commits

### 70ff7a36b - NextSpeakerChecker Default Setting
**Commit:** `fix(core): Default skipNextSpeakerCheck to true when the setting is not manually set (#8295)`  
**Date:** Sep 11, 2025  
**Files:** packages/core/src/config/config.ts  

**REASON:** NextSpeakerChecker was completely removed from llxprt codebase as part of our determinism improvements. This commit references settings and functionality that no longer exists in our fork.

### 70900799d - Enable Smart Edit by Default  
**Commit:** `Enable smart edit by default on main (#7679)`  
**Date:** Sep 3, 2025  
**Files:** packages/core/src/config/config.ts, packages/core/src/telemetry/clearcut-logger/clearcut-logger.test.ts  

**REASON:** Smart edit is intentionally disabled in llxprt for determinism. We made an explicit design decision to keep AI behavior more predictable and consistent. Enabling it would revert our determinism improvements.

### 0e210a4c6 - Release v0.4.1
**Commit:** `chore(release): v0.4.1`  
**Date:** Sep 11, 2025  

**REASON:** Release commit for gemini-cli. We maintain separate versioning for llxprt.

### 0b7abe97c - Release v0.4.0  
**Commit:** `chore(release): v0.4.0`  
**Date:** Sep 11, 2025  

**REASON:** Release commit for gemini-cli. We maintain separate versioning for llxprt.

### c173f7705 - Release v0.4.0-preview
**Commit:** `chore(release): v0.4.0-preview`  
**Date:** Sep 7, 2025  

**REASON:** Release commit for gemini-cli. We maintain separate versioning for llxprt.

### e088c06a9 - Release v0.3.1  
**Commit:** `chore(release): v0.3.1 (#7742)`  
**Date:** Sep 4, 2025  

**REASON:** Release commit for gemini-cli. We maintain separate versioning for llxprt.

### 89213699b - Final Changes for Stable Release
**Commit:** `Final Changes for stable release (#8105)`  
**Date:** Sep 10, 2025  

**REASON:** Version bump v0.2.2 → v0.3.0, adds ExtensionInstallEvent telemetry to Google Analytics, and other release-specific changes that don't apply to llxprt.

### deda119be - Takethree
**Commit:** `Takethree (#7740)`  
**Date:** Sep 4, 2025  

**REASON:** Another version bump v0.2.2 → v0.3.0, skips flaky tests for release stability. Not useful for llxprt.

### 4aef2fa5d - Temp Disable Windows E2E Tests
**Commit:** `temp disable windows e2e tests (#7746)`  
**Date:** Sep 7, 2025  

**REASON:** Temporary test configuration change specific to gemini-cli CI infrastructure. Not applicable to llxprt test setup.

### e133acd29 - Remove Command from Extension Docs
**Commit:** `Remove command from extension docs (#7675)`  
**Date:** Sep 3, 2025  

**REASON:** Removes CLI extension installation command documentation. LLxprt has its own extension documentation and command structure.


### 5cc23f0cd - E2E Workflow Improvements
**Commit:** `feat/e2e workflow improvements (#7684)`  
**Date:** Sep 3, 2025  

**REASON:** CI/CD workflow changes specific to gemini-cli infrastructure. Not applicable to llxprt testing setup.

### c31e37b30 - History Dangling Function Calls Fix
**Commit:** `fix(core): tend to history with dangling function calls/responses (#7692)`  
**Date:** Sep 4, 2025  
**Files:** packages/core/src/services/loopDetectionService.ts  

**REASON:** LLxprt uses an atomic tool call/response implementation that makes orphaned function calls impossible by design. This upstream fix addresses a problem that cannot occur in llxprt's architecture. Our HistoryService explicitly states "orphans are impossible by design" and the tests are marked as "OBSOLETE - atomic implementation prevents orphans". Adding this fix could potentially interfere with our superior atomic design.

### 2aa25ba87 - Add OTel Logging for FileOperationEvent
**Commit:** `add(telemetry): Add OTel logging for FileOperationEvent (#7082)`  
**Date:** Sep 4, 2025  

**REASON:** Adds OpenTelemetry with external data transmission capability. Violates llxprt's privacy-first, local-only telemetry approach. We don't want to send file operation data to external services.

### cae4cacd6 - Rename Telemetry Fields
**Commit:** `rename(telemetry): Update ai_(added|removed)_lines to model_(added|removed)_lines (#7577)`  
**Date:** Sep 4, 2025  

**REASON:** Telemetry field renaming for Google Analytics. Since we don't use Google telemetry, this is unnecessary.

### af522f21f - Add Character Counts to Diff Stats
**Commit:** `feat(telemetry): Add character counts to diff stats (#7619)`  
**Date:** Sep 3, 2025  

**REASON:** Adds more telemetry data collection for Google Analytics. We maintain minimal local telemetry only.

## Total Skipped: 16 commits

This represents approximately 39% of the commits in the range, demonstrating llxprt's significant architectural differences from upstream gemini-cli.