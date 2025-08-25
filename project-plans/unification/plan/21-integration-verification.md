# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 21: Integration Verification Tests

## Phase ID

`PLAN-20250823-UNIFICATION.P21`

## Prerequisites

- Required: Phase 20 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P20" packages/core/src/providers/gemini/`
- Expected files from previous phase:
  - `packages/core/src/providers/gemini/GeminiProvider.ts` (with unified implementation)

## Implementation Tasks

### Files to Create

- `packages/core/src/conversation/ConversationManager.integration.test.ts` - Integration tests for ConversationManager across providers
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P21`
  - MUST include: `@requirement:REQ-001`
  - MUST include: `@requirement:REQ-003`

- `packages/core/src/tools/ToolCallTrackerService.integration.test.ts` - Integration tests for ToolCallTrackerService across providers
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P21`
  - MUST include: `@requirement:REQ-002`
  - MUST include: `@requirement:REQ-003`

### Files to Modify

- `packages/core/src/conversation/types.integration.test.ts`
  - Line 1: Add integration test suite for conversation types
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P21`
  - Implements: `@requirement:REQ-001`

- `packages/core/src/tools/types.integration.test.ts`
  - Line 1: Add integration test suite for tool tracking types
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P21`
  - Implements: `@requirement:REQ-002`

## Required Code Markers

Every test created in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250823-UNIFICATION.P21
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
grep -r "@plan:PLAN-20250823-UNIFICATION.P21" packages/core/src/ | grep "test" | wc -l
# Expected: 4+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-4]" packages/core/src/ | grep "test" | wc -l
# Expected: 4+ occurrences

# Run integration tests (will naturally fail until implementation)
npm test -- --grep "@plan:.*P21" packages/core/src/
# Expected: Tests exist but fail with natural errors (not NotImplemented)
```

### Manual Verification Checklist

- [ ] Phase 20 markers present (Gemini implementation)
- [ ] ConversationManager integration test file created
- [ ] ToolCallTrackerService integration test file created
- [ ] Integration test files for types created
- [ ] Tests follow proper behavioral pattern (no mocks, no reverse testing)
- [ ] Tests naturally fail with real behavior expectations
- [ ] All requirements covered with actual assertions
- [ ] At least 30% property-based tests included
- [ ] No structure-only testing ("toBeDefined" etc.)

## Success Criteria

- Integration tests created for ConversationManager and ToolCallTrackerService
- Tests naturally fail (no NotImplemented patterns)
- All requirements covered (REQ-001, REQ-002, REQ-003)
- 30%+ property-based tests to validate edge cases
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/conversation/ConversationManager.integration.test.ts
   rm -f packages/core/src/tools/ToolCallTrackerService.integration.test.ts
   git checkout -- packages/core/src/conversation/types.integration.test.ts
   git checkout -- packages/core/src/tools/types.integration.test.ts
   ```
2. Files to revert: Integration test files
3. Cannot proceed to Phase 22 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P21.md`
Contents:

```markdown
Phase: P21
Completed: 2025-08-23
Files Created: 
- packages/core/src/conversation/ConversationManager.integration.test.ts
- packages/core/src/tools/ToolCallTrackerService.integration.test.ts
Files Modified: 
- packages/core/src/conversation/types.integration.test.ts
- packages/core/src/tools/types.integration.test.ts
Tests Added: [count of new tests]
Verification: [paste of verification command outputs]
```