# Feature Specification: Loop Detection Settings Control

## Purpose

Add configurable loop detection setting that is OFF by default, controllable via profiles and global settings, with support for runtime updates via `/set` command. This solves the problem of loop detection causing HTTP 400 errors when using providers with lower context limits, while still allowing users to enable it when needed.

## Architectural Decisions

- **Pattern**: Hierarchical Settings Resolution (Profile → Global → System Default)
- **Technology Stack**: TypeScript, existing SettingsService and ProfileManager
- **Data Flow**: Settings resolved at runtime through Config service
- **Integration Points**: LoopDetectionService, SettingsService, ProfileManager, CLI commands

## Project Structure

```
packages/core/src/
  types/
    modelParams.ts         # Profile interface update
  settings/
    types.ts              # Global settings schema update
  config/
    config.ts             # Resolution logic
  services/
    loopDetectionService.ts  # Early return check
packages/cli/src/
  ui/commands/
    setCommand.ts         # /set loop-detection handler
test/
  integration/
    loop-detection-settings.spec.ts
```

## Technical Environment

- **Type**: CLI Tool Feature
- **Runtime**: Node.js 20.x
- **Dependencies**: Existing project dependencies only

## Integration Points (MANDATORY SECTION)

### Existing Code That Will Use This Feature

- `/packages/core/src/services/loopDetectionService.ts:turnStarted()` - Will check setting before processing
- `/packages/core/src/config/config.ts:getLoopDetectionEnabled()` - New method for resolution
- `/packages/cli/src/ui/commands/setCommand.ts` - Will handle `/set loop-detection` command

### Existing Code To Be Replaced

- None - This is purely additive with early return logic

### User Access Points

- CLI: `/set loop-detection-enabled true|false` command
- Profile: `~/.llxprt/profiles/<name>.json` - `loopDetectionEnabled` field
- Global: `~/.llxprt/settings.json` - `loopDetectionEnabled` field

### Migration Requirements

- No migration needed - undefined defaults to false
- Existing profiles continue working unchanged
- Existing global settings continue working unchanged

## Formal Requirements

[REQ-001] Settings Schema Updates
  [REQ-001.1] Add optional `loopDetectionEnabled?: boolean` to Profile interface
  [REQ-001.2] Add optional `loopDetectionEnabled?: boolean` to global settings schema
  [REQ-001.3] Default value must be `false` when undefined

[REQ-002] Settings Resolution Hierarchy
  [REQ-002.1] Profile setting takes precedence over global
  [REQ-002.2] Global setting takes precedence over system default
  [REQ-002.3] System default is `false`
  [REQ-002.4] Resolution happens at runtime, not cached

[REQ-003] Loop Detection Service Integration
  [REQ-003.1] Check setting in `turnStarted()` method
  [REQ-003.2] Return `false` immediately if disabled
  [REQ-003.3] No processing or API calls when disabled

[REQ-004] CLI Command Support
  [REQ-004.1] `/set loop-detection-enabled true` enables for current profile
  [REQ-004.2] `/set loop-detection-enabled false` disables for current profile
  [REQ-004.3] Setting persists to profile JSON file
  [REQ-004.4] Invalid values show error message

[REQ-INT-001] Integration Requirements
  [REQ-INT-001.1] Setting must be checked on every turn
  [REQ-INT-001.2] Profile changes apply immediately
  [REQ-INT-001.3] No restart required for changes
  [REQ-INT-001.4] Setting visible in `/status` output

## Data Schemas

```typescript
// Profile interface update
export interface Profile {
  version: 1;
  provider: string;
  model: string;
  modelParams: ModelParams;
  ephemeralSettings: EphemeralSettings;
  loopDetectionEnabled?: boolean;  // NEW - undefined defaults to global/system
}

// Global settings update
export interface GlobalSettings {
  // ... existing fields ...
  loopDetectionEnabled?: boolean;  // NEW - undefined defaults to system (false)
}

// Config method signature
interface Config {
  getLoopDetectionEnabled(): boolean;
}
```

## Example Data

```json
// Profile with loop detection enabled
{
  "version": 1,
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-latest",
  "loopDetectionEnabled": true,
  "modelParams": {},
  "ephemeralSettings": {}
}

// Global settings with loop detection enabled
{
  "loopDetectionEnabled": true,
  "model": "gpt-4",
  "provider": "openai"
}

// CLI commands
"/set loop-detection-enabled true"
"/set loop-detection-enabled false"
```

## Constraints

- Must not break existing profiles or settings
- Changes must take effect immediately without restart
- Setting must be checked on every turn (no caching)
- Default must be OFF to prevent 400 errors

## Performance Requirements

- Setting resolution: <1ms
- No additional API calls
- No file I/O on every check (use in-memory settings)