# Phase 06a: Interface and Callers Stub Verification

## Phase ID
`PLAN-20250826-RESPONSES.P06a`

## Task Description

Verify that the interface stub AND all callers have been updated. Critical: Verify NO ISOLATION - all callers must pass sessionId parameter.

## Input Files

- `/packages/core/src/providers/IProvider.ts`
- All files identified in `/project-plans/responses-revised/analysis/domain-model.md` as callers

## Verification Checklist

### Interface Update
- [ ] IProvider.ts has sessionId parameter
- [ ] Parameter is optional (?)
- [ ] Parameter is 4th in order
- [ ] Phase marker present
- [ ] TypeScript compiles

### Caller Updates (CRITICAL)
- [ ] ALL callers identified in domain-model.md updated
- [ ] Each caller passes sessionId (even if undefined)
- [ ] No callers missed
- [ ] Phase markers in all modified files
- [ ] NO ISOLATED IMPLEMENTATION

## Verification Commands

```bash
# Check interface updated
grep "sessionId?: string" packages/core/src/providers/IProvider.ts
# Expected: 1 occurrence

# Check ALL callers updated
# For each caller in domain-model.md, verify it passes 4 parameters
grep -r "generateChatCompletion(" packages/ --include="*.ts" | grep -v "test" | wc -l
# All should have 4 parameters or spread operator

# Check phase markers
grep "@plan PLAN-20250826-RESPONSES.P06" packages/core/src/providers/IProvider.ts
# Expected: 1+ occurrence

# TypeScript compilation
cd packages/core && npm run typecheck
# Expected: May have IMessage errors, but no sessionId parameter errors

# Verify no isolation
echo "Checking that callers were actually modified..."
git diff --name-only | grep -v IProvider.ts
# Expected: Multiple files changed (not just interface)
```

## Success Criteria

- Interface has sessionId parameter
- ALL callers pass sessionId (even undefined)
- Not built in isolation
- TypeScript compiles (except IMessage errors)
- Phase markers present

## Failure Actions

If verification fails:
1. Check for missed callers
2. Ensure ALL files from domain-model.md were updated
3. Re-run Phase 03 for missed files
4. REJECT if only interface updated (isolation)

## Output

Create verification result:
```json
{
  "phase": "03a",
  "status": "pass|fail",
  "interface_updated": true/false,
  "callers_updated": {
    "total_found": 0,
    "total_updated": 0,
    "missed": []
  },
  "built_in_isolation": false,
  "typescript_compiles": true/false,
  "issues": []
}
```

Save to: `/project-plans/responses-revised/verification/03a-result.json`