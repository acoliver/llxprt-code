# Phase 13: CLI Command Integration TDD

## Phase ID

`PLAN-20250823-LOOPDETSET.P13`

## Prerequisites

- Required: Phase 12 completed
- Verification: `grep -q "loop-detection" packages/cli/src/ui/commands/setCommand.ts`

## Implementation Tasks

### Files to Create

- `packages/cli/src/ui/commands/test/setCommand.loopdetection.spec.ts`
  - MUST include: `@plan:PLAN-20250823-LOOPDETSET.P13`
  - MUST include: `@requirement:REQ-004`
  - Test true/false values
  - Test invalid values
  - Test profile update

### Required Tests

```typescript
/**
 * @plan PLAN-20250823-LOOPDETSET.P13
 * @requirement REQ-004.1
 * @scenario Enable loop detection
 * @given User types /set loop-detection-enabled true
 * @when Command is executed
 * @then Profile updated with loopDetectionEnabled: true
 */
it('should enable loop detection for current profile', async () => {
  const context = createMockContext();
  const result = await setCommand.handlers['loop-detection-enabled']('true', context);
  
  expect(result.type).toBe('message');
  expect(result.messageType).toBe('success');
  expect(result.content).toContain('enabled');
  
  // Verify profile was updated
  const profile = await context.profileManager.getCurrentProfile();
  expect(profile.loopDetectionEnabled).toBe(true);
});

/**
 * @requirement REQ-004.2
 * @scenario Disable loop detection
 * @given User types /set loop-detection-enabled false
 * @when Command is executed
 * @then Profile updated with loopDetectionEnabled: false
 */
it('should disable loop detection for current profile', async () => {
  const context = createMockContext();
  const result = await setCommand.handlers['loop-detection-enabled']('false', context);
  
  expect(result.type).toBe('message');
  expect(result.messageType).toBe('success');
  expect(result.content).toContain('disabled');
  
  const profile = await context.profileManager.getCurrentProfile();
  expect(profile.loopDetectionEnabled).toBe(false);
});

/**
 * @requirement REQ-004.4
 * @scenario Invalid value
 * @given User types /set loop-detection-enabled yes
 * @when Command is executed
 * @then Error message returned
 */
it('should reject invalid values', async () => {
  const context = createMockContext();
  const result = await setCommand.handlers['loop-detection-enabled']('yes', context);
  
  expect(result.type).toBe('message');
  expect(result.messageType).toBe('error');
  expect(result.content).toContain("Use 'true' or 'false'");
});

/**
 * @requirement REQ-004.3
 * @scenario Setting persists
 * @given Loop detection enabled
 * @when Profile is saved and reloaded
 * @then Setting is preserved
 */
it('should persist setting to profile file', async () => {
  const context = createMockContext();
  
  // Enable loop detection
  await setCommand.handlers['loop-detection-enabled']('true', context);
  
  // Save profile
  await context.profileManager.saveCurrentProfile();
  
  // Load profile fresh
  const loaded = await context.profileManager.loadProfile('test-profile');
  expect(loaded.loopDetectionEnabled).toBe(true);
});
```

### Test Coverage Requirements

1. Enable loop detection (true)
2. Disable loop detection (false)
3. Invalid values (yes, 1, on, etc.)
4. No active profile error
5. Profile save failure handling
6. Setting persistence
7. Immediate effect (no restart)

## Verification Commands

```bash
# Run tests - will fail until implementation
npm test -- setCommand.loopdetection.spec

# Check test count
grep -c "it(" packages/cli/src/ui/commands/test/setCommand.loopdetection.spec.ts
# Expected: 7+ tests

# No forbidden patterns
! grep -r "toThrow('NotYetImplemented')" packages/cli/src/ui/commands/test/
```

## Success Criteria

- Tests for all valid and invalid inputs
- Tests verify profile update
- Tests verify persistence
- Clear error messages for invalid input

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P13.md`