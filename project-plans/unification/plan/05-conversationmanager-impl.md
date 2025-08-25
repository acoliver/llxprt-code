# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 05: ConversationManager Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P05`

## Prerequisites

- Required: Phase 04 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P04" packages/core/src/conversation/`
- Expected files from previous phase:
  - `packages/core/src/conversation/ConversationManager.test.ts`

## Implementation Tasks

### Files to Modify

- `packages/core/src/conversation/ConversationManager.ts`
  - Implement all methods following pseudocode from `conversation-manager-pseudocode.md`
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P05`
  - Implements: `@requirement:REQ-001`

### Implementation Details

Following the pseudocode from lines 1-50 in `project-plans/unification/analysis/pseudocode/conversation-manager-pseudocode.md`:

- Line 5: METHOD getConversation(conversationId)
  - IMPLEMENTATION: Retrieve conversation from internal Map storage
- Line 10: METHOD addMessages(conversationId, contents)
  - IMPLEMENTATION: Add contents to conversation, updating token count
- Line 15: METHOD getProviderMessages(conversationId, providerName)
  - IMPLEMENTATION: Convert Gemini format to provider-specific format using adapters
- Line 20: METHOD needsCompression(conversationId, providerName, modelId)
  - IMPLEMENTATION: Check token count against provider/model thresholds
- Line 25: METHOD compressConversation(conversationId)
  - IMPLEMENTATION: Call existing compression service
- Line 30: METHOD persistConversation(conversationId)
  - IMPLEMENTATION: Save to SettingsService
- Line 35: METHOD loadConversation(conversationId)
  - IMPLEMENTATION: Load from SettingsService
- Line 40: METHOD initializeFromSettings()
  - IMPLEMENTATION: Load all conversations during initialization
- Line 45: METHOD setModelForConversation(conversationId, providerName, modelId)
  - IMPLEMENTATION: Track model-specific settings for token counting

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P05" packages/core/src/conversation/ | wc -l
# Expected: 1+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-001" packages/core/src/conversation/ | wc -l
# Expected: 1+ occurrences

# Run ConversationManager tests - should all pass
npm test packages/core/src/conversation/ConversationManager.test.ts
# Expected: All tests pass
```

### Manual Verification Checklist

- [ ] Phase 04 markers present (TDD tests completed)
- [ ] ConversationManager.ts file updated with full implementation
- [ ] All methods implemented following pseudocode line references
- [ ] No test modifications made
- [ ] All tests pass naturally
- [ ] TypeScript compiles without errors

## Success Criteria

- ConversationManager fully implemented following pseudocode
- All methods working per specifications
- All existing tests pass
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   git checkout -- packages/core/src/conversation/ConversationManager.ts
   ```
2. Files to revert: ConversationManager implementation
3. Cannot proceed to Phase 06 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P05.md`
Contents:

```markdown
Phase: P05
Completed: 2025-08-23
Files Created: 
Files Modified: 
- packages/core/src/conversation/ConversationManager.ts
Tests Added: 0
Verification: [paste of verification command outputs showing all tests pass]
```