# Phase 07: Config Resolution TDD

## Phase ID

`PLAN-20250823-LOOPDETSET.P07`

## Prerequisites

- Required: Phase 06 completed
- Verification: `grep -q "getLoopDetectionEnabled" packages/core/src/config/config.ts`

## Implementation Tasks

### Files to Create

- `packages/core/src/config/test/config.loopdetection.spec.ts`
  - MUST include: `@plan:PLAN-20250823-LOOPDETSET.P07`
  - MUST include: `@requirement:REQ-002`
  - Test resolution hierarchy
  - Test profile > global > default precedence

### Required Tests

```typescript
/**
 * @plan PLAN-20250823-LOOPDETSET.P07
 * @requirement REQ-002.1
 * @scenario Profile setting takes precedence
 * @given Profile has loopDetectionEnabled: true, Global has false
 * @when getLoopDetectionEnabled() called
 * @then Returns true (profile value)
 */
it('should use profile setting when defined', () => {
  const config = new Config();
  // Setup profile with loopDetectionEnabled: true
  config.setCurrentProfile({ loopDetectionEnabled: true, /* other fields */ });
  // Setup global with loopDetectionEnabled: false
  config.setGlobalSettings({ loopDetectionEnabled: false });
  
  expect(config.getLoopDetectionEnabled()).toBe(true);
});

/**
 * @requirement REQ-002.2
 * @scenario Global setting when profile undefined
 * @given Profile has no loopDetectionEnabled, Global has true
 * @when getLoopDetectionEnabled() called
 * @then Returns true (global value)
 */
it('should fall back to global when profile undefined', () => {
  const config = new Config();
  // Profile without loopDetectionEnabled field
  config.setCurrentProfile({ /* no loopDetectionEnabled */ });
  // Global with loopDetectionEnabled: true
  config.setGlobalSettings({ loopDetectionEnabled: true });
  
  expect(config.getLoopDetectionEnabled()).toBe(true);
});

/**
 * @requirement REQ-002.3
 * @scenario System default when both undefined
 * @given No profile or global loopDetectionEnabled
 * @when getLoopDetectionEnabled() called
 * @then Returns false (system default)
 */
it('should return false when both undefined', () => {
  const config = new Config();
  // No loopDetectionEnabled in either
  config.setCurrentProfile({});
  config.setGlobalSettings({});
  
  expect(config.getLoopDetectionEnabled()).toBe(false);
});
```

### Test Coverage Requirements

1. Profile true, global false → returns true
2. Profile false, global true → returns false
3. Profile undefined, global true → returns true
4. Profile undefined, global false → returns false
5. Both undefined → returns false (default)
6. No profile loaded → checks global only
7. No settings at all → returns false

## Verification Commands

```bash
# Run tests - will fail until implementation
npm test -- config.loopdetection.spec

# Check test count
grep -c "it(" packages/core/src/config/test/config.loopdetection.spec.ts
# Expected: 7+ tests

# No forbidden patterns
! grep -r "toThrow('NotYetImplemented')" packages/core/src/config/test/
! grep -r "expect.*not\\.toThrow()" packages/core/src/config/test/
```

## Success Criteria

- Tests cover all hierarchy scenarios
- Tests fail with stub returning false
- No reverse testing
- Clear behavioral assertions

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P07.md`