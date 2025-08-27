# Phase 05: Interface AND Callers Stub

## Phase ID
`PLAN-20250826-RESPONSES.P05`

## Task Description

Add the sessionId parameter to the IProvider interface AND update ALL callers to pass it (even if undefined for now). This ensures integration from the start, not isolation.

## Input Files

- `/project-plans/responses-revised/analysis/domain-model.md` (MUST have caller list)
- `/packages/core/src/providers/IProvider.ts`

## Files to Modify

### 1. `/packages/core/src/providers/IProvider.ts`

Add sessionId as optional fourth parameter to generateChatCompletion:

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P05
 * @requirement REQ-001.1
 */
generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  toolFormat?: string,
  sessionId?: string  // NEW optional parameter
): AsyncIterableIterator<Content>;
```

### 2. ALL CALLERS (from domain-model.md analysis)

For EACH file that calls generateChatCompletion:
```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P05
 * @requirement REQ-001.2
 */
// Add undefined as 4th parameter for now
yield* provider.generateChatCompletion(
  contents,
  tools,
  toolFormat,
  undefined  // sessionId - will be implemented later
);
```

## Requirements

1. MODIFY existing interface (do not create IProviderV2)
2. UPDATE ALL CALLERS to pass sessionId (even if undefined)
3. Parameter must be optional (?) to maintain backward compatibility
4. Must compile with strict TypeScript
5. Add plan and requirement markers
6. NO ISOLATED CHANGES - callers must be updated too

## Forbidden

- Creating IProviderV2 or new interface files
- Adding implementation logic
- Adding TODO comments
- Breaking existing providers

## Success Criteria

- Interface updated with sessionId parameter
- TypeScript compiles without errors
- All existing code still compiles
- Parameter is optional

## Execution Instructions

```bash
# For subagent execution:
1. Open /packages/core/src/providers/IProvider.ts
2. Find the generateChatCompletion method signature (around line 25-29)
3. Add sessionId?: string as the fourth parameter
4. Add the plan marker comment above the method
5. Save the file
6. Run: npm run typecheck
7. Verify no TypeScript errors
```

## Verification

After execution, verify:
```bash
# Check interface was modified
grep "sessionId?: string" packages/core/src/providers/IProvider.ts
# Expected: 1 occurrence

# Check plan marker
grep "@plan PLAN-20250826-RESPONSES.P05" packages/core/src/providers/IProvider.ts
# Expected: 1 occurrence

# TypeScript compilation
cd packages/core && npm run typecheck
# Expected: No errors
```

## Output Status

Save to: `/project-plans/responses-revised/workers/phase-03.json`
```json
{
  "phase": "03",
  "completed": true,
  "files_modified": ["packages/core/src/providers/IProvider.ts"],
  "typescript_compiles": true
}
```