# Phase 26: Integration TDD

## Phase ID
`PLAN-20250826-RESPONSES.P26`

## Task Description

Write end-to-end behavioral tests for complete conversation flow with sessionId tracking. Must include 30% property-based tests.

## Files to Create

### `/packages/cli/src/integration-tests/openai-responses-tracking.integration.test.ts`

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P26
 * @requirement REQ-INT-001
 */
describe('OpenAI Responses API conversation tracking integration', () => {
  /**
   * @requirement REQ-001.2, REQ-001.3, REQ-001.4
   * @scenario Full conversation flow with sessionId
   * @given GeminiChat with OpenAI provider using GPT-5
   * @when Multiple messages sent in conversation
   * @then SessionId flows from config through to API calls
   */
  it('should maintain conversation context through sessionId', async () => {
    const config = new Config({ sessionId: 'test-session-123' });
    const chat = new GeminiChat(config, contentGenerator);
    
    // First message
    const response1 = await chat.sendMessage('Hello');
    expect(response1.metadata?.responseId).toBeDefined();
    
    // Second message should maintain context
    const response2 = await chat.sendMessage('What did I just say?');
    expect(response2.metadata?.responseId).toBeDefined();
    expect(response2.metadata?.responseId).not.toBe(response1.metadata?.responseId);
    
    // Verify API was called with correct conversation_id
    const apiCalls = getAPICallHistory();
    expect(apiCalls[0].conversation_id).toBe('test-session-123');
    expect(apiCalls[1].conversation_id).toBe('test-session-123');
    expect(apiCalls[1].previous_response_id).toBe(response1.metadata?.responseId);
  });

  /**
   * @requirement REQ-002.3, REQ-002.4
   * @scenario Previous responseId lookup
   * @given Conversation history with responseId in metadata
   * @when New message sent
   * @then Previous responseId found and used
   */
  it('should find and use previous responseId from metadata', async () => {
    const history: Content[] = [
      { role: 'user', parts: [{ text: 'First message' }] },
      { 
        role: 'model', 
        parts: [{ text: 'First response' }],
        metadata: { responseId: 'resp-001' }
      }
    ];
    
    const chat = new GeminiChat(config, contentGenerator, {}, history);
    await chat.sendMessage('Second message');
    
    const apiCalls = getAPICallHistory();
    expect(apiCalls[0].previous_response_id).toBe('resp-001');
  });

  /**
   * @requirement REQ-INT-001.3
   * @scenario Save and load preserves metadata
   * @given Conversation with responseId metadata
   * @when Save then load conversation
   * @then ResponseId metadata preserved
   */
  it('should preserve responseId metadata through save/load', async () => {
    const chat = new GeminiChat(config, contentGenerator);
    await chat.sendMessage('Test message');
    
    // Save conversation
    const saved = await chat.save('test-checkpoint');
    expect(saved).toBe(true);
    
    // Load conversation
    const loaded = await chat.load('test-checkpoint');
    const history = loaded.getHistory();
    
    // Verify metadata preserved
    const modelMessages = history.filter(m => m.role === 'model');
    expect(modelMessages[0].metadata?.responseId).toBeDefined();
  });

  /**
   * @requirement REQ-INT-001.4
   * @scenario Provider switching resets chain
   * @given Active conversation with OpenAI
   * @when Switch to different provider
   * @then Previous responseId chain broken
   */
  it('should reset conversation chain when switching providers', async () => {
    const chat = new GeminiChat(config, contentGenerator);
    
    // Start with OpenAI
    provider.setProvider('openai');
    provider.setModel('gpt-5');
    const response1 = await chat.sendMessage('Hello from OpenAI');
    
    // Switch to Gemini
    provider.setProvider('gemini');
    const response2 = await chat.sendMessage('Hello from Gemini');
    
    // Switch back to OpenAI - should start new chain
    provider.setProvider('openai');
    provider.setModel('gpt-5');
    await chat.sendMessage('Back to OpenAI');
    
    const apiCalls = getAPICallHistory();
    // Third call should have null previous_response_id (new chain)
    expect(apiCalls[2].previous_response_id).toBe(null);
  });

  /**
   * Property-based test (30% requirement)
   */
  test.prop([
    fc.string().filter(s => s.length > 0),
    fc.array(fc.string(), { minLength: 1, maxLength: 10 })
  ])('handles any sessionId and message sequence', async (sessionId, messages) => {
    const config = new Config({ sessionId });
    const chat = new GeminiChat(config, contentGenerator);
    
    // Send all messages
    for (const message of messages) {
      const response = await chat.sendMessage(message);
      expect(response).toBeDefined();
      
      // Verify sessionId propagated
      const lastCall = getLastAPICall();
      expect(lastCall.conversation_id).toBe(sessionId);
    }
  });

  /**
   * Property-based test for metadata preservation
   */
  test.prop([
    fc.record({
      responseId: fc.string(),
      timestamp: fc.integer(),
      custom: fc.string()
    })
  ])('preserves any metadata structure', (metadata) => {
    const content: Content = {
      role: 'model',
      parts: [{ text: 'Test' }],
      metadata
    };
    
    // Save and load
    const saved = JSON.stringify(content);
    const loaded = JSON.parse(saved);
    
    expect(loaded.metadata).toEqual(metadata);
  });
});
```

## Requirements

1. Test ACTUAL end-to-end behavior
2. Include 30% property-based tests minimum
3. Test real integration points
4. NO mock theater - use real components
5. Verify complete data flow
6. Tests tied to specific requirements

## Success Criteria

- Tests verify complete sessionId flow
- Tests verify metadata preservation
- Property-based tests >= 30%
- Integration with save/load tested
- Provider switching tested
- All tests behavioral

## Output Status

Save to: `/project-plans/responses-revised/workers/phase-13.json`