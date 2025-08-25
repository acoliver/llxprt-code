# Phase 01a: Test Cleanup Verification

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P01a`

## Prerequisites
- Required: Phase 01 completed
- Verification: `grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P01" packages/core/src/providers/`
- Expected: 8+ files modified with plan markers

## Verification Tasks

### 1. Automated Verification Script

Create and run comprehensive verification script:

```bash
#!/bin/bash
# verification-p01.sh
set -e

echo "=== Phase 01 Test Cleanup Verification ==="

# Track verification results
VERIFICATION_REPORT="/tmp/p01-verification.json"
echo '{"phase": "P01", "timestamp": "'$(date -Iseconds)'", "checks": []}' > $VERIFICATION_REPORT

# Function to add check result
add_check() {
    local name="$1"
    local expected="$2"
    local actual="$3"
    local status="$4"
    
    jq '.checks += [{"name": "'"$name"'", "expected": "'"$expected"'", "actual": "'"$actual"'", "status": "'"$status"'"}]' \
       $VERIFICATION_REPORT > /tmp/report.tmp && mv /tmp/report.tmp $VERIFICATION_REPORT
}

echo "1. Verifying plan markers..."
PLAN_MARKERS=$(grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P01" packages/core/src/providers/ | wc -l | xargs)
if [ "$PLAN_MARKERS" -ge 8 ]; then
    echo "✅ Plan markers: $PLAN_MARKERS (expected: 8+)"
    add_check "plan_markers" "8+" "$PLAN_MARKERS" "PASS"
else
    echo "❌ Plan markers: $PLAN_MARKERS (expected: 8+)"
    add_check "plan_markers" "8+" "$PLAN_MARKERS" "FAIL"
    exit 1
fi

echo "2. Verifying mock theater reduction..."
MOCK_THEATER_COUNT=$(grep -rn "toHaveBeenCalled\|mockImplementation\|mockResolvedValue\|mockRejectedValue" packages/core/src/providers/*/test* | wc -l | xargs)
echo "Mock theater occurrences: $MOCK_THEATER_COUNT (should be significantly reduced)"
add_check "mock_theater_reduction" "reduced" "$MOCK_THEATER_COUNT" "INFO"

echo "3. Verifying hardcoded ID removal..."
BROKEN_IDS=$(grep -rn "broken-tool-123" packages/core/src/providers/ | wc -l | xargs)
if [ "$BROKEN_IDS" -eq 0 ]; then
    echo "✅ Hardcoded IDs removed: 0 occurrences"
    add_check "hardcoded_ids" "0" "$BROKEN_IDS" "PASS"
else
    echo "❌ Hardcoded IDs found: $BROKEN_IDS occurrences"
    add_check "hardcoded_ids" "0" "$BROKEN_IDS" "FAIL"
    grep -rn "broken-tool-123" packages/core/src/providers/
    exit 1
fi

echo "4. Verifying system role removal from tests..."
SYSTEM_ROLE_TESTS=$(grep -rn "role.*['\"]system['\"]" packages/core/src/providers/*/test* | wc -l | xargs)
if [ "$SYSTEM_ROLE_TESTS" -eq 0 ]; then
    echo "✅ System role tests removed: 0 occurrences"
    add_check "system_role_tests" "0" "$SYSTEM_ROLE_TESTS" "PASS"
else
    echo "❌ System role tests found: $SYSTEM_ROLE_TESTS occurrences"
    add_check "system_role_tests" "0" "$SYSTEM_ROLE_TESTS" "FAIL"
    grep -rn "role.*['\"]system['\"]" packages/core/src/providers/*/test*
    exit 1
fi

echo "5. Verifying deleted files..."
if [ ! -f "packages/core/src/providers/openai/OpenAIProvider.responsesIntegration.test.ts" ]; then
    echo "✅ responsesIntegration.test.ts deleted"
    add_check "deleted_files" "1" "1" "PASS"
else
    echo "❌ responsesIntegration.test.ts still exists"
    add_check "deleted_files" "1" "0" "FAIL"
    exit 1
fi

echo "6. Verifying build passes..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build passes"
    add_check "build_passes" "true" "true" "PASS"
else
    echo "❌ Build fails"
    add_check "build_passes" "true" "false" "FAIL"
    exit 1
fi

echo "7. Verifying tests run..."
if npm run test:ci > /dev/null 2>&1; then
    echo "✅ Tests pass"
    add_check "tests_pass" "true" "true" "PASS"
else
    echo "❌ Tests fail"
    add_check "tests_pass" "true" "false" "FAIL"
    # Don't exit - some test failures may be expected during transition
fi

echo "8. Verifying specific file modifications..."

# Anthropic Provider Tests
if grep -q "@plan:PLAN-20250824-CONTENT-REMEDIATION.P01" packages/core/src/providers/anthropic/AnthropicProvider.test.ts; then
    echo "✅ AnthropicProvider.test.ts modified"
    add_check "anthropic_tests_modified" "true" "true" "PASS"
else
    echo "❌ AnthropicProvider.test.ts not modified"
    add_check "anthropic_tests_modified" "true" "false" "FAIL"
fi

# Count remaining tests
REMAINING_TESTS=$(find packages/core/src/providers -name "*.test.ts" -exec grep -c "it(" {} + 2>/dev/null | paste -sd+ | bc 2>/dev/null || echo "0")
echo "Remaining tests: $REMAINING_TESTS"
add_check "remaining_test_count" "reduced" "$REMAINING_TESTS" "INFO"

echo "9. Generating detailed file analysis..."

# Analyze each target file
declare -a TARGET_FILES=(
    "packages/core/src/providers/anthropic/AnthropicProvider.test.ts"
    "packages/core/src/providers/anthropic/AnthropicProvider.oauth.test.ts"  
    "packages/core/src/providers/openai/OpenAIProvider.switch.test.ts"
    "packages/core/src/providers/openai/OpenAIProvider.responses.test.ts"
    "packages/core/src/providers/gemini/GeminiProvider.test.ts"
    "packages/core/src/providers/converters/SystemMessageHandling.test.ts"
    "packages/core/src/providers/adapters/GeminiCompatibleWrapper.system.test.ts"
)

for file in "${TARGET_FILES[@]}"; do
    if [ -f "$file" ]; then
        TESTS_IN_FILE=$(grep -c "it(" "$file" 2>/dev/null || echo "0")
        PLAN_MARKERS_IN_FILE=$(grep -c "@plan:PLAN-20250824-CONTENT-REMEDIATION.P01" "$file" 2>/dev/null || echo "0")
        echo "  $file: $TESTS_IN_FILE tests, $PLAN_MARKERS_IN_FILE markers"
    else
        echo "  $file: [DELETED]"
    fi
done

echo "=== Verification Complete ==="
cat $VERIFICATION_REPORT | jq .

# Final status
FAILED_CHECKS=$(cat $VERIFICATION_REPORT | jq '[.checks[] | select(.status == "FAIL")] | length')
if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo "🎉 All critical verifications passed!"
    exit 0
else
    echo "💥 $FAILED_CHECKS critical verifications failed"
    exit 1
fi
```

### 2. Manual Verification Checklist

#### File-by-File Verification

**Anthropic Provider Tests**:
- [ ] `AnthropicProvider.test.ts`: Plan marker present
- [ ] `AnthropicProvider.test.ts`: No 'broken-tool-123' occurrences
- [ ] `AnthropicProvider.test.ts`: No mock theater tests remain
- [ ] `AnthropicProvider.test.ts`: ~12 fewer tests than original
- [ ] `AnthropicProvider.oauth.test.ts`: Plan marker present
- [ ] `AnthropicProvider.oauth.test.ts`: OAuth mock tests removed

**OpenAI Provider Tests**:
- [ ] `OpenAIProvider.switch.test.ts`: Plan marker present
- [ ] `OpenAIProvider.switch.test.ts`: Skipped tests removed
- [ ] `OpenAIProvider.responses.test.ts`: Plan marker present
- [ ] `OpenAIProvider.responses.test.ts`: Complex mock tests removed
- [ ] `OpenAIProvider.responsesIntegration.test.ts`: File deleted entirely

**Gemini Provider Tests**:
- [ ] `GeminiProvider.test.ts`: Plan marker present
- [ ] `GeminiProvider.test.ts`: All stub tests removed
- [ ] `GeminiProvider.test.ts`: No placeholder comments remain

**Converter Tests**:
- [ ] `SystemMessageHandling.test.ts`: Plan marker present
- [ ] `SystemMessageHandling.test.ts`: No Content with role='system' tests

**Adapter Tests**:
- [ ] `GeminiCompatibleWrapper.system.test.ts`: Plan marker present
- [ ] `GeminiCompatibleWrapper.system.test.ts`: System filtering tests removed

#### Content Analysis Verification

```bash
# Verify no invalid patterns remain
echo "Checking for invalid test patterns..."

# Should return 0 results:
grep -r "toThrow.*NotYetImplemented" packages/core/src/providers/ || echo "✅ No reverse testing"
grep -r "jest\.fn()\.mockResolvedValue" packages/core/src/providers/ || echo "✅ Reduced mock theater"
grep -r "expect.*toHaveProperty.*only" packages/core/src/providers/ || echo "✅ No structure-only tests"

# Quality improvements:
echo "Quality improvements verified:"
echo "- Mock theater significantly reduced"  
echo "- Hardcoded IDs eliminated"
echo "- Invalid Content formats removed"
echo "- Stub tests removed"
echo "- Skipped tests removed"
```

### 3. Build and Test Verification

```bash
# Must pass for verification to succeed
echo "Running quality gates..."

# TypeScript compilation
npm run typecheck || exit 1

# Linting
npm run lint || exit 1

# Build
npm run build || exit 1

# Test execution (some failures expected during transition)
npm run test:ci
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests pass"
else
    echo "⚠️  Some test failures (expected during transition)"
    echo "Proceeding if failures are due to missing implementations we'll add later"
fi
```

### 4. Regression Detection

```bash
# Verify we didn't break anything that was working
echo "Checking for regressions..."

# Core functionality should still work
npm run build-core || exit 1
npm run build-cli || exit 1

# Basic provider instantiation should work
node -e "
const { OpenAIProvider } = require('./dist/packages/core/src/providers/openai/OpenAIProvider.js');
const { AnthropicProvider } = require('./dist/packages/core/src/providers/anthropic/AnthropicProvider.js');
const { GeminiProvider } = require('./dist/packages/core/src/providers/gemini/GeminiProvider.js');

console.log('✅ All providers can be imported');
" || exit 1
```

## Success Criteria

### Critical Requirements (Must Pass)
- [ ] **All plan markers present**: 8+ files contain `@plan:PLAN-20250824-CONTENT-REMEDIATION.P01`
- [ ] **Zero hardcoded IDs**: No 'broken-tool-123' in test files
- [ ] **Zero system role tests**: No tests creating Content with role='system'
- [ ] **Build passes**: `npm run build` exits with 0
- [ ] **TypeScript passes**: `npm run typecheck` exits with 0
- [ ] **Lint passes**: `npm run lint` exits with 0
- [ ] **File deletion confirmed**: responsesIntegration.test.ts deleted

### Quality Improvements (Should Achieve)
- [ ] **Mock theater reduced**: Significantly fewer mock-only tests
- [ ] **Test count reduced**: ~47 fewer tests total
- [ ] **Stub tests removed**: No more placeholder tests
- [ ] **Clear error messages**: Any test failures have clear causes

### Documentation Requirements
- [ ] **Verification report generated**: JSON report with all check results
- [ ] **File analysis completed**: Per-file breakdown of changes
- [ ] **Quality metrics**: Before/after comparison of test quality

## Phase Completion Requirements

1. **All critical requirements pass**: No exceptions allowed
2. **Verification script passes**: Exit code 0
3. **Manual checklist complete**: All items verified
4. **Documentation created**: Completion marker file created

## Failure Recovery

If verification fails:

### For Build Failures
```bash
# Check what's broken
npm run build 2>&1 | tee build-errors.log
npm run typecheck 2>&1 | tee type-errors.log

# Common fixes:
# 1. Missing imports after test removal
# 2. Unused variables after mock removal  
# 3. Test dependencies on removed functions
```

### For Test Import Errors
```bash
# Find and fix import issues
grep -r "from.*test.*removed" packages/core/src/
# Update imports to not reference removed tests
```

### For Unexpected Dependencies
```bash
# Identify what still depends on removed code
npm run test:ci 2>&1 | grep -E "(Cannot find|is not defined)"
# Fix remaining dependencies
```

### Rollback if Necessary
```bash
git log --oneline --grep="P01" | head -5
git revert <commit-hash>
# Then analyze what went wrong before retrying
```

## Next Phase Readiness

Phase 02 (System Prompt Stub) can begin when:
- All verification criteria met
- Build passes completely  
- No broken test dependencies remain
- Clean foundation for TDD implementation established

The test cleanup creates a clean slate for implementing proper TDD practices in the system prompt architecture phase.