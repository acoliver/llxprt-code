# Phase 14: CLI Command Integration Implementation

## Phase ID

`PLAN-20250823-LOOPDETSET.P14`

## Prerequisites

- Required: Phase 13 completed
- Verification: Tests exist for CLI command

## Implementation Tasks

### Files to Modify

- `packages/cli/src/ui/commands/setCommand.ts`
  - UPDATE handler for 'loop-detection'
  - MUST follow pseudocode EXACTLY from lines 60-115
  - ADD comment: `@plan:PLAN-20250823-LOOPDETSET.P14`

### Implementation Following Pseudocode

```typescript
/**
 * @plan PLAN-20250823-LOOPDETSET.P14
 * @requirement REQ-004
 * @pseudocode lines 60-115
 */
'loop-detection-enabled': async (value: string, context: CommandContext) => {
  // Lines 62-67: Validate input
  if (value !== 'true' && value !== 'false') {
    return {
      type: 'message',
      messageType: 'error',
      content: "Invalid value. Use 'true' or 'false'"
    };
  }
  
  // Line 70: Parse boolean value
  const booleanValue = value === 'true';
  
  // Lines 73-74: Get ProfileManager
  const profileManager = new ProfileManager();
  const currentProfileName = context.config.getCurrentProfileName();
  
  // Lines 76-81: Check for active profile
  if (!currentProfileName) {
    return {
      type: 'message',
      messageType: 'error',
      content: 'No active profile'
    };
  }
  
  // Lines 84-91: Load current profile
  const profile = await profileManager.loadProfile(currentProfileName);
  if (!profile) {
    return {
      type: 'message',
      messageType: 'error',
      content: 'Failed to load profile'
    };
  }
  
  // Line 94: Update profile with new setting
  profile.loopDetectionEnabled = booleanValue;
  
  // Lines 97-104: Save updated profile
  try {
    await profileManager.saveProfile(currentProfileName, profile);
  } catch (error) {
    return {
      type: 'message',
      messageType: 'error',
      content: `Failed to save profile: ${error.message}`
    };
  }
  
  // Line 107: Update in-memory settings
  context.config.updateCurrentProfile(profile);
  
  // Lines 110-114: Return success message
  const status = booleanValue ? 'enabled' : 'disabled';
  return {
    type: 'message',
    messageType: 'success',
    content: `Loop detection ${status} for profile ${currentProfileName}`
  };
}
```

### Pseudocode Mapping

- Lines 62-67: Input validation → Check for true/false only
- Line 70: Parse boolean → Convert string to boolean
- Lines 73-81: Profile check → Ensure profile exists
- Lines 84-91: Load profile → Get current profile data
- Line 94: Update setting → Set loopDetectionEnabled field
- Lines 97-104: Save profile → Persist to disk with error handling
- Line 107: Update memory → Apply immediately
- Lines 110-114: User feedback → Success message

## Verification Commands

```bash
# All tests must pass
npm test -- setCommand.loopdetection.spec || exit 1

# No test modifications
git diff packages/cli/src/ui/commands/test/ | grep -E "^[+-]" | grep -v "^[+-]{3}" && \
  echo "FAIL: Tests modified"

# Verify implementation matches pseudocode
grep -q "value !== 'true' && value !== 'false'" packages/cli/src/ui/commands/setCommand.ts || exit 1
grep -q "profile.loopDetectionEnabled = booleanValue" packages/cli/src/ui/commands/setCommand.ts || exit 1
grep -q "saveProfile" packages/cli/src/ui/commands/setCommand.ts || exit 1

# No debug code
! grep -r "console\\.\\|TODO\\|FIXME" packages/cli/src/ui/commands/
```

## Success Criteria

- All CLI command tests pass
- Input validation works
- Profile updates and saves
- Immediate effect (in-memory update)
- Clear success/error messages

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P14.md`