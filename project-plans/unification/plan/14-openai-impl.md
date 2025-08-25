# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 14: OpenAI Provider Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P14`

## Prerequisites

- Required: Phase 13 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P13" packages/core/src/providers/openai/`
- Expected files from previous phase:
  - `packages/core/src/providers/openai/OpenAIAdapter.test.ts`
  - `packages/core/src/providers/openai/OpenAIProvider.unification.test.ts`

## Implementation Tasks

### Files to Modify

- `packages/core/src/providers/openai/OpenAIAdapter.ts`
  - Implement format conversion between Gemini format and OpenAI format
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P14`
  - Implements: `@requirement:REQ-001.4`
  - Implements: `@requirement:REQ-002.2`

- `packages/core/src/providers/openai/OpenAIProvider.ts`
  - Fully implement integration with ConversationManager and ToolCallTrackerService
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P14`
  - Implements: `@requirement:REQ-003.1`
  - Implements: `@requirement:REQ-003.2`
  - Line [reference]: Replace all local conversation management with ConversationManager calls
  - Line [reference]: Replace SyntheticToolResponseHandler with ToolCallTrackerService
  - Line [reference]: Implement proper token counting via ConversationManager
  - Line [reference]: Preserve conversation context in clearState method

### Implementation Details

Following the pseudocode from lines 1-100 in `project-plans/unification/analysis/pseudocode/provider-adapter-pseudocode.md`:

- Line 5: METHOD convertToOpenAIFormat(content)
  - IMPLEMENTATION: Convert Gemini Content format to OpenAI message format
- Line 10: METHOD convertFromOpenAIFormat(message)
  - IMPLEMENTATION: Convert OpenAI message format to Gemini Content format
- Line 15: METHOD generateSyntheticResponseForCancelledTool(toolCallId)
  - IMPLEMENTATION: Generate OpenAI-specific synthetic response for cancelled tools
- Line 20: METHOD addToolCallToConversation(conversationId, toolCall)
  - IMPLEMENTATION: Register tool calls with ToolCallTrackerService
- Line 25: METHOD completeToolCallInConversation(conversationId, toolCallId)
  - IMPLEMENTATION: Mark tool calls as completed with ToolCallTrackerService
- Line 30: METHOD cancelToolCallInConversation(conversationId, toolCallId)
  - IMPLEMENTATION: Handle cancellations with ToolCallTrackerService

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P14" packages/core/src/providers/openai/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-3]" packages/core/src/providers/openai/ | wc -l
# Expected: 4+ occurrences

# Run OpenAI provider tests - should all pass
npm test packages/core/src/providers/openai/ --grep "unification"
# Expected: All tests pass
```

### Manual Verification Checklist

- [ ] Phase 13 markers present (TDD tests completed)
- [ ] OpenAIAdapter.ts file updated with full implementation
- [ ] OpenAIProvider.ts file updated with full unified integration
- [ ] All methods implemented following pseudocode line references
- [ ] No test modifications made
- [ ] All tests pass naturally
- [ ] TypeScript compiles without errors

## Success Criteria

- OpenAI adapter fully implemented for format conversion
- OpenAI provider fully integrated with unified conversation system
- All methods working per specifications
- All existing tests pass
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   git checkout -- packages/core/src/providers/openai/OpenAIAdapter.ts
   git checkout -- packages/core/src/providers/openai/OpenAIProvider.ts
   ```
2. Files to revert: OpenAI provider implementation files
3. Cannot proceed to Phase 15 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P14.md`
Contents:

```markdown
Phase: P14
Completed: 2025-08-23
Files Created: 
Files Modified: 
- packages/core/src/providers/openai/OpenAIAdapter.ts
- packages/core/src/providers/openai/OpenAIProvider.ts
Tests Added: 0
Verification: [paste of verification command outputs showing all tests pass]
```