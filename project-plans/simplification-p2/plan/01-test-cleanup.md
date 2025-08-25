# Phase 01: Test Cleanup Phase

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P01`

## Prerequisites
- Required: Phase 00 (Overview) completed
- Verification: Plan overview exists and analysis documents reviewed
- Expected files from analysis:
  - `project-plans/simplification-p2/tests-to-remove.md`
  - `project-plans/simplification-p2/overview.md`

## Implementation Tasks

### Goal
Remove 47 problematic tests that validate broken behavior, mock theater, or invalid implementations. This clears the path for proper TDD implementation in subsequent phases.

### Files to Modify

#### 1. Anthropic Provider Tests
**File**: `packages/core/src/providers/anthropic/AnthropicProvider.test.ts`
- **Lines to Remove**: 569-578, 195-234, 235-314, 315-327, 328-374, 375-411, 412-457, 458-493, 494-509, 149-192, 180-191, 7-44
- **Reason**: Mock theater tests, hardcoded 'broken-tool-123' validation, structure-only tests
- **Tests Removed**: 12 problematic tests
- **MUST include**: `@plan:PLAN-20250824-CONTENT-REMEDIATION.P01`

**File**: `packages/core/src/providers/anthropic/AnthropicProvider.oauth.test.ts`
- **Lines to Remove**: 134-168, 169-191, 192-230, 233-258
- **Reason**: Mock theater OAuth tests that only verify mock interactions
- **Tests Removed**: 4 problematic tests
- **MUST include**: `@plan:PLAN-20250824-CONTENT-REMEDIATION.P01`

#### 2. OpenAI Provider Tests
**File**: `packages/core/src/providers/openai/OpenAIProvider.switch.test.ts`
- **Lines to Remove**: 65-138, 140-164, 166-190, 192-268, 270-311
- **Reason**: Skipped tests for broken implementation, mock theater for API switching
- **Tests Removed**: 8 problematic tests
- **MUST include**: `@plan:PLAN-20250824-CONTENT-REMEDIATION.P01`

**File**: `packages/core/src/providers/openai/OpenAIProvider.responses.test.ts`
- **Lines to Remove**: 96-256, 258-355, 357-496
- **Reason**: Complex mock theater with fetch mocking, no real API validation
- **Tests Removed**: 3 problematic tests
- **MUST include**: `@plan:PLAN-20250824-CONTENT-REMEDIATION.P01`

**File**: `packages/core/src/providers/openai/OpenAIProvider.responsesIntegration.test.ts`
- **Action**: DELETE ENTIRE FILE
- **Reason**: All 7 tests are skipped with comment "Integration tests that depend on responses API implementation which is not complete"
- **Tests Removed**: 7 skipped/broken tests
- **MUST include**: `@plan:PLAN-20250824-CONTENT-REMEDIATION.P01`

#### 3. Gemini Provider Tests
**File**: `packages/core/src/providers/gemini/GeminiProvider.test.ts`
- **Lines to Remove**: 30-33, 40-43, 50-53, 60-63, 70-73, 80-93
- **Reason**: All stub tests with placeholder comments, not real implementations
- **Tests Removed**: 6 stub tests
- **MUST include**: `@plan:PLAN-20250824-CONTENT-REMEDIATION.P01`

#### 4. Converter Tests
**File**: `packages/core/src/providers/converters/SystemMessageHandling.test.ts`
- **Lines to Remove**: 16-39, 41-68, 98-119, 139-160
- **Reason**: Tests Content with role='system' which is invalid for unified Content format
- **Tests Removed**: 4 problematic tests
- **MUST include**: `@plan:PLAN-20250824-CONTENT-REMEDIATION.P01`

#### 5. Adapter Tests
**File**: `packages/core/src/providers/adapters/GeminiCompatibleWrapper.system.test.ts`
- **Lines to Remove**: 77-100, 102-125, 179-204
- **Reason**: Tests backward compatibility for invalid Content format (system role)
- **Tests Removed**: 3 problematic tests
- **MUST include**: `@plan:PLAN-20250824-CONTENT-REMEDIATION.P01`

### Required Code Markers

Every modification in this phase MUST include:

```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P01
 * @requirement REQ-003.1
 * @action REMOVE_BROKEN_TESTS
 */
```

### Removal Strategy

For each test file:
1. **Identify problematic test blocks** using the analysis from `tests-to-remove.md`
2. **Remove entire test functions** (it(...) blocks) that validate broken behavior
3. **Remove associated mock setup** that only supports mock theater
4. **Add removal marker comments** with plan and requirement references
5. **Keep file structure intact** but remove problematic content
6. **Delete entire files** only when ALL tests are problematic (responsesIntegration.test.ts)

### Test Categories Being Removed

#### 1. Mock Theater Tests (28 tests)
```typescript
// Example of what's being removed:
it('should stream content from Anthropic API', async () => {
  // Mock setup
  mockAnthropic.messages.stream.mockImplementation(() => mockStream);
  
  // Only tests that mocks were called correctly
  expect(mockAnthropic.messages.stream).toHaveBeenCalledWith(...);
});
```

#### 2. Hardcoded ID Tests (2 tests)
```typescript
// Example of what's being removed:
it('should validate and fix tool_use/tool_result mismatches on retry', () => {
  // Expects hardcoded broken ID
  expect(result.tool_use_id).toBe('broken-tool-123');
});
```

#### 3. Invalid Content Format Tests (7 tests)
```typescript
// Example of what's being removed:
it('should handle Content with role="system"', () => {
  const contents: Content[] = [
    { role: 'system', parts: [{ text: 'Invalid for Gemini' }] }
  ];
  // Tests invalid format that breaks unified architecture
});
```

#### 4. Stub/Placeholder Tests (6 tests)
```typescript
// Example of what's being removed:
it('should set __oauth_needs_code to true when OAuth flow requires user input', () => {
  // This will require mocking the OAuth flow in a later phase
  expect(true).toBe(true); // Placeholder test
});
```

#### 5. Skipped/Broken Implementation Tests (4 tests)
```typescript
// Example of what's being removed:
it.skip('should use responses API for gpt-4o model', async () => {
  // Test is skipped because implementation doesn't work
});
```

## Verification Commands

### Automated Checks

```bash
# Verify removals completed
grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P01" packages/core/src/providers/ | wc -l
# Expected: 8+ occurrences (one per modified file)

# Verify mock theater removal
grep -rn "toHaveBeenCalled\|mockImplementation" packages/core/src/providers/*/
# Expected: Significantly reduced count

# Verify hardcoded ID removal
grep -rn "broken-tool-123" packages/core/src/providers/
# Expected: Zero occurrences in test files

# Verify system role removal from tests
grep -rn "role.*system" packages/core/src/providers/*/test*
# Expected: Zero occurrences testing system Content

# Check remaining test count
find packages/core/src/providers -name "*.test.ts" -exec grep -c "it(" {} + | paste -sd+ | bc
# Expected: ~47 fewer tests than before
```

### Manual Verification Checklist

- [ ] AnthropicProvider.test.ts: 12 problematic tests removed
- [ ] AnthropicProvider.oauth.test.ts: 4 OAuth mock tests removed
- [ ] OpenAI switch tests: 8 mock theater tests removed  
- [ ] OpenAI responses tests: 3 complex mock tests removed
- [ ] OpenAI responsesIntegration.test.ts: Entire file deleted (7 skipped tests)
- [ ] GeminiProvider.test.ts: 6 stub tests removed
- [ ] SystemMessageHandling.test.ts: 4 invalid Content format tests removed
- [ ] GeminiCompatibleWrapper.system.test.ts: 3 backward compatibility tests removed
- [ ] All removal markers include plan ID and requirement references
- [ ] No hardcoded 'broken-tool-123' in tests
- [ ] No Content with role='system' being tested
- [ ] Mock theater significantly reduced

## Success Criteria

- **47 problematic tests removed** across 8 files
- **1 entire test file deleted** (responsesIntegration.test.ts)
- **Zero hardcoded IDs** in remaining tests
- **Zero invalid Content formats** being tested
- **Clear path** for TDD implementation in subsequent phases
- **Build still passes** with remaining valid tests
- **No broken test dependencies** in remaining code

## Impact Analysis

### Test Coverage Impact
- **Removed**: 47 tests that validated broken/mock behavior
- **Remaining**: Valid tests that check real functionality
- **Quality**: Significant improvement in test quality
- **Coverage**: Temporary reduction, but higher quality coverage

### Build Impact
- **Expected**: Some test failures may occur due to dependencies
- **Mitigation**: Fix any remaining test dependencies in this phase
- **Verification**: Full build must pass before proceeding to Phase 02

### Risk Assessment
- **Low Risk**: Removing broken tests improves code quality
- **Validation**: Keep any tests that validate correct behavior
- **Safety**: All removals are documented and reversible via git

## Rollback Plan

If this phase needs to be reverted:

```bash
# Rollback all changes in this phase
git log --oneline --grep="PLAN-20250824-CONTENT-REMEDIATION.P01"
git revert <commit-hashes>

# Or restore specific files
git checkout HEAD~1 packages/core/src/providers/anthropic/AnthropicProvider.test.ts
git checkout HEAD~1 packages/core/src/providers/openai/OpenAIProvider.switch.test.ts
# ... restore other modified files
```

## Phase Completion Marker

Create: `project-plans/simplification-p2/.completed/P01.md`

```markdown
Phase: P01 - Test Cleanup
Completed: 2025-08-24 HH:MM
Files Modified: 8 test files
Tests Removed: 47 problematic tests
Files Deleted: 1 (responsesIntegration.test.ts)
Verification: All automated checks passed
Quality Improvement: Removed mock theater, hardcoded IDs, invalid formats
Build Status: Passing
```