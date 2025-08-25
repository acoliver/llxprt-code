# Plan: Provider Content Simplification

Plan ID: PLAN-20250113-SIMPLIFICATION
Generated: 2025-01-13
Total Phases: 15
Requirements: REQ-001, REQ-002, REQ-003, REQ-INT-001

## Objective

Eliminate IMessage interface and pass Content[] directly from GeminiChat to providers, using dedicated converter classes for format translation.

## Phase Overview

### Converter Implementation (Phases 01-06)
- 01-02: Analysis and pseudocode
- 03-04: IContentConverter interface (stub + TDD)  
- 05-06: OpenAIContentConverter (TDD + implementation)

### OpenAI Provider Integration (Phases 07-09)
- 07: OpenAIProvider TDD with Content[]
- 08: OpenAIProvider implementation
- 09: OpenAIProvider integration verification

### Anthropic Provider Integration (Phases 10-12)
- 10: AnthropicContentConverter TDD
- 11: AnthropicContentConverter implementation
- 12: AnthropicProvider integration

### System Integration (Phases 13-15)
- 13: GeminiCompatibleWrapper modification
- 14: ProviderContentGenerator update
- 15: End-to-end testing and IMessage removal

## Success Criteria

- All providers accept Content[] instead of IMessage[]
- Format conversion handled by dedicated converter classes
- No duplicate conversation caches in providers
- All existing tests pass
- IMessage interface removed from codebase