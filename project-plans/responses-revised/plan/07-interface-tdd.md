# Phase 07: Interface TDD

## Phase ID
`PLAN-20250826-RESPONSES.P07`

## Task Description

Write behavioral tests for the sessionId parameter in IProvider interface. Tests should verify actual behavior, not implementation details.

## Files to Create

### `/packages/core/src/providers/IProvider.test.ts`

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P07
 * @requirement REQ-001.1
 */
describe('IProvider sessionId parameter', () => {
  /**
   * @requirement REQ-001.1
   * @scenario Provider accepts sessionId parameter
   * @given A provider implementing IProvider
   * @when generateChatCompletion is called with sessionId
   * @then The method accepts the parameter without error
   */
  it('should accept optional sessionId parameter', async () => {
    const provider = new TestProvider();
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Hello' }] }
    ];
    
    // Should compile and run without errors
    const generator = provider.generateChatCompletion(
      contents,
      undefined,
      undefined,
      'test-session-123'
    );
    
    const results = [];
    for await (const content of generator) {
      results.push(content);
    }
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });

  /**
   * @requirement REQ-001.1  
   * @scenario Backward compatibility maintained
   * @given Existing code calling with 3 parameters
   * @when generateChatCompletion is called without sessionId
   * @then The method works as before
   */
  it('should maintain backward compatibility without sessionId', async () => {
    const provider = new TestProvider();
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Hello' }] }
    ];
    
    // Old signature still works
    const generator = provider.generateChatCompletion(contents);
    
    const results = [];
    for await (const content of generator) {
      results.push(content);
    }
    
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
  });

  /**
   * @requirement REQ-001.1
   * @scenario Type safety with sessionId
   * @given TypeScript strict mode
   * @when Wrong type passed for sessionId
   * @then TypeScript compilation fails
   */
  it('should enforce type safety for sessionId parameter', async () => {
    const provider = new TestProvider();
    const contents: Content[] = [];
    
    // This test verifies TypeScript would catch wrong types
    // In actual test, we verify the correct type works
    const generator = provider.generateChatCompletion(
      contents,
      undefined,
      undefined,
      'valid-string-session'
    );
    
    expect(generator).toBeDefined();
    // TypeScript would prevent: sessionId: 123 (number)
  });
});

/**
 * Test implementation of IProvider
 * @plan PLAN-20250826-RESPONSES.P07
 */
class TestProvider implements IProvider {
  name = 'test';
  
  async *generateChatCompletion(
    contents: Content[],
    tools?: ITool[],
    toolFormat?: string,
    sessionId?: string
  ): AsyncIterableIterator<Content> {
    // Return test content
    yield {
      role: 'model',
      parts: [{ text: `Response with session: ${sessionId || 'none'}` }]
    };
  }
  
  // Other required IProvider methods...
  async getModels() { return []; }
  getDefaultModel() { return 'test'; }
  getServerTools() { return []; }
  async invokeServerTool() { return {}; }
}
```

## Requirements

1. Test ACTUAL BEHAVIOR with real data flows
2. NO testing for NotYetImplemented
3. NO reverse tests (expect().not.toThrow())
4. Each test must have behavior-driven comments
5. Tests should fail naturally until implementation
6. Include 30% PROPERTY-BASED tests minimum:
   ```typescript
   test.prop([fc.string()])('handles any sessionId', (sessionId) => {
     const result = provider.generateChatCompletion([], undefined, undefined, sessionId);
     expect(result).toBeDefined();
   });
   ```
7. Tests must achieve 80% mutation score (verified in verification phase)

## Forbidden Patterns

- `expect(mockService.method).toHaveBeenCalled()`
- `expect(result).toHaveProperty('field')`
- `expect(() => fn()).not.toThrow()`
- `expect(fn).toThrow('NotYetImplemented')`
- Tests that pass with empty implementations

## Success Criteria

- Tests verify sessionId parameter acceptance
- Tests verify backward compatibility
- Tests fail naturally (interface not updated yet)
- Behavioral assertions only
- Clear test descriptions

## Execution Instructions

```bash
# For subagent execution:
1. Create packages/core/src/providers/IProvider.test.ts
2. Write behavioral tests for sessionId parameter
3. Include test provider implementation
4. Add plan and requirement markers
5. Run: npm test packages/core/src/providers/IProvider.test.ts
6. Verify tests fail naturally (not "cannot find")
```

## Expected Test Results

Tests should fail with:
- "Property 'sessionId' does not exist" or similar
- NOT: "Cannot find module" or "NotYetImplemented"

## Output Status

Save to: `/project-plans/responses-revised/workers/phase-04.json`
```json
{
  "phase": "04",
  "completed": true,
  "tests_created": 3,
  "tests_fail_naturally": true,
  "behavioral_only": true
}
```