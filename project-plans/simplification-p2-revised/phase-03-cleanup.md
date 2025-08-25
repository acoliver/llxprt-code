# Phase 3: Cleanup

## Objective
Remove unnecessary workarounds and complexity that was added to handle broken tool IDs.

## Tasks

### 1. Simplify SyntheticToolResponseHandler

**File**: `packages/core/src/providers/openai/syntheticToolResponses.ts`

**Simplify deep copy logic (lines 132-178)**:
- Remove complex property copying
- Remove defensive handling for JSONResponse objects
- Simplify to basic message copying

**Before** (complex):
```typescript
const deepCopyMessages: IMessage[] = messages.map((msg) => {
  // 40+ lines of defensive copying...
});
```

**After** (simple):
```typescript
const patchedMessages = [...messages];
// Just add missing synthetic responses
```

### 2. Remove Redundant Synthetic Response Generation

Since coreToolScheduler already creates responses for cancelled tools:
- Check if synthetic responses are being duplicated
- Remove redundant generation if found
- Keep only edge case handling

### 3. Remove Anthropic Converter Tool ID Generation

**File**: `packages/core/src/providers/converters/AnthropicContentConverter.ts`

Remove unused `generateToolId()` method (line 162) since provider handles this.

### 4. Clean Up OpenAI Provider

**File**: `packages/core/src/providers/openai/OpenAIProvider.ts`

Remove workarounds for broken IDs:
- ID reconciliation logic
- Defensive checks for 'broken-tool-123'
- Complex message patching

### 5. Update Tests

**Remove**:
- Tests expecting 'broken-tool-123'
- Tests for complex deep copy behavior
- Tests for duplicate synthetic responses
- Mock theater tests identified in original plan

**Keep/Add**:
- Tests for proper ID flow
- Tests for cancellation handling
- Integration tests

## Code to Remove

### From AnthropicProvider.test.ts
```typescript
// Line 572 - Remove this expectation
expect(syntheticResult.tool_use_id).toBe('broken-tool-123');
```

### From OpenAI Tests
Remove any test that:
- Expects hardcoded IDs
- Tests defensive workarounds
- Validates mock interactions instead of behavior

## Success Criteria

- ✅ Simpler SyntheticToolResponseHandler (~50% less code)
- ✅ No redundant synthetic response generation
- ✅ No unused tool ID generation methods
- ✅ Cleaner OpenAI provider without workarounds
- ✅ All tests pass with real behavior validation

## Estimated Time: 4 hours