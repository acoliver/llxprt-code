# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 28: Final Integration Tests

## Phase ID

`PLAN-20250823-UNIFICATION.P28`

## Prerequisites

- Required: Phase 27 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P27" packages/core/src/conversation/`
- Expected files from previous phase:
  - `packages/core/src/conversation/SettingsServiceIntegration.ts`
  - `packages/core/src/conversation/ConversationManager.ts` (with SettingsService integration)

## Implementation Tasks

### Files to Create

- `packages/core/src/integration-tests/unified-conversation.e2e.test.ts` - End-to-end tests for unified conversation system
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P28`
  - MUST include: `@requirement:REQ-001`
  - MUST include: `@requirement:REQ-002`
  - MUST include: `@requirement:REQ-003`

- `packages/core/src/integration-tests/provider-switching.e2e.test.ts` - End-to-end tests for provider switching with context preservation
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P28`
  - MUST include: `@requirement:REQ-001.2`
  - MUST include: `@requirement:REQ-003.1`
  - MUST include: `@requirement:REQ-003.4`

### Files to Modify

- `packages/core/src/integration-tests/types.e2e.test.ts`
  - Line 1: Add test suite for unified system types
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P28`
  - Implements: `@requirement:REQ-001`

## Required Code Markers

Every test created in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P28
 * @requirement REQ-XXX
 * @scenario [description of test scenario]
 * @given [input data]
 * @when [action being tested]
 * @then [expected outcome]
 */
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P28" packages/core/src/integration-tests/ | wc -l
# Expected: 3+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-4]" packages/core/src/integration-tests/ | wc -l
# Expected: 4+ occurrences

# Run final integration tests (will naturally fail until implementation)
npm test -- --grep "@plan:.*P28" packages/core/src/integration-tests/
# Expected: Tests exist but fail with natural errors (not NotImplemented)
```

### Manual Verification Checklist

- [ ] Phase 27 markers present (SettingsService implementation)
- [ ] unified-conversation.e2e.test.ts file created with behavioral tests
- [ ] provider-switching.e2e.test.ts file created with behavioral tests
- [ ] Tests follow proper behavioral pattern (no mocks, no reverse testing)
- [ ] Tests naturally fail with real behavior expectations
- [ ] All requirements covered with actual assertions
- [ ] At least 30% property-based tests included
- [ ] No structure-only testing ("toBeDefined" etc.)

## Success Criteria

- Final integration tests created covering all requirements
- Tests naturally fail (no NotImplemented patterns)
- All requirements covered (REQ-001, REQ-002, REQ-003, REQ-004)
- 30%+ property-based tests to validate edge cases
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/integration-tests/unified-conversation.e2e.test.ts
   rm -f packages/core/src/integration-tests/provider-switching.e2e.test.ts
   git checkout -- packages/core/src/integration-tests/types.e2e.test.ts
   ```
2. Files to revert: Final integration test files
3. Cannot proceed to Phase 29 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P28.md`
Contents:

```markdown
Phase: P28
Completed: 2025-08-23
Files Created: 
- packages/core/src/integration-tests/unified-conversation.e2e.test.ts
- packages/core/src/integration-tests/provider-switching.e2e.test.ts
Files Modified: 
- packages/core/src/integration-tests/types.e2e.test.ts
Tests Added: [count of new tests]
Verification: [paste of verification command outputs]
```