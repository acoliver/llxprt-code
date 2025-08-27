# Phase 10a: Interface Implementation Verification with Mutation Testing

## Phase ID
`PLAN-20250826-RESPONSES.P10a`

## Task Description

Verify implementation follows pseudocode, tests pass, and achieve 80% mutation testing score.

## Input Files

- `/packages/core/src/providers/IProvider.ts`
- All caller files from domain-model.md
- `/project-plans/responses-revised/analysis/pseudocode/integration.md`
- Test files from Phase 04

## Verification Checklist

### Implementation Quality
- [ ] Implementation references pseudocode line numbers
- [ ] Algorithm matches pseudocode exactly
- [ ] No shortcuts or deviations
- [ ] All error paths implemented
- [ ] Phase markers present

### Test Results
- [ ] All Phase 04 tests now pass
- [ ] No test modifications made
- [ ] TypeScript compiles
- [ ] Callers properly pass sessionId

### Mutation Testing (80% MINIMUM)
- [ ] Run Stryker mutation testing
- [ ] Achieve 80%+ mutation score
- [ ] No surviving mutants in critical paths
- [ ] Document any acceptable survivors

## Verification Commands

```bash
# Verify pseudocode was followed
grep "@pseudocode" packages/core/src/providers/*.ts packages/core/src/core/*.ts
# Expected: References to pseudocode line numbers

# All tests pass
npm test packages/core/src/providers/IProvider.test.ts
# Expected: All tests pass

# No test modifications
git diff packages/core/src/providers/IProvider.test.ts
# Expected: No changes since Phase 04

# TypeScript compilation
npm run typecheck 2>&1 | grep -v "IMessage"
# Expected: No errors except IMessage

# Run mutation testing
npx stryker run --mutate "packages/core/src/providers/IProvider.ts"

# Get mutation score
MUTATION_SCORE=$(jq -r '.metrics.mutationScore' .stryker-tmp/reports/mutation-report.json)
echo "Mutation score: $MUTATION_SCORE%"
# Expected: >= 80%

# Check for surviving mutants
jq '.files[].mutants[] | select(.status == "survived")' .stryker-tmp/reports/mutation-report.json
# Review any survivors - should be minimal
```

## Pseudocode Compliance Check

```bash
# Create compliance check script
cat > check-pseudocode.sh << 'EOF'
#!/bin/bash
echo "Checking pseudocode compliance..."

# Check for sessionId flow (lines 71-80)
grep -q "sessionId = this.config.getSessionId()" packages/core/src/core/geminiChat.ts || echo "FAIL: Line 72 not implemented"

# Check for parameter passing (lines 75-79)
grep -q "generateChatCompletion.*sessionId" packages/core/src/core/*.ts || echo "FAIL: Line 79 not implemented"

echo "Pseudocode compliance check complete"
EOF

chmod +x check-pseudocode.sh
./check-pseudocode.sh
```

## Success Criteria

- Implementation follows pseudocode
- All tests pass
- 80%+ mutation score
- No test modifications
- Integration verified

## Failure Actions

If verification fails:
1. **Low mutation score**: Add more comprehensive tests
2. **Pseudocode not followed**: Fix implementation to match
3. **Tests modified**: Revert and fix implementation instead
4. **Integration broken**: Ensure callers updated properly

## Output

Create verification result:
```json
{
  "phase": "05a",
  "status": "pass|fail",
  "tests_passing": true/false,
  "mutation_score": 0,
  "pseudocode_followed": true/false,
  "integration_complete": true/false,
  "surviving_mutants": [],
  "issues": []
}
```

Save to: `/project-plans/responses-revised/verification/05a-result.json`