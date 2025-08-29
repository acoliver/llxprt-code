# Phase 03: HistoryService Interface Stub

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P03  
**Title:** Create HistoryService Interface and Basic Stub Implementation  
**Requirements:** HS-001 to HS-008 (Core History Management)

## Prerequisites

- [ ] Phase 02a completed successfully (Pseudocode verification passed)
- [ ] All pseudocode files contain numbered line references
- [ ] Requirements HS-001 to HS-008 validated in requirements.md

## Phase Overview

Create the basic HistoryService interface and stub implementation that defines the core contract for history management. This stub phase establishes the method signatures and can either throw `NotYetImplemented` or return empty values.

## Implementation Tasks

### Files to Create

1. **Create `/packages/core/src/services/history/HistoryService.ts`**
   - Basic class structure with stub methods
   - Can throw NotYetImplemented OR return empty values
   - Include @plan, @requirement, and @pseudocode markers

2. **Create `/packages/core/src/services/history/types.ts`**  
   - TypeScript interfaces and enums
   - Message, HistoryState, and EventEmitter types

3. **Create `/packages/core/src/services/history/index.ts`**
   - Export barrel file for the service

### Files to Modify

None (pure creation phase)

## Required Code Structure

### HistoryService.ts Stub Methods
```typescript
export class HistoryService {
  // @plan PLAN-20250128-HISTORYSERVICE.P03
  // @requirement HS-001: Single authoritative history array
  // @pseudocode history-service.md:21-36
  constructor(conversationId: string) {
    // Stub: Initialize basic properties or throw NotYetImplemented
  }

  // @requirement HS-002: Add user messages
  // @pseudocode history-service.md:38-63
  addMessage(content: string, role: MessageRole, metadata?: MessageMetadata): string {
    // Stub: Return empty UUID or throw NotYetImplemented
  }

  // @requirement HS-005: Retrieve complete history  
  // @pseudocode history-service.md:65-77
  getMessages(startIndex?: number, count?: number): Message[] {
    // Stub: Return empty array or throw NotYetImplemented
  }

  // @requirement HS-006: Curated history retrieval
  getCuratedHistory(): Message[] {
    // Stub: Return empty array or throw NotYetImplemented  
  }

  // @requirement HS-007: Last message accessors
  getLastMessage(): Message | null {
    // Stub: Return null or throw NotYetImplemented
  }

  getLastUserMessage(): Message | null {
    // Stub: Return null or throw NotYetImplemented
  }

  getLastModelMessage(): Message | null {
    // Stub: Return null or throw NotYetImplemented
  }

  // @requirement HS-008: Clear history
  // @pseudocode history-service.md:142-167
  clearHistory(): number {
    // Stub: Return 0 or throw NotYetImplemented
  }
}
```

## Required Markers

Each method MUST include these exact markers:
- `@plan PLAN-20250128-HISTORYSERVICE.P03`
- `@requirement HS-XXX` (specific requirement)
- `@pseudocode history-service.md:LINE_START-LINE_END`

## Verification Commands

```bash
# Check file creation
ls -la /packages/core/src/services/history/HistoryService.ts
ls -la /packages/core/src/services/history/types.ts
ls -la /packages/core/src/services/history/index.ts

# Verify stub methods exist
grep -n "addMessage" /packages/core/src/services/history/HistoryService.ts
grep -n "getMessages" /packages/core/src/services/history/HistoryService.ts
grep -n "clearHistory" /packages/core/src/services/history/HistoryService.ts

# Check required markers
grep -c "@plan PLAN-20250128-HISTORYSERVICE.P03" /packages/core/src/services/history/HistoryService.ts
grep -c "@requirement" /packages/core/src/services/history/HistoryService.ts
grep -c "@pseudocode" /packages/core/src/services/history/HistoryService.ts

# Verify TypeScript compilation
npx tsc --noEmit /packages/core/src/services/history/HistoryService.ts
```

## Success Criteria

- [ ] All three files created successfully
- [ ] HistoryService class exports correctly
- [ ] All stub methods have proper signatures matching requirements
- [ ] Every method includes required @plan, @requirement, @pseudocode markers
- [ ] TypeScript compilation passes without errors
- [ ] Methods either return appropriate empty values OR throw NotYetImplemented
- [ ] No tests created (stub phase only)

## Failure Recovery

If verification fails:
1. Check file paths match exactly: `/packages/core/src/services/history/`
2. Verify all required markers are present in each method
3. Ensure pseudocode line references match actual pseudocode files
4. Fix TypeScript compilation errors
5. Re-run verification commands

## Next Phase

Phase 03a: Interface Verification - Validate stub implementation meets requirements