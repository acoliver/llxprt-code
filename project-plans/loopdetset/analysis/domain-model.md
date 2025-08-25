# Domain Analysis: Loop Detection Settings Control

## Entity Relationships

### Core Entities

1. **LoopDetectionService**
   - Responsible for detecting conversation loops
   - Makes API calls to analyze conversation history
   - Currently always active

2. **Config**
   - Central configuration service
   - Provides access to settings and profiles
   - Resolution point for all configuration values

3. **SettingsService**
   - Manages global settings persistence
   - Loads/saves from `~/.llxprt/settings.json`
   - In-memory cache of current settings

4. **ProfileManager**
   - Manages profile persistence
   - Loads/saves from `~/.llxprt/profiles/<name>.json`
   - Handles profile switching

5. **SetCommand**
   - CLI command handler
   - Updates ephemeral and persistent settings
   - Provides user interface for configuration

## State Transitions

### Loop Detection State

```
DISABLED (default) <--> ENABLED
    ^                    |
    |                    v
    +-- User Command ----+
    +-- Profile Load ----+
    +-- Global Setting --+
```

### Settings Resolution Flow

```
1. User issues /set command OR profile loads
2. Setting updated in current profile
3. Config.getLoopDetectionEnabled() called
4. Resolution hierarchy:
   - Check current profile setting
   - Check global setting if profile undefined
   - Return system default (false) if both undefined
5. LoopDetectionService checks setting
6. If disabled, skip all processing
```

## Business Rules

1. **Default Behavior**: Loop detection is OFF by default
2. **Hierarchy**: Profile > Global > System Default
3. **Persistence**: Settings survive restarts
4. **Immediate Effect**: No restart required for changes
5. **Profile Isolation**: Each profile has independent setting
6. **Backward Compatibility**: Undefined treated as false

## Edge Cases

### E1: Profile Without Setting
- Profile exists but has no `loopDetectionEnabled` field
- Falls back to global setting
- If global also undefined, uses system default (false)

### E2: Invalid Command Values
- User types `/set loop-detection-enabled yes` (not true/false)
- Show error: "Invalid value. Use 'true' or 'false'"
- No change made to settings

### E3: Profile Switch During Conversation
- User switches profile mid-conversation
- New profile's loop detection setting applies immediately
- No conversation history lost

### E4: Corrupted Settings File
- JSON parse error in settings/profile
- Log error, use system default
- Don't crash the application

### E5: Concurrent Updates
- Multiple CLI instances updating same profile
- Last write wins
- File system handles atomicity

## Error Scenarios

### ERR-001: File System Errors
- **Trigger**: Cannot read/write profile or settings file
- **Behavior**: Log error, continue with in-memory value
- **Recovery**: Retry on next save attempt

### ERR-002: Invalid Boolean Value
- **Trigger**: Non-boolean value in JSON for loopDetectionEnabled
- **Behavior**: Treat as undefined, use fallback
- **Recovery**: Automatic via hierarchy

### ERR-003: Missing Profile
- **Trigger**: Current profile deleted while running
- **Behavior**: Use global setting or default
- **Recovery**: Create new profile on next save

## Performance Considerations

1. **Setting Resolution**: Must be fast (<1ms)
   - Cache current profile in memory
   - No file I/O on every check
   
2. **Turn Processing**: Check happens every turn
   - Early return pattern for efficiency
   - No API calls when disabled

3. **Profile Loading**: One-time cost
   - Load profile at startup or switch
   - Keep in memory during session

## Security Considerations

1. **Input Validation**: Boolean values only
2. **File Permissions**: User-only access to settings
3. **No Code Execution**: Pure data, no eval()
4. **Path Traversal**: Profile names sanitized

## Testing Scenarios

1. **Default State**: New installation has loop detection OFF
2. **Global Override**: Global true overrides default false
3. **Profile Override**: Profile setting overrides global
4. **Command Updates**: /set command updates current profile
5. **Profile Switching**: Setting changes with profile
6. **Invalid Values**: Non-boolean values handled gracefully
7. **Missing Files**: System continues with defaults