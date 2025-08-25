# Phase 08: Config Resolution Implementation

## Phase ID

`PLAN-20250823-LOOPDETSET.P08`

## Prerequisites

- Required: Phase 07 completed
- Verification: `npm test -- config.loopdetection.spec` (tests exist but fail)

## Implementation Tasks

### Files to Modify

- `packages/core/src/config/config.ts`
  - UPDATE method: `getLoopDetectionEnabled()`
  - MUST follow pseudocode EXACTLY from lines 10-30
  - ADD comment: `@plan:PLAN-20250823-LOOPDETSET.P08`

### Implementation Following Pseudocode

```typescript
/**
 * @plan PLAN-20250823-LOOPDETSET.P08
 * @requirement REQ-002
 * @pseudocode lines 10-30
 */
getLoopDetectionEnabled(): boolean {
  // Line 15: Get current profile from ProfileManager
  const currentProfile = this.profileManager?.getCurrentProfile();
  
  // Lines 18-20: Check profile setting
  if (currentProfile?.loopDetectionEnabled !== undefined) {
    return currentProfile.loopDetectionEnabled;
  }
  
  // Lines 23-26: Check global setting
  const globalSettings = this.settingsService?.getSettings();
  if (globalSettings?.loopDetectionEnabled !== undefined) {
    return globalSettings.loopDetectionEnabled;
  }
  
  // Line 29: Return system default
  return false;
}
```

### Pseudocode Mapping

- Line 10: METHOD signature → TypeScript method
- Line 15: Get current profile → `this.profileManager?.getCurrentProfile()`
- Line 18-20: Profile check → Check if defined and return
- Line 23-26: Global check → Check if defined and return
- Line 29: Default return → `return false`

## Verification Commands

```bash
# All tests must pass
npm test -- config.loopdetection.spec || exit 1

# No test modifications
git diff packages/core/src/config/test/ | grep -E "^[+-]" | grep -v "^[+-]{3}" && \
  echo "FAIL: Tests modified"

# Verify pseudocode compliance
grep -q "currentProfile?.loopDetectionEnabled" packages/core/src/config/config.ts || exit 1
grep -q "globalSettings?.loopDetectionEnabled" packages/core/src/config/config.ts || exit 1
grep -q "return false" packages/core/src/config/config.ts || exit 1

# No debug code
! grep -r "console\\.\\|TODO\\|FIXME" packages/core/src/config/
```

## Success Criteria

- All hierarchy tests pass
- Implementation matches pseudocode exactly
- No test modifications
- Proper null checking with optional chaining

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P08.md`