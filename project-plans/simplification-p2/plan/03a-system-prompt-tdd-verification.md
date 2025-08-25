# Phase 03a: System Prompt TDD Verification

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P03a`

## Prerequisites
- Required: Phase 03 completed
- Verification: All TDD test files created
- Expected: Comprehensive behavioral tests that fail with current stubs

## Verification Tasks

### 1. Test Creation Verification Script

```bash
#!/bin/bash
# verification-p03.sh
set -e

echo "=== Phase 03 System Prompt TDD Verification ==="

VERIFICATION_REPORT="/tmp/p03-verification.json"
echo '{"phase": "P03", "timestamp": "'$(date -Iseconds)'", "checks": []}' > $VERIFICATION_REPORT

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
    "packages/core/src/providers/adapters/GeminiCompatibleWrapper.system.test.ts"
    "packages/core/src/providers/gemini/GeminiProvider.system.test.ts"
    "packages/core/src/providers/openai/OpenAIProvider.system.test.ts"
    "packages/core/src/providers/anthropic/AnthropicProvider.system.test.ts"
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
PLAN_MARKERS=$(grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P03" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
if [ "$PLAN_MARKERS" -ge 4 ]; then
    echo "✅ Plan markers in tests: $PLAN_MARKERS"
    add_check "test_plan_markers" "4+" "$PLAN_MARKERS" "PASS"
else
    echo "❌ Plan markers in tests: $PLAN_MARKERS (expected: 4+)"
    add_check "test_plan_markers" "4+" "$PLAN_MARKERS" "FAIL"
    exit 1
fi

echo "3. Verifying behavioral test annotations..."
SCENARIOS=$(grep -r "@scenario\|@given\|@when\|@then" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
if [ "$SCENARIOS" -ge 60 ]; then
    echo "✅ Behavioral annotations: $SCENARIOS"
    add_check "behavioral_annotations" "60+" "$SCENARIOS" "PASS"
else
    echo "❌ Behavioral annotations: $SCENARIOS (expected: 60+)"
    add_check "behavioral_annotations" "60+" "$SCENARIOS" "WARN"
fi

echo "4. Verifying property-based tests..."
PROPERTY_TESTS=$(grep -r "it\.prop\|fc\." packages/core/src/providers/*.system.test.ts | wc -l | xargs)
if [ "$PROPERTY_TESTS" -ge 8 ]; then
    echo "✅ Property-based tests: $PROPERTY_TESTS"
    add_check "property_based_tests" "8+" "$PROPERTY_TESTS" "PASS"
else
    echo "❌ Property-based tests: $PROPERTY_TESTS (expected: 8+)"
    add_check "property_based_tests" "8+" "$PROPERTY_TESTS" "FAIL"
fi

echo "5. Verifying mock theater reduction..."
MOCK_THEATER=$(grep -r "mockImplementation\|toHaveBeenCalledWith.*mock" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
if [ "$MOCK_THEATER" -lt 10 ]; then
    echo "✅ Mock theater limited: $MOCK_THEATER occurrences"
    add_check "mock_theater_limited" "<10" "$MOCK_THEATER" "PASS"
else
    echo "❌ Too much mock theater: $MOCK_THEATER occurrences"
    add_check "mock_theater_limited" "<10" "$MOCK_THEATER" "WARN"
fi

echo "6. Verifying no reverse testing..."
REVERSE_TESTS=$(grep -r "toThrow.*NotYetImplemented\|expect.*not\.toThrow" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
if [ "$REVERSE_TESTS" -eq 0 ]; then
    echo "✅ No reverse testing: $REVERSE_TESTS"
    add_check "no_reverse_testing" "0" "$REVERSE_TESTS" "PASS"
else
    echo "❌ Reverse testing found: $REVERSE_TESTS occurrences"
    grep -r "toThrow.*NotYetImplemented\|expect.*not\.toThrow" packages/core/src/providers/*.system.test.ts
    add_check "no_reverse_testing" "0" "$REVERSE_TESTS" "FAIL"
    exit 1
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
# Run tests and expect failures (this proves they test real behavior)
if npm test -- --grep "system.*instruction" --silent 2>/dev/null; then
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
# test-quality-analysis.sh

echo "=== TDD Test Quality Analysis ==="

echo "1. Analyzing test file structure..."
for file in packages/core/src/providers/*.system.test.ts; do
    if [ -f "$file" ]; then
        TEST_COUNT=$(grep -c "it(" "$file")
        DESCRIBE_COUNT=$(grep -c "describe(" "$file")
        BEHAVIORAL_ANNOTATIONS=$(grep -c "@scenario\|@given\|@when\|@then" "$file")
        PROPERTY_TESTS=$(grep -c "it\.prop" "$file")
        
        echo "  $(basename "$file"):"
        echo "    Tests: $TEST_COUNT"
        echo "    Test suites: $DESCRIBE_COUNT" 
        echo "    Behavioral annotations: $BEHAVIORAL_ANNOTATIONS"
        echo "    Property-based tests: $PROPERTY_TESTS"
        
        # Calculate property-based percentage
        if [ $TEST_COUNT -gt 0 ]; then
            PROP_PERCENTAGE=$(( (PROPERTY_TESTS * 100) / TEST_COUNT ))
            echo "    Property-based %: $PROP_PERCENTAGE%"
        fi
        echo ""
    fi
done

echo "2. Analyzing behavioral coverage..."

# Count requirements coverage
REQ_001_1=$(grep -r "REQ-001.1" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
REQ_001_2=$(grep -r "REQ-001.2" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
REQ_001_3=$(grep -r "REQ-001.3" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
REQ_001_4=$(grep -r "REQ-001.4" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
REQ_001_5=$(grep -r "REQ-001.5" packages/core/src/providers/*.system.test.ts | wc -l | xargs)

echo "Requirements coverage:"
echo "  REQ-001.1 (System as config): $REQ_001_1 tests"
echo "  REQ-001.2 (Gemini systemInstruction): $REQ_001_2 tests"  
echo "  REQ-001.3 (OpenAI system messages): $REQ_001_3 tests"
echo "  REQ-001.4 (Anthropic system/OAuth): $REQ_001_4 tests"
echo "  REQ-001.5 (No system Content): $REQ_001_5 tests"

echo "3. Analyzing test behavior patterns..."

# Look for data transformation tests
TRANSFORMATION_TESTS=$(grep -r "expect.*toBe\|expect.*toEqual\|expect.*toContain" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
echo "Data transformation assertions: $TRANSFORMATION_TESTS"

# Look for real behavior validation
REAL_BEHAVIOR_TESTS=$(grep -r "generateChatCompletion\|generateContent" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
echo "Real behavior tests: $REAL_BEHAVIOR_TESTS"

# Check for edge case coverage
EDGE_CASE_TESTS=$(grep -r "empty\|undefined\|null\|invalid" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
echo "Edge case coverage: $EDGE_CASE_TESTS"

echo "4. Identifying potential issues..."

# Check for weak test patterns
WEAK_PATTERNS=$(grep -r "toHaveProperty\|toBeDefined\|toBeUndefined" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
if [ $WEAK_PATTERNS -gt 5 ]; then
    echo "⚠️  Potential weak tests (structure-only): $WEAK_PATTERNS"
else
    echo "✅ Strong behavioral tests (minimal structure-only): $WEAK_PATTERNS"
fi

# Check for sufficient complexity
SIMPLE_TESTS=$(grep -r "expect.*toBe.*true\|expect.*toBe.*false" packages/core/src/providers/*.system.test.ts | wc -l | xargs)
if [ $SIMPLE_TESTS -gt 10 ]; then
    echo "⚠️  Many simple boolean tests: $SIMPLE_TESTS (consider more complex validations)"
else
    echo "✅ Appropriate test complexity: $SIMPLE_TESTS simple boolean tests"
fi
```

### 3. Manual Verification Checklist

#### File-by-File Test Quality Verification

**GeminiCompatibleWrapper.system.test.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P03` marker
- [ ] Tests system instruction extraction from Content[]
- [ ] Tests system instruction passed as config to providers
- [ ] Tests Content[] filtering (no system role to providers)
- [ ] Tests config.systemInstruction precedence over Content system
- [ ] Tests validation of system Content (text-only requirement)
- [ ] Contains property-based test for system extraction
- [ ] All tests have behavioral annotations (@scenario, @given, @when, @then)
- [ ] No mock theater (tests call real methods, verify real outputs)

**GeminiProvider.system.test.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P03` marker
- [ ] Tests systemInstruction parameter in Gemini API calls
- [ ] Tests system instruction structure preservation
- [ ] Tests empty system instruction handling
- [ ] Property-based test for any valid system instruction text
- [ ] All tests verify actual Gemini API format requirements
- [ ] No Content with system role sent to Gemini API

**OpenAIProvider.system.test.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P03` marker
- [ ] Tests system instruction conversion to OpenAI system message
- [ ] Tests system message placement (first in messages array)
- [ ] Tests multiple system instruction combination
- [ ] Tests system message with tool calls
- [ ] Property-based test for system message placement
- [ ] All tests verify actual OpenAI API format requirements

**AnthropicProvider.system.test.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P03` marker
- [ ] Tests API mode: system parameter (not in messages)
- [ ] Tests OAuth mode: injection into first user message  
- [ ] Tests auth mode detection (API vs OAuth)
- [ ] Tests complex system instruction formatting preservation
- [ ] Property-based test for auth mode handling
- [ ] All tests verify actual Anthropic API format requirements

#### Behavioral Test Quality Verification

**For each test file, verify**:
- [ ] **Real Data Transformation**: Tests process actual Content[] and system instructions
- [ ] **Provider-Specific Behavior**: Tests match real API requirements for each provider
- [ ] **Edge Case Coverage**: Empty, undefined, invalid inputs handled
- [ ] **Format Validation**: Output matches expected provider formats exactly
- [ ] **No Mock Theater**: Tests don't just verify mocks were called
- [ ] **Clear Assertions**: Each test verifies specific output values/structure
- [ ] **Property-Based Coverage**: At least 30% property-based tests per file

#### TDD Verification (Critical)

**Tests should FAIL with current stub implementations**:
```bash
# Run each test file and verify failures
npm test packages/core/src/providers/adapters/GeminiCompatibleWrapper.system.test.ts
# Expected: Multiple test failures due to stub implementations

npm test packages/core/src/providers/gemini/GeminiProvider.system.test.ts  
# Expected: Tests fail because systemInstruction not implemented

npm test packages/core/src/providers/openai/OpenAIProvider.system.test.ts
# Expected: Tests fail because system message conversion not implemented

npm test packages/core/src/providers/anthropic/AnthropicProvider.system.test.ts
# Expected: Tests fail because system parameter/injection not implemented
```

**If tests pass with stubs, they are likely weak tests that need strengthening.**

### 4. Test Behavior Validation

```typescript
// Create validation script: validate-test-behavior.ts
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P03a
 * Validate that tests actually test real behavior
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const testFiles = [
  'packages/core/src/providers/adapters/GeminiCompatibleWrapper.system.test.ts',
  'packages/core/src/providers/gemini/GeminiProvider.system.test.ts',
  'packages/core/src/providers/openai/OpenAIProvider.system.test.ts',
  'packages/core/src/providers/anthropic/AnthropicProvider.system.test.ts'
];

interface TestQualityMetrics {
  file: string;
  totalTests: number;
  behavioralAnnotations: number;
  propertyBasedTests: number;
  mockTheaterCount: number;
  realBehaviorTests: number;
  dataTransformationAssertions: number;
}

function analyzeTestFile(filePath: string): TestQualityMetrics {
  const content = readFileSync(filePath, 'utf8');
  
  return {
    file: filePath,
    totalTests: (content.match(/it\(/g) || []).length + (content.match(/it\.prop\(/g) || []).length,
    behavioralAnnotations: (content.match(/@scenario|@given|@when|@then/g) || []).length,
    propertyBasedTests: (content.match(/it\.prop\(/g) || []).length,
    mockTheaterCount: (content.match(/toHaveBeenCalled|mockImplementation.*mock/g) || []).length,
    realBehaviorTests: (content.match(/generateChatCompletion|generateContent/g) || []).length,
    dataTransformationAssertions: (content.match(/expect.*toEqual|expect.*toBe.*[^true|false]/g) || []).length
  };
}

console.log('=== Test Behavior Analysis ===');

let totalQualityScore = 0;
let fileCount = 0;

testFiles.forEach(file => {
  try {
    const metrics = analyzeTestFile(file);
    fileCount++;
    
    console.log(`\n${metrics.file}:`);
    console.log(`  Total Tests: ${metrics.totalTests}`);
    console.log(`  Behavioral Annotations: ${metrics.behavioralAnnotations}`);
    console.log(`  Property-Based Tests: ${metrics.propertyBasedTests}`);
    console.log(`  Mock Theater Count: ${metrics.mockTheaterCount}`);
    console.log(`  Real Behavior Tests: ${metrics.realBehaviorTests}`);
    console.log(`  Data Transformation Assertions: ${metrics.dataTransformationAssertions}`);
    
    // Calculate quality score (0-100)
    const behavioralCoverage = metrics.totalTests > 0 ? (metrics.behavioralAnnotations / metrics.totalTests) : 0;
    const propertyBasedPercent = metrics.totalTests > 0 ? (metrics.propertyBasedTests / metrics.totalTests) : 0;
    const realBehaviorPercent = metrics.totalTests > 0 ? (metrics.realBehaviorTests / metrics.totalTests) : 0;
    const mockTheaterPenalty = Math.min(metrics.mockTheaterCount * 2, 20); // Penalty for mock theater
    
    const qualityScore = Math.max(0, 
      (behavioralCoverage * 30) +  // 30% for behavioral annotations
      (propertyBasedPercent * 30) +  // 30% for property-based tests
      (realBehaviorPercent * 40) -   // 40% for real behavior testing
      mockTheaterPenalty            // Penalty for mock theater
    );
    
    console.log(`  Quality Score: ${qualityScore.toFixed(1)}/100`);
    totalQualityScore += qualityScore;
    
    // Quality assessment
    if (qualityScore >= 80) {
      console.log(`  ✅ Excellent test quality`);
    } else if (qualityScore >= 60) {
      console.log(`  ⚠️  Good test quality, room for improvement`);
    } else {
      console.log(`  ❌ Poor test quality, needs significant improvement`);
    }
    
  } catch (error) {
    console.log(`❌ Error analyzing ${file}: ${error}`);
  }
});

const averageQuality = fileCount > 0 ? totalQualityScore / fileCount : 0;
console.log(`\n=== Overall Quality Score: ${averageQuality.toFixed(1)}/100 ===`);

if (averageQuality >= 75) {
  console.log('🎉 TDD tests meet high quality standards!');
  process.exit(0);
} else {
  console.log('💥 TDD tests need quality improvements before proceeding');
  process.exit(1);
}
```

## Success Criteria

### Critical Requirements (Must Pass)
- [ ] **All 4 test files created** and contain comprehensive system prompt tests
- [ ] **Tests compile successfully** with TypeScript strict mode
- [ ] **Tests fail with stub implementations** (proving they test real behavior)
- [ ] **60+ behavioral annotations** across all test files
- [ ] **8+ property-based tests** (minimum 30% coverage)
- [ ] **Zero reverse testing** (no testing for NotYetImplemented)
- [ ] **Minimal mock theater** (<10 occurrences across all files)

### Quality Requirements (Should Pass)
- [ ] **All requirements covered**: REQ-001.1 through REQ-001.5 have test coverage
- [ ] **Real behavior validation**: Tests call actual provider methods
- [ ] **Data transformation focus**: Tests verify input→output transformations
- [ ] **Provider-specific testing**: Each provider tested for its native format
- [ ] **Edge case coverage**: Empty, invalid, complex inputs tested
- [ ] **OAuth special handling**: Anthropic OAuth mode tested separately

### Architecture Validation
- [ ] **System instruction separation**: Tests verify system instructions not in Content[]
- [ ] **Provider capability testing**: Each provider tested for correct system handling
- [ ] **Format compliance**: Tests verify actual API format requirements
- [ ] **Configuration vs messages**: Clear separation tested

## Phase Completion Requirements

1. **All verification scripts pass**: Exit code 0 with no critical failures
2. **Manual checklist complete**: All items verified per provider
3. **Test quality analysis**: Average quality score ≥75
4. **TDD validation**: Tests fail appropriately with stub implementations

## Common Issues and Fixes

### Tests Passing with Stubs (Bad Sign)
```bash
# This indicates weak tests - they should fail with stubs
# Fix: Strengthen assertions to test actual behavior
# Change from: expect(result).toBeDefined()
# To: expect(result.systemInstruction).toBe('specific expected value')
```

### Missing Property-Based Tests
```bash
# Add more property-based tests using fast-check
npm install --save-dev fast-check
# Ensure 30% of tests use it.prop(...) with fc. generators
```

### Too Much Mock Theater
```bash
# Replace mock verification with real behavior testing
# Change from: expect(mockMethod).toHaveBeenCalledWith(...)
# To: expect(actualResult).toEqual(expectedTransformation)
```

## Next Phase Readiness

Phase 04 (System Prompt Implementation) can begin when:
- All TDD tests created and failing appropriately  
- High test quality standards met (≥75 average score)
- All requirements have comprehensive test coverage
- Tests drive clear implementation requirements

This verification ensures the TDD phase creates a solid foundation for driving correct implementation in the next phase.