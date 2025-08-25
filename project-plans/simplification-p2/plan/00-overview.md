# Plan: Content Format Remediation

## Plan Header

```markdown
# Plan: Content Format Remediation Phase 2

Plan ID: PLAN-20250824-CONTENT-REMEDIATION
Generated: 2025-08-24
Total Phases: 16
Requirements: [REQ-001.1, REQ-002.1, REQ-003.1, REQ-004.1, REQ-INT-001, REQ-INT-002]
```

## Executive Summary

This plan addresses critical issues discovered after the initial Content[] format unification that prevent proper provider functionality. The remediation focuses on four key areas requiring systematic TDD-based fixes.

## Background and Issues

### 1. System Instruction Architecture Problem
**Current State**: System instructions are incorrectly converted to `Content` objects with `role: 'system'` and mixed into message arrays.

**Problem**: 
- Gemini's Content type only supports `role: 'user' | 'model'`, not 'system'
- System instructions are configuration data, not messages
- Causes "Content with system role is not supported" errors

**Root Cause**: System instructions from core.md are injected as Content with system role instead of being passed as configuration parameters.

### 2. Anthropic Tool ID Bug
**Current State**: Production code uses hardcoded `'broken-tool-123'` for all tool IDs.

**Problem**:
- Tool IDs must be unique and match between tool_use and tool_result
- Anthropic API rejects requests with duplicate/mismatched IDs
- Causes "multiple tool_result blocks with id: broken-tool-123" errors

**Root Cause**: Placeholder test code leaked into production. Tests validate broken behavior.

### 3. Test Philosophy Problems
**Current State**: 47 tests validate implementation details and broken behavior.

**Examples**:
- Tests expect hardcoded 'broken-tool-123' instead of unique IDs
- Tests validate Content with role='system' (invalid for Gemini)
- Mock theater tests that only verify mocks were called
- No integration tests for actual provider API requirements

### 4. Converter Architecture Issues
**Current State**: Confusion about where and how converters should be used.

**Clarification**:
- GeminiProvider: NO converter (uses Content[] natively)
- OpenAIProvider: Has OpenAIContentConverter (Content[] → OpenAI format)
- AnthropicProvider: Has AnthropicContentConverter (Content[] → Anthropic format)
- GeminiCompatibleWrapper: Should NOT do conversion, just pass Content[] to providers

## Formal Requirements

### REQ-001: System Instruction Architecture
- [REQ-001.1] System instructions must be configuration, not Content messages
- [REQ-001.2] Gemini must use systemInstruction parameter
- [REQ-001.3] OpenAI must use system messages in messages array
- [REQ-001.4] Anthropic must use system parameter (API) or inject (OAuth)
- [REQ-001.5] No Content objects with role='system' in any provider

### REQ-002: Tool ID Management
- [REQ-002.1] Tool IDs must be unique and realistic (no hardcoded values)
- [REQ-002.2] tool_use and tool_result IDs must match in conversation flow
- [REQ-002.3] Anthropic IDs must follow toolu_xxxxx format
- [REQ-002.4] OpenAI IDs must follow call_xxxxx format
- [REQ-002.5] Multiple tool calls must have unique IDs

### REQ-003: Test Quality
- [REQ-003.1] All tests must validate correct behavior, not broken implementation
- [REQ-003.2] No mock theater tests (tests that only verify mocks)
- [REQ-003.3] No reverse testing (expecting NotYetImplemented)
- [REQ-003.4] Integration tests with real API behavior
- [REQ-003.5] 30% minimum property-based testing

### REQ-004: Content Format Validation
- [REQ-004.1] Content objects must only have valid roles: user, model, system
- [REQ-004.2] System Content can only contain text parts
- [REQ-004.3] Content arrays must not be empty
- [REQ-004.4] All providers must handle Content format consistently

### REQ-INT-001: Integration Requirements
- [REQ-INT-001.1] All providers must work with unified Content[] format
- [REQ-INT-001.2] System instructions must work correctly for all providers
- [REQ-INT-001.3] Tool calls must work with proper ID matching
- [REQ-INT-001.4] OAuth mode special cases must be handled

### REQ-INT-002: Quality Gates
- [REQ-INT-002.1] Zero errors when typing "hello" in TUI with any provider
- [REQ-INT-002.2] All tests pass and validate correct behavior
- [REQ-INT-002.3] Clear architecture with proper separation of concerns
- [REQ-INT-002.4] Consistent behavior across all providers and auth modes

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

## Implementation Strategy

Following TDD principles from RULES.md:
1. **Phase 1**: Remove broken tests that validate incorrect behavior
2. **Phase 2**: Create system prompt architecture with proper TDD
3. **Phase 3**: Fix Anthropic tool IDs with unique generation
4. **Phase 4**: Add comprehensive integration tests

## Phases Overview

### Phase 01: Test Cleanup
**Goal**: Remove 47 problematic tests that validate broken behavior
- Remove mock theater tests
- Remove hardcoded ID tests  
- Remove invalid Content format tests
- Remove stub/placeholder tests
- Clear path for proper TDD implementation

### Phase 02-04: System Prompt Architecture
**Goal**: Fix system instruction injection to use proper provider configuration
- **Phase 02**: Create stub implementation for system prompt handling
- **Phase 03**: Write comprehensive TDD tests for correct behavior
- **Phase 04**: Implement proper system prompt architecture

### Phase 05-07: Anthropic Tool ID Fix
**Goal**: Replace hardcoded 'broken-tool-123' with proper unique IDs
- **Phase 05**: Create stub for tool ID generation system
- **Phase 06**: Write TDD tests for unique ID matching
- **Phase 07**: Implement proper tool ID generation and tracking

### Phase 08: Integration Testing
**Goal**: Add comprehensive end-to-end testing
- Integration tests with real API behavior patterns
- Cross-provider consistency validation
- OAuth mode special case testing
- Performance and error handling validation

## Success Criteria

1. **Zero errors** when typing "hello" in TUI with any provider
2. **System instructions** work correctly for all providers without Content role='system'
3. **Tool calls** work with proper unique ID matching
4. **Tests** validate correct behavior with 0% mock theater
5. **Clear architecture** with proper separation of concerns
6. **All quality gates pass**: build, test, lint, typecheck

## Risk Mitigation

### High Risk Areas
1. **OAuth Mode Complexity**: Anthropic OAuth requires special system instruction handling
2. **Test Dependencies**: Many tests currently expect broken behavior
3. **Provider Differences**: Each provider handles system instructions differently

### Mitigation Strategies
1. **Incremental Changes**: Each phase includes proper verification
2. **TDD Approach**: Write failing tests first, then implement
3. **Integration Testing**: Validate with realistic API patterns
4. **Rollback Plans**: Each phase has clear rollback procedures

## Files Requiring Changes

### Critical Changes Required
1. `/packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts` - System instruction handling
2. `/packages/core/src/providers/anthropic/AnthropicProvider.ts` - Tool ID generation
3. `/packages/core/src/providers/anthropic/AnthropicProvider.test.ts` - Remove broken tests
4. `/packages/core/src/providers/openai/OpenAIProvider.*.test.ts` - Remove mock theater
5. `/packages/core/src/providers/gemini/GeminiProvider.test.ts` - Remove stub tests

### Integration Points
1. System prompt loading and injection
2. Content conversion and validation
3. Tool ID generation and tracking
4. Provider-specific API formatting

## Quality Assurance

Each phase follows strict TDD requirements:
- Write failing tests for correct behavior FIRST
- Implement minimal code to make tests pass
- Refactor for clarity and maintainability
- Run all quality checks: build, lint, test, typecheck
- Only proceed when ALL checks pass

## Timeline

- **Phase 01**: Test cleanup (1-2 hours)
- **Phase 02-04**: System prompts (4-6 hours)
- **Phase 05-07**: Tool IDs (3-4 hours)
- **Phase 08**: Integration (2-3 hours)
- **Total**: 10-15 hours

This plan addresses the root causes systematically while maintaining code quality and following TDD principles throughout.