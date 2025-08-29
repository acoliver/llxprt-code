# Phase 28a - Provider TDD Verification

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P28A

**Prerequisites:** Phase 28 completed (Provider updates TDD tests created)

## Verification Scope

This phase verifies the TDD tests created for provider updates functionality, ensuring providers accept Content[] parameters and have NO HistoryService dependency, maintaining clean architecture and separation of concerns.

## Verification Commands

### 1. Test Coverage Verification
```bash
# Verify all providers have Content[] parameter tests
grep -r "Content\[\]" packages/core/src/providers --include="*.test.ts"

# Check test content for clean architecture verification
grep -r "NO HistoryService" packages/core/src --include="*.test.ts"

# CRITICAL: Verify provider translation tests exist
echo "=== PROVIDER TRANSLATION TEST VERIFICATION ==="
grep -r "translates HistoryService format to" packages/core/src/providers --include="*.test.ts" || echo "❌ MISSING: Translation tests"
grep -r "convertToProviderFormat" packages/core/src/providers --include="*.test.ts" || echo "❌ MISSING: Format conversion tests"

# Check for provider-specific format validation
grep -r "Anthropic.*format\|Anthropic.*API" packages/core/src/providers --include="*.test.ts" || echo "❌ MISSING: Anthropic format tests"
grep -r "OpenAI.*format\|OpenAI.*API" packages/core/src/providers --include="*.test.ts" || echo "❌ MISSING: OpenAI format tests"
grep -r "Gemini.*format\|Part\[\].*structure" packages/core/src/providers --include="*.test.ts" || echo "❌ MISSING: Gemini format tests"
```

### 2. Requirement Traceability Check
```bash
# Verify HS-041 reference in all provider tests
grep -r "HS-041" packages/core/src --include="*.test.ts"

# Count HS-041 references (should be at least 3 - one per provider)
grep -r "HS-041" packages/core/src --include="*.test.ts" | wc -l
```

### 3. Separation of Concerns Validation
```bash
# Verify NO HistoryService in provider tests
grep -r "historyService" packages/core/src/providers --include="*.ts" --exclude="*.test.ts"

# Check for Content[] parameter pattern
grep -r "Content\[\]" packages/core/src/providers --include="*.ts"
```

### 4. Test Execution - Natural Failure Verification
```bash
# Kill any existing vitest instances
ps -ef | grep -i vitest | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Run tests (should fail with stub implementations)
npm test -- --reporter=verbose 2>&1 | tee test-output.log

# Kill remaining vitest instances
ps -ef | grep -i vitest | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
```

### 5. Provider Independence Check
```bash
# Verify each provider works with Content[] parameters
npm test -- packages/core/src/providers/anthropic-provider.test.ts
npm test -- packages/core/src/providers/openai-provider.test.ts  
npm test -- packages/core/src/providers/gemini-provider.test.ts
```

## Success Criteria

### 1. Test Coverage Requirements
- [ ] All providers have Content[] parameter tests
- [ ] Each provider test verifies NO HistoryService dependency
- [ ] Tests verify clean architecture principles
- [ ] GeminiChat orchestration tests are present
- [ ] **CRITICAL: Provider translation tests exist for ALL providers**
- [ ] **Anthropic format conversion tests present**
- [ ] **OpenAI format conversion tests present**
- [ ] **Gemini Part[] structure tests present**

### 2. Requirement Traceability
- [ ] All provider tests reference HS-041 requirement
- [ ] At least 3 HS-041 references found across provider tests
- [ ] Test descriptions clearly link to requirement purpose

### 3. Separation of Concerns
- [ ] Tests verify NO HistoryService in providers
- [ ] Tests confirm Content[] parameter usage
- [ ] Each provider test verifies clean separation
- [ ] GeminiChat handles all HistoryService interaction
- [ ] **Translation logic is tested for each provider**
- [ ] **Role mapping differences are tested**
- [ ] **Tool format differences are tested**

### 4. Natural Test Failures
- [ ] Tests fail if providers access HistoryService
- [ ] Tests fail if Content[] parameters not accepted
- [ ] Failure messages indicate architecture violations
- [ ] Clean architecture is enforced by tests

### 5. Provider Independence
- [ ] Each provider works without HistoryService
- [ ] Providers focus solely on LLM communication
- [ ] Content[] parameters are the only data source
- [ ] Complete separation from history management

## Expected Test Output Pattern

```
FAIL packages/core/src/providers/anthropic-provider.test.ts
FAIL packages/core/src/providers/openai-provider.test.ts
FAIL packages/core/src/providers/gemini-provider.test.ts

Expected failures for:
- Content[] parameters not yet accepted
- HistoryService dependency still present (should be removed)
- Clean architecture not yet implemented
```

## Failure Recovery

### If Tests Don't Exist
```bash
# Navigate to previous phase
cd project-plans/historyservice/plan
cat phase-28-provider-updates-tdd.md

# Re-run Phase 28 implementation
```

### If HS-041 References Missing
```bash
# Add requirement references to test files
find packages/core/src -name "*Provider.test.ts" -exec grep -L "HS-041" {} \;

# Update each file to include proper requirement traceability
```

### If Separation of Concerns Violated
```bash
# Check for HistoryService in providers
grep -r "historyService" packages/core/src/providers --include="*.ts"

# Ensure providers only accept Content[] parameters
```

### If Tests Pass Unexpectedly
```bash
# Verify providers have NO HistoryService access
grep -r "historyService" packages/core/src/providers --include="*.ts" --exclude="*.test.ts"

# Ensure Content[] parameters are enforced
```

## Verification Report Template

```markdown
## Phase 28a Verification Results

**Date:** [DATE]
**Verifier:** [NAME]

### Test Coverage: [PASS/FAIL]
- Anthropic Provider Tests: [✓/✗]
- OpenAI Provider Tests: [✓/✗]  
- Gemini Provider Tests: [✓/✗]

### Requirement Traceability: [PASS/FAIL]
- HS-041 References Found: [COUNT]
- All Providers Reference HS-041: [✓/✗]

### Separation of Concerns: [PASS/FAIL]
- NO HistoryService in Providers: [✓/✗]
- Content[] Parameters Used: [✓/✗]
- Clean Architecture Maintained: [✓/✗]

### Natural Failures: [PASS/FAIL]
- Tests Fail as Expected: [✓/✗]
- Clear Failure Messages: [✓/✗]

### Provider Independence: [PASS/FAIL]
- Independent Execution: [✓/✗]
- No Shared State: [✓/✗]

**Overall Status:** [PASS/FAIL]
**Issues Found:** [LIST]
**Next Steps:** [ACTIONS]
```

## Notes

- This verification ensures clean architecture is maintained
- Providers must have NO access to HistoryService
- Providers receive Content[] arrays from GeminiChat
- Complete separation of concerns is critical for maintainability