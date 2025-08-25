# Phase 06a: Anthropic Tool ID TDD Verification

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P06a`

## Prerequisites
- Required: Phase 06 completed
- Verification: All tool ID TDD test files created
- Expected: Comprehensive behavioral tests that fail with current stubs

## Verification Tasks

### 1. TDD Test Creation Verification Script

```bash
#!/bin/bash
# verification-p06.sh
set -e

echo "=== Phase 06 Anthropic Tool ID TDD Verification ==="

VERIFICATION_REPORT="/tmp/p06-verification.json"
echo '{"phase": "P06", "timestamp": "'$(date -Iseconds)'", "checks": []}' > $VERIFICATION_REPORT

add_check() {
    local name="$1"
    local expected="$2"
    local actual="$3"
    local status="$4"
    
    jq '.checks += [{"name": "'"$name"'", "expected": "'"$expected"'", "actual": "'"$actual"'", "status": "'"$status"'"}]' \
       $VERIFICATION_REPORT > /tmp/report.tmp && mv /tmp/report.tmp $VERIFICATION_REPORT
}

echo "1. Verifying test files created..."
declare -a EXPECTED_FILES=(
    "packages/core/src/providers/types/ToolIdConfig.test.ts"
    "packages/core/src/providers/anthropic/AnthropicToolIdTracker.test.ts"
    "packages/core/src/providers/anthropic/AnthropicProvider.toolid.test.ts"
    "packages/core/src/providers/converters/AnthropicContentConverter.toolid.test.ts"
)

CREATED_FILES=0
for file in "${EXPECTED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
        CREATED_FILES=$((CREATED_FILES + 1))
    else
        echo "❌ $file missing"
    fi
done

if [ $CREATED_FILES -eq ${#EXPECTED_FILES[@]} ]; then
    add_check "test_files_created" "4" "$CREATED_FILES" "PASS"
else
    add_check "test_files_created" "4" "$CREATED_FILES" "FAIL"
    exit 1
fi

echo "2. Verifying plan markers in test files..."
PLAN_MARKERS=$(grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P06" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
if [ "$PLAN_MARKERS" -ge 4 ]; then
    echo "✅ Plan markers in tests: $PLAN_MARKERS"
    add_check "test_plan_markers" "4+" "$PLAN_MARKERS" "PASS"
else
    echo "❌ Plan markers in tests: $PLAN_MARKERS (expected: 4+)"
    add_check "test_plan_markers" "4+" "$PLAN_MARKERS" "FAIL"
    exit 1
fi

echo "3. Verifying behavioral test annotations..."
SCENARIOS=$(grep -r "@scenario\|@given\|@when\|@then" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
if [ "$SCENARIOS" -ge 40 ]; then
    echo "✅ Behavioral annotations: $SCENARIOS"
    add_check "behavioral_annotations" "40+" "$SCENARIOS" "PASS"
else
    echo "❌ Behavioral annotations: $SCENARIOS (expected: 40+)"
    add_check "behavioral_annotations" "40+" "$SCENARIOS" "WARN"
fi

echo "4. Verifying property-based tests..."
PROPERTY_TESTS=$(grep -r "it\.prop\|fc\." packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
if [ "$PROPERTY_TESTS" -ge 8 ]; then
    echo "✅ Property-based tests: $PROPERTY_TESTS"
    add_check "property_based_tests" "8+" "$PROPERTY_TESTS" "PASS"
else
    echo "❌ Property-based tests: $PROPERTY_TESTS (expected: 8+)"
    add_check "property_based_tests" "8+" "$PROPERTY_TESTS" "FAIL"
fi

echo "5. Verifying realistic ID pattern testing..."
ID_PATTERN_TESTS=$(grep -r "toolu_.*\[A-Za-z0-9\]" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
if [ "$ID_PATTERN_TESTS" -ge 10 ]; then
    echo "✅ Realistic ID pattern tests: $ID_PATTERN_TESTS"
    add_check "id_pattern_tests" "10+" "$ID_PATTERN_TESTS" "PASS"
else
    echo "❌ Realistic ID pattern tests: $ID_PATTERN_TESTS (expected: 10+)"
    add_check "id_pattern_tests" "10+" "$ID_PATTERN_TESTS" "WARN"
fi

echo "6. Verifying no empty string testing..."
EMPTY_STRING_TESTS=$(grep -r "toBe('')\|toEqual('')" packages/core/src/providers/*toolid*.test.ts | wc -l | xargs)
if [ "$EMPTY_STRING_TESTS" -lt 3 ]; then
    echo "✅ Minimal empty string testing: $EMPTY_STRING_TESTS"
    add_check "empty_string_testing" "<3" "$EMPTY_STRING_TESTS" "PASS"
else
    echo "❌ Too much empty string testing: $EMPTY_STRING_TESTS (tests should expect real IDs)"
    add_check "empty_string_testing" "<3" "$EMPTY_STRING_TESTS" "WARN"
fi

echo "7. Verifying test compilation..."
if npm run typecheck > /dev/null 2>&1; then
    echo "✅ Tests compile successfully"
    add_check "tests_compile" "pass" "pass" "PASS"
else
    echo "❌ Test compilation fails"
    npm run typecheck 2>&1 | tail -20
    add_check "tests_compile" "pass" "fail" "FAIL"
    exit 1
fi

echo "8. Verifying tests fail with stubs (TDD requirement)..."
# Run tool ID tests and expect failures (proves they test real behavior)
if npm test -- --grep "tool.*id|Tool.*Id|generateId|storeToolCall" --silent 2>/dev/null; then
    echo "⚠️  Tests pass with stubs (may indicate weak tests)"
    add_check "tests_fail_with_stubs" "fail" "pass" "WARN"
else
    echo "✅ Tests fail with stubs (proves they test real behavior)"
    add_check "tests_fail_with_stubs" "fail" "fail" "PASS"
fi

echo "=== Verification Complete ==="
cat $VERIFICATION_REPORT | jq .

# Final status
FAILED_CHECKS=$(cat $VERIFICATION_REPORT | jq '[.checks[] | select(.status == "FAIL")] | length')
if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo "🎉 All TDD verifications passed!"
    exit 0
else
    echo "💥 $FAILED_CHECKS TDD verifications failed"
    exit 1
fi
```

### 2. Test Quality Analysis Script

```bash
#!/bin/bash
# tool-id-test-quality.sh

echo "=== Tool ID TDD Test Quality Analysis ==="

echo "1. Analyzing test file structure..."
declare -a TEST_FILES=(
    "packages/core/src/providers/types/ToolIdConfig.test.ts"
    "packages/core/src/providers/anthropic/AnthropicToolIdTracker.test.ts"
    "packages/core/src/providers/anthropic/AnthropicProvider.toolid.test.ts"
    "packages/core/src/providers/converters/AnthropicContentConverter.toolid.test.ts"
)

for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        TEST_COUNT=$(grep -c "it(" "$file")
        DESCRIBE_COUNT=$(grep -c "describe(" "$file")
        BEHAVIORAL_ANNOTATIONS=$(grep -c "@scenario\|@given\|@when\|@then" "$file")
        PROPERTY_TESTS=$(grep -c "it\.prop" "$file")
        ID_PATTERNS=$(grep -c "toolu_.*\[A-Za-z0-9\]" "$file")
        
        echo "  $(basename "$file"):"
        echo "    Tests: $TEST_COUNT"
        echo "    Test suites: $DESCRIBE_COUNT"
        echo "    Behavioral annotations: $BEHAVIORAL_ANNOTATIONS"
        echo "    Property-based tests: $PROPERTY_TESTS"
        echo "    ID pattern validations: $ID_PATTERNS"
        
        # Calculate property-based percentage
        if [ $TEST_COUNT -gt 0 ]; then
            PROP_PERCENTAGE=$(( (PROPERTY_TESTS * 100) / TEST_COUNT ))
            echo "    Property-based %: $PROP_PERCENTAGE%"
        fi
        echo ""
    fi
done

echo "2. Analyzing requirements coverage..."

# Count requirements coverage
REQ_002_1=$(grep -r "REQ-002.1" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
REQ_002_2=$(grep -r "REQ-002.2" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
REQ_002_3=$(grep -r "REQ-002.3" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
REQ_002_4=$(grep -r "REQ-002.4" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
REQ_002_5=$(grep -r "REQ-002.5" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)

echo "Requirements coverage:"
echo "  REQ-002.1 (Unique tool IDs): $REQ_002_1 tests"
echo "  REQ-002.2 (ID matching): $REQ_002_2 tests"
echo "  REQ-002.3 (Anthropic format): $REQ_002_3 tests"
echo "  REQ-002.4 (Converter delegation): $REQ_002_4 tests"
echo "  REQ-002.5 (Multiple tools): $REQ_002_5 tests"

echo "3. Analyzing test behavior patterns..."

# Look for realistic ID testing
ID_FORMAT_TESTS=$(grep -r "toMatch.*toolu_\|startsWith.*toolu_\|length.*18" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
echo "Realistic ID format tests: $ID_FORMAT_TESTS"

# Look for uniqueness testing
UNIQUENESS_TESTS=$(grep -r "Set.*size\|unique\|different" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l | xargs)
echo "ID uniqueness tests: $UNIQUENESS_TESTS"

# Look for conversation flow testing
CONVERSATION_TESTS=$(grep -r "conversation\|tool_use.*tool_result\|matching.*ID" packages/core/src/providers/*toolid*.test.ts | wc -l | xargs)
echo "Conversation flow tests: $CONVERSATION_TESTS"

echo "4. Identifying potential issues..."

# Check for weak test patterns
WEAK_PATTERNS=$(grep -r "toHaveProperty\|toBeDefined\|toBeUndefined" packages/core/src/providers/*toolid*.test.ts | wc -l | xargs)
if [ $WEAK_PATTERNS -gt 3 ]; then
    echo "⚠️  Potential weak tests (structure-only): $WEAK_PATTERNS"
else
    echo "✅ Strong behavioral tests (minimal structure-only): $WEAK_PATTERNS"
fi

# Check for stub testing (bad)
STUB_TESTING=$(grep -r "toBe('')\|toEqual('')\|empty.*string" packages/core/src/providers/*toolid*.test.ts | wc -l | xargs)
if [ $STUB_TESTING -gt 5 ]; then
    echo "⚠️  Too much stub behavior testing: $STUB_TESTING (should test real IDs)"
else
    echo "✅ Minimal stub testing: $STUB_TESTING"
fi

# Check for realistic ID expectations
REALISTIC_EXPECTATIONS=$(grep -r "toolu_[A-Za-z0-9]\{12\}" packages/core/src/providers/*toolid*.test.ts | wc -l | xargs)
echo "Realistic ID expectations: $REALISTIC_EXPECTATIONS"
```

### 3. Behavioral Verification Script

```typescript
// tool-id-behavioral-verification.ts
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P06a
 * Behavioral verification for tool ID TDD tests
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

interface TestQualityMetrics {
  file: string;
  totalTests: number;
  behavioralAnnotations: number;
  propertyBasedTests: number;
  idPatternTests: number;
  realBehaviorTests: number;
  stubTestingCount: number;
}

function analyzeToolIdTestFile(filePath: string): TestQualityMetrics {
  if (!existsSync(filePath)) {
    throw new Error(`Test file does not exist: ${filePath}`);
  }
  
  const content = readFileSync(filePath, 'utf8');
  
  return {
    file: filePath,
    totalTests: (content.match(/it\(/g) || []).length + (content.match(/it\.prop\(/g) || []).length,
    behavioralAnnotations: (content.match(/@scenario|@given|@when|@then/g) || []).length,
    propertyBasedTests: (content.match(/it\.prop\(/g) || []).length,
    idPatternTests: (content.match(/toolu_.*\[A-Za-z0-9\]|toMatch.*toolu_/g) || []).length,
    realBehaviorTests: (content.match(/generateId|storeToolCall|getToolIdForFunction/g) || []).length,
    stubTestingCount: (content.match(/toBe\(''\)|toEqual\(''\)|empty.*string/g) || []).length
  };
}

const toolIdTestFiles = [
  'packages/core/src/providers/types/ToolIdConfig.test.ts',
  'packages/core/src/providers/anthropic/AnthropicToolIdTracker.test.ts',
  'packages/core/src/providers/anthropic/AnthropicProvider.toolid.test.ts',
  'packages/core/src/providers/converters/AnthropicContentConverter.toolid.test.ts'
];

console.log('=== Tool ID Test Behavioral Analysis ===');

let totalQualityScore = 0;
let fileCount = 0;

toolIdTestFiles.forEach(file => {
  try {
    const metrics = analyzeToolIdTestFile(file);
    fileCount++;
    
    console.log(`\n${metrics.file}:`);
    console.log(`  Total Tests: ${metrics.totalTests}`);
    console.log(`  Behavioral Annotations: ${metrics.behavioralAnnotations}`);
    console.log(`  Property-Based Tests: ${metrics.propertyBasedTests}`);
    console.log(`  ID Pattern Tests: ${metrics.idPatternTests}`);
    console.log(`  Real Behavior Tests: ${metrics.realBehaviorTests}`);
    console.log(`  Stub Testing Count: ${metrics.stubTestingCount}`);
    
    // Calculate quality score (0-100)
    const behavioralCoverage = metrics.totalTests > 0 ? (metrics.behavioralAnnotations / metrics.totalTests) : 0;
    const propertyBasedPercent = metrics.totalTests > 0 ? (metrics.propertyBasedTests / metrics.totalTests) : 0;
    const idPatternPercent = metrics.totalTests > 0 ? (metrics.idPatternTests / metrics.totalTests) : 0;
    const stubTestingPenalty = Math.min(metrics.stubTestingCount * 5, 25); // Heavy penalty for stub testing
    
    const qualityScore = Math.max(0,
      (behavioralCoverage * 25) +     // 25% for behavioral annotations
      (propertyBasedPercent * 30) +   // 30% for property-based tests  
      (idPatternPercent * 35) +       // 35% for realistic ID testing
      10 -                            // 10% base score
      stubTestingPenalty              // Penalty for testing stub behavior
    );
    
    console.log(`  Quality Score: ${qualityScore.toFixed(1)}/100`);
    totalQualityScore += qualityScore;
    
    // Quality assessment
    if (qualityScore >= 85) {
      console.log(`  ✅ Excellent tool ID test quality`);
    } else if (qualityScore >= 70) {
      console.log(`  ⚠️  Good test quality, room for improvement`);
    } else {
      console.log(`  ❌ Poor test quality, needs significant improvement`);
    }
    
    // Specific feedback
    if (metrics.stubTestingCount > 3) {
      console.log(`  ⚠️  Too much stub testing - should test real ID behavior`);
    }
    
    if (propertyBasedPercent < 0.25) {
      console.log(`  ⚠️  Low property-based testing: ${(propertyBasedPercent * 100).toFixed(1)}% (need 25%+)`);
    }
    
    if (metrics.idPatternTests < 3) {
      console.log(`  ⚠️  Insufficient ID pattern validation`);
    }
    
  } catch (error) {
    console.log(`❌ Error analyzing ${file}: ${error.message}`);
  }
});

const averageQuality = fileCount > 0 ? totalQualityScore / fileCount : 0;
console.log(`\n=== Overall Tool ID Test Quality: ${averageQuality.toFixed(1)}/100 ===`);

// Test execution verification
console.log('\n=== Test Execution Verification ===');

try {
  console.log('Running tool ID tests to verify they fail appropriately...');
  
  // Run tests and capture output
  const testOutput = execSync('npm test -- --grep "tool.*id|Tool.*Id|generateId|storeToolCall" --reporter min', {
    encoding: 'utf8',
    timeout: 30000
  });
  
  console.log('⚠️  Tool ID tests are passing with stubs (may indicate weak tests)');
  console.log('Tests should fail with stub implementations to prove they test real behavior');
  
} catch (error) {
  console.log('✅ Tool ID tests fail with stubs (proves they test real behavior)');
  console.log('This is expected and correct for TDD approach');
}

if (averageQuality >= 80) {
  console.log('\n🎉 Tool ID TDD tests meet high quality standards!');
  process.exit(0);
} else {
  console.log('\n💥 Tool ID TDD tests need quality improvements before proceeding');
  console.log('Focus on:');
  console.log('- Reduce stub behavior testing (test real IDs instead)');
  console.log('- Increase property-based testing coverage');  
  console.log('- Add more realistic ID pattern validation');
  console.log('- Ensure tests fail with stub implementations');
  process.exit(1);
}
```

### 4. Manual Verification Checklist

#### File-by-File Test Quality Verification

**ToolIdConfig.test.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P06` marker
- [ ] Tests `generateToolId()` for realistic Anthropic format (toolu_xxxxx)
- [ ] Tests `generateToolId()` for OpenAI format (call_xxxxx)
- [ ] Tests ID uniqueness across multiple generations
- [ ] Tests `validateToolId()` with valid and invalid formats
- [ ] Property-based tests for format consistency and uniqueness
- [ ] All tests have behavioral annotations (@scenario, @given, @when, @then)
- [ ] No testing for empty strings or stub behavior

**AnthropicToolIdTracker.test.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P06` marker
- [ ] Tests `generateId()` returns realistic Anthropic IDs
- [ ] Tests `storeToolCall()` and `getToolIdForFunction()` mapping
- [ ] Tests multiple function mappings work independently
- [ ] Tests `clear()` removes all mappings
- [ ] Tests `getConfig()` returns correct Anthropic configuration
- [ ] Property-based tests for conversation simulation
- [ ] Property-based tests for format consistency

**AnthropicProvider.toolid.test.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P06` marker  
- [ ] Tests tool_use generation with realistic unique IDs
- [ ] Tests tool_result generation with matching IDs
- [ ] Tests multiple tool calls get unique IDs
- [ ] Tests complete conversation flow with ID matching
- [ ] Property-based tests for function call handling
- [ ] All tests use realistic Anthropic API format expectations
- [ ] No mock theater - tests verify actual data transformations

**AnthropicContentConverter.toolid.test.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P06` marker
- [ ] Tests converter delegates tool ID generation (leaves empty)
- [ ] Tests tool_result IDs left empty for provider matching
- [ ] Tests multiple tool calls all have empty IDs
- [ ] Tests mixed content with proper ID delegation
- [ ] Tests converter no longer generates any IDs internally

#### TDD Quality Verification (Critical)

**Tests should FAIL with current stub implementations**:
```bash
# Each test file should have failing tests when run individually
npm test packages/core/src/providers/types/ToolIdConfig.test.ts
# Expected: Multiple failures because generateToolId returns empty string

npm test packages/core/src/providers/anthropic/AnthropicToolIdTracker.test.ts
# Expected: Failures because tracker methods are stubs

npm test packages/core/src/providers/anthropic/AnthropicProvider.toolid.test.ts
# Expected: Failures because provider uses stub tool ID generation

npm test packages/core/src/providers/converters/AnthropicContentConverter.toolid.test.ts
# Expected: May pass if only testing delegation behavior
```

**If tests pass with stubs, they are weak tests that need strengthening.**

#### Behavioral Test Quality Assessment

**For each test file, verify**:
- [ ] **Realistic ID Expectations**: Tests expect toolu_xxxxx format, not empty strings
- [ ] **Uniqueness Validation**: Tests verify different tool calls get different IDs
- [ ] **Format Compliance**: Tests validate exact Anthropic ID patterns
- [ ] **Matching Logic**: Tests verify tool_use and tool_result IDs match
- [ ] **Property-Based Coverage**: At least 25% property-based tests per file
- [ ] **Conversation Flow**: Tests validate IDs work across multi-turn conversations
- [ ] **No Mock Theater**: Tests verify actual data transformations
- [ ] **Clear Assertions**: Each test verifies specific ID values/patterns

## Success Criteria

### Critical Requirements (Must Pass)
- [ ] **All 4 test files created** and contain comprehensive tool ID tests
- [ ] **Tests compile successfully** with TypeScript strict mode
- [ ] **Tests fail with stub implementations** (proving they test real behavior)
- [ ] **40+ behavioral annotations** across all test files
- [ ] **8+ property-based tests** (minimum 25% coverage)
- [ ] **10+ realistic ID pattern tests** (toolu_xxxxx validation)
- [ ] **Minimal stub behavior testing** (<3 tests expecting empty strings)

### Quality Requirements (Should Pass)
- [ ] **All requirements covered**: REQ-002.1 through REQ-002.5 have test coverage
- [ ] **Realistic ID validation**: Tests expect proper Anthropic ID format  
- [ ] **ID uniqueness testing**: Tests verify different tool calls get different IDs
- [ ] **Conversation flow testing**: Tests verify ID matching across turns
- [ ] **Delegation testing**: Converter tests verify proper ID delegation to provider
- [ ] **Edge case coverage**: Property-based tests cover unusual scenarios

### Architecture Validation
- [ ] **Tool ID generation testing**: Tests drive proper unique ID creation
- [ ] **ID tracking testing**: Tests drive proper tool call mapping
- [ ] **Provider integration testing**: Tests drive proper tool ID usage
- [ ] **Converter delegation testing**: Tests verify converter doesn't generate IDs

## Phase Completion Requirements

1. **All verification scripts pass**: Exit code 0 with no critical failures
2. **Manual checklist complete**: All items verified per test file
3. **Test quality analysis**: Average quality score ≥80
4. **TDD validation**: Tests fail appropriately with stub implementations

## Common Issues and Fixes

### Tests Passing with Stubs (Bad Sign)
```bash
# This indicates weak tests - strengthen them
# Change from: expect(result).toBeDefined()
# To: expect(result).toMatch(/^toolu_[A-Za-z0-9]{12}$/)
```

### Missing Realistic ID Testing
```bash
# Add more tests that validate actual Anthropic ID patterns
# Use: expect(toolId).toMatch(/^toolu_[A-Za-z0-9]{12}$/)
# Use: expect(toolId.startsWith('toolu_')).toBe(true)
```

### Insufficient Property-Based Testing
```bash
# Add more property-based tests using fast-check
# Ensure 25%+ of tests use it.prop(...) with fc. generators
```

## Next Phase Readiness

Phase 07 (Anthropic Tool ID Implementation) can begin when:
- All TDD tests created and failing appropriately
- High test quality standards met (≥80 average score)
- Realistic ID pattern expectations defined in tests
- Tool ID matching behavior clearly specified
- Conversation flow requirements validated

This verification ensures the TDD phase creates comprehensive, high-quality tests that will drive correct tool ID implementation in the next phase.