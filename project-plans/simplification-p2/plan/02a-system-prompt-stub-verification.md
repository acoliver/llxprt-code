# Phase 02a: System Prompt Stub Verification

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P02a`

## Prerequisites
- Required: Phase 02 completed
- Verification: `grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P02" packages/core/src/providers/`
- Expected: 6+ files with stub implementations

## Verification Tasks

### 1. Compilation Verification Script

```bash
#!/bin/bash
# verification-p02.sh
set -e

echo "=== Phase 02 System Prompt Stub Verification ==="

VERIFICATION_REPORT="/tmp/p02-verification.json"
echo '{"phase": "P02", "timestamp": "'$(date -Iseconds)'", "checks": []}' > $VERIFICATION_REPORT

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

echo "2. Verifying new files created..."
if [ -f "packages/core/src/providers/types/SystemPromptConfig.ts" ]; then
    echo "✅ SystemPromptConfig.ts created"
    add_check "system_prompt_config_file" "exists" "exists" "PASS"
else
    echo "❌ SystemPromptConfig.ts missing"
    add_check "system_prompt_config_file" "exists" "missing" "FAIL"
    exit 1
fi

if [ -f "packages/core/src/providers/capabilities/SystemPromptCapabilities.ts" ]; then
    echo "✅ SystemPromptCapabilities.ts created"
    add_check "system_prompt_capabilities_file" "exists" "exists" "PASS" 
else
    echo "❌ SystemPromptCapabilities.ts missing"
    add_check "system_prompt_capabilities_file" "exists" "missing" "FAIL"
    exit 1
fi

echo "3. Verifying plan markers..."
PLAN_MARKERS=$(grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P02" packages/core/src/providers/ | wc -l | xargs)
if [ "$PLAN_MARKERS" -ge 6 ]; then
    echo "✅ Plan markers: $PLAN_MARKERS (expected: 6+)"
    add_check "plan_markers" "6+" "$PLAN_MARKERS" "PASS"
else
    echo "❌ Plan markers: $PLAN_MARKERS (expected: 6+)"
    add_check "plan_markers" "6+" "$PLAN_MARKERS" "FAIL"
    exit 1
fi

echo "4. Verifying no NotYetImplemented..."
NOT_YET_IMPL=$(grep -r "NotYetImplemented" packages/core/src/providers/ | wc -l | xargs)
if [ "$NOT_YET_IMPL" -eq 0 ]; then
    echo "✅ No NotYetImplemented errors: $NOT_YET_IMPL"
    add_check "no_not_yet_implemented" "0" "$NOT_YET_IMPL" "PASS"
else
    echo "❌ NotYetImplemented found: $NOT_YET_IMPL occurrences"
    grep -r "NotYetImplemented" packages/core/src/providers/
    add_check "no_not_yet_implemented" "0" "$NOT_YET_IMPL" "FAIL"
    exit 1
fi

echo "5. Verifying TODO markers for implementation..."
TODO_MARKERS=$(grep -r "TODO.*Phase 04" packages/core/src/providers/ | wc -l | xargs)
if [ "$TODO_MARKERS" -ge 6 ]; then
    echo "✅ TODO markers for Phase 04: $TODO_MARKERS"
    add_check "todo_markers" "6+" "$TODO_MARKERS" "PASS"
else
    echo "❌ TODO markers for Phase 04: $TODO_MARKERS (expected: 6+)"
    add_check "todo_markers" "6+" "$TODO_MARKERS" "FAIL"
fi

echo "6. Verifying interface definitions..."
# Check SystemPromptConfig interface exists
if grep -q "interface SystemPromptConfig" packages/core/src/providers/types/SystemPromptConfig.ts; then
    echo "✅ SystemPromptConfig interface defined"
    add_check "system_prompt_config_interface" "defined" "defined" "PASS"
else
    echo "❌ SystemPromptConfig interface missing"
    add_check "system_prompt_config_interface" "defined" "missing" "FAIL"
fi

# Check SystemPromptCapabilities interface exists
if grep -q "interface SystemPromptCapabilities" packages/core/src/providers/types/SystemPromptConfig.ts; then
    echo "✅ SystemPromptCapabilities interface defined"
    add_check "system_prompt_capabilities_interface" "defined" "defined" "PASS"
else
    echo "❌ SystemPromptCapabilities interface missing"
    add_check "system_prompt_capabilities_interface" "defined" "missing" "FAIL"
fi

echo "7. Verifying provider modifications..."
# Check each provider has been modified
declare -a PROVIDERS=("gemini" "openai" "anthropic")

for provider in "${PROVIDERS[@]}"; do
    PROVIDER_FILE="packages/core/src/providers/${provider}/${provider^}Provider.ts"
    if grep -q "@plan:PLAN-20250824-CONTENT-REMEDIATION.P02" "$PROVIDER_FILE"; then
        echo "✅ ${provider^}Provider modified"
        add_check "${provider}_provider_modified" "modified" "modified" "PASS"
    else
        echo "❌ ${provider^}Provider not modified"
        add_check "${provider}_provider_modified" "modified" "not_modified" "FAIL"
    fi
done

echo "8. Verifying GeminiCompatibleWrapper modification..."
if grep -q "@plan:PLAN-20250824-CONTENT-REMEDIATION.P02" packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts; then
    echo "✅ GeminiCompatibleWrapper modified"
    add_check "wrapper_modified" "modified" "modified" "PASS"
else
    echo "❌ GeminiCompatibleWrapper not modified"
    add_check "wrapper_modified" "modified" "not_modified" "FAIL"
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

### 2. Type Safety Verification

```typescript
// verification-p02-types.ts
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P02a
 * Type safety verification for system prompt stubs
 */

import { SystemPromptConfig, SystemPromptCapabilities, extractSystemPrompt, validateSystemPrompt } from '../providers/types/SystemPromptConfig';
import { getSystemPromptCapabilities, detectAuthMode } from '../providers/capabilities/SystemPromptCapabilities';

// Test that all interfaces are properly typed
const testConfig: SystemPromptConfig = {
  systemInstruction: 'test',
  supportsNativeSystemInstructions: true,
  requiresOAuthInjection: false
};

const testCapabilities: SystemPromptCapabilities = {
  systemParameter: true,
  systemMessages: false,
  oauthInjection: false
};

// Test that functions have correct signatures
const systemPrompt: string = extractSystemPrompt({ config: { systemInstruction: 'test' } });
validateSystemPrompt('test'); // Should not throw

const capabilities: SystemPromptCapabilities = getSystemPromptCapabilities('gemini');
const authMode: 'api' | 'oauth' | 'unknown' = detectAuthMode('sk-ant-api-123');

console.log('✅ All type definitions are valid');
```

### 3. Stub Function Verification

```bash
# Verify each stub function exists and compiles
echo "Testing stub function compilation..."

# Test SystemPromptConfig functions
node -e "
const { extractSystemPrompt, validateSystemPrompt } = require('./dist/packages/core/src/providers/types/SystemPromptConfig.js');
const result = extractSystemPrompt({});
console.log('extractSystemPrompt returns:', typeof result);
validateSystemPrompt('test');
console.log('✅ SystemPromptConfig functions work');
"

# Test SystemPromptCapabilities functions
node -e "
const { getSystemPromptCapabilities, detectAuthMode } = require('./dist/packages/core/src/providers/capabilities/SystemPromptCapabilities.js');
const caps = getSystemPromptCapabilities('gemini');
const mode = detectAuthMode('sk-ant-api-123');
console.log('Capabilities:', caps);
console.log('Auth mode:', mode);
console.log('✅ SystemPromptCapabilities functions work');
"
```

### 4. Manual Verification Checklist

#### File Creation Verification
- [ ] `packages/core/src/providers/types/SystemPromptConfig.ts` exists
- [ ] `packages/core/src/providers/capabilities/SystemPromptCapabilities.ts` exists
- [ ] Both files contain `@plan:PLAN-20250824-CONTENT-REMEDIATION.P02` markers
- [ ] Interface definitions are complete and properly typed

#### Provider Modification Verification

**GeminiProvider.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P02` marker
- [ ] Has `handleSystemInstruction` method stub
- [ ] Imports `SystemPromptConfig` type
- [ ] Method returns appropriate type without throwing

**OpenAIProvider.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P02` marker
- [ ] Has `addSystemMessage` method stub
- [ ] Imports `SystemPromptConfig` type
- [ ] Method returns appropriate type without throwing

**AnthropicProvider.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P02` marker
- [ ] Has `handleSystemPrompt` method stub
- [ ] Imports both `SystemPromptConfig` and capability detection
- [ ] Method returns appropriate object structure

**GeminiCompatibleWrapper.ts**:
- [ ] Contains `@plan:PLAN-20250824-CONTENT-REMEDIATION.P02` marker
- [ ] Has `handleSystemInstructions` method stub
- [ ] Has `generateContentWithSystemPrompt` method stub
- [ ] Methods return appropriate types without throwing

#### Code Quality Verification
- [ ] No `NotYetImplemented` exceptions in new code
- [ ] All stub methods return correct types
- [ ] TODO comments indicate Phase 04 implementation points
- [ ] All new code follows TypeScript strict mode
- [ ] No console.log or debug statements in stubs

#### Integration Verification
- [ ] All providers can be imported successfully
- [ ] Stub methods can be called without errors
- [ ] Type definitions are consistent across files
- [ ] No circular dependencies introduced

## Success Criteria

### Critical Requirements (Must Pass)
- [ ] **TypeScript compilation passes**: `npm run typecheck` exits 0
- [ ] **All new files created**: SystemPromptConfig.ts and SystemPromptCapabilities.ts exist
- [ ] **All providers modified**: Plan markers in all provider files
- [ ] **No runtime exceptions**: Stub methods don't throw NotYetImplemented
- [ ] **Type safety maintained**: All returns match expected interfaces

### Quality Requirements (Should Pass)
- [ ] **Plan markers present**: 6+ occurrences across modified files
- [ ] **TODO markers present**: Implementation points marked for Phase 04
- [ ] **Interface consistency**: All system prompt types properly defined
- [ ] **Import structure**: No circular dependencies or missing imports

### Architecture Validation
- [ ] **Separation of concerns**: Configuration separate from messages
- [ ] **Provider abstraction**: Each provider has appropriate stub methods
- [ ] **Capability detection**: Framework for provider-specific handling
- [ ] **OAuth detection**: Framework for auth mode differences

## Phase Completion Requirements

1. **Verification script passes**: Exit code 0 with all checks green
2. **Manual checklist complete**: All items verified manually
3. **Build system passes**: npm run build succeeds
4. **Type safety verified**: Compilation with strict TypeScript

## Common Issues and Fixes

### Import Issues
```bash
# Fix missing import paths
grep -r "SystemPromptConfig" packages/core/src/providers/ | grep -v "import"
# Add missing imports to files using the interfaces
```

### Type Issues
```bash
# Check for type mismatches
npm run typecheck 2>&1 | grep -E "(error|Type)"
# Fix return types to match interface definitions
```

### Circular Dependencies
```bash
# Check for circular imports
npm run build 2>&1 | grep -i "circular"
# Refactor imports to avoid circular dependencies
```

## Next Phase Readiness

Phase 03 (System Prompt TDD) can begin when:
- All verification criteria met
- TypeScript compilation passes
- All stub methods created and functional
- Clean foundation for writing comprehensive TDD tests

This verification ensures the stub implementation provides a solid, type-safe foundation for the TDD implementation phase.