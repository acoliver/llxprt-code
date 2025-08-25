# Loop Detection Settings Control

## Overview

Add configurable loop detection setting that is OFF by default, controllable via profiles and global settings, with support for runtime updates via `/set` command.

## Problem Statement

The LoopDetectionService is currently always active and attempts to use Gemini Flash for analysis, but due to a bug, requests are being routed to the current provider (often OpenAI). This causes:
- HTTP 400 errors when context is too large for OpenAI
- Unnecessary API calls and costs
- Background failures that clutter debug logs
- Performance overhead for users who don't need loop detection

## Solution

Implement a hierarchical settings system for loop detection control:

1. **System Default**: OFF (`false`)
2. **Global Override**: Optional setting in `~/.llxprt/settings.json`
3. **Profile Override**: Optional setting in `~/.llxprt/profiles/<name>.json`
4. **Runtime Control**: `/set loop-detection-enabled true|false` command

## Settings Hierarchy

Settings are resolved in priority order (highest to lowest):

```
1. Profile Setting (if defined)
   └─ ~/.llxprt/profiles/<profile-name>.json
   
2. Global Setting (if defined)
   └─ ~/.llxprt/settings.json
   
3. System Default
   └─ false (OFF)
```

## Implementation Components

### 1. Profile Schema Update
**File**: `packages/core/src/types/modelParams.ts`

Add optional `loopDetectionEnabled` field to Profile interface:
```typescript
export interface Profile {
  version: 1;
  provider: string;
  model: string;
  modelParams: ModelParams;
  ephemeralSettings: EphemeralSettings;
  loopDetectionEnabled?: boolean;  // NEW - undefined defaults to global/system
}
```

### 2. Global Settings Schema
**File**: `packages/core/src/settings/types.ts` (or equivalent)

Add optional `loopDetectionEnabled` field to global settings:
```typescript
interface GlobalSettings {
  // ... existing fields ...
  loopDetectionEnabled?: boolean;  // NEW - undefined defaults to system (false)
}
```

### 3. Config/SettingsService Integration
**File**: `packages/core/src/config/config.ts`

Add method to resolve loop detection setting:
```typescript
getLoopDetectionEnabled(): boolean {
  // Check profile → global → system default
}
```

### 4. LoopDetectionService Update
**File**: `packages/core/src/services/loopDetectionService.ts`

Add early return in `turnStarted()`:
```typescript
async turnStarted(signal: AbortSignal): Promise<boolean> {
  if (!this.config.getLoopDetectionEnabled()) {
    return false;  // Skip all loop detection
  }
  // ... existing logic ...
}
```

### 5. Slash Command Implementation
**File**: `packages/cli/src/ui/commands/setCommand.ts`

Add handler for `/set loop-detection-enabled`:
- Updates current profile's `loopDetectionEnabled` setting
- Saves to profile file
- Takes effect immediately

## User Scenarios

### Scenario 1: Default User
- No configuration needed
- Loop detection is OFF
- No 400 errors or unnecessary API calls

### Scenario 2: Power User Wants It Always On
```json
// ~/.llxprt/settings.json
{
  "loopDetectionEnabled": true,
  // ... other settings ...
}
```
- All profiles inherit this setting unless overridden
- Loop detection active for all sessions

### Scenario 3: Profile-Specific Control
```json
// ~/.llxprt/profiles/development.json
{
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-latest",
  "loopDetectionEnabled": true,  // ON for this profile
  // ...
}

// ~/.llxprt/profiles/production.json
{
  "provider": "openai",
  "model": "gpt-4",
  "loopDetectionEnabled": false,  // OFF for this profile
  // ...
}
```

### Scenario 4: Temporary Override
```bash
# Enable for current session
/set loop-detection-enabled true

# Disable again
/set loop-detection-enabled false
```

## Benefits

1. **Immediate Fix**: Stops 400 errors for users with large contexts
2. **Cost Savings**: Reduces unnecessary API calls
3. **Performance**: Eliminates overhead when not needed
4. **Flexibility**: Users can enable when debugging loops
5. **Backward Compatible**: Existing users unaffected (defaults to OFF)
6. **Profile Integration**: Works with existing profile system

## Testing Requirements

1. **Default Behavior**: Verify loop detection is OFF by default
2. **Global Override**: Test global settings.json override
3. **Profile Override**: Test profile-specific settings
4. **Runtime Updates**: Test `/set loop-detection` command
5. **Hierarchy Resolution**: Verify correct priority order
6. **Service Integration**: Confirm LoopDetectionService respects setting

## Migration

No migration needed - the absence of the setting defaults to OFF, which is the desired behavior for existing users.

## Future Considerations

1. **Fix Root Cause**: Address the bug where loop detection uses wrong provider
2. **UI Indicator**: Show loop detection status in UI when enabled
3. **Statistics**: Track when loop detection actually prevents loops
4. **Auto-Enable**: Consider auto-enabling when certain patterns detected
5. **Per-Provider Settings**: Different thresholds for different providers

## Implementation Priority

**High Priority** - This is causing active errors for users and should be implemented soon to improve reliability and reduce costs.