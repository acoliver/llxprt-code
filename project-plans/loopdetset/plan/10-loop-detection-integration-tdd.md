# Phase 10: Loop Detection Service Integration TDD

## Phase ID

`PLAN-20250823-LOOPDETSET.P10`

## Prerequisites

- Required: Phase 09 completed
- Verification: `grep -q "@plan:PLAN-20250823-LOOPDETSET.P09" packages/core/src/services/loopDetectionService.ts`

## Implementation Tasks

### Files to Create

- `packages/core/src/services/test/loopDetectionService.settings.spec.ts`
  - MUST include: `@plan:PLAN-20250823-LOOPDETSET.P10`
  - MUST include: `@requirement:REQ-003`
  - Test early return when disabled
  - Test normal operation when enabled

### Required Tests

```typescript
/**
 * @plan PLAN-20250823-LOOPDETSET.P10
 * @requirement REQ-003.2
 * @scenario Loop detection disabled
 * @given Config returns false for loop detection
 * @when turnStarted() is called
 * @then Returns false immediately without processing
 */
it('should return false immediately when disabled', async () => {
  const config = createMockConfig({ loopDetectionEnabled: false });
  const service = new LoopDetectionService(config);
  const signal = new AbortController().signal;
  
  const result = await service.turnStarted(signal);
  
  expect(result).toBe(false);
  // Verify no API calls were made (by checking no history fetch)
  expect(config.getGeminiClient().getHistory).not.toHaveBeenCalled();
});

/**
 * @requirement REQ-003.3
 * @scenario Loop detection enabled
 * @given Config returns true for loop detection
 * @when turnStarted() is called
 * @then Processes normally and checks for loops
 */
it('should process normally when enabled', async () => {
  const config = createMockConfig({ loopDetectionEnabled: true });
  const service = new LoopDetectionService(config);
  const signal = new AbortController().signal;
  
  // Set up conditions for loop detection to run
  service.turnsInCurrentPrompt = 5; // Trigger check
  
  const result = await service.turnStarted(signal);
  
  // Should attempt to check (actual result depends on implementation)
  expect(service.turnsInCurrentPrompt).toBe(6); // Incremented
});

/**
 * @requirement REQ-003.1
 * @scenario Setting checked on every turn
 * @given Multiple turns with changing settings
 * @when turnStarted() called multiple times
 * @then Respects current setting each time
 */
it('should check setting on every turn', async () => {
  const config = createMockConfig({ loopDetectionEnabled: false });
  const service = new LoopDetectionService(config);
  const signal = new AbortController().signal;
  
  // First turn - disabled
  let result = await service.turnStarted(signal);
  expect(result).toBe(false);
  
  // Enable for second turn
  config.setLoopDetectionEnabled(true);
  result = await service.turnStarted(signal);
  // Should process (not necessarily detect loop)
  expect(service.turnsInCurrentPrompt).toBeGreaterThan(0);
});
```

### Testing Requirements

1. NO mocking of the actual loop detection logic
2. Test the integration point (early return)
3. Verify no processing when disabled
4. Verify normal processing when enabled
5. Test dynamic setting changes

## Verification Commands

```bash
# Run tests - will fail until implementation
npm test -- loopDetectionService.settings.spec

# Check test count
grep -c "it(" packages/core/src/services/test/loopDetectionService.settings.spec.ts
# Expected: 5+ tests

# No reverse testing
! grep -r "expect.*not\\.toThrow()" packages/core/src/services/test/
```

## Success Criteria

- Tests for enabled and disabled states
- Tests verify early return behavior
- No processing when disabled
- Setting checked each turn

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P10.md`