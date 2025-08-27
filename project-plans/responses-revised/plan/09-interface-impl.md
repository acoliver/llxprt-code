# Phase 09: Interface Implementation

## Phase ID
`PLAN-20250826-RESPONSES.P09`

## Task Description

The interface was already updated in Phase 03 (stub). This phase verifies the tests now pass with the updated interface.

## Input Files

- `/packages/core/src/providers/IProvider.ts` (already modified in Phase 03)
- `/packages/core/src/providers/IProvider.test.ts` (created in Phase 04)

## Expected State

The interface should already have:
```typescript
generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string,
  sessionId?: string  // Added in Phase 03
): AsyncIterableIterator<Content>;
```

## Verification Tasks

1. Run the tests created in Phase 04
2. Verify they now pass
3. Ensure TypeScript compilation succeeds
4. Check backward compatibility

## Requirements

1. Do NOT modify tests from Phase 04
2. Interface already has sessionId from Phase 03
3. All tests must pass
4. No TypeScript errors

## Success Criteria

- Phase 04 tests pass
- TypeScript compiles
- No test modifications
- Backward compatibility maintained

## Execution Instructions

```bash
# For subagent execution:
1. Verify interface has sessionId parameter from Phase 03
2. Run: npm test packages/core/src/providers/IProvider.test.ts
3. Confirm all tests pass
4. Run: npm run typecheck
5. Verify no TypeScript errors
```

## Verification Commands

```bash
# All tests should pass
npm test packages/core/src/providers/IProvider.test.ts
# Expected: All tests pass

# No test modifications
git diff packages/core/src/providers/IProvider.test.ts
# Expected: No changes since Phase 04

# TypeScript compilation
npm run typecheck
# Expected: No errors

# Check interface has sessionId
grep "sessionId?: string" packages/core/src/providers/IProvider.ts
# Expected: 1 occurrence
```

## Output Status

Save to: `/project-plans/responses-revised/workers/phase-05.json`
```json
{
  "phase": "05",
  "completed": true,
  "tests_passing": true,
  "typescript_compiles": true,
  "backward_compatible": true
}
```