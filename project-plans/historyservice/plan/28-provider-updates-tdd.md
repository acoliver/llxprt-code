# Phase 28: Provider Updates TDD

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P28  
**Title:** Test-Driven Development for Provider Updates  
**Requirements:** HS-041 (Provider Integration without changes to existing implementations)

## Prerequisites

- [ ] Phase 27a passed (Provider Updates Stub Verification complete)
- [ ] TypeScript compilation passes without errors
- [ ] All providers have HistoryService integration stubs
- [ ] HistoryService implementation available with actual behavior (not NotYetImplemented)

## TDD Overview

This phase creates comprehensive behavioral tests for the clean provider architecture where providers receive Content[] arrays as parameters from GeminiChat. Tests focus on REAL provider behavior with actual conversation data, verifying that providers have NO direct access to HistoryService and work solely with prepared data.

**Critical:** Tests MUST verify that providers receive Content[] arrays as method parameters and have NO HistoryService dependency. GeminiChat is responsible for using HistoryService to prepare data and pass it to providers.

## Test Creation Tasks

### Task 1: AnthropicProvider Integration Test Infrastructure

**Target:** `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/providers/__tests__/anthropic-provider.historyservice.test.ts`

**Test Infrastructure Requirements:**
```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P28
// @requirement HS-041
// @phase provider-updates-tdd

// Provider methods should accept Content[] parameters
interface ProviderMethodSignature {
  generateResponse(messages: Content[], config?: any): Promise<Response>;
  streamResponse(messages: Content[], config?: any): AsyncIterator<Response>;
  // NO HistoryService dependency in providers
}

// Real conversation data for provider testing
const REAL_ANTHROPIC_DATA = {
  simpleQuery: {
    userMessage: { role: 'user', content: 'What is TypeScript?' },
    modelResponse: { role: 'assistant', content: 'TypeScript is a typed superset of JavaScript.' }
  },
  toolCallScenario: {
    toolCallMessage: { 
      role: 'assistant', 
      content: null,
      tool_calls: [{
        id: 'call_123',
        type: 'function',
        function: { name: 'search', arguments: '{"query": "TypeScript"}' }
      }]
    },
    toolResponse: {
      role: 'tool',
      tool_call_id: 'call_123',
      content: 'TypeScript search results...'
    }
  },
  multipleToolCalls: [
    {
      id: 'call_456',
      type: 'function',
      function: { name: 'search1', arguments: '{"query": "test1"}' }
    },
    {
      id: 'call_789', 
      type: 'function',
      function: { name: 'search2', arguments: '{"query": "test2"}' }
    }
  ]
};
```

**Success Criteria:**
- Mock HistoryService interface matches expected provider contract
- Real conversation data covers Anthropic-specific message formats
- Test infrastructure supports provider-specific authentication and configuration

### Task 2: AnthropicProvider History Access Tests

**Target:** Behavioral tests for HistoryService delegation in AnthropicProvider

**Test Cases:**
```typescript
describe('AnthropicProvider Clean Architecture', () => {
  test('accepts Content[] arrays as method parameters', () => {
    // Test that provider methods accept Content[] parameters
    // Verify provider has NO HistoryService dependency
    // Ensure provider works solely with provided Content[] data
  });

  test('has NO access to HistoryService', () => {
    // Test that provider constructor does NOT accept HistoryService
    // Verify no historyService property or method calls
    // Ensure complete separation from history management
  });

  test('processes Content[] arrays without history knowledge', () => {
    // Test provider correctly processes Content[] parameters
    // Verify Anthropic-specific formatting works with Content[]
    // Ensure provider focuses only on LLM communication
  });

  test('preserves Anthropic-specific message formatting', () => {
    // Test that Anthropic formats work with Content[] parameters
    // Verify tool calls, system messages work correctly
    // Ensure Claude-specific features work with provided data
  });

  test('maintains authentication independently', () => {
    // Test that provider authentication works without HistoryService
    // Verify API key handling works with Content[] parameters
    // Ensure clean separation of concerns
  });

  // CRITICAL: Provider Translation Testing
  test('translates HistoryService format to Anthropic format correctly', () => {
    // Test HistoryService → Anthropic format conversion
    const historyMessages: Content[] = [
      { role: 'user', content: 'Test message' },
      { role: 'assistant', content: null, tool_calls: [{
        id: 'call_123',
        type: 'function',
        function: { name: 'search', arguments: '{"query": "test"}' }
      }]},
      { role: 'tool', tool_call_id: 'call_123', content: 'Tool result' }
    ];
    
    const translated = provider.convertToProviderFormat(historyMessages);
    
    // Verify Anthropic-specific format differences:
    // - No 'tool' role (tools embedded differently in Anthropic)
    // - Tool calls use Anthropic's specific structure
    // - System messages handled correctly
    // - Message ordering preserved
    expect(translated).not.toContainEqual(expect.objectContaining({ role: 'tool' }));
    expect(translated).toMatchAnthropicAPIFormat();
  });

  test('handles Anthropic-specific role mapping correctly', () => {
    // Test role conversions specific to Anthropic
    // - 'tool' role → embedded in assistant message
    // - 'system' role → Anthropic system format
    // - Multiple tool calls in single message
    const complexHistory: Content[] = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Call multiple tools' },
      { role: 'assistant', content: null, tool_calls: [
        { id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '{}' }},
        { id: 'call_2', type: 'function', function: { name: 'tool2', arguments: '{}' }}
      ]},
      { role: 'tool', tool_call_id: 'call_1', content: 'Result 1' },
      { role: 'tool', tool_call_id: 'call_2', content: 'Result 2' }
    ];
    
    const translated = provider.convertToProviderFormat(complexHistory);
    
    // Verify Anthropic embeds tool responses correctly
    expect(translated).toHaveCorrectAnthropicToolEmbedding();
    expect(translated).toPreserveMessageSequencing();
  });

  test('validates translation against Anthropic API constraints', () => {
    // Test that translated format meets Anthropic API requirements
    // - Message alternation rules
    // - Content format requirements
    // - Tool format validation
    const translated = provider.convertToProviderFormat(testHistory);
    
    // Validate against known Anthropic API constraints
    expect(() => anthropicAPIValidator(translated)).not.toThrow();
    expect(translated).toMeetAnthropicAPIRequirements();
  });
});
```

### Task 3: OpenAIProvider Integration Tests

**Target:** `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/providers/__tests__/openai-provider.historyservice.test.ts`

**Test Infrastructure Requirements:**
```typescript
// Real OpenAI conversation data
const REAL_OPENAI_DATA = {
  chatCompletion: {
    messages: [
      { role: 'user', content: 'Explain async/await' },
      { role: 'assistant', content: 'async/await is a syntax for handling promises...' }
    ]
  },
  toolCallScenario: {
    toolCallMessage: {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: 'call_abc123',
        type: 'function', 
        function: { name: 'get_weather', arguments: '{"location": "San Francisco"}' }
      }]
    },
    toolResponse: {
      role: 'tool',
      tool_call_id: 'call_abc123',
      name: 'get_weather',
      content: '{"temperature": "72F", "condition": "sunny"}'
    }
  },
  streamingResponse: {
    chunks: [
      { choices: [{ delta: { content: 'The answer' } }] },
      { choices: [{ delta: { content: ' is 42.' } }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] }
    ]
  }
};
```

**Test Cases:**
```typescript
describe('OpenAIProvider Clean Architecture', () => {
  test('eliminates synthetic response generation for orphaned tool calls', () => {
    // Test that provider NO LONGER generates synthetic responses
    // Verify provider works only with provided Content[] data
    // Ensure provider focuses only on OpenAI API communication
  });

  test('uses Content[] parameters for API calls', () => {
    // Test that provider uses Content[] parameters for API requests
    // Verify OpenAI API messages are constructed from Content[] data
    // Ensure proper message format conversion for OpenAI API
  });

  test('handles streaming with Content[] parameters', () => {
    // Test streaming works with Content[] parameters
    // Verify incremental response building from provided data
    // Ensure streaming consistency with Content[] input
  });

  test('maintains token counting with Content[] parameters', () => {
    // Test token counting works with Content[] parameters
    // Verify token tracking accuracy with provided data
    // Ensure billing/usage tracking remains functional
  });

  test('has NO HistoryService dependency', () => {
    // Test provider has NO access to HistoryService
    // Verify clean separation from history management
    // Ensure provider works solely with Content[] parameters
  });

  // CRITICAL: Provider Translation Testing for OpenAI
  test('translates HistoryService format to OpenAI format correctly', () => {
    // Test HistoryService → OpenAI format conversion
    const historyMessages: Content[] = [
      { role: 'user', content: 'Test message' },
      { role: 'assistant', content: null, tool_calls: [{
        id: 'call_123',
        type: 'function',
        function: { name: 'search', arguments: '{"query": "test"}' }
      }]},
      { role: 'tool', tool_call_id: 'call_123', name: 'search', content: 'Tool result' }
    ];
    
    const translated = provider.convertToProviderFormat(historyMessages);
    
    // Verify OpenAI-specific format differences:
    // - Has 'tool' role (distinct from assistant)
    // - tool_calls structure specific to OpenAI
    // - Function call format differences
    // - Content structure requirements
    expect(translated).toContainEqual(expect.objectContaining({ role: 'tool' }));
    expect(translated).toMatchOpenAIAPIFormat();
    expect(translated[1].tool_calls).toHaveOpenAIStructure();
  });

  test('handles OpenAI-specific tool call structure', () => {
    // Test OpenAI tool call format requirements
    const toolCallHistory: Content[] = [
      { role: 'assistant', content: null, tool_calls: [
        { id: 'call_abc', type: 'function', function: { name: 'get_weather', arguments: '{"location": "NYC"}' }}
      ]},
      { role: 'tool', tool_call_id: 'call_abc', name: 'get_weather', content: '{"temp": "72F"}' }
    ];
    
    const translated = provider.convertToProviderFormat(toolCallHistory);
    
    // Verify OpenAI tool call structure
    expect(translated[0]).toHaveProperty('tool_calls');
    expect(translated[0].tool_calls[0]).toMatchObject({
      id: 'call_abc',
      type: 'function',
      function: { name: 'get_weather', arguments: '{"location": "NYC"}' }
    });
    
    // Verify tool response format
    expect(translated[1]).toMatchObject({
      role: 'tool',
      tool_call_id: 'call_abc',
      name: 'get_weather',
      content: '{"temp": "72F"}'
    });
  });

  test('validates translation against OpenAI API constraints', () => {
    // Test that translated format meets OpenAI API requirements
    // - Message role requirements
    // - Tool call format validation
    // - Content structure requirements
    const complexHistory: Content[] = [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'User message' },
      { role: 'assistant', content: 'Response' },
      { role: 'user', content: 'Call a function' },
      { role: 'assistant', content: null, tool_calls: [
        { id: 'call_1', type: 'function', function: { name: 'func1', arguments: '{}' }}
      ]},
      { role: 'tool', tool_call_id: 'call_1', name: 'func1', content: 'Result' }
    ];
    
    const translated = provider.convertToProviderFormat(complexHistory);
    
    // Validate against known OpenAI API constraints
    expect(() => openAIAPIValidator(translated)).not.toThrow();
    expect(translated).toMeetOpenAIAPIRequirements();
    expect(translated).toPreserveToolCallSequencing();
  });
});
```

### Task 4: GeminiProvider Integration Tests

**Target:** `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/providers/__tests__/gemini-provider.historyservice.test.ts`

**Test Infrastructure Requirements:**
```typescript
// Real Gemini conversation data  
const REAL_GEMINI_DATA = {
  conversationHistory: [
    { role: 'user', parts: [{ text: 'What is machine learning?' }] },
    { role: 'model', parts: [{ text: 'Machine learning is a subset of AI...' }] }
  ],
  functionCallScenario: {
    functionCall: {
      role: 'model',
      parts: [{
        functionCall: {
          name: 'search_web',
          args: { query: 'machine learning basics' }
        }
      }]
    },
    functionResponse: {
      role: 'user', 
      parts: [{
        functionResponse: {
          name: 'search_web',
          response: { results: ['ML is...', 'AI techniques...'] }
        }
      }]
    }
  },
  multiPartMessage: {
    role: 'model',
    parts: [
      { text: 'Here is the analysis:' },
      { text: 'Key findings include...' },
      { text: 'Conclusion: The data shows...' }
    ]
  }
};
```

**Test Cases:**
```typescript
describe('GeminiProvider Clean Architecture', () => {
  test('accepts Content[] arrays as parameters', () => {
    // Test that provider methods accept Content[] parameters
    // Verify no direct access to conversation arrays
    // Ensure Gemini API calls use provided Content[] data
  });

  test('works directly with Gemini Content format', () => {
    // Test provider receives Content[] in Gemini format
    // Verify all part types work with Content[] parameters
    // Ensure metadata and context work with provided data
  });

  test('has NO tool call management logic', () => {
    // Test that tool call completion logic is removed
    // Verify provider focuses only on Gemini API communication
    // Ensure clean separation from history management
  });

  test('maintains Gemini-specific features with Content[]', () => {
    // Test that Gemini safety settings work with Content[] parameters
    // Verify model configuration works with provided data
    // Ensure generation config works without HistoryService
  });

  test('has NO HistoryService dependency', () => {
    // Test provider has NO access to HistoryService
    // Verify complete separation from history management
    // Ensure provider works solely with Content[] parameters
  });

  // CRITICAL: Provider Translation Testing for Gemini
  test('translates HistoryService format to Gemini format correctly', () => {
    // Test HistoryService → Gemini format conversion
    const historyMessages: Content[] = [
      { role: 'user', content: 'Test message' },
      { role: 'assistant', content: 'Response text' },
      { role: 'assistant', content: null, tool_calls: [{
        id: 'call_123',
        type: 'function',
        function: { name: 'search', arguments: '{"query": "test"}' }
      }]},
      { role: 'tool', tool_call_id: 'call_123', content: 'Tool result' }
    ];
    
    const translated = provider.convertToProviderFormat(historyMessages);
    
    // Verify Gemini-specific format differences:
    // - Content[] with Part[] structure
    // - 'model' role instead of 'assistant'
    // - functionCall/functionResponse structure
    // - parts array for content
    expect(translated[0]).toHaveProperty('parts');
    expect(translated[1].role).toBe('model');
    expect(translated).toMatchGeminiContentFormat();
  });

  test('handles Gemini Part[] structure correctly', () => {
    // Test Gemini's unique Part[] content structure
    const complexContent: Content[] = [
      { role: 'user', content: 'Multi-part message' },
      { role: 'assistant', content: null, tool_calls: [{
        id: 'func_1',
        type: 'function',
        function: { name: 'search_web', arguments: '{"query": "Gemini"}' }
      }]},
      { role: 'tool', tool_call_id: 'func_1', content: '{"results": ["item1", "item2"]}' }
    ];
    
    const translated = provider.convertToProviderFormat(complexContent);
    
    // Verify Gemini Part[] structure
    expect(translated[0]).toMatchObject({
      role: 'user',
      parts: [{ text: 'Multi-part message' }]
    });
    
    // Verify function call format
    expect(translated[1]).toMatchObject({
      role: 'model',
      parts: [{
        functionCall: {
          name: 'search_web',
          args: { query: 'Gemini' }
        }
      }]
    });
    
    // Verify function response format
    expect(translated[2]).toMatchObject({
      role: 'user',
      parts: [{
        functionResponse: {
          name: 'search_web',
          response: { results: ['item1', 'item2'] }
        }
      }]
    });
  });

  test('handles Gemini role mapping correctly', () => {
    // Test role conversions specific to Gemini
    // - 'assistant' → 'model'
    // - 'tool' → 'user' with functionResponse
    // - Proper alternation of user/model roles
    const history: Content[] = [
      { role: 'system', content: 'System message' },
      { role: 'user', content: 'User query' },
      { role: 'assistant', content: 'Model response' },
      { role: 'assistant', content: 'Another model response' }
    ];
    
    const translated = provider.convertToProviderFormat(history);
    
    // Verify role mapping
    expect(translated.filter(m => m.role === 'assistant')).toHaveLength(0);
    expect(translated.filter(m => m.role === 'model')).toBeGreaterThan(0);
    expect(translated).toMaintainGeminiRoleAlternation();
  });

  test('validates translation against Gemini API constraints', () => {
    // Test that translated format meets Gemini API requirements
    // - Part[] structure validation
    // - Role alternation requirements
    // - Function call/response format
    const complexHistory: Content[] = [
      { role: 'user', content: 'Initial query' },
      { role: 'assistant', content: null, tool_calls: [
        { id: 'call_1', type: 'function', function: { name: 'func1', arguments: '{"param": "value"}' }},
        { id: 'call_2', type: 'function', function: { name: 'func2', arguments: '{"param": "value"}' }}
      ]},
      { role: 'tool', tool_call_id: 'call_1', content: 'Result 1' },
      { role: 'tool', tool_call_id: 'call_2', content: 'Result 2' },
      { role: 'assistant', content: 'Final response' }
    ];
    
    const translated = provider.convertToProviderFormat(complexHistory);
    
    // Validate against known Gemini API constraints
    expect(() => geminiAPIValidator(translated)).not.toThrow();
    expect(translated).toMeetGeminiAPIRequirements();
    expect(translated).toHaveValidPartStructure();
    expect(translated).toMaintainProperRoleSequence();
  });
});
```

### Task 5: Provider Interface Consistency Tests

**Target:** `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/providers/__tests__/provider-interface.historyservice.test.ts`

**Test Cases:**
```typescript
describe('Provider Interface Consistency', () => {
  const providers = [
    () => new AnthropicProvider(mockConfig),
    () => new OpenAIProvider(mockConfig),
    () => new GeminiProvider(mockConfig)
  ];

  test('NO provider has HistoryService dependency', () => {
    // Test that NO provider constructor accepts HistoryService
    // Verify providers have NO historyService property
    // Ensure complete separation from HistoryService
  });

  test('all providers accept Content[] parameters', () => {
    // Test that all provider methods accept Content[] parameters
    // Verify consistent method signatures across providers
    // Ensure uniform Content[] parameter pattern
  });

  test('no provider contains orphan detection logic', () => {
    // Test that orphan detection is NOT in any provider
    // Verify providers work only with provided Content[]
    // Ensure clean separation of concerns
  });

  test('all providers handle Content[] consistently', () => {
    // Test Content[] processing across all providers
    // Verify consistent parameter handling patterns
    // Ensure no provider modifies provided data
  });

  test('provider independence from history management', () => {
    // Test that providers work in isolation from history
    // Verify providers focus on LLM communication only
    // Ensure NO history-specific business logic in providers
  });
});
```

### Task 6: History Consistency Across Providers Tests

**Target:** Integration tests ensuring history consistency regardless of provider

**Test Cases:**
```typescript
describe('GeminiChat Orchestration with Providers', () => {
  const testScenarios = [
    { provider: 'anthropic', data: REAL_ANTHROPIC_DATA },
    { provider: 'openai', data: REAL_OPENAI_DATA },
    { provider: 'gemini', data: REAL_GEMINI_DATA }
  ];

  test('GeminiChat uses HistoryService to prepare Content[]', () => {
    // Test that GeminiChat gets history from HistoryService
    // Verify GeminiChat prepares Content[] arrays
    // Ensure Content[] is passed to provider methods
  });

  test('GeminiChat handles provider-agnostic Content[]', () => {
    // Test Content[] preparation works for any provider
    // Verify format conversions happen in GeminiChat
    // Ensure providers receive properly formatted data
  });

  test('GeminiChat manages history updates after provider responses', () => {
    // Test GeminiChat updates HistoryService after provider calls
    // Verify response recording happens in GeminiChat
    // Ensure providers don't update history directly
  });

  test('providers work independently of HistoryService', () => {
    // Test providers have NO knowledge of HistoryService
    // Verify complete separation of concerns
    // Ensure clean architecture is maintained
  });

  test('Content[] parameter pattern is consistent', () => {
    // Test all providers use same Content[] parameter pattern
    // Verify method signatures are uniform
    // Ensure clean, consistent interfaces
  });
});
```

## Required Code Markers

All test files MUST include these markers for traceability:

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P28
// @requirement HS-041  
// @phase provider-updates-tdd
// @behavioral-testing Real provider integration testing
```

## Success Criteria

**All tests must pass with the following verification:**

- [ ] AnthropicProvider integration tests pass (service delegation + Anthropic format preservation)
- [ ] OpenAIProvider integration tests pass (synthetic response removal + OpenAI API integration)
- [ ] GeminiProvider integration tests pass (conversation array removal + Gemini Content handling)
- [ ] Provider interface consistency tests pass (uniform HistoryService integration)
- [ ] History consistency tests pass (provider independence verification)
- [ ] Tests use REAL provider-specific data, not minimal mocks
- [ ] Tests verify INTEGRATION behavior, not isolated unit behavior
- [ ] No provider contains orphan detection logic
- [ ] No provider generates synthetic responses for missing tool calls
- [ ] All providers use HistoryService for history access exclusively
- [ ] Test coverage includes error scenarios and provider failures

## Implementation Guidelines

**Test Data Requirements:**
- Use actual provider message formats (Anthropic, OpenAI, Gemini-specific)
- Include real tool calls with provider-specific function structures
- Test with complex multi-turn conversations using Content[] parameters
- Cover edge cases like streaming responses, large contexts, API errors

**Behavioral Verification Focus:**
- Verify providers have NO HistoryService access
- Test that providers work solely with Content[] parameters
- Ensure providers remain focused on LLM communication only
- Validate clean separation between providers and history management

**Integration Testing Approach:**
- Test provider methods with Content[] parameters
- Verify GeminiChat orchestration between HistoryService and providers
- Test both successful operations and failure/error scenarios
- Ensure clean architecture is maintained throughout

## Verification Commands

```bash
# Run provider integration tests
cd /Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core
npm test -- --testPathPattern="provider.*historyservice.test.ts"

# Verify no orphan detection in providers
grep -r "orphan\|orphaned" src/providers/ --exclude="*.test.ts" && echo "❌ Orphan detection found in providers" || echo "✓ No orphan detection in providers"

# Verify no synthetic response generation
grep -r "synthetic.*response\|fake.*response" src/providers/ --exclude="*.test.ts" && echo "❌ Synthetic responses found" || echo "✓ No synthetic responses in providers"

# Verify NO HistoryService in providers
grep -r "historyService" src/providers/ --include="*.ts" --exclude="*.test.ts" && echo "❌ HistoryService found in providers" || echo "✓ No HistoryService in providers"

# Verify test coverage
npm run test:coverage -- src/providers/

# Ensure no NotYetImplemented expectations in tests
grep -r "NotYetImplemented" src/providers/__tests__/ && echo "❌ Tests expect NotYetImplemented" || echo "✓ Tests expect real behavior"

# Check for Content[] parameters in provider methods
grep -r "Content\[\]" src/providers/ --include="*.ts" | wc -l
echo "Above number should be > 0 (providers should accept Content[] parameters)"
```

## Next Phase

**Phase 28a:** Provider Updates TDD Verification - Validate that all provider integration tests pass and behavior is correctly verified

**Dependencies for Future Phases:**
- Phase 29: Provider Updates Implementation (requires working provider integration tests)
- Phase 30: Final Integration Stub (requires all provider integrations completed)
- All provider integration must be complete before final system integration

## Notes

- This phase ensures clean architecture with proper separation of concerns
- Providers have NO access to HistoryService - they receive Content[] parameters
- GeminiChat orchestrates between HistoryService and providers
- Providers focus solely on their LLM communication responsibilities
- Clean architecture principles are maintained throughout
- Tests verify complete separation between providers and history management