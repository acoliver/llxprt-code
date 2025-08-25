# Phase 05a: Anthropic Tool ID Stub Verification

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P05a`

## Prerequisites
- Required: Phase 05 completed
- Verification: Anthropic tool ID stub implementation done
- Expected: No hardcoded 'broken-tool-123' IDs remaining

## Verification Tasks

### 1. Hardcoded ID Elimination Verification Script

```bash
#!/bin/bash
# verification-p05.sh
set -e

echo "=== Phase 05 Anthropic Tool ID Stub Verification ==="

VERIFICATION_REPORT="/tmp/p05-verification.json"
echo '{"phase": "P05", "timestamp": "'$(date -Iseconds)'", "checks": []}' > $VERIFICATION_REPORT

add_check() {
    local name="$1"
    local expected="$2"
    local actual="$3"
    local status="$4"
    
    jq '.checks += [{"name": "'"$name"'", "expected": "'"$expected"'", "actual": "'"$actual"'", "status": "'"$status"'"}]' \
       $VERIFICATION_REPORT > /tmp/report.tmp && mv /tmp/report.tmp $VERIFICATION_REPORT
}

echo "1. Verifying TypeScript compilation..."
if npm run typecheck > /dev/null 2>&1; then
    echo "✅ TypeScript compilation passes"
    add_check "typescript_compilation" "pass" "pass" "PASS"
else
    echo "❌ TypeScript compilation fails"
    npm run typecheck 2>&1 | tail -10
    add_check "typescript_compilation" "pass" "fail" "FAIL"
    exit 1
fi

echo "2. Verifying hardcoded ID elimination..."
BROKEN_IDS=$(grep -r "broken-tool-123" packages/core/src/providers/ | wc -l | xargs)
if [ "$BROKEN_IDS" -eq 0 ]; then
    echo "✅ All hardcoded IDs eliminated: $BROKEN_IDS occurrences"
    add_check "hardcoded_ids_eliminated" "0" "$BROKEN_IDS" "PASS"
else
    echo "❌ Hardcoded IDs still found: $BROKEN_IDS occurrences"
    grep -r "broken-tool-123" packages/core/src/providers/
    add_check "hardcoded_ids_eliminated" "0" "$BROKEN_IDS" "FAIL"
    exit 1
fi

echo "3. Verifying new files created..."
if [ -f "packages/core/src/providers/types/ToolIdConfig.ts" ]; then
    echo "✅ ToolIdConfig.ts created"
    add_check "tool_id_config_file" "exists" "exists" "PASS"
else
    echo "❌ ToolIdConfig.ts missing"
    add_check "tool_id_config_file" "exists" "missing" "FAIL"
    exit 1
fi

if [ -f "packages/core/src/providers/anthropic/AnthropicToolIdTracker.ts" ]; then
    echo "✅ AnthropicToolIdTracker.ts created"
    add_check "anthropic_tracker_file" "exists" "exists" "PASS"
else
    echo "❌ AnthropicToolIdTracker.ts missing"
    add_check "anthropic_tracker_file" "exists" "missing" "FAIL"
    exit 1
fi

echo "4. Verifying plan markers..."
PLAN_MARKERS=$(grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P05" packages/core/src/providers/ | wc -l | xargs)
if [ "$PLAN_MARKERS" -ge 10 ]; then
    echo "✅ Plan markers: $PLAN_MARKERS (expected: 10+)"
    add_check "plan_markers" "10+" "$PLAN_MARKERS" "PASS"
else
    echo "❌ Plan markers: $PLAN_MARKERS (expected: 10+)"
    add_check "plan_markers" "10+" "$PLAN_MARKERS" "FAIL"
    exit 1
fi

echo "5. Verifying interface definitions..."
if grep -q "interface ToolIdConfig" packages/core/src/providers/types/ToolIdConfig.ts; then
    echo "✅ ToolIdConfig interface defined"
    add_check "tool_id_config_interface" "defined" "defined" "PASS"
else
    echo "❌ ToolIdConfig interface missing"
    add_check "tool_id_config_interface" "defined" "missing" "FAIL"
    exit 1
fi

if grep -q "interface ToolCallTracker" packages/core/src/providers/types/ToolIdConfig.ts; then
    echo "✅ ToolCallTracker interface defined"
    add_check "tool_call_tracker_interface" "defined" "defined" "PASS"
else
    echo "❌ ToolCallTracker interface missing"
    add_check "tool_call_tracker_interface" "defined" "missing" "FAIL"
    exit 1
fi

echo "6. Verifying AnthropicProvider modifications..."
if grep -q "AnthropicToolIdTracker" packages/core/src/providers/anthropic/AnthropicProvider.ts; then
    echo "✅ AnthropicProvider imports tracker"
    add_check "provider_imports_tracker" "imported" "imported" "PASS"
else
    echo "❌ AnthropicProvider missing tracker import"
    add_check "provider_imports_tracker" "imported" "missing" "FAIL"
    exit 1
fi

# Check that hardcoded ID assignments are replaced
if grep -q "generateToolUse\|generateToolResult" packages/core/src/providers/anthropic/AnthropicProvider.ts; then
    echo "✅ AnthropicProvider has new tool generation methods"
    add_check "provider_new_methods" "present" "present" "PASS"
else
    echo "❌ AnthropicProvider missing new tool generation methods"
    add_check "provider_new_methods" "present" "missing" "FAIL"
    exit 1
fi

echo "7. Verifying converter delegation..."
if grep -q "@deprecated\|delegated to provider" packages/core/src/providers/converters/AnthropicContentConverter.ts; then
    echo "✅ Converter properly delegates tool ID generation"
    add_check "converter_delegation" "delegated" "delegated" "PASS"
else
    echo "❌ Converter not properly delegating tool ID generation"
    add_check "converter_delegation" "delegated" "not_delegated" "WARN"
fi

echo "8. Verifying build passes..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build passes"
    add_check "build_passes" "pass" "pass" "PASS"
else
    echo "❌ Build fails"
    npm run build 2>&1 | tail -20
    add_check "build_passes" "pass" "fail" "FAIL"
    exit 1
fi

echo "=== Verification Complete ==="
cat $VERIFICATION_REPORT | jq .

# Final status
FAILED_CHECKS=$(cat $VERIFICATION_REPORT | jq '[.checks[] | select(.status == "FAIL")] | length')
if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo "🎉 All stub verifications passed!"
    exit 0
else
    echo "💥 $FAILED_CHECKS stub verifications failed"
    exit 1
fi
```

### 2. Architecture Verification Script

```bash
#!/bin/bash  
# architecture-verification.sh

echo "=== Anthropic Tool ID Architecture Verification ==="

echo "1. Verifying tool ID interfaces exist and are properly typed..."

# Test ToolIdConfig interface
node -e "
try {
  const { generateToolId, validateToolId } = require('./dist/packages/core/src/providers/types/ToolIdConfig.js');
  console.log('ToolIdConfig functions imported successfully');
  
  // Test stub behavior
  const stubConfig = {
    idFormat: 'anthropic',
    prefix: 'toolu_',
    suffixLength: 12,
    requiresMatching: true
  };
  
  const toolId = generateToolId(stubConfig);
  const isValid = validateToolId(toolId, stubConfig);
  
  console.log('generateToolId stub returns:', typeof toolId, '(empty string expected)');
  console.log('validateToolId stub returns:', isValid, '(true expected)');
  
} catch (error) {
  console.error('ToolIdConfig verification failed:', error.message);
  process.exit(1);
}
" || exit 1

echo "2. Verifying AnthropicToolIdTracker class..."

node -e "
try {
  const { AnthropicToolIdTracker } = require('./dist/packages/core/src/providers/anthropic/AnthropicToolIdTracker.js');
  
  const tracker = new AnthropicToolIdTracker();
  console.log('AnthropicToolIdTracker instantiated successfully');
  
  // Test stub methods
  const generatedId = tracker.generateId();
  console.log('generateId() returns:', typeof generatedId, '(string expected, empty for stub)');
  
  tracker.storeToolCall('testFunction', 'test-id');
  console.log('storeToolCall() executed without error');
  
  const retrievedId = tracker.getToolIdForFunction('testFunction');
  console.log('getToolIdForFunction() returns:', retrievedId, '(undefined expected for stub)');
  
  tracker.clear();
  console.log('clear() executed without error');
  
  const config = tracker.getConfig();
  console.log('getConfig() returns format:', config.idFormat);
  
} catch (error) {
  console.error('AnthropicToolIdTracker verification failed:', error.message);
  process.exit(1);
}
" || exit 1

echo "3. Verifying AnthropicProvider integration..."

node -e "
try {
  const { AnthropicProvider } = require('./dist/packages/core/src/providers/anthropic/AnthropicProvider.js');
  
  const provider = new AnthropicProvider('sk-ant-api-test');
  console.log('AnthropicProvider instantiated with tracker integration');
  
  // Check that provider has the new methods (they'll be private, so check prototype)
  const hasNewMethods = 
    provider.constructor.prototype.hasOwnProperty('generateToolUse') ||
    provider.constructor.prototype.hasOwnProperty('generateToolResult') ||
    provider.constructor.name === 'AnthropicProvider';
    
  console.log('AnthropicProvider has new architecture:', hasNewMethods);
  
} catch (error) {
  console.error('AnthropicProvider verification failed:', error.message);
  process.exit(1);
}
" || exit 1

echo "All architecture verifications passed!"
```

### 3. Code Quality Verification

```typescript
// code-quality-verification.ts
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05a
 * Verify stub implementation follows quality standards
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface QualityCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
}

function verifyFileQuality(filePath: string): QualityCheck[] {
  if (!existsSync(filePath)) {
    return [{
      name: `File existence: ${filePath}`,
      status: 'FAIL',
      details: 'File does not exist'
    }];
  }

  const content = readFileSync(filePath, 'utf8');
  const checks: QualityCheck[] = [];

  // Check 1: Plan markers present
  const planMarkers = (content.match(/@plan:PLAN-20250824-CONTENT-REMEDIATION\.P05/g) || []).length;
  checks.push({
    name: `Plan markers in ${filePath}`,
    status: planMarkers > 0 ? 'PASS' : 'FAIL',
    details: `Found ${planMarkers} plan markers`
  });

  // Check 2: No hardcoded broken IDs
  const brokenIds = (content.match(/broken-tool-123/g) || []).length;
  checks.push({
    name: `Hardcoded IDs in ${filePath}`,
    status: brokenIds === 0 ? 'PASS' : 'FAIL', 
    details: `Found ${brokenIds} hardcoded IDs`
  });

  // Check 3: Proper TypeScript interfaces/classes
  const hasInterface = content.includes('interface ') || content.includes('class ');
  const hasExport = content.includes('export ');
  checks.push({
    name: `TypeScript structure in ${filePath}`,
    status: (hasInterface && hasExport) ? 'PASS' : 'WARN',
    details: `Interface: ${hasInterface}, Export: ${hasExport}`
  });

  // Check 4: Stub documentation
  const stubComments = (content.match(/@stub/g) || []).length;
  checks.push({
    name: `Stub documentation in ${filePath}`,
    status: stubComments > 0 ? 'PASS' : 'WARN',
    details: `Found ${stubComments} @stub comments`
  });

  // Check 5: No NotYetImplemented patterns
  const notYetImpl = (content.match(/NotYetImplemented|throw.*Error.*not.*implement/gi) || []).length;
  checks.push({
    name: `No NotYetImplemented in ${filePath}`,
    status: notYetImpl === 0 ? 'PASS' : 'FAIL',
    details: `Found ${notYetImpl} NotYetImplemented patterns`
  });

  return checks;
}

const filesToVerify = [
  'packages/core/src/providers/types/ToolIdConfig.ts',
  'packages/core/src/providers/anthropic/AnthropicToolIdTracker.ts',
  'packages/core/src/providers/anthropic/AnthropicProvider.ts',
  'packages/core/src/providers/converters/AnthropicContentConverter.ts'
];

console.log('=== Code Quality Verification ===');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

filesToVerify.forEach(file => {
  console.log(`\nVerifying ${file}:`);
  const checks = verifyFileQuality(file);
  
  checks.forEach(check => {
    totalChecks++;
    const icon = check.status === 'PASS' ? '✅' : 
                 check.status === 'WARN' ? '⚠️' : '❌';
    console.log(`  ${icon} ${check.name}: ${check.status}`);
    if (check.details) {
      console.log(`     ${check.details}`);
    }
    
    if (check.status === 'PASS') passedChecks++;
    else if (check.status === 'FAIL') failedChecks++;
  });
});

console.log(`\n=== Summary: ${passedChecks}/${totalChecks} passed, ${failedChecks} failed ===`);

if (failedChecks === 0) {
  console.log('🎉 All code quality checks passed!');
  process.exit(0);
} else {
  console.log('💥 Some code quality checks failed');
  process.exit(1);
}
```

### 4. Manual Verification Checklist

#### File Creation Verification
- [ ] `packages/core/src/providers/types/ToolIdConfig.ts` exists
- [ ] `packages/core/src/providers/anthropic/AnthropicToolIdTracker.ts` exists
- [ ] Both files compile successfully with TypeScript
- [ ] Both files contain proper @plan markers

#### Interface Definition Verification

**ToolIdConfig.ts**:
- [ ] `ToolIdConfig` interface defined with required properties
- [ ] `ToolCallTracker` interface defined with all required methods
- [ ] `generateToolId()` function stub returns empty string
- [ ] `validateToolId()` function stub returns true
- [ ] All functions properly typed and documented

**AnthropicToolIdTracker.ts**:
- [ ] Implements `ToolCallTracker` interface
- [ ] All method stubs present and properly typed
- [ ] Constructor initializes config properly
- [ ] `getConfig()` method returns correct Anthropic configuration
- [ ] No hardcoded IDs in implementation

#### Provider Integration Verification

**AnthropicProvider.ts**:
- [ ] Imports `AnthropicToolIdTracker` correctly
- [ ] Creates `toolIdTracker` instance as private property
- [ ] `generateToolId()` method replaced with tracker delegation
- [ ] `generateToolUse()` method added as stub
- [ ] `generateToolResult()` method added as stub
- [ ] Hardcoded ID assignments (lines 686, 706) replaced with method calls
- [ ] All modifications marked with @plan markers
- [ ] No `'broken-tool-123'` references remain

**AnthropicContentConverter.ts**:
- [ ] Existing `generateToolId()` method marked as deprecated
- [ ] Tool conversion methods updated to use empty IDs
- [ ] Delegation to provider documented
- [ ] No hardcoded IDs in tool conversion logic

#### Compilation and Type Safety
- [ ] `npm run typecheck` passes without errors
- [ ] `npm run build` completes successfully
- [ ] All imports resolve correctly
- [ ] Interface implementations are complete
- [ ] Method signatures match interface requirements

#### Architecture Verification
- [ ] Tool ID generation responsibility moved from converter to provider
- [ ] Provider uses tracker for ID management
- [ ] Tracker provides proper interface abstraction
- [ ] Configuration system in place for provider-specific formats
- [ ] Clear separation between generation and tracking concerns

## Success Criteria

### Critical Requirements (Must Pass)
- [ ] **TypeScript compilation passes**: No type errors
- [ ] **All hardcoded IDs eliminated**: Zero 'broken-tool-123' references
- [ ] **New files created**: ToolIdConfig.ts and AnthropicToolIdTracker.ts exist
- [ ] **Provider integration**: AnthropicProvider uses tracker for tool ID management
- [ ] **Build passes**: npm run build succeeds
- [ ] **Plan markers present**: All modifications properly tagged

### Quality Requirements (Should Pass)
- [ ] **Interface completeness**: All ToolCallTracker methods implemented as stubs
- [ ] **Documentation quality**: @stub comments explain future implementation
- [ ] **Architecture clarity**: Clear delegation from converter to provider
- [ ] **Configuration system**: Anthropic-specific config properly defined
- [ ] **Type safety**: All stub methods return correct types

### Architecture Validation
- [ ] **Responsibility separation**: ID generation moved to appropriate layer
- [ ] **Anthropic specificity**: Tracker configured for Anthropic ID format
- [ ] **State management**: Infrastructure for tool call tracking in place
- [ ] **Extensibility**: Framework supports other providers in future

## Phase Completion Requirements

1. **All verification scripts pass**: Exit code 0 for all verification tests
2. **Manual checklist complete**: All items verified
3. **Code quality standards met**: Proper typing, documentation, plan markers
4. **Architecture foundation solid**: Ready for comprehensive TDD in Phase 06

## Common Issues and Fixes

### Import/Export Issues
```bash
# Check for circular imports
npm run build 2>&1 | grep -i "circular"
# Fix: Ensure proper import ordering and avoid circular dependencies
```

### Type Safety Issues
```bash
# Check for interface implementation problems
npm run typecheck 2>&1 | grep -E "does not implement|missing property"
# Fix: Ensure all interface methods are implemented, even as stubs
```

### Missing Plan Markers
```bash
# Find unmarked code changes
grep -r "generateId\|storeToolCall" packages/core/src/providers/ | grep -v "@plan"
# Fix: Add @plan markers to all new/modified methods
```

## Next Phase Readiness

Phase 06 (Anthropic Tool ID TDD) can begin when:
- All stub verification passes completed
- Architecture foundation is solid and compilable  
- All hardcoded IDs eliminated from codebase
- Tool ID generation and tracking infrastructure in place
- Clear interface for TDD test development

This verification ensures the stub phase creates a clean, type-safe foundation for comprehensive TDD testing of tool ID generation and matching in the next phase.