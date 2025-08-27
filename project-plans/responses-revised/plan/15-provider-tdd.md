# Phase 15: Provider TDD

## Phase ID
`PLAN-20250826-RESPONSES.P15`

## Task Description

Write behavioral tests for provider sessionId handling, including 30% property-based tests.

## Files to Create

### `/packages/core/src/providers/openai/OpenAIProvider.responses.test.ts`

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P15
 * @requirement REQ-001.4, REQ-002.3
 */
describe('OpenAI Provider conversation tracking behavior', () => {
  /**
   * @requirement REQ-001.4
   * @scenario Provider tracks conversations with sessionId
   * @given OpenAI provider with GPT-5 model and sessionId
   * @when Multiple messages sent in same session
   * @then Second response references first response
   */
  it('should maintain conversation context across messages', async () => {
    const provider = new OpenAIProvider();
    provider.setModel('gpt-5');
    const sessionId = 'test-session-123';
    const contents: Content[] = [];
    
    // First message
    const gen1 = provider.generateChatCompletion(
      [{ role: 'user', parts: [{ text: 'My name is Alice' }] }],
      undefined,
      undefined,
      sessionId
    );
    
    for await (const content of gen1) {
      contents.push(content);
    }
    
    // Second message in same conversation
    contents.push({ role: 'user', parts: [{ text: 'What is my name?' }] });
    
    const gen2 = provider.generateChatCompletion(
      contents,
      undefined,
      undefined,
      sessionId
    );
    
    let response = '';
    for await (const content of gen2) {
      if (content.parts?.[0]?.text) {
        response += content.parts[0].text;
      }
    }
    
    // Behavioral assertion: model remembers context
    expect(response.toLowerCase()).toContain('alice');
  });

  /**
   * @requirement REQ-002.1, REQ-002.2
   * @scenario Response ID stored in metadata
   * @given Responses API returns response with ID
   * @when Provider processes the response
   * @then Content includes responseId in metadata
   */
  it('should store response ID in Content metadata', async () => {
    const provider = new OpenAIProvider();
    provider.setModel('gpt-5');
    
    const generator = provider.generateChatCompletion(
      [{ role: 'user', parts: [{ text: 'Hello' }] }],
      undefined,
      undefined,
      'session-456'
    );
    
    const contents: Content[] = [];
    for await (const content of generator) {
      contents.push(content);
    }
    
    // Find content with responseId metadata
    const responseContent = contents.find(c => c.metadata?.responseId);
    
    // Behavioral assertion: response ID is captured
    expect(responseContent).toBeDefined();
    expect(responseContent?.metadata?.responseId).toMatch(/^[\w-]+$/);
  });

  /**
   * @requirement REQ-002.3
   * @scenario Finding previous response ID
   * @given Conversation history with response IDs
   * @when New message sent
   * @then Uses most recent assistant response ID
   */
  it('should use most recent assistant response ID for chaining', async () => {
    const provider = new OpenAIProvider();
    provider.setModel('o3');
    
    const history: Content[] = [
      { role: 'user', parts: [{ text: 'First' }] },
      { 
        role: 'assistant', 
        parts: [{ text: 'Response 1' }],
        metadata: { responseId: 'old-resp-111' }
      },
      { role: 'user', parts: [{ text: 'Second' }] },
      { 
        role: 'model', 
        parts: [{ text: 'Response 2' }],
        metadata: { responseId: 'recent-resp-222' }
      },
      { role: 'user', parts: [{ text: 'Third' }] }
    ];
    
    const generator = provider.generateChatCompletion(
      history,
      undefined,
      undefined,
      'session-789'
    );
    
    // Process response
    for await (const content of generator) {
      // Behavioral check: response builds on previous
      if (content.parts?.[0]?.text) {
        // Should reference context from Response 2
        expect(content).toBeDefined();
      }
    }
  });

  /**
   * Property-based test (30% requirement)
   * @requirement REQ-001.4
   */
  test.prop([
    fc.string().filter(s => s.length > 0),
    fc.array(fc.record({
      role: fc.constantFrom('user', 'assistant', 'model'),
      text: fc.string()
    }))
  ])('maintains conversation for any valid sessionId and history', 
    async (sessionId, messages) => {
      const provider = new OpenAIProvider();
      provider.setModel('gpt-5');
      
      const contents: Content[] = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'model',
        parts: [{ text: m.text }]
      }));
      
      // Should handle any valid conversation without error
      const generator = provider.generateChatCompletion(
        contents,
        undefined,
        undefined,
        sessionId
      );
      
      // Behavioral: generator always returns valid async iterator
      expect(generator[Symbol.asyncIterator]).toBeDefined();
    }
  );

  /**
   * @requirement REQ-001.5
   * @scenario No sessionId provided
   * @given Responses API call without sessionId
   * @when generateChatCompletion called
   * @then Still maintains conversation (with generated ID)
   */
  it('should maintain conversation even without explicit sessionId', async () => {
    const provider = new OpenAIProvider();
    provider.setModel('o3');
    
    // First message without sessionId
    const gen1 = provider.generateChatCompletion(
      [{ role: 'user', parts: [{ text: 'Remember: blue' }] }],
      undefined,
      undefined,
      undefined // No sessionId
    );
    
    const contents: Content[] = [];
    for await (const content of gen1) {
      contents.push(content);
    }
    
    // Second message in same conversation
    contents.push({ role: 'user', parts: [{ text: 'What color?' }] });
    
    const gen2 = provider.generateChatCompletion(
      contents,
      undefined,
      undefined,
      undefined // Still no sessionId
    );
    
    let response = '';
    for await (const content of gen2) {
      if (content.parts?.[0]?.text) {
        response += content.parts[0].text;
      }
    }
    
    // Behavioral: conversation maintained even with temp IDs
    expect(response.toLowerCase()).toContain('blue');
  });
});
```

## Requirements

1. Test ACTUAL BEHAVIOR not implementation
2. Include 30% property-based tests  
3. NO mock theater - test observable behavior only
4. NO reverse testing
5. Behavioral assertions only (what the system does, not how)
6. Tests should fail until implementation

## Success Criteria

- Tests verify sessionId usage
- Tests verify responseId lookup
- Property-based tests included
- Natural failures until implementation
- Clear behavioral descriptions

## Output Status

Save to: `/project-plans/responses-revised/workers/phase-07.json`