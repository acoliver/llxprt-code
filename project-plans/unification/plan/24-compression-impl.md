# Plan: Unified Context and Tool Management

Plan ID: PLAN-20250823-UNIFICATION
Generated: 2025-08-23
Total Phases: 35
Requirements: REQ-001, REQ-002, REQ-003, REQ-004

# Phase 24: Compression Integration Implementation

## Phase ID

`PLAN-20250823-UNIFICATION.P24`

## Prerequisites

- Required: Phase 23 completed
- Verification: `grep -r "@plan:PLAN-20250823-UNIFICATION.P23" packages/core/src/conversation/`
- Expected files from previous phase:
  - `packages/core/src/conversation/CompressionIntegration.test.ts`

## Implementation Tasks

### Files to Modify

- `packages/core/src/conversation/CompressionIntegration.ts`
  - Implement full compression integration following existing patterns
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P24`
  - Implements: `@requirement:REQ-001.3`
  - Implements: `@requirement:REQ-003.4`

- `packages/core/src/conversation/ConversationManager.ts`
  - Fully implement integration with compression service
  - ADD comment: `@plan:PLAN-20250823-UNIFICATION.P24`
  - Implements: `@requirement:REQ-001.3`
  - Line [reference]: Replace manual compression implementation with CompressionIntegration calls
  - Line [reference]: Add proper hooks for compression triggering during provider switching

### Implementation Details

Following the pseudocode from lines 1-50 in `project-plans/unification/analysis/pseudocode/conversation-manager-pseudocode.md`:

- Line 5: METHOD triggerCompressionIfNeeded(conversationId, providerName, modelId)
  - IMPLEMENTATION: Check token count against thresholds and trigger compression if needed
- Line 10: METHOD compressWithExistingService(conversationId)
  - IMPLEMENTATION: Use existing compression service to reduce conversation size
- Line 15: METHOD preserveFunctionCallPairsDuringCompression(contents)
  - IMPLEMENTATION: Ensure function call/response pairs are kept together during compression
- Line 20: METHOD updateTokenCountAfterCompression(conversationId, newTokenCount)
  - IMPLEMENTATION: Update token count in conversation context after compression
- Line 25: METHOD getCompressionThresholdsForProvider(providerName, modelId)
  - IMPLEMENTATION: Retrieve appropriate compression thresholds based on provider and model

## Verification Commands

### Automated Checks

```bash
# Check plan markers exist
grep -r "@plan:PLAN-20250823-UNIFICATION.P24" packages/core/src/conversation/ | wc -l
# Expected: 2+ occurrences

# Check requirements covered
grep -r "@requirement:REQ-00[1-4]" packages/core/src/conversation/ | wc -l
# Expected: 2+ occurrences

# Run compression integration tests - should all pass
npm test packages/core/src/conversation/CompressionIntegration.test.ts
# Expected: All tests pass
```

### Manual Verification Checklist

- [ ] Phase 23 markers present (TDD tests completed)
- [ ] CompressionIntegration.ts file updated with full implementation
- [ ] ConversationManager.ts file updated with compression integration
- [ ] All methods implemented following pseudocode line references
- [ ] No test modifications made
- [ ] All tests pass naturally
- [ ] TypeScript compiles without errors

## Success Criteria

- Compression integration fully implemented
- ConversationManager integrated with compression service
- All methods working per specifications
- All existing tests pass
- TypeScript compiles without errors

## Failure Recovery

If this phase fails:

1. Rollback commands: 
   ```bash
   git checkout -- packages/core/src/conversation/CompressionIntegration.ts
   git checkout -- packages/core/src/conversation/ConversationManager.ts
   ```
2. Files to revert: Compression integration implementation files
3. Cannot proceed to Phase 25 until fixed

## Phase Completion Marker

Create: `project-plans/unification/.completed/P24.md`
Contents:

```markdown
Phase: P24
Completed: 2025-08-23
Files Created: 
Files Modified: 
- packages/core/src/conversation/CompressionIntegration.ts
- packages/core/src/conversation/ConversationManager.ts
Tests Added: 0
Verification: [paste of verification command outputs showing all tests pass]
```