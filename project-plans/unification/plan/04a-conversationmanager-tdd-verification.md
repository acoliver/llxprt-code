# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 04a: ConversationManager TDD Verification

## Phase ID

`PLAN-20250823-UNIFICATION.P04a`

## Prerequisites

- Required: Phase 04 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P04" packages/core/src/conversation/`
- Expected files from previous phase:
  - `packages/core/src/conversation/ConversationManager.test.ts`

## Implementation Tasks

### Files to Create

- `packages/core/src/conversation/verification/conversation-manager-tdd-verification.md` - Verification document for TDD tests
  - MUST include: `@plan:PLAN-20250823-UNIFICATION.P04a`
  - MUST include: `@requirement:REQ-001.1`
  - MUST include: `@requirement:REQ-001.2`
  - MUST include: `@requirement:REQ-001.3`
  - MUST include: `@requirement:REQ-001.4`

### Files to Modify

- `packages/core/src/conversation/index.ts`
  - Line 1: Export verification document
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P04a`
  - Implements: `@requirement:REQ-001`

## Required Code Markers

Every verification document created in this phase MUST include:

```markdown
<!--
 * @plan PLAN-20250823-UNIFICATION.P04a
 * @requirement REQ-XXX
 * @verification lines 1-N
 -->
```

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P04a" packages/core/src/conversation/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered in tests
grep -r "@requirement:REQ-001" packages/core/src/conversation/ConversationManager.test.ts | wc -l
# Expected: 4+ occurrences

# Check for mock theater (sophisticated fraud)
grep -r "toHaveBeenCalled\|toHaveBeenCalledWith" packages/core/src/conversation/ConversationManager.test.ts
# Expected: 0 occurrences

# Check for reverse testing
grep -r "toThrow('NotYetImplemented')\|expect.*not\.toThrow()" packages/core/src/conversation/ConversationManager.test.ts
# Expected: 0 occurrences

# Check for structure-only testing
grep -r "toHaveProperty\|toBeDefined\|toBeUndefined" packages/core/src/conversation/ConversationManager.test.ts | \
  grep -v "with specific value"
# Expected: 0 occurrences

# Verify behavioral assertions exist
grep -E "toBe\(|toEqual\(|toMatch\(|toContain\(" packages/core/src/conversation/ConversationManager.test.ts > /dev/null
# Expected: Tests have behavioral assertions

# Verify property-based tests included
grep -c "test\.prop\(" packages/core/src/conversation/ConversationManager.test.ts
# Expected: 30%+ of tests are property-based

# Run tests - should fail naturally with stub implementation
npm test packages/core/src/conversation/ConversationManager.test.ts 2>&1 | head -20
# Expected to see natural failures like "Cannot read property" or "is not a function"
# NOT "Error: NotYetImplemented"
```

### Manual Verification Checklist

- [ ] Phase 04 markers present (ConversationManager TDD tests completed)
- [ ] TDD verification document created
- [ ] Tests follow behavioral pattern without mock verification
- [ ] Tests naturally fail with real behavior expectations (not NotImplemented)
- [ ] No reverse testing patterns found
- [ ] No structure-only testing patterns found
- [ ] At least 30% of tests are property-based tests
- [ ] All requirements covered with actual behavioral assertions

## Success Criteria

- TDD tests for ConversationManager created and verified
- Tests naturally fail with real behavior expectations (not stub behavior)
- All requirements covered in behavioral tests
- 30%+ property-based tests to validate edge cases
- No mock theater or reverse testing detected

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   rm -f packages/core/src/conversation/verification/conversation-manager-tdd-verification.md
   ```
2. Files to revert: ConversationManager TDD verification file
3. Cannot proceed to Phase 05 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P04a.md`
Contents:

```markdown
Phase: P04a
Completed: 2025-08-23
Files Created: 
- packages/core/src/conversation/verification/conversation-manager-tdd-verification.md
Files Modified: 
- packages/core/src/conversation/index.ts
Tests Added: 0
Verification: [paste of verification command outputs]
```