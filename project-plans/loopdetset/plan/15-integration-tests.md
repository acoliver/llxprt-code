# Phase 15: End-to-End Integration Tests

## Phase ID

`PLAN-20250823-LOOPDETSET.P15`

## Prerequisites

- Required: Phase 14 completed
- Verification: All unit tests pass

## Implementation Tasks

### Files to Create

- `packages/core/src/integration-tests/loop-detection-settings.integration.spec.ts`
  - MUST include: `@plan:PLAN-20250823-LOOPDETSET.P15`
  - MUST include: `@requirement:REQ-INT-001`
  - Test complete flow from CLI to service
  - Test with real files and services

### Required Integration Tests

```typescript
/**
 * @plan PLAN-20250823-LOOPDETSET.P15
 * @requirement REQ-INT-001.1
 * @scenario End-to-end flow
 * @given User disables loop detection via CLI
 * @when Multiple turns are processed
 * @then No loop detection API calls are made
 */
it('should disable loop detection end-to-end', async () => {
  // Setup real services
  const config = new Config();
  const profileManager = new ProfileManager();
  const loopDetectionService = new LoopDetectionService(config);
  
  // Create and load test profile
  await profileManager.saveProfile('test', {
    version: 1,
    provider: 'openai',
    model: 'gpt-4',
    loopDetectionEnabled: true, // Start enabled
    modelParams: {},
    ephemeralSettings: {}
  });
  
  await profileManager.load('test');
  
  // Process turn with loop detection enabled
  let result = await loopDetectionService.turnStarted(signal);
  // May or may not detect loop, but should process
  
  // Disable via CLI command simulation
  const setCommand = new SetCommand();
  await setCommand.execute('loop-detection-enabled false', config);
  
  // Process turn with loop detection disabled
  result = await loopDetectionService.turnStarted(signal);
  expect(result).toBe(false); // Always false when disabled
  
  // Verify no API calls were made
  // (Check by monitoring network or API client calls)
});

/**
 * @requirement REQ-INT-001.2
 * @scenario Profile change applies immediately
 * @given Loop detection enabled in profile A
 * @when Switch to profile B with it disabled
 * @then Setting changes without restart
 */
it('should apply profile changes immediately', async () => {
  const config = new Config();
  const profileManager = new ProfileManager();
  const loopDetectionService = new LoopDetectionService(config);
  
  // Create two profiles
  await profileManager.saveProfile('profile-enabled', {
    loopDetectionEnabled: true,
    // ... other fields
  });
  
  await profileManager.saveProfile('profile-disabled', {
    loopDetectionEnabled: false,
    // ... other fields
  });
  
  // Load first profile
  await profileManager.load('profile-enabled');
  expect(config.getLoopDetectionEnabled()).toBe(true);
  
  // Switch profiles
  await profileManager.load('profile-disabled');
  expect(config.getLoopDetectionEnabled()).toBe(false);
  
  // Verify service respects new setting
  const result = await loopDetectionService.turnStarted(signal);
  expect(result).toBe(false);
});

/**
 * @requirement REQ-INT-001.3
 * @scenario Hierarchy resolution works
 * @given Complex settings hierarchy
 * @when Settings are resolved
 * @then Correct precedence is applied
 */
it('should resolve settings hierarchy correctly', async () => {
  const settingsService = new SettingsService();
  const profileManager = new ProfileManager();
  const config = new Config(settingsService, profileManager);
  
  // Set global to true
  await settingsService.updateSettings({ loopDetectionEnabled: true });
  
  // Profile without setting
  await profileManager.saveProfile('no-setting', {
    // No loopDetectionEnabled field
  });
  await profileManager.load('no-setting');
  
  // Should use global
  expect(config.getLoopDetectionEnabled()).toBe(true);
  
  // Profile with false overrides global true
  await profileManager.saveProfile('override', {
    loopDetectionEnabled: false
  });
  await profileManager.load('override');
  
  // Should use profile setting
  expect(config.getLoopDetectionEnabled()).toBe(false);
});
```

### Integration Test Requirements

1. NO mocking - use real services
2. Test actual file I/O
3. Test complete user flows
4. Verify API calls (or lack thereof)
5. Test profile switching
6. Test settings persistence

## Verification Commands

```bash
# Run integration tests
npm test -- loop-detection-settings.integration.spec

# All tests must pass
npm test -- loop-detection-settings.integration.spec || exit 1

# Check test uses real services
! grep -r "mock" packages/core/src/integration-tests/loop-detection-settings.integration.spec.ts
```

## Success Criteria

- End-to-end flows work
- No mocks used
- Real file I/O tested
- Profile switching works
- Settings hierarchy validated

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P15.md`