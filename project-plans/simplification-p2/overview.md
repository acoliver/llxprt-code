# Simplification Phase 2: Remediation Plan Overview

## Background

The initial simplification plan (Phase 1) successfully unified providers to use Gemini's native `Content[]` format, but introduced several critical issues that need remediation:

## Issues Discovered

### 1. System Instruction Architecture Problem
**Current State**: System instructions are being incorrectly converted to `Content` objects with `role: 'system'` and mixed into message arrays.

**Problem**: 
- Gemini's Content type only supports `role: 'user' | 'model'`, not 'system'
- System instructions are configuration data, not messages
- This causes "Content with system role is not supported" errors when using Gemini

**Root Cause**: System instructions from core.md and other prompts are being injected as Content with system role instead of being passed as configuration parameters.

### 2. Anthropic Tool ID Bug
**Current State**: Production code uses hardcoded `'broken-tool-123'` for all tool IDs.

**Problem**:
- Tool IDs must be unique and match between tool_use and tool_result
- Anthropic API rejects requests with duplicate or mismatched IDs
- Causes "multiple tool_result blocks with id: broken-tool-123" errors

**Root Cause**: Placeholder test code leaked into production. Tests validate the broken behavior instead of correct behavior.

### 3. Test Philosophy Problems
**Current State**: Tests validate implementation details and broken behavior rather than correct API behavior.

**Examples**:
- Tests expect hardcoded 'broken-tool-123' instead of unique IDs
- Tests validate Content with role='system' (invalid for Gemini)
- Mock theater tests that only verify mocks were called
- No integration tests for actual provider API requirements

### 4. Converter Misuse
**Current State**: Confusion about where and how converters should be used.

**Clarification**:
- GeminiProvider: NO converter (uses Content[] natively)
- OpenAIProvider: Has OpenAIContentConverter (Content[] → OpenAI format)
- AnthropicProvider: Has AnthropicContentConverter (Content[] → Anthropic format)
- GeminiCompatibleWrapper: Should NOT do conversion, just pass Content[] to providers

### 5. Data Flow Issues
**Current State**: Unclear separation between configuration and messages.

**Should Be**:
- System instructions: Configuration passed as parameters
- User/assistant messages: Content[] array
- Tools: Separate configuration

## Architecture Goals

### Correct Data Flow
```
User Input → Content[] (messages only)
           ↓
    GeminiCompatibleWrapper
           ↓
    ┌──────┴──────┬──────────┬────────┐
    ↓             ↓          ↓        ↓
GeminiProvider  OpenAI    Anthropic  Config
(no converter)  Provider   Provider  (system instructions,
                ↓          ↓         tools, etc.)
                Converter  Converter
                ↓          ↓
                OpenAI API Anthropic API
```

### Key Principles
1. **Everything internally uses Gemini's native format** (Content[])
2. **System instructions are configuration**, not messages
3. **Each provider handles conversion internally** via converters
4. **Tests validate correct behavior**, not implementation details
5. **Clear separation** between messages and configuration

## Required Remediations

### Phase 1: Test Cleanup
- Remove tests that expect broken behavior
- Remove mock theater tests
- Add behavioral tests for correct API usage

### Phase 2: System Instruction Fix
- System instructions should never be Content with role='system'
- Pass as configuration parameters to providers
- Each provider converts to their format

### Phase 3: Anthropic Tool ID Fix
- Implement proper unique ID generation
- Ensure tool_use and tool_result IDs match
- Fix tests to validate correct behavior

### Phase 4: Integration Testing
- Add tests that validate actual API requirements
- Test with realistic data formats
- Ensure providers work with their actual APIs

## Success Criteria

1. **Zero errors** when typing "hello" in TUI with any provider
2. **System instructions** work correctly for all providers
3. **Tool calls** work with proper ID matching
4. **Tests** validate correct behavior, not broken implementation
5. **Clear architecture** with proper separation of concerns

## Implementation Approach

Following TDD principles from RULES.md:
1. Write tests for correct behavior (that will fail)
2. Fix implementation to make tests pass
3. Remove tests that validate incorrect behavior
4. Add integration tests for end-to-end validation

## Next Steps

1. Analyze existing tests to identify what to remove
2. Design new tests for correct behavior
3. Create detailed implementation plan
4. Execute plan with proper verification at each phase