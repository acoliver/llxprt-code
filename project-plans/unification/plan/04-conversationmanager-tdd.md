# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 04: ConversationManager TDD Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P04`

## Prerequisites

- Required: Phase 03 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P03" packages/core/src/conversation/`
- Expected files from previous phase:
  - `packages/core/src/conversation/ConversationManager.ts`
  - `packages/core/src/conversation/types/IConversationManager.ts`

## Implementation Tasks

### Files to Create

- `packages/core/src/conversation/ConversationManager.test.ts` - Behavioral tests for ConversationManager
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P04`
  - MUST include: `@requirement:REQ-001.1`
  - MUST include: `@requirement:REQ-001.2`
  - MUST include: `@requirement:REQ-001.3`
  - MUST include: `@requirement:REQ-001.4`

### Files to Modify

- `packages/core/src/conversation/types.test.ts`
  - Line 1: Add test suite for conversation types
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P04`
  - Implements: `@requirement:REQ-001`

## Required Code Markers

Every test created in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P04
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
grep -r "@plan:PLAN-20250823-UNIFICATION.P04" packages/core/src/conversation/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-001" packages/core/src/conversation/ | grep "test" | wc -l
# Expected: 2+ occurrences

# Run phase-specific tests (will naturally fail until implementation)
npm test -- --grep "@plan:.*P04" packages/core/src/conversation/
# Expected: Tests exist but fail with natural errors (not NotImplemented)
```

### Manual Verification Checklist

- [ ] Phase 03 markers present (ConversationManager stub)
- [ ] ConversationManager.test.ts file created with behavioral tests
- [ ] Tests follow proper behavioral pattern (no mocks, no reverse testing)
- [ ] Tests naturally fail with real behavior expectations
- [ ] All requirements covered with actual assertions
- [ ] At least 30% property-based tests included
- [ ] No structure-only testing ("toBeDefined" etc.)

## Success Criteria

- ConversationManager behavioral tests created
- Tests naturally fail (no NotImplemented patterns)
- All requirements (REQ-001.1 to REQ-001.4) covered in tests
- 30%+ property-based tests to validate edge cases
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/conversation/ConversationManager.test.ts
   git checkout -- packages/core/src/conversation/types.test.ts
   ```
2. Files to revert: ConversationManager test files
3. Cannot proceed to Phase 05 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P04.md`
Contents:

```markdown
Phase: P04
Completed: 2025-08-23
Files Created: 
- packages/core/src/conversation/ConversationManager.test.ts
Files Modified: 
- packages/core/src/conversation/types.test.ts
Tests Added: [count of new tests]
Verification: [paste of verification command outputs]
```