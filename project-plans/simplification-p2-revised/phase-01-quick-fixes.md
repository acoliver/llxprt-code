# Phase 1: Quick Fixes

## Objective
Fix the immediate breaking issues caused by hardcoded tool IDs.

## Tasks

### 1. Fix Hardcoded Tool IDs in AnthropicProvider

**File**: `packages/core/src/providers/anthropic/AnthropicProvider.ts`

**Line 686** - Replace:
```typescript
// Use deterministic ID for testing consistency
const toolId = 'broken-tool-123';
```

With:
```typescript
// Use existing ID or generate new one
const toolId = part.functionCall.id || `toolu_${crypto.randomBytes(6).toString('hex')}`;
```

**Line 706** - Replace:
```typescript
// For now, use a fixed ID - in a real scenario, this would match the actual tool_use id
const toolUseId = 'broken-tool-123';
```

With:
```typescript
// Use the ID from the function response (should match the original call)
const toolUseId = part.functionResponse.id || lastToolUseId;
```

### 2. Remove Tests Expecting Broken IDs

**Files to modify**:
- `packages/core/src/providers/anthropic/AnthropicProvider.test.ts`
  - Line 572: Remove expectation of 'broken-tool-123'
  - Update to expect unique IDs matching pattern `/^toolu_[A-Za-z0-9]{12}$/`

### 3. Verify Tool Cancellations Work

**Test manually**:
1. Start TUI with Anthropic provider
2. Type a message that triggers tool use
3. Press ESC while tool is executing
4. Verify no "multiple tool_result blocks with same ID" error
5. Verify conversation continues normally

**Test with other providers**:
- Repeat with OpenAI
- Repeat with Gemini
- Repeat with Responses endpoint

## Verification

Run existing tests:
```bash
npm test -- AnthropicProvider
npm test -- tool
npm test -- cancel
```

All tests should pass except those expecting 'broken-tool-123'.

## Success Criteria

- ✅ No hardcoded 'broken-tool-123' in production code
- ✅ Tool IDs are unique and match between calls and responses
- ✅ Tool cancellations work without errors
- ✅ Existing tests pass (except those removed)

## Estimated Time: 2 hours