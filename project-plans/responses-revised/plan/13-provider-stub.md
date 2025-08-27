# Phase 13: Provider Stub

## Phase ID
`PLAN-20250826-RESPONSES.P13`

## Task Description
Add sessionId parameter to all provider methods as optional with phase markers.

## Dependencies
- Phase 12 completed

## Implementation Steps
1. Update OpenAIProvider.generateChatCompletion signature
2. Update AnthropicProvider.generateChatCompletion signature
3. Update GeminiProvider.generateChatCompletion signature
4. Add phase marker comments
5. Ensure backward compatibility

## Files Modified
- `/packages/core/src/providers/openai/OpenAIProvider.ts`
- `/packages/core/src/providers/anthropic/AnthropicProvider.ts`
- `/packages/core/src/providers/gemini/GeminiProvider.ts`

## Phase Markers
```typescript
// PHASE: PLAN-20250826-RESPONSES.P13 - Provider sessionId stub
```

## Success Criteria
- All providers accept optional sessionId
- TypeScript compiles
- No runtime errors