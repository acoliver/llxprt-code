# Simplification Phase 2 - Revised Plan

## Discovery Summary

After deeper analysis, we discovered that the issues were much simpler than initially thought:

1. **Tool IDs**: Two hardcoded `'broken-tool-123'` lines broke existing working functionality
2. **Tool Cancellations**: Were already working correctly with proper synthetic responses from coreToolScheduler
3. **System Prompts**: Still need fixing but are a separate, simpler issue

## Root Causes

### Issue 1: Hardcoded Tool IDs
- **Location**: AnthropicProvider.ts lines 686 & 706
- **Impact**: Breaks tool ID matching, causing spurious "missing response" errors
- **Fix**: Use actual IDs from functionCall/functionResponse objects

### Issue 2: System Prompts as Content
- **Location**: System instructions incorrectly passed as Content with role='system'
- **Impact**: Gemini rejects invalid Content format
- **Fix**: Pass system instructions as configuration, not messages

## Revised Scope

### What We DON'T Need (from original plan)
- ❌ Complex AnthropicToolIdTracker class
- ❌ Tool ID generation utilities
- ❌ Tool ID state management
- ❌ Phases 05-07 (Anthropic tool ID implementation)
- ❌ Complex synthetic response generation (already exists)
- ❌ Extensive TDD cycles for simple fixes

### What We DO Need
- ✅ Fix 2 hardcoded ID lines
- ✅ Fix system prompt architecture
- ✅ Remove tests expecting broken behavior
- ✅ Basic integration tests

## Implementation Phases

### Phase 1: Quick Fixes (2 hours)
- Fix hardcoded 'broken-tool-123' lines
- Remove tests expecting broken IDs
- Verify tool cancellations work again

### Phase 2: System Prompt Architecture (1 day)
- Extract system prompts from Content[]
- Pass as configuration to providers
- Update each provider's handling

### Phase 3: Cleanup (4 hours)
- Remove unnecessary workarounds in OpenAI provider
- Simplify SyntheticToolResponseHandler
- Remove defensive code added for broken IDs

### Phase 4: Validation (4 hours)
- Integration tests for all providers
- Test tool cancellations
- Test system prompts
- Test responses vs completions endpoints

## Success Criteria

1. **No errors** when typing "hello" with any provider
2. **Tool cancellations** work correctly with proper ID matching
3. **System prompts** handled as configuration, not Content
4. **Tests** validate correct behavior only
5. **Simplified codebase** with workarounds removed

## Estimated Timeline

- Total: 2-3 days (vs 2-3 weeks in original plan)
- Critical fixes: 2 hours
- Full remediation: 2 days
- Polish and cleanup: 1 day