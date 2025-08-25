# Phase 16: Final Verification

## Phase ID

`PLAN-20250823-LOOPDETSET.P16`

## Prerequisites

- Required: All phases 01-15 completed
- All tests passing

## Verification Tasks

### 1. Complete Test Suite

```bash
# Run all tests
npm test || exit 1

# Run with coverage
npm test -- --coverage

# Coverage should be >90% for new code
```

### 2. Mutation Testing

```bash
# Run mutation testing on new code
npx stryker run --mutate "packages/core/src/config/config.ts" \
                --mutate "packages/core/src/services/loopDetectionService.ts" \
                --mutate "packages/cli/src/ui/commands/setCommand.ts"

# Check mutation score
MUTATION_SCORE=$(jq -r '.metrics.mutationScore' .stryker-tmp/reports/mutation-report.json)
[ $MUTATION_SCORE -lt 80 ] && echo "FAIL: Mutation score only $MUTATION_SCORE%"
```

### 3. TypeScript and Linting

```bash
# TypeScript compilation
npm run typecheck || exit 1

# Linting
npm run lint || exit 1

# Format check
npm run format:check || exit 1

# No debug code
! grep -r "console\\.log\\|TODO\\|FIXME\\|XXX" packages/
```

### 4. Plan Marker Verification

```bash
# Check all plan markers present
for phase in {03..15}; do
  grep -r "@plan:PLAN-20250823-LOOPDETSET.P$phase" packages/ || \
    echo "Missing markers for phase $phase"
done

# Check requirement coverage
for req in "REQ-001" "REQ-002" "REQ-003" "REQ-004" "REQ-INT-001"; do
  grep -r "@requirement:$req" packages/ || \
    echo "Missing requirement $req"
done
```

### 5. Manual Testing Checklist

- [ ] `/set loop-detection false` - disables successfully
- [ ] `/set loop-detection true` - enables successfully
- [ ] `/set loop-detection invalid` - shows error
- [ ] Profile switch changes setting
- [ ] Global setting works when profile undefined
- [ ] Default is false for new installations
- [ ] No 400 errors when disabled
- [ ] Setting persists across restarts

### 6. Performance Verification

```bash
# Measure setting resolution time
node -e "
const config = new (require('./packages/core/dist/config/config.js').Config)();
console.time('resolution');
for(let i = 0; i < 10000; i++) {
  config.getLoopDetectionEnabled();
}
console.timeEnd('resolution');
"
# Should be <100ms for 10000 calls (<0.01ms per call)
```

### 7. Documentation Check

- [ ] Setting documented in user guide
- [ ] CLI command documented
- [ ] Default behavior documented
- [ ] Hierarchy explained

### 8. Backward Compatibility

```bash
# Load old profile without loopDetectionEnabled field
echo '{"version":1,"provider":"openai","model":"gpt-4"}' > test-old-profile.json

# Should not crash, should use default
node -e "
const pm = new (require('./packages/core/dist/config/profileManager.js').ProfileManager)();
pm.loadProfile('test-old-profile').then(p => {
  console.log('Loaded:', p.loopDetectionEnabled === undefined ? 'PASS' : 'FAIL');
});
"
```

## Success Criteria

- [ ] All tests pass (100%)
- [ ] Mutation score >80%
- [ ] TypeScript compiles
- [ ] No linting errors
- [ ] All plan markers present
- [ ] All requirements covered
- [ ] Manual testing successful
- [ ] Performance <1ms per check
- [ ] Backward compatible

## Final Report

Create: `project-plans/loopdetset/.completed/P16-final-report.md`

Include:
- Test results summary
- Coverage report
- Mutation score
- Performance metrics
- Manual testing results
- Any issues found

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P16.md`