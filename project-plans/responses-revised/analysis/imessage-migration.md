# IMessage Migration Plan

/**
 * @plan PLAN-20250826-RESPONSES.P30
 * @requirement REQ-003.1
 * IMessage to Content[] Migration Analysis and Plan
 */

## Executive Summary

Total files found using IMessage: **37 source files** (excluding dist/ and node_modules)

**Status**: Parser already migrated to Content format in Phase 23. Remaining work is to migrate consumers of IMessage to use Content format.

## Files to Modify

### 1. Core Provider Files
- **packages/core/src/providers/IMessage.ts**
  - STATUS: File exists, defines IMessage interface
  - ACTION: DELETE - No longer needed after migration
  - IMPACT: Will break all files importing this interface

### 2. OpenAI Provider Files
- **packages/core/src/providers/openai/OpenAIProvider.ts**
  - USAGE: Expects IMessage from parseResponsesStream, uses IMessage properties (content, tool_calls, usage, id)
  - MIGRATION: Update to handle Content format with metadata
  - TEST IMPACT: Multiple test files affected

- **packages/core/src/providers/openai/parseResponsesStream.ts**
  - STATUS: ✅ ALREADY MIGRATED (Phase 23) - Returns Content with metadata
  - USAGE: No longer imports IMessage
  - ACTION: None needed

### 3. Content Converters
- **packages/core/src/providers/converters/OpenAIContentConverter.ts**
  - USAGE: Converts between IMessage and Content
  - MIGRATION: Update to work with Content only, remove IMessage handling
  - ACTION: Simplify conversion logic

### 4. Utility Files
- **packages/core/src/providers/openai/IChatGenerateParams.ts**
  - USAGE: Interface references IMessage
  - MIGRATION: Change to Content[]

- **packages/core/src/providers/openai/syntheticToolResponses.ts**
  - USAGE: Creates IMessage objects
  - MIGRATION: Create Content objects instead

- **packages/core/src/providers/openai/estimateRemoteTokens.ts**
  - USAGE: Processes IMessage arrays
  - MIGRATION: Process Content arrays

- **packages/core/src/providers/openai/buildResponsesRequest.ts**
  - USAGE: Takes IMessage[] as input
  - MIGRATION: Take Content[] as input

- **packages/core/src/providers/openai/ConversationCache.ts**
  - USAGE: Stores and retrieves IMessage
  - MIGRATION: Store and retrieve Content

### 5. CLI Package Files
- **packages/cli/src/providers/index.ts**
  - USAGE: Exports IMessage
  - MIGRATION: Remove IMessage export

- **packages/cli/src/utils/privacy/ConversationDataRedactor.ts**
  - USAGE: Redacts IMessage content
  - MIGRATION: Redact Content.parts[].text instead

- **packages/cli/src/storage/ConversationStorage.test.ts**
  - USAGE: Test with IMessage
  - MIGRATION: Test with Content

### 6. Test Files (21 files)
All test files need updates to use Content instead of IMessage:
- OpenAI provider tests
- Integration tests
- Logging tests
- Storage tests

## Migration Pattern

### BEFORE (IMessage)
```typescript
import { IMessage } from '../providers/IMessage.js';

interface Response {
  messages: IMessage[];
}

function processMessage(msg: IMessage) {
  console.log(msg.content);
  if (msg.tool_calls) {
    // Handle tool calls
  }
  if (msg.usage) {
    // Handle usage
  }
}
```

### AFTER (Content)
```typescript
import { Content } from '@google/generative-ai';

interface Response {
  messages: Content[];
}

function processMessage(msg: Content & { metadata?: { responseId: string }; usage?: any; id?: string }) {
  const text = msg.parts?.map(p => p.text || '').join('') || '';
  console.log(text);
  
  const toolCalls = msg.parts?.filter(p => p.functionCall);
  if (toolCalls?.length) {
    // Handle function calls
  }
  
  if ('usage' in msg && msg.usage) {
    // Handle usage
  }
}
```

## Migration Steps (Recommended Order)

### Phase 1: Core Infrastructure
1. **Update IChatGenerateParams.ts** - Change interface to use Content[]
2. **Update OpenAIContentConverter.ts** - Remove IMessage handling  
3. **Update buildResponsesRequest.ts** - Accept Content[] input
4. **Update estimateRemoteTokens.ts** - Process Content instead of IMessage

### Phase 2: OpenAI Provider Core
5. **Update OpenAIProvider.ts** - Main provider to handle Content format
   - Update generateChatCompletion return type
   - Update internal logic to work with Content.parts
   - Handle metadata.responseId instead of id property
   - Convert usage handling
6. **Update ConversationCache.ts** - Store Content instead of IMessage
7. **Update syntheticToolResponses.ts** - Create Content objects

### Phase 3: CLI Package
8. **Update ConversationDataRedactor.ts** - Redact Content.parts[].text
9. **Update providers/index.ts** - Remove IMessage export

### Phase 4: Tests
10. **Update all 21 test files** - Change mock data and expectations to Content format

### Phase 5: Cleanup
11. **Delete IMessage.ts** - Remove the interface entirely
12. **Verify TypeScript compilation** - Ensure no remaining references

## Test Impact Analysis

### Critical Tests Affected
- **OpenAI Provider tests** (8 files) - Need Content format mock data
- **Integration tests** (6 files) - Update expectations
- **Logging tests** (3 files) - Update IMessage handling
- **Storage tests** (4 files) - Change stored format

### Property-Based Tests
- Parser tests already use Content format ✅
- Provider tests need Content format generators
- Integration tests need Content format validation

## Type Compatibility Issues

### Key Differences
1. **IMessage.content** → **Content.parts[].text**
2. **IMessage.tool_calls** → **Content.parts[].functionCall**  
3. **IMessage.role** → **Content.role** (different enum values: 'assistant' → 'model')
4. **IMessage.usage** → **Custom metadata field**
5. **IMessage.id** → **Custom metadata field**

### Backward Compatibility Strategy
Create utility functions to bridge the gap during migration:

```typescript
function contentToText(content: Content): string {
  return content.parts?.map(p => p.text || '').join('') || '';
}

function contentHasTools(content: Content): boolean {
  return content.parts?.some(p => p.functionCall) || false;
}

function getContentMetadata(content: Content): { responseId?: string; usage?: any } {
  return (content as any).metadata || {};
}
```

## Risk Analysis

### High Risk
- **OpenAIProvider.ts** - Complex file with multiple IMessage usages
- **Integration tests** - May break end-to-end flows
- **ConversationCache.ts** - Storage format changes

### Medium Risk  
- **Content converters** - Logic changes needed
- **CLI privacy redaction** - Text extraction changes

### Low Risk
- **Test files** - Isolated changes
- **Interface files** - Simple type changes

## Verification Commands

```bash
# 1. Find remaining IMessage references (should be 0 after migration)
grep -r "IMessage" packages/core/src --include="*.ts" | grep -v node_modules | wc -l

# 2. Verify TypeScript compilation
npm run typecheck

# 3. Verify all tests pass
npm test

# 4. Check that parser still returns Content
grep -A 5 "AsyncIterableIterator<Content>" packages/core/src/providers/openai/parseResponsesStream.ts

# 5. Verify IMessage.ts deleted
test ! -f packages/core/src/providers/IMessage.ts && echo "IMessage.ts deleted" || echo "IMessage.ts still exists"
```

## Success Criteria

- [ ] All 37 files migrated from IMessage to Content
- [ ] IMessage.ts deleted
- [ ] TypeScript compilation succeeds
- [ ] All tests pass
- [ ] Parser continues to return Content with metadata.responseId
- [ ] OpenAI Provider handles Content format correctly
- [ ] End-to-end conversation tracking works

## Notes

The parser (parseResponsesStream.ts) was already migrated in Phase 23 and correctly returns Content format with metadata.responseId. The remaining work is to migrate all consumers of IMessage to handle the new Content format.

This migration enables:
- ✅ Unified Content format across providers
- ✅ Response ID tracking in metadata
- ✅ Better Google AI SDK integration  
- ✅ Simplified type system