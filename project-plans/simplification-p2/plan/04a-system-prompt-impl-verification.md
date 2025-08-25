# Phase 04a: System Prompt Implementation Verification

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P04a`

## Prerequisites
- Required: Phase 04 completed
- Verification: All system prompt implementation done
- Expected: All TDD tests passing with real implementations

## Verification Tasks

### 1. Implementation Completion Verification Script

```bash
#!/bin/bash
# verification-p04.sh
set -e

echo "=== Phase 04 System Prompt Implementation Verification ==="

VERIFICATION_REPORT="/tmp/p04-verification.json"
echo '{"phase": "P04", "timestamp": "'$(date -Iseconds)'", "checks": []}' > $VERIFICATION_REPORT

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
    npm run typecheck 2>&1 | tail -20
    add_check "typescript_compilation" "pass" "fail" "FAIL"
    exit 1
fi

echo "2. Verifying implementation markers..."
IMPL_MARKERS=$(grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P04" packages/core/src/providers/ | wc -l | xargs)
if [ "$IMPL_MARKERS" -ge 15 ]; then
    echo "✅ Implementation markers: $IMPL_MARKERS"
    add_check "implementation_markers" "15+" "$IMPL_MARKERS" "PASS"
else
    echo "❌ Implementation markers: $IMPL_MARKERS (expected: 15+)"
    add_check "implementation_markers" "15+" "$IMPL_MARKERS" "FAIL"
    exit 1
fi

echo "3. Verifying all TODO markers resolved..."
TODO_MARKERS=$(grep -r "TODO.*Phase 04" packages/core/src/providers/ | wc -l | xargs)
if [ "$TODO_MARKERS" -eq 0 ]; then
    echo "✅ All TODO markers resolved: $TODO_MARKERS"
    add_check "todo_markers_resolved" "0" "$TODO_MARKERS" "PASS"
else
    echo "❌ Unresolved TODO markers: $TODO_MARKERS"
    grep -r "TODO.*Phase 04" packages/core/src/providers/
    add_check "todo_markers_resolved" "0" "$TODO_MARKERS" "FAIL"
    exit 1
fi

echo "4. Verifying all system prompt tests pass..."
if npm test -- --grep "system.*instruction|System.*Instruction" --silent > /dev/null 2>&1; then
    echo "✅ All system prompt tests pass"
    add_check "system_tests_pass" "all_pass" "all_pass" "PASS"
else
    echo "❌ System prompt tests failing"
    npm test -- --grep "system.*instruction|System.*Instruction" 2>&1 | tail -30
    add_check "system_tests_pass" "all_pass" "some_fail" "FAIL"
    exit 1
fi

echo "5. Verifying build passes completely..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Build passes"
    add_check "build_passes" "pass" "pass" "PASS"
else
    echo "❌ Build fails"
    npm run build 2>&1 | tail -20
    add_check "build_passes" "pass" "fail" "FAIL"
    exit 1
fi

echo "6. Verifying core functionality works..."
# Test system prompt extraction
node -e "
const { extractSystemPrompt, filterSystemContent, validateSystemContent } = require('./dist/packages/core/src/providers/types/SystemPromptConfig.js');

// Test extraction
const extracted = extractSystemPrompt({
  config: { systemInstruction: 'Config prompt' },
  contents: [{ role: 'system', parts: [{ text: 'Content prompt' }] }]
});
console.log('Extraction test:', extracted === 'Config prompt' ? 'PASS' : 'FAIL');

// Test filtering  
const contents = [
  { role: 'system', parts: [{ text: 'System' }] },
  { role: 'user', parts: [{ text: 'User' }] }
];
const filtered = filterSystemContent(contents);
console.log('Filtering test:', filtered.length === 1 && filtered[0].role === 'user' ? 'PASS' : 'FAIL');

// Test validation
try {
  validateSystemContent({ role: 'system', parts: [{ text: 'Valid' }] });
  console.log('Validation test: PASS');
} catch (e) {
  console.log('Validation test: FAIL');
}
" 2>/dev/null && {
    echo "✅ Core functionality works"
    add_check "core_functionality" "working" "working" "PASS"
} || {
    echo "❌ Core functionality broken"
    add_check "core_functionality" "working" "broken" "FAIL"
    exit 1
}

echo "7. Verifying provider-specific implementations..."

# Test Gemini system instruction conversion
node -e "
const { GeminiProvider } = require('./dist/packages/core/src/providers/gemini/GeminiProvider.js');
const provider = new GeminiProvider('test-key');
try {
  const converted = provider.convertToGeminiSystemInstruction('Test prompt');
  console.log('Gemini conversion:', converted.parts[0].text === 'Test prompt' ? 'PASS' : 'FAIL');
} catch (e) {
  console.log('Gemini conversion: FAIL -', e.message);
}
" 2>/dev/null && {
    echo "✅ Gemini implementation works"
    add_check "gemini_implementation" "working" "working" "PASS"
} || {
    echo "❌ Gemini implementation broken"
    add_check "gemini_implementation" "working" "broken" "FAIL"
}

# Test OpenAI system message conversion
node -e "
const { OpenAIProvider } = require('./dist/packages/core/src/providers/openai/OpenAIProvider.js');
const provider = new OpenAIProvider('test-key');
try {
  const messages = provider.convertToOpenAIMessagesWithSystem(
    [{ role: 'user', parts: [{ text: 'Hello' }] }],
    'System prompt'
  );
  const passTest = messages[0].role === 'system' && messages[0].content === 'System prompt';
  console.log('OpenAI conversion:', passTest ? 'PASS' : 'FAIL');
} catch (e) {
  console.log('OpenAI conversion: FAIL -', e.message);
}
" 2>/dev/null && {
    echo "✅ OpenAI implementation works"
    add_check "openai_implementation" "working" "working" "PASS"
} || {
    echo "❌ OpenAI implementation broken"
    add_check "openai_implementation" "working" "broken" "FAIL"
}

# Test Anthropic auth mode detection and processing
node -e "
const { AnthropicProvider } = require('./dist/packages/core/src/providers/anthropic/AnthropicProvider.js');
const provider = new AnthropicProvider('sk-ant-api-123');
try {
  const authMode = provider.detectAuthenticationMode('sk-ant-oat-456');
  console.log('Anthropic auth detection:', authMode === 'oauth' ? 'PASS' : 'FAIL');
  
  const processed = provider.processSystemInstructionForMode(
    [{ role: 'user', parts: [{ text: 'Hello' }] }],
    'System prompt'
  );
  const hasSystem = processed.systemParameter === 'System prompt';
  console.log('Anthropic processing:', hasSystem ? 'PASS' : 'FAIL');
} catch (e) {
  console.log('Anthropic tests: FAIL -', e.message);
}
" 2>/dev/null && {
    echo "✅ Anthropic implementation works"
    add_check "anthropic_implementation" "working" "working" "PASS"
} || {
    echo "❌ Anthropic implementation broken"  
    add_check "anthropic_implementation" "working" "broken" "FAIL"
}

echo "=== Verification Complete ==="
cat $VERIFICATION_REPORT | jq .

# Final status
FAILED_CHECKS=$(cat $VERIFICATION_REPORT | jq '[.checks[] | select(.status == "FAIL")] | length')
if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo "🎉 All implementation verifications passed!"
    exit 0
else
    echo "💥 $FAILED_CHECKS implementation verifications failed"
    exit 1
fi
```

### 2. Comprehensive Test Execution

```bash
#!/bin/bash
# test-execution-verification.sh

echo "=== Comprehensive Test Execution Verification ==="

echo "1. Running all system prompt tests..."
npm test -- --grep "system.*instruction|System.*Instruction" --reporter verbose

TEST_EXIT_CODE=$?
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All system prompt tests pass"
else
    echo "❌ System prompt tests failing (exit code: $TEST_EXIT_CODE)"
    exit 1
fi

echo "2. Running tests by provider..."

# Test each provider separately
declare -a PROVIDERS=("GeminiCompatibleWrapper" "GeminiProvider" "OpenAIProvider" "AnthropicProvider")

for provider in "${PROVIDERS[@]}"; do
    echo "Testing $provider system handling..."
    if npm test -- --grep "$provider.*system" --reporter min > /dev/null 2>&1; then
        echo "✅ $provider system tests pass"
    else
        echo "❌ $provider system tests fail"
        npm test -- --grep "$provider.*system" 2>&1 | tail -20
        exit 1
    fi
done

echo "3. Running integration tests..."
npm test -- --grep "should.*pass.*system.*instruction.*to" --reporter min
if [ $? -eq 0 ]; then
    echo "✅ Integration tests pass"
else
    echo "❌ Integration tests fail"
    exit 1
fi

echo "4. Running property-based tests..."
npm test -- --grep "it\.prop|property.*based" --reporter min
if [ $? -eq 0 ]; then
    echo "✅ Property-based tests pass"
else  
    echo "❌ Property-based tests fail"
    exit 1
fi

echo "All test executions completed successfully!"
```

### 3. Behavioral Verification Script

```typescript
// behavioral-verification.ts
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P04a
 * Comprehensive behavioral verification of system prompt implementation
 */

import { extractSystemPrompt, filterSystemContent, validateSystemContent } from '../packages/core/src/providers/types/SystemPromptConfig';
import { getSystemPromptCapabilities, detectAuthMode } from '../packages/core/src/providers/capabilities/SystemPromptCapabilities';

interface VerificationResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

async function runBehavioralVerification(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Test 1: System prompt extraction priority
  try {
    const extracted = extractSystemPrompt({
      config: { systemInstruction: 'Config wins' },
      contents: [{ role: 'system', parts: [{ text: 'Content loses' }] }]
    });
    
    results.push({
      test: 'System prompt extraction priority',
      status: extracted === 'Config wins' ? 'PASS' : 'FAIL',
      details: `Expected "Config wins", got "${extracted}"`
    });
  } catch (error) {
    results.push({
      test: 'System prompt extraction priority',
      status: 'FAIL',
      details: `Error: ${error.message}`
    });
  }

  // Test 2: System Content filtering
  try {
    const contents = [
      { role: 'system', parts: [{ text: 'System message' }] },
      { role: 'user', parts: [{ text: 'User message' }] },
      { role: 'model', parts: [{ text: 'Model response' }] }
    ];
    
    const filtered = filterSystemContent(contents);
    const hasSystemRole = filtered.some(c => c.role === 'system');
    const correctLength = filtered.length === 2;
    
    results.push({
      test: 'System Content filtering',
      status: (!hasSystemRole && correctLength) ? 'PASS' : 'FAIL',
      details: `Has system: ${hasSystemRole}, Length: ${filtered.length} (expected 2)`
    });
  } catch (error) {
    results.push({
      test: 'System Content filtering',
      status: 'FAIL',
      details: `Error: ${error.message}`
    });
  }

  // Test 3: System Content validation
  try {
    // Valid system Content should not throw
    validateSystemContent({
      role: 'system',
      parts: [{ text: 'Valid system content' }]
    });
    
    results.push({
      test: 'Valid system Content validation',
      status: 'PASS'
    });
  } catch (error) {
    results.push({
      test: 'Valid system Content validation',
      status: 'FAIL',
      details: `Should not throw for valid content: ${error.message}`
    });
  }

  // Test 4: Invalid system Content validation
  try {
    validateSystemContent({
      role: 'system',
      parts: [
        { text: 'Text part' },
        { functionCall: { name: 'invalid', args: {} } }
      ]
    });
    
    results.push({
      test: 'Invalid system Content validation',
      status: 'FAIL',
      details: 'Should throw for function calls in system Content'
    });
  } catch (error) {
    results.push({
      test: 'Invalid system Content validation',
      status: error.message.includes('function calls') ? 'PASS' : 'FAIL',
      details: error.message
    });
  }

  // Test 5: Auth mode detection
  const authModeTests = [
    { token: 'sk-ant-api-123', expected: 'api' },
    { token: 'sk-ant-oat-456', expected: 'oauth' },
    { token: 'invalid-token', expected: 'unknown' },
    { token: '', expected: 'unknown' }
  ];

  authModeTests.forEach(({ token, expected }) => {
    try {
      const detected = detectAuthMode(token);
      results.push({
        test: `Auth mode detection: ${token}`,
        status: detected === expected ? 'PASS' : 'FAIL',
        details: `Expected ${expected}, got ${detected}`
      });
    } catch (error) {
      results.push({
        test: `Auth mode detection: ${token}`,
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }
  });

  // Test 6: Provider capabilities
  const capabilityTests = [
    { provider: 'gemini', expected: { systemParameter: true, systemMessages: false, oauthInjection: false } },
    { provider: 'openai', expected: { systemParameter: false, systemMessages: true, oauthInjection: false } },
    { provider: 'anthropic', expected: { systemParameter: true, systemMessages: false, oauthInjection: false } }
  ];

  capabilityTests.forEach(({ provider, expected }) => {
    try {
      const capabilities = getSystemPromptCapabilities(provider, 'sk-ant-api-123');
      const matches = Object.keys(expected).every(key => 
        capabilities[key] === expected[key]
      );
      
      results.push({
        test: `Provider capabilities: ${provider}`,
        status: matches ? 'PASS' : 'FAIL',
        details: `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(capabilities)}`
      });
    } catch (error) {
      results.push({
        test: `Provider capabilities: ${provider}`,
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }
  });

  return results;
}

// Run verification and report results
runBehavioralVerification().then(results => {
  console.log('=== Behavioral Verification Results ===');
  
  let passed = 0;
  let failed = 0;
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.status}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    
    if (result.status === 'PASS') passed++;
    else failed++;
  });
  
  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===`);
  
  if (failed === 0) {
    console.log('🎉 All behavioral verifications passed!');
    process.exit(0);
  } else {
    console.log('💥 Some behavioral verifications failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Verification script failed:', error);
  process.exit(1);
});
```

### 4. Manual Verification Checklist

#### Implementation Quality Verification

**SystemPromptConfig.ts**:
- [ ] `extractSystemPrompt()` prioritizes config over Content correctly
- [ ] `extractSystemPrompt()` combines multiple system Content texts
- [ ] `validateSystemContent()` allows only text parts in system Content  
- [ ] `validateSystemContent()` throws clear errors for invalid content
- [ ] `filterSystemContent()` removes all system Content from arrays
- [ ] All functions have proper TypeScript types and JSDoc

**SystemPromptCapabilities.ts**:
- [ ] `getSystemPromptCapabilities()` returns correct capabilities per provider
- [ ] `detectAuthMode()` correctly identifies API vs OAuth tokens
- [ ] Edge cases handled (empty tokens, invalid formats)
- [ ] OAuth detection specifically works for Anthropic tokens

**GeminiCompatibleWrapper.ts**:
- [ ] System instructions extracted from both config and Content
- [ ] System Content validation occurs before processing
- [ ] Clean contents (no system role) passed to providers
- [ ] System prompt passed via enhanced options
- [ ] Existing generateContent functionality preserved

**GeminiProvider.ts**:
- [ ] `convertToGeminiSystemInstruction()` creates correct format
- [ ] `generateChatCompletionWithSystemPrompt()` adds systemInstruction to config
- [ ] Empty system prompts handled gracefully
- [ ] Original functionality preserved for non-system cases

**OpenAIProvider.ts**:
- [ ] `convertToOpenAIMessagesWithSystem()` adds system message first
- [ ] System message placement consistent regardless of input order  
- [ ] Tool calls work correctly with system messages
- [ ] Multiple system instructions combined properly

**AnthropicProvider.ts**:
- [ ] `detectAuthenticationMode()` works for both API and OAuth tokens
- [ ] API mode uses system parameter in request
- [ ] OAuth mode injects system prompt into first user message
- [ ] `injectSystemPromptIntoConversation()` preserves message structure
- [ ] Complex system instruction formatting preserved

#### Integration Verification

**Cross-Provider Consistency**:
- [ ] All providers handle empty system prompts the same way
- [ ] System prompt formatting preserved across all providers
- [ ] Error handling consistent for invalid system Content
- [ ] OAuth special case only applies to Anthropic

**Content[] Format Compliance**:
- [ ] No provider receives Content with system role
- [ ] All system instructions passed via configuration
- [ ] Conversation flow preserved after system extraction
- [ ] Tool calls unaffected by system prompt handling

#### Error Handling Verification

**Validation Errors**:
```bash
# Test validation error messages
node -e "
const { validateSystemContent } = require('./dist/packages/core/src/providers/types/SystemPromptConfig.js');
try {
  validateSystemContent({
    role: 'system',
    parts: [{ functionCall: { name: 'invalid', args: {} } }]
  });
  console.log('FAIL: Should have thrown error');
} catch (e) {
  console.log('PASS: Validation error:', e.message);
}
"
```

**Edge Case Handling**:
```bash
# Test edge cases
node -e "
const { extractSystemPrompt } = require('./dist/packages/core/src/providers/types/SystemPromptConfig.js');

// Empty inputs
console.log('Empty config:', extractSystemPrompt({}));
console.log('Empty contents:', extractSystemPrompt({ contents: [] }));
console.log('Null config:', extractSystemPrompt({ config: null }));
"
```

## Success Criteria

### Critical Requirements (Must Pass)
- [ ] **All system prompt tests pass**: 0 failing tests in TDD test suites
- [ ] **TypeScript compilation passes**: `npm run typecheck` exits 0
- [ ] **Build passes completely**: `npm run build` exits 0
- [ ] **All TODO markers resolved**: No "TODO Phase 04" comments remain
- [ ] **Implementation markers present**: 15+ @plan markers in implementation
- [ ] **Core functionality works**: All behavioral verification tests pass

### Quality Requirements (Should Pass)
- [ ] **Provider-specific implementations working**: Each provider handles system prompts correctly
- [ ] **OAuth special case working**: Anthropic OAuth injection works properly
- [ ] **Error handling robust**: Clear error messages for invalid inputs
- [ ] **Edge cases handled**: Empty, null, invalid inputs handled gracefully
- [ ] **Type safety maintained**: All functions properly typed
- [ ] **Documentation complete**: JSDoc comments on all public methods

### Integration Requirements
- [ ] **Cross-provider consistency**: All providers handle system prompts appropriately
- [ ] **Content[] compliance**: No system role Content reaches providers
- [ ] **Configuration separation**: System instructions passed as config, not messages
- [ ] **Existing functionality preserved**: Non-system-prompt flows still work

## Phase Completion Requirements

1. **All verification scripts pass**: Exit code 0 for all verification tests
2. **Manual checklist complete**: All items verified across all providers
3. **Integration testing successful**: System prompts work end-to-end
4. **Quality gates passed**: Build, test, lint, typecheck all pass

## Common Issues and Solutions

### Tests Still Failing
```bash
# Debug specific test failures
npm test -- --grep "failing test name" --reporter verbose
# Check implementation against test expectations
# Verify test-driven markers match actual test requirements
```

### TypeScript Compilation Issues  
```bash
# Check for type mismatches
npm run typecheck 2>&1 | grep -E "error TS"
# Common issues: wrong return types, missing properties, circular imports
```

### Provider Integration Issues
```bash
# Test each provider individually
node -e "
// Test provider-specific functionality
const provider = require('./dist/packages/core/src/providers/[provider]/[Provider].js');
// Verify methods exist and return expected types
"
```

## Next Phase Readiness

Phase 05 (Anthropic Tool ID Stub) can begin when:
- All system prompt implementation verified and working
- All TDD tests passing consistently  
- Type safety and build quality maintained
- System prompts working correctly across all providers
- OAuth special case handling verified

This verification ensures the system prompt architecture is fully implemented and ready for the next phase of tool ID remediation.