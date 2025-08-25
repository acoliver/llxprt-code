# Phase 03: System Prompt TDD Phase

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P03`

## Prerequisites
- Required: Phase 02a completed
- Verification: `npm run typecheck` passes with stub implementations
- Expected: All stub methods created and functional

## Implementation Tasks

### Goal
Write comprehensive BEHAVIORAL tests for correct system prompt handling that will initially FAIL with the current stub implementation. These tests define the exact behavior needed and will drive the implementation in Phase 04.

### TDD Approach
1. **Write tests that expect CORRECT behavior** (will fail with stubs)
2. **Test actual data transformations**, not mock interactions
3. **Validate provider-specific formats** for system instructions
4. **Include property-based testing** for edge cases
5. **NO reverse testing** - don't test for stubs or NotYetImplemented

### Files to Create

#### 1. System Instruction Handling Tests

**File**: `packages/core/src/providers/adapters/GeminiCompatibleWrapper.system.test.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P03
 * @requirement REQ-001.1
 * @test_behavior System instruction separation from Content[] messages
 */

import { GeminiCompatibleWrapper } from './GeminiCompatibleWrapper';
import { Content } from '@google/generative-ai';
import { describe, it, expect, beforeEach } from 'vitest';

describe('GeminiCompatibleWrapper System Instructions', () => {
  let wrapper: GeminiCompatibleWrapper;
  
  beforeEach(() => {
    // Use real provider instances, not mocks
    const mockProvider = {
      generateChatCompletion: vi.fn().mockResolvedValue({
        role: 'model',
        parts: [{ text: 'Test response' }]
      })
    };
    wrapper = new GeminiCompatibleWrapper(mockProvider);
  });

  /**
   * @requirement REQ-001.1
   * @scenario System instructions should be extracted and passed as config
   * @given Content[] with system role and user message
   * @when generateContent is called
   * @then System instructions are separated from conversation content
   */
  it('should extract system instructions from Content[] and pass as config', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [{ text: 'You are a helpful assistant specializing in code analysis.' }]
      },
      {
        role: 'user',
        parts: [{ text: 'Analyze this function: function add(a, b) { return a + b; }' }]
      }
    ];

    const result = await wrapper.generateContent({
      model: 'gemini-pro',
      contents,
      config: {}
    });

    // Verify system instruction was extracted
    expect(mockProvider.generateChatCompletion).toHaveBeenCalledWith(
      // Contents should NOT include system messages
      expect.not.arrayContaining([
        expect.objectContaining({ role: 'system' })
      ]),
      [],
      expect.objectContaining({
        systemInstruction: 'You are a helpful assistant specializing in code analysis.'
      })
    );
    
    // Verify only user message in contents
    const calledContents = mockProvider.generateChatCompletion.mock.calls[0][0];
    expect(calledContents).toHaveLength(1);
    expect(calledContents[0].role).toBe('user');
  });

  /**
   * @requirement REQ-001.1
   * @scenario Multiple system instructions should be combined
   * @given Content[] with multiple system messages and user messages
   * @when generateContent is called
   * @then All system instructions are combined into single config
   */
  it('should combine multiple system instructions into single config', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [{ text: 'You are a helpful assistant.' }]
      },
      {
        role: 'system', 
        parts: [{ text: ' Always be precise and accurate.' }]
      },
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    await wrapper.generateContent({
      model: 'gemini-pro',
      contents,
      config: {}
    });

    expect(mockProvider.generateChatCompletion).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: 'user' })
      ]),
      [],
      expect.objectContaining({
        systemInstruction: 'You are a helpful assistant. Always be precise and accurate.'
      })
    );
  });

  /**
   * @requirement REQ-001.1
   * @scenario Config systemInstruction should take precedence over Content system
   * @given Content[] with system role AND config.systemInstruction
   * @when generateContent is called  
   * @then Config systemInstruction is used, Content system is ignored
   */
  it('should prioritize config systemInstruction over Content system messages', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [{ text: 'Ignore this system message' }]
      },
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    await wrapper.generateContent({
      model: 'gemini-pro', 
      contents,
      config: {
        systemInstruction: 'Use this config system instruction instead'
      }
    });

    expect(mockProvider.generateChatCompletion).toHaveBeenCalledWith(
      expect.any(Array),
      [],
      expect.objectContaining({
        systemInstruction: 'Use this config system instruction instead'
      })
    );
  });

  /**
   * @requirement REQ-001.5
   * @scenario No Content with system role should reach providers
   * @given Content[] with mixed roles including system
   * @when generateContent is called
   * @then Provider receives only user/model Content, no system
   */
  it('should never pass Content with system role to providers', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [{ text: 'System instruction' }]
      },
      {
        role: 'user',
        parts: [{ text: 'User message 1' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Model response' }]
      },
      {
        role: 'user',
        parts: [{ text: 'User message 2' }]
      }
    ];

    await wrapper.generateContent({
      model: 'gemini-pro',
      contents,
      config: {}
    });

    const calledContents = mockProvider.generateChatCompletion.mock.calls[0][0];
    
    // Verify no system role in passed contents
    calledContents.forEach((content: Content) => {
      expect(content.role).not.toBe('system');
    });
    
    // Verify correct content count (3 non-system messages)
    expect(calledContents).toHaveLength(3);
  });

  /**
   * @requirement REQ-004.2
   * @scenario System Content validation
   * @given Content with system role containing non-text parts
   * @when generateContent is called
   * @then Should throw validation error
   */
  it('should validate system Content can only contain text parts', async () => {
    const invalidSystemContent: Content[] = [
      {
        role: 'system',
        parts: [
          { text: 'Valid system instruction' },
          { functionCall: { name: 'invalid', args: {} } } as any
        ]
      },
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    await expect(
      wrapper.generateContent({
        model: 'gemini-pro',
        contents: invalidSystemContent,
        config: {}
      })
    ).rejects.toThrow('System Content cannot contain function calls');
  });

  // Property-based test for system instruction extraction
  it.prop([
    fc.array(
      fc.record({
        role: fc.constantFrom('system' as const),
        parts: fc.array(fc.record({
          text: fc.string().filter(s => s.length > 0)
        }), { minLength: 1 })
      }),
      { minLength: 1, maxLength: 5 }
    ),
    fc.array(
      fc.record({
        role: fc.constantFrom('user' as const, 'model' as const),
        parts: fc.array(fc.record({
          text: fc.string()
        }), { minLength: 1 })
      }),
      { minLength: 1, maxLength: 3 }
    )
  ])('should extract all system instructions regardless of count', (systemContents, nonSystemContents) => {
    const contents = [...systemContents, ...nonSystemContents];
    const expectedSystemText = systemContents
      .flatMap(c => c.parts)
      .map(p => p.text)
      .join('');

    return wrapper.generateContent({
      model: 'gemini-pro',
      contents,
      config: {}
    }).then(() => {
      expect(mockProvider.generateChatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        [],
        expect.objectContaining({
          systemInstruction: expectedSystemText
        })
      );
    });
  });
});
```

#### 2. Gemini Provider System Instruction Tests

**File**: `packages/core/src/providers/gemini/GeminiProvider.system.test.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P03
 * @requirement REQ-001.2
 * @test_behavior Gemini-specific system instruction handling
 */

import { GeminiProvider } from './GeminiProvider';
import { Content } from '@google/generative-ai';

describe('Gemini Provider System Instructions', () => {
  let provider: GeminiProvider;
  
  beforeEach(() => {
    provider = new GeminiProvider(process.env.GEMINI_API_KEY || 'test-key');
  });

  /**
   * @requirement REQ-001.2
   * @scenario Gemini native systemInstruction parameter usage
   * @given Contents and system instruction configuration
   * @when generateChatCompletion is called
   * @then System instruction is passed via systemInstruction parameter
   */
  it('should use systemInstruction parameter in Gemini API request', async () => {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Write a hello world function in Python' }]
      }
    ];
    
    const systemInstruction = 'You are a Python programming expert. Always include type hints and docstrings.';

    // Mock the Gemini model's generateContent method
    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        candidates: [{
          content: {
            role: 'model',
            parts: [{ text: 'def hello_world() -> str:\n    """Returns hello world message."""\n    return "Hello, World!"' }]
          }
        }]
      }
    });

    // Use the provider's internal method for system instruction handling
    const result = await provider.generateChatCompletionWithSystemPrompt(
      contents, 
      [], 
      { systemInstruction }
    );

    // Verify the provider calls Gemini API with systemInstruction
    expect(mockGenerateContent).toHaveBeenCalledWith({
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      }
    });

    expect(result.role).toBe('model');
    expect(result.parts[0].text).toContain('def hello_world');
  });

  /**
   * @requirement REQ-001.2
   * @scenario System instruction structure preservation
   * @given System instruction with complex formatting
   * @when converted to Gemini format
   * @then Structure is preserved in systemInstruction parts
   */
  it('should preserve system instruction structure in Gemini systemInstruction', () => {
    const systemInstruction = `You are Claude Code, an AI assistant.

Key capabilities:
- Code analysis and debugging
- File system operations
- Git operations

Always be precise and provide working examples.`;

    const geminiSystemInstruction = provider.convertToGeminiSystemInstruction(systemInstruction);

    expect(geminiSystemInstruction).toEqual({
      parts: [{ text: systemInstruction }]
    });
    
    // Verify original formatting preserved
    expect(geminiSystemInstruction.parts[0].text).toContain('Key capabilities:');
    expect(geminiSystemInstruction.parts[0].text).toContain('- Code analysis');
    expect(geminiSystemInstruction.parts[0].text).toContain('Always be precise');
  });

  /**
   * @requirement REQ-001.2  
   * @scenario Empty system instruction handling
   * @given Empty or undefined system instruction
   * @when processed by provider
   * @then No systemInstruction parameter is added
   */
  it('should handle empty system instructions gracefully', async () => {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    const mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        candidates: [{
          content: {
            role: 'model',
            parts: [{ text: 'Hello!' }]
          }
        }]
      }
    });

    // Test with empty string
    await provider.generateChatCompletionWithSystemPrompt(contents, [], { systemInstruction: '' });
    
    expect(mockGenerateContent).toHaveBeenCalledWith({
      contents: contents
      // Should NOT have systemInstruction property
    });
    
    expect(mockGenerateContent).not.toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: expect.anything()
      })
    );
  });

  // Property-based test for system instruction format
  it.prop([
    fc.string().filter(s => s.trim().length > 0)
  ])('should handle any valid system instruction text', (systemText) => {
    const geminiSystemInstruction = provider.convertToGeminiSystemInstruction(systemText);
    
    expect(geminiSystemInstruction).toEqual({
      parts: [{ text: systemText }]
    });
    expect(geminiSystemInstruction.parts[0].text).toBe(systemText);
  });
});
```

#### 3. OpenAI Provider System Message Tests

**File**: `packages/core/src/providers/openai/OpenAIProvider.system.test.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P03
 * @requirement REQ-001.3
 * @test_behavior OpenAI-specific system message handling
 */

import { OpenAIProvider } from './OpenAIProvider';
import { Content } from '@google/generative-ai';

describe('OpenAI Provider System Messages', () => {
  let provider: OpenAIProvider;
  
  beforeEach(() => {
    provider = new OpenAIProvider(process.env.OPENAI_API_KEY || 'test-key');
  });

  /**
   * @requirement REQ-001.3
   * @scenario System prompt converted to OpenAI system message
   * @given Contents and system instruction
   * @when generateChatCompletion is called
   * @then System instruction becomes first system message in messages array
   */
  it('should convert system instruction to OpenAI system message format', async () => {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Write a simple calculator function' }]
      }
    ];
    
    const systemInstruction = 'You are a JavaScript expert. Write clean, well-documented code.';

    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{
        message: {
          role: 'assistant',
          content: 'function calculator(a, b, operation) {\n  // Implementation here\n}'
        }
      }]
    });

    // Mock OpenAI client
    vi.mocked(provider.openai.chat.completions.create = mockCreate);

    const result = await provider.generateChatCompletionWithSystemPrompt(
      contents,
      [],
      { systemInstruction }
    );

    // Verify OpenAI API called with system message first
    expect(mockCreate).toHaveBeenCalledWith({
      model: expect.any(String),
      messages: [
        {
          role: 'system',
          content: 'You are a JavaScript expert. Write clean, well-documented code.'
        },
        {
          role: 'user',
          content: 'Write a simple calculator function'
        }
      ]
    });

    expect(result.role).toBe('model');
    expect(result.parts[0].text).toContain('calculator');
  });

  /**
   * @requirement REQ-001.3
   * @scenario Multiple system instructions combined
   * @given Multiple system instruction sources
   * @when converted to OpenAI format
   * @then Combined into single system message
   */
  it('should combine multiple system instructions into single system message', () => {
    const systemInstructions = [
      'You are a helpful programming assistant.',
      'Focus on clean, maintainable code.',
      'Always include error handling.'
    ];

    const openaiMessages = provider.convertToOpenAIMessagesWithSystem(
      [{ role: 'user', parts: [{ text: 'Hello' }] }],
      systemInstructions.join(' ')
    );

    expect(openaiMessages).toEqual([
      {
        role: 'system',
        content: 'You are a helpful programming assistant. Focus on clean, maintainable code. Always include error handling.'
      },
      {
        role: 'user',
        content: 'Hello'
      }
    ]);
  });

  /**
   * @requirement REQ-001.3
   * @scenario System message ordering in conversation
   * @given Existing conversation with user and assistant messages
   * @when system instruction is added
   * @then System message appears first, conversation order preserved
   */
  it('should place system message first regardless of Content order', () => {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'First user message' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Assistant response' }]
      },
      {
        role: 'user', 
        parts: [{ text: 'Second user message' }]
      }
    ];

    const systemInstruction = 'You are an expert software engineer.';

    const openaiMessages = provider.convertToOpenAIMessagesWithSystem(contents, systemInstruction);

    expect(openaiMessages).toEqual([
      {
        role: 'system',
        content: 'You are an expert software engineer.'
      },
      {
        role: 'user',
        content: 'First user message'
      },
      {
        role: 'assistant',
        content: 'Assistant response'
      },
      {
        role: 'user',
        content: 'Second user message'
      }
    ]);
  });

  /**
   * @requirement REQ-001.3
   * @scenario Tool calls with system instructions
   * @given Contents with function calls and system instruction
   * @when converted to OpenAI format
   * @then System message first, tool calls properly formatted
   */
  it('should handle tool calls with system instructions', () => {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'Search for TypeScript tutorials' }]
      },
      {
        role: 'model',
        parts: [
          { text: 'I\'ll search for TypeScript tutorials for you.' },
          {
            functionCall: {
              name: 'search',
              args: { query: 'TypeScript tutorials' }
            }
          }
        ]
      }
    ];

    const systemInstruction = 'You are a helpful tutorial finder. Use search when users ask for learning resources.';

    const openaiMessages = provider.convertToOpenAIMessagesWithSystem(contents, systemInstruction);

    expect(openaiMessages).toEqual([
      {
        role: 'system',
        content: 'You are a helpful tutorial finder. Use search when users ask for learning resources.'
      },
      {
        role: 'user',
        content: 'Search for TypeScript tutorials'
      },
      {
        role: 'assistant',
        content: 'I\'ll search for TypeScript tutorials for you.',
        tool_calls: [
          {
            id: expect.stringMatching(/^call_/),
            type: 'function',
            function: {
              name: 'search',
              arguments: '{"query":"TypeScript tutorials"}'
            }
          }
        ]
      }
    ]);
  });

  // Property-based test for system instruction placement
  it.prop([
    fc.string().filter(s => s.trim().length > 0),
    fc.array(
      fc.record({
        role: fc.constantFrom('user' as const, 'model' as const),
        parts: fc.array(fc.record({ text: fc.string() }), { minLength: 1 })
      }),
      { minLength: 1, maxLength: 5 }
    )
  ])('should always place system message first regardless of content order', (systemText, contents) => {
    const openaiMessages = provider.convertToOpenAIMessagesWithSystem(contents, systemText);
    
    expect(openaiMessages[0]).toEqual({
      role: 'system',
      content: systemText
    });
    
    expect(openaiMessages.length).toBe(contents.length + 1);
  });
});
```

#### 4. Anthropic Provider System Parameter Tests

**File**: `packages/core/src/providers/anthropic/AnthropicProvider.system.test.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P03
 * @requirement REQ-001.4
 * @test_behavior Anthropic-specific system parameter and OAuth injection
 */

import { AnthropicProvider } from './AnthropicProvider';
import { Content } from '@google/generative-ai';

describe('Anthropic Provider System Handling', () => {
  describe('API Mode System Parameter', () => {
    let provider: AnthropicProvider;
    
    beforeEach(() => {
      provider = new AnthropicProvider('sk-ant-api-12345'); // API key format
    });

    /**
     * @requirement REQ-001.4
     * @scenario System instruction as separate system parameter
     * @given Contents and system instruction in API mode
     * @when generateChatCompletion is called
     * @then System instruction passed as system parameter, not in messages
     */
    it('should use system parameter for API mode', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Explain recursion in simple terms' }]
        }
      ];
      
      const systemInstruction = 'You are an expert computer science teacher. Explain complex topics using simple analogies and examples.';

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Recursion is like Russian dolls - each doll contains a smaller version of itself...'
        }]
      });

      vi.mocked(provider.anthropic.messages.create = mockCreate);

      const result = await provider.generateChatCompletionWithSystemPrompt(
        contents,
        [],
        { systemInstruction }
      );

      // Verify Anthropic API called with system parameter
      expect(mockCreate).toHaveBeenCalledWith({
        model: expect.any(String),
        max_tokens: expect.any(Number),
        system: 'You are an expert computer science teacher. Explain complex topics using simple analogies and examples.',
        messages: [
          {
            role: 'user',
            content: 'Explain recursion in simple terms'
          }
        ]
      });

      // Verify system instruction NOT in messages array
      const calledMessages = mockCreate.mock.calls[0][0].messages;
      calledMessages.forEach((msg: any) => {
        expect(msg.role).not.toBe('system');
      });

      expect(result.role).toBe('model');
      expect(result.parts[0].text).toContain('Recursion');
    });

    /**
     * @requirement REQ-001.4
     * @scenario Complex system instruction formatting
     * @given Multi-line system instruction with formatting
     * @when processed for API mode
     * @then Formatting preserved in system parameter
     */
    it('should preserve complex system instruction formatting', async () => {
      const systemInstruction = `You are Claude Code, an AI assistant specialized in software engineering.

Core Principles:
- Write clean, maintainable code
- Follow best practices
- Include comprehensive error handling

Capabilities:
1. Code analysis and debugging
2. File system operations  
3. Git operations
4. Test writing and validation

Always provide working code examples with explanations.`;

      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Help me debug this function' }] }
      ];

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'I\'ll help debug your function...' }]
      });

      vi.mocked(provider.anthropic.messages.create = mockCreate);

      await provider.generateChatCompletionWithSystemPrompt(contents, [], { systemInstruction });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: systemInstruction
        })
      );

      const calledSystemParam = mockCreate.mock.calls[0][0].system;
      expect(calledSystemParam).toContain('Core Principles:');
      expect(calledSystemParam).toContain('- Write clean');
      expect(calledSystemParam).toContain('1. Code analysis');
    });
  });

  describe('OAuth Mode Conversation Injection', () => {
    let provider: AnthropicProvider;
    
    beforeEach(() => {
      provider = new AnthropicProvider('sk-ant-oat-xyz123'); // OAuth token format
    });

    /**
     * @requirement REQ-001.4
     * @scenario System instruction injection in OAuth mode
     * @given OAuth token and system instruction
     * @when generateChatCompletion is called
     * @then System instruction injected into first user message
     */
    it('should inject system instruction into conversation for OAuth mode', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Write a Python function to calculate fibonacci' }]
        }
      ];
      
      const systemInstruction = 'You are a Python expert. Always include docstrings and type hints.';

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'def fibonacci(n: int) -> int:\n    """Calculate fibonacci number."""' }]
      });

      vi.mocked(provider.anthropic.messages.create = mockCreate);

      const result = await provider.generateChatCompletionWithSystemPrompt(
        contents,
        [],
        { systemInstruction }
      );

      // Verify NO system parameter in OAuth mode
      expect(mockCreate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.anything()
        })
      );

      // Verify system instruction injected into first user message
      expect(mockCreate).toHaveBeenCalledWith({
        model: expect.any(String),
        max_tokens: expect.any(Number),
        messages: [
          {
            role: 'user',
            content: 'You are a Python expert. Always include docstrings and type hints.\n\n---\n\nWrite a Python function to calculate fibonacci'
          }
        ]
      });

      expect(result.role).toBe('model');
      expect(result.parts[0].text).toContain('fibonacci');
    });

    /**
     * @requirement REQ-001.4
     * @scenario OAuth injection with multi-turn conversation
     * @given OAuth mode with existing conversation history
     * @when system instruction is added
     * @then Only first user message is modified with injection
     */
    it('should inject system instruction only into first user message in OAuth mode', async () => {
      const contents: Content[] = [
        {
          role: 'user',
          parts: [{ text: 'Hello' }]
        },
        {
          role: 'model',
          parts: [{ text: 'Hi there!' }]
        },
        {
          role: 'user',
          parts: [{ text: 'Write some Python code' }]
        }
      ];
      
      const systemInstruction = 'You are a Python coding assistant.';

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Here\'s some Python code...' }]
      });

      vi.mocked(provider.anthropic.messages.create = mockCreate);

      await provider.generateChatCompletionWithSystemPrompt(contents, [], { systemInstruction });

      const calledMessages = mockCreate.mock.calls[0][0].messages;
      
      // First user message should have injection
      expect(calledMessages[0]).toEqual({
        role: 'user',
        content: 'You are a Python coding assistant.\n\n---\n\nHello'
      });
      
      // Other messages should be unchanged
      expect(calledMessages[1]).toEqual({
        role: 'assistant',
        content: 'Hi there!'
      });
      
      expect(calledMessages[2]).toEqual({
        role: 'user', 
        content: 'Write some Python code'
      });
    });

    /**
     * @requirement REQ-001.4
     * @scenario OAuth mode detection
     * @given Various token formats
     * @when auth mode is detected
     * @then Correct mode identified for proper system handling
     */
    it('should correctly detect OAuth vs API mode from token format', () => {
      const testCases = [
        { token: 'sk-ant-api-12345', expected: 'api' },
        { token: 'sk-ant-oat-xyz789', expected: 'oauth' },
        { token: 'invalid-token', expected: 'unknown' },
        { token: '', expected: 'unknown' }
      ];

      testCases.forEach(({ token, expected }) => {
        const detectedMode = provider.detectAuthenticationMode(token);
        expect(detectedMode).toBe(expected);
      });
    });
  });

  // Property-based test for system instruction handling
  it.prop([
    fc.string().filter(s => s.trim().length > 0),
    fc.constantFrom('sk-ant-api-123', 'sk-ant-oat-456')
  ])('should handle system instructions appropriately based on auth mode', (systemText, authToken) => {
    const testProvider = new AnthropicProvider(authToken);
    const isOAuth = authToken.startsWith('sk-ant-oat');
    
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Test message' }] }
    ];

    const result = testProvider.processSystemInstructionForMode(contents, systemText);

    if (isOAuth) {
      // OAuth mode: system instruction should be injected into content
      expect(result.messages[0].content).toContain(systemText);
      expect(result.systemParameter).toBeUndefined();
    } else {
      // API mode: system instruction should be in system parameter
      expect(result.systemParameter).toBe(systemText);
      expect(result.messages[0].content).toBe('Test message');
    }
  });
});
```

### Required Test Markers

Every test MUST include detailed behavioral annotations:

```typescript
/**
 * @requirement REQ-001.X
 * @scenario [Clear description of what should happen]
 * @given [Input conditions]
 * @when [Action taken]
 * @then [Expected outcome]
 * @and [Additional expectations]
 */
```

### Test Quality Requirements

1. **NO Mock Theater**: Tests call real provider methods, verify actual behavior
2. **Data Transformation Focus**: Test input → output conversions, not mock interactions
3. **Property-Based Testing**: 30% of tests use property-based testing for edge cases
4. **Realistic Data**: Use actual system instructions and realistic Content[] arrays
5. **Provider-Specific**: Test each provider's native format requirements
6. **OAuth Special Cases**: Test Anthropic OAuth mode separately from API mode

## Verification Commands

### Automated Checks

```bash
# Verify TDD test files created
find packages/core/src/providers -name "*.system.test.ts" | wc -l
# Expected: 4 files

# Check test behavior annotations
grep -r "@scenario\|@given\|@when\|@then" packages/core/src/providers/*.system.test.ts | wc -l
# Expected: 60+ behavioral annotations

# Verify property-based tests
grep -r "it\.prop\|fc\." packages/core/src/providers/*.system.test.ts | wc -l  
# Expected: 12+ property-based tests (30% minimum)

# Check for mock theater (should be minimal)
grep -r "mockImplementation\|toHaveBeenCalled" packages/core/src/providers/*.system.test.ts | wc -l
# Expected: <10 occurrences (only for necessary mocking)

# Verify tests will fail with stubs
npm test -- --grep "system" --reporter verbose
# Expected: Most tests should fail naturally with stub implementations
```

## Success Criteria

- **4 new test files created** with comprehensive system prompt behavior tests
- **60+ test scenarios** covering all system prompt handling requirements
- **30%+ property-based tests** for edge case coverage  
- **Zero mock theater** - tests verify real data transformations
- **Clear behavioral specs** - every test has @scenario/@given/@when/@then annotations
- **Tests fail naturally** with stub implementations (proving they test real behavior)
- **All requirements covered** - REQ-001.1 through REQ-001.5 have test coverage

These tests will drive the correct implementation in Phase 04 and ensure system prompts work properly across all providers.