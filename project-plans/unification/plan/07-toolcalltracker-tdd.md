# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 07: ToolCallTrackerService TDD Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P07`

## Prerequisites

- Required: Phase 06 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P06" packages/core/src/tools/`
- Expected files from previous phase:
  - `packages/core/src/tools/ToolCallTrackerService.ts`
  - `packages/core/src/tools/types/IToolCallTrackerService.ts`

## Implementation Tasks

### Files to Create

- `packages/core/src/tools/ToolCallTrackerService.test.ts` - Behavioral tests for ToolCallTrackerService
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P07`
  - MUST include: `@requirement:REQ-002.1`
  - MUST include: `@requirement:REQ-002.2`
  - MUST include: `@requirement:REQ-002.3`
  - MUST include: `@requirement:REQ-002.4`

### Files to Modify

- `packages/core/src/tools/types.test.ts`
  - Line 1: Add test suite for tool tracking types
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P07`
  - Implements: `@requirement:REQ-002`

## Required Code Markers

Every test created in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P07
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
grep -r "@plan:PLAN-20250823-UNIFICATION.P07" packages/core/src/tools/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-002" packages/core/src/tools/ | grep "test" | wc -l
# Expected: 2+ occurrences

# Run phase-specific tests (will naturally fail until implementation)
npm test -- --grep "@plan:.*P07" packages/core/src/tools/
# Expected: Tests exist but fail with natural errors (not NotImplemented)
```

### Manual Verification Checklist

- [ ] Phase 06 markers present (ToolCallTrackerService stub)
- [ ] ToolCallTrackerService.test.ts file created with behavioral tests
- [ ] Tests follow proper behavioral pattern (no mocks, no reverse testing)
- [ ] Tests naturally fail with real behavior expectations
- [ ] All requirements covered with actual assertions
- [ ] At least 30% property-based tests included
- [ ] No structure-only testing ("toBeDefined" etc.)

## Success Criteria

- ToolCallTrackerService behavioral tests created
- Tests naturally fail (no NotImplemented patterns)
- All requirements (REQ-002.1 to REQ-002.4) covered in tests
- 30%+ property-based tests to validate edge cases
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/tools/ToolCallTrackerService.test.ts
   git checkout -- packages/core/src/tools/types.test.ts
   ```
2. Files to revert: ToolCallTrackerService test files
3. Cannot proceed to Phase 08 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P07.md`
Contents:

```markdown
Phase: P07
Completed: 2025-08-23
Files Created: 
- packages/core/src/tools/ToolCallTrackerService.test.ts
Files Modified: 
- packages/core/src/tools/types.test.ts
Tests Added: [count of new tests]
Verification: [paste of verification command outputs]
```