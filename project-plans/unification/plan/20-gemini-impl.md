# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 20: Gemini Provider Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P20`

## Prerequisites

- Required: Phase 19 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P19" packages/core/src/providers/gemini/`
- Expected files from previous phase:
  - `packages/core/src/providers/gemini/GeminiProvider.unification.test.ts`

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/gemini/GeminiProvider.ts`
  - Fully implement integration with ConversationManager and ToolCallTrackerService
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P20`
  - Implements: `@requirement:REQ-003.1`
  - Implements: `@requirement:REQ-003.2`
  - Line [reference]: Replace local tool call tracking with ToolCallTrackerService
  - Line [reference]: Replace direct SettingsService model persistence with ConversationManager
  - Line [reference]: Preserve conversation context in clearState method
  - Line [reference]: Update tool call registration with ToolCallTrackerService

### Implementation Details

Following the pseudocode from lines 1-100 in `project-plans/unification/analysis/pseudocode/provider-adapter-pseudocode.md`:

- Line 5: METHOD addToolCallToConversation(conversationId, toolCall)
  - IMPLEMENTATION: Register tool calls with ToolCallTrackerService
- Line 10: METHOD completeToolCallInConversation(conversationId, toolCallId)
  - IMPLEMENTATION: Mark tool calls as completed with ToolCallTrackerService
- Line 15: METHOD cancelToolCallInConversation(conversationId, toolCallId)
  - IMPLEMENTATION: Handle cancellations with ToolCallTrackerService
- Line 20: METHOD updateModelInConversation(conversationId, modelId)
  - IMPLEMENTATION: Update model information in ConversationManager
- Line 25: METHOD onConversationClear()
  - IMPLEMENTATION: Coordinate with ConversationManager for proper cleanup

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P20" packages/core/src/providers/gemini/ | wc -l
# Expected: 1+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-3]" packages/core/src/providers/gemini/ | wc -l
# Expected: 3+ occurrences

# Run Gemini provider tests - should all pass
npm test packages/core/src/providers/gemini/ --grep "unification"
# Expected: All tests pass
```

### Manual Verification Checklist

- [ ] Phase 19 markers present (TDD tests completed)
- [ ] GeminiProvider.ts file updated with full unified integration
- [ ] All methods implemented following pseudocode line references
- [ ] No test modifications made
- [ ] All tests pass naturally
- [ ] TypeScript compiles without errors

## Success Criteria

- Gemini provider fully integrated with unified conversation system
- All methods working per specifications
- All existing tests pass
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   git checkout -- packages/core/src/providers/gemini/GeminiProvider.ts
   ```
2. Files to revert: Gemini provider implementation files
3. Cannot proceed to Phase 21 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P20.md`
Contents:

```markdown
Phase: P20
Completed: 2025-08-23
Files Created: 
Files Modified: 
- packages/core/src/providers/gemini/GeminiProvider.ts
Tests Added: 0
Verification: [paste of verification command outputs showing all tests pass]
```