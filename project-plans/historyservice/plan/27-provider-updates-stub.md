# Phase 27: Provider Updates Stub

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P27  
**Prerequisites:** Phase 26a passed  
**Requirement:** HS-041

## Overview

Remove orphaned tool call fixing logic from providers since HistoryService now handles this responsibility centrally. Providers should NOT have direct access to HistoryService. Instead, GeminiChat will use HistoryService to prepare Content[] arrays and pass them to provider methods as parameters.

## Implementation Tasks

### Task 1: AnthropicProvider Cleanup
**File:** `/packages/core/src/providers/anthropic-provider.ts`

- Remove any orphan detection logic from provider methods
- Update method signatures to accept `Content[]` arrays as parameters instead of accessing history directly
- Remove any synthetic response handling for orphaned tool calls
- Provider should NOT have HistoryService dependency - receives prepared data from GeminiChat

**Code Markers Required:**
```typescript
// MARKER: HS-041-ANTHROPIC-CLEAN - Orphan detection removed from provider
// MARKER: HS-041-ANTHROPIC-PARAMS - Accepts Content[] arrays as method parameters
```

### Task 2: OpenAIProvider Cleanup  
**File:** `/packages/core/src/providers/openai-provider.ts`

- Remove synthetic response handling for orphaned tool calls
- Update method signatures to accept `Content[]` arrays as parameters from GeminiChat
- Clean up any tool call completion logic that's now handled by HistoryService
- Provider should NOT have HistoryService dependency - receives prepared data from GeminiChat

**Code Markers Required:**
```typescript
// MARKER: HS-041-OPENAI-CLEAN - Synthetic response handling removed
// MARKER: HS-041-OPENAI-PARAMS - Accepts Content[] arrays as method parameters
```

### Task 3: GeminiProvider Integration
**File:** `/packages/core/src/providers/gemini-provider.ts`

- Update method signatures to accept `Content[]` arrays as parameters from GeminiChat
- Remove any direct conversation array access
- Provider focuses solely on LLM communication, not history management
- Provider should NOT have HistoryService dependency - receives prepared data from GeminiChat

**Code Markers Required:**
```typescript
// MARKER: HS-041-GEMINI-PARAMS - Accepts Content[] arrays as method parameters
// MARKER: HS-041-GEMINI-CLEAN - No history management in provider
```

### Task 4: Provider Interface Updates
**File:** `/packages/core/src/providers/base-provider.ts` (if exists)

- Update base provider interface methods to accept `Content[]` arrays as parameters
- Define standard pattern for receiving prepared history data from GeminiChat
- Remove any base orphan handling methods

**Code Markers Required:**
```typescript
// MARKER: HS-041-BASE-INTERFACE - Standard Content[] parameter pattern
```

### Task 5: Provider Tests Updates
**Files:** 
- `/packages/core/src/providers/__tests__/anthropic-provider.test.ts`
- `/packages/core/src/providers/__tests__/openai-provider.test.ts`
- `/packages/core/src/providers/__tests__/gemini-provider.test.ts`

- Update tests to pass Content[] arrays as method parameters
- Remove tests for orphan handling (now HistoryService responsibility)
- Add tests verifying providers correctly process Content[] parameters

**Code Markers Required:**
```typescript
// MARKER: HS-041-TEST-PARAMS - Tests use Content[] parameters
// MARKER: HS-041-TEST-CLEAN - Tests verify clean provider separation
```

## Success Criteria

1. **Clean Separation**: No provider contains orphan tool call detection logic
2. **Parameter-Based History**: All providers receive Content[] arrays as method parameters from GeminiChat
3. **No Synthetic Responses**: Providers don't generate synthetic tool call responses
4. **Interface Consistency**: All providers follow same Content[] parameter pattern
5. **Test Coverage**: All provider tests verify correct Content[] parameter handling
6. **No HistoryService Dependency**: Providers have NO direct access to HistoryService

## Verification Steps

1. Search codebase for orphan detection patterns in provider files
2. Verify no providers contain synthetic response generation code
3. Confirm all provider methods accept Content[] arrays as parameters
4. Check NO provider has HistoryService dependency
5. Run provider test suites to ensure functionality preserved
6. Verify GeminiChat correctly prepares and passes Content[] to providers

## Notes

- This phase removes redundant functionality now centralized in HistoryService
- Providers become simpler and more focused on their core LLM interaction logic
- GeminiChat orchestrates between HistoryService and providers
- Providers receive prepared Content[] arrays, maintaining clean architecture
- This separation improves testability and maintainability of provider code