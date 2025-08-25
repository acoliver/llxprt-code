# Test Plan for Provider Simplification Phase 2

## Overview

This document outlines the comprehensive test strategy to validate the correct behavior of the providers after fixing system instruction handling, tool ID matching, and content format validation issues. The tests are organized by priority and focus areas.

## 1. System Instruction Handling Tests

### Priority: High

These tests validate that system instructions are properly handled in each provider's native format.

#### 1.1 OpenAI Provider System Instruction Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/openai/OpenAIProvider.system.test.ts`

**Description:** Test OpenAI provider's handling of system instructions in messages array

```typescript
describe('OpenAI Provider System Instructions', () => {
  it('should convert system Content to system message in messages array', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [{ text: 'You are a helpful assistant' }]
      },
      {
        role: 'user', 
        parts: [{ text: 'Hello' }]
      }
    ];

    const provider = new OpenAIProvider(TEST_API_KEY);
    const result = await provider.generateChatCompletion(contents, [], {});

    // Verify the request includes system message in correct format
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ]
      })
    );
  });

  it('should handle multiple system instructions correctly', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [{ text: 'You are a helpful assistant' }]
      },
      {
        role: 'system',
        parts: [{ text: 'Be concise in responses' }] 
      },
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    const provider = new OpenAIProvider(TEST_API_KEY);
    await provider.generateChatCompletion(contents, [], {});

    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'system', content: 'Be concise in responses' },
          { role: 'user', content: 'Hello' }
        ]
      })
    );
  });

  it('should reject invalid system Content format', () => {
    const invalidContents: Content[] = [
      {
        role: 'system',
        parts: [
          { text: 'System instruction' },
          { functionCall: { name: 'invalid', args: {} } } // Invalid in system
        ]
      }
    ];

    const provider = new OpenAIProvider(TEST_API_KEY);
    expect(() => 
      provider.generateChatCompletion(invalidContents, [], {})
    ).toThrow('System messages cannot contain function calls');
  });
});
```

**Expected Behavior:** 
- System Content converted to system messages in OpenAI messages array
- Multiple system messages preserved as separate entries
- System messages with non-text parts rejected
- System instructions appear before user messages in API call

#### 1.2 Anthropic Provider System Instruction Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/anthropic/AnthropicProvider.system.test.ts`

**Description:** Test Anthropic provider's handling of system instructions as system parameter

```typescript
describe('Anthropic Provider System Instructions', () => {
  it('should pass system Content as system parameter, not in messages', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [{ text: 'You are a helpful assistant' }]
      },
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    const provider = new AnthropicProvider(TEST_API_KEY);
    await provider.generateChatCompletion(contents, [], {});

    expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are a helpful assistant',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      })
    );
  });

  it('should combine multiple system instructions into single system parameter', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [{ text: 'You are helpful.' }]
      },
      {
        role: 'system', 
        parts: [{ text: ' Be concise.' }]
      },
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    const provider = new AnthropicProvider(TEST_API_KEY);
    await provider.generateChatCompletion(contents, [], {});

    expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are helpful. Be concise.',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      })
    );
  });

  it('should handle system instructions with complex formatting', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [
          { text: 'You are a helpful assistant.\n\nInstructions:\n' },
          { text: '1. Be concise\n2. Be accurate' }
        ]
      },
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    const provider = new AnthropicProvider(TEST_API_KEY);
    await provider.generateChatCompletion(contents, [], {});

    expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are a helpful assistant.\n\nInstructions:\n1. Be concise\n2. Be accurate'
      })
    );
  });
});
```

**Expected Behavior:**
- System Content converted to system parameter (not in messages array)
- Multiple system Content entries combined into single system string
- System messages excluded from messages array
- Complex formatting preserved in system parameter

#### 1.3 Gemini Provider System Instruction Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/gemini/GeminiProvider.system.test.ts`

**Description:** Test Gemini provider's native system instruction handling

```typescript
describe('Gemini Provider System Instructions', () => {
  it('should pass system Content as systemInstruction parameter', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [{ text: 'You are a helpful assistant' }]
      },
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    const provider = new GeminiProvider(TEST_API_KEY);
    await provider.generateChatCompletion(contents, [], {});

    expect(mockGeminiModel.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: {
          parts: [{ text: 'You are a helpful assistant' }]
        },
        contents: [
          { role: 'user', parts: [{ text: 'Hello' }] }
        ]
      })
    );
  });

  it('should preserve system Content structure in systemInstruction', async () => {
    const contents: Content[] = [
      {
        role: 'system',
        parts: [
          { text: 'Primary instruction: ' },
          { text: 'Be helpful and accurate.' }
        ]
      },
      {
        role: 'user',
        parts: [{ text: 'Hello' }]
      }
    ];

    const provider = new GeminiProvider(TEST_API_KEY);
    await provider.generateChatCompletion(contents, [], {});

    expect(mockGeminiModel.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: {
          parts: [
            { text: 'Primary instruction: ' },
            { text: 'Be helpful and accurate.' }
          ]
        }
      })
    );
  });
});
```

**Expected Behavior:**
- System Content passed as systemInstruction parameter
- System Content structure (multiple parts) preserved
- System Content excluded from contents array
- Native Gemini systemInstruction format maintained

## 2. Tool ID Matching Tests

### Priority: High

These tests validate that tool_use and tool_result IDs match correctly and follow realistic API patterns.

#### 2.1 Anthropic Tool ID Matching Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/converters/AnthropicContentConverter.toolid.test.ts`

**Description:** Test Anthropic tool ID generation and matching

```typescript
describe('Anthropic Tool ID Matching', () => {
  it('should generate realistic Anthropic tool IDs', () => {
    const converter = new AnthropicContentConverter();
    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'search',
              args: { query: 'test' }
            }
          }
        ]
      }
    ];

    const result = converter.toProviderFormat(contents);
    const toolUse = result[0].content[0];

    expect(toolUse.id).toMatch(/^toolu_[A-Za-z0-9]{10,20}$/);
    expect(toolUse.type).toBe('tool_use');
    expect(toolUse.name).toBe('search');
  });

  it('should maintain tool ID consistency in conversation flow', () => {
    const converter = new AnthropicContentConverter();
    
    // First: model makes tool call
    const toolCallContents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'search',
              args: { query: 'test' }
            }
          }
        ]
      }
    ];

    const toolCallResult = converter.toProviderFormat(toolCallContents);
    const toolId = toolCallResult[0].content[0].id;

    // Second: user provides tool result with same ID
    const toolResultContents: Content[] = [
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: 'search',
              response: { results: ['item1'] }
            }
          }
        ]
      }
    ];

    // Mock the tool ID generation to return the same ID
    vi.spyOn(converter, 'generateToolId').mockReturnValue(toolId);

    const toolResultResult = converter.toProviderFormat(toolResultContents);
    const toolResult = toolResultResult[0].content[0];

    expect(toolResult.tool_use_id).toBe(toolId);
    expect(toolResult.type).toBe('tool_result');
  });

  it('should generate unique IDs for different tool calls', () => {
    const converter = new AnthropicContentConverter();
    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'search',
              args: { query: 'first' }
            }
          },
          {
            functionCall: {
              name: 'calculate',
              args: { expression: '2+2' }
            }
          }
        ]
      }
    ];

    const result = converter.toProviderFormat(contents);
    const toolUse1 = result[0].content[0];
    const toolUse2 = result[0].content[1];

    expect(toolUse1.id).not.toBe(toolUse2.id);
    expect(toolUse1.id).toMatch(/^toolu_/);
    expect(toolUse2.id).toMatch(/^toolu_/);
  });
});
```

**Expected Behavior:**
- Tool IDs follow realistic Anthropic format (toolu_xxxxx)
- IDs are unique for different tool calls
- tool_use and tool_result IDs match in conversation flow
- IDs are persistent across converter calls

#### 2.2 OpenAI Tool ID Matching Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/converters/OpenAIContentConverter.toolid.test.ts`

**Description:** Test OpenAI tool call ID generation and matching

```typescript
describe('OpenAI Tool ID Matching', () => {
  it('should generate realistic OpenAI tool call IDs', () => {
    const converter = new OpenAIContentConverter();
    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'search',
              args: { query: 'test' }
            }
          }
        ]
      }
    ];

    const result = converter.toProviderFormat(contents);
    const toolCall = result[0].tool_calls[0];

    expect(toolCall.id).toMatch(/^call_[A-Za-z0-9]{10,20}$/);
    expect(toolCall.type).toBe('function');
    expect(toolCall.function.name).toBe('search');
  });

  it('should match tool_call_id with original tool call ID', () => {
    const converter = new OpenAIContentConverter();
    
    // Generate tool call first
    const toolCallContents: Content[] = [
      {
        role: 'model', 
        parts: [
          {
            functionCall: {
              name: 'search',
              args: { query: 'test' }
            }
          }
        ]
      }
    ];

    const toolCallResult = converter.toProviderFormat(toolCallContents);
    const originalToolId = toolCallResult[0].tool_calls[0].id;

    // Mock the ID retrieval to return same ID for tool result
    vi.spyOn(converter, 'generateToolCallId').mockReturnValue(originalToolId);

    // Process tool result
    const toolResultContents: Content[] = [
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: 'search', 
              response: { results: ['item1'] }
            }
          }
        ]
      }
    ];

    const toolResultResult = converter.toProviderFormat(toolResultContents);
    expect(toolResultResult[0].tool_call_id).toBe(originalToolId);
  });

  it('should handle multiple tool calls with unique IDs', () => {
    const converter = new OpenAIContentConverter();
    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'search',
              args: { query: 'first' }
            }
          },
          {
            functionCall: {
              name: 'calculate', 
              args: { expression: '2+2' }
            }
          }
        ]
      }
    ];

    const result = converter.toProviderFormat(contents);
    const toolCall1 = result[0].tool_calls[0];
    const toolCall2 = result[0].tool_calls[1];

    expect(toolCall1.id).not.toBe(toolCall2.id);
    expect(toolCall1.id).toMatch(/^call_/);
    expect(toolCall2.id).toMatch(/^call_/);
  });
});
```

**Expected Behavior:**
- Tool IDs follow OpenAI format (call_xxxxx)
- tool_call_id matches original tool call ID
- Multiple tool calls get unique IDs
- ID generation is deterministic for same function name

## 3. Content Format Validation Tests

### Priority: High

These tests validate that Content objects only have valid roles and that system Content is handled properly.

#### 3.1 Content Role Validation Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/validation/ContentValidation.test.ts`

**Description:** Test Content format validation across all providers

```typescript
describe('Content Format Validation', () => {
  it('should accept only valid Content roles', () => {
    const validContents: Content[] = [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi there' }] },
      { role: 'system', parts: [{ text: 'Instructions' }] }
    ];

    expect(() => validateContentArray(validContents)).not.toThrow();
  });

  it('should reject invalid Content roles', () => {
    const invalidContents = [
      { role: 'assistant', parts: [{ text: 'Hello' }] }, // assistant not valid for Content
      { role: 'tool', parts: [{ text: 'Result' }] } // tool not valid for Content
    ] as Content[];

    expect(() => validateContentArray(invalidContents)).toThrow(
      'Invalid Content role: assistant. Must be user, model, or system'
    );
  });

  it('should require parts array in Content objects', () => {
    const invalidContents = [
      { role: 'user' } // Missing parts
    ] as Content[];

    expect(() => validateContentArray(invalidContents)).toThrow(
      'Content must have parts array'
    );
  });

  it('should reject empty parts arrays', () => {
    const invalidContents: Content[] = [
      { role: 'user', parts: [] } // Empty parts
    ];

    expect(() => validateContentArray(invalidContents)).toThrow(
      'Content parts array cannot be empty'
    );
  });
});
```

**Expected Behavior:**
- Only 'user', 'model', 'system' roles accepted for Content
- Content objects must have non-empty parts array
- Invalid roles trigger clear error messages
- Validation occurs before provider processing

#### 3.2 System Content Validation Tests  

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/validation/SystemContentValidation.test.ts`

**Description:** Test system Content validation rules

```typescript
describe('System Content Validation', () => {
  it('should allow only text parts in system Content', () => {
    const validSystemContent: Content = {
      role: 'system',
      parts: [
        { text: 'You are helpful' },
        { text: ' and accurate.' }
      ]
    };

    expect(() => validateSystemContent(validSystemContent)).not.toThrow();
  });

  it('should reject functionCall in system Content', () => {
    const invalidSystemContent: Content = {
      role: 'system',
      parts: [
        { text: 'Instructions' },
        { functionCall: { name: 'invalid', args: {} } }
      ]
    };

    expect(() => validateSystemContent(invalidSystemContent)).toThrow(
      'System Content cannot contain function calls'
    );
  });

  it('should reject functionResponse in system Content', () => {
    const invalidSystemContent: Content = {
      role: 'system', 
      parts: [
        { functionResponse: { name: 'invalid', response: {} } }
      ]
    };

    expect(() => validateSystemContent(invalidSystemContent)).toThrow(
      'System Content cannot contain function responses'
    );
  });

  it('should handle system Content with empty text gracefully', () => {
    const systemContentEmptyText: Content = {
      role: 'system',
      parts: [{ text: '' }]
    };

    expect(() => validateSystemContent(systemContentEmptyText)).not.toThrow();
  });
});
```

**Expected Behavior:**
- System Content can only contain text parts
- Function calls/responses in system Content rejected
- Empty text parts allowed but validated
- Clear error messages for violations

## 4. Integration Tests

### Priority: High

End-to-end tests with realistic data and no mocks.

#### 4.1 Multi-Provider System Instruction Integration Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/integration/SystemInstructionIntegration.test.ts`

**Description:** Integration tests across all providers with real system instructions

```typescript
describe('System Instruction Integration Tests', () => {
  const REAL_SYSTEM_INSTRUCTION = `You are Claude Code, an AI assistant specialized in software development.

Key capabilities:
- Code analysis and debugging
- File system operations  
- Git operations
- Test writing and validation

Always be precise and provide working code examples.`;

  const providers = [
    { name: 'OpenAI', provider: () => new OpenAIProvider(process.env.OPENAI_API_KEY!) },
    { name: 'Anthropic', provider: () => new AnthropicProvider(process.env.ANTHROPIC_API_KEY!) },
    { name: 'Gemini', provider: () => new GeminiProvider(process.env.GEMINI_API_KEY!) }
  ];

  providers.forEach(({ name, provider }) => {
    it(`should handle complex system instructions correctly - ${name}`, async () => {
      if (!process.env[`${name.toUpperCase()}_API_KEY`]) {
        return; // Skip if no API key
      }

      const contents: Content[] = [
        {
          role: 'system',
          parts: [{ text: REAL_SYSTEM_INSTRUCTION }]
        },
        {
          role: 'user',
          parts: [{ text: 'Write a simple hello world function in TypeScript' }]
        }
      ];

      const providerInstance = provider();
      const result = await providerInstance.generateChatCompletion(contents, [], {});

      expect(result.role).toBe('model');
      expect(result.parts).toHaveLength(1);
      expect(result.parts[0].text).toContain('function');
      expect(result.parts[0].text).toContain('TypeScript');
    }, 30000);

    it(`should maintain system context across conversation - ${name}`, async () => {
      if (!process.env[`${name.toUpperCase()}_API_KEY`]) {
        return;
      }

      const contents: Content[] = [
        {
          role: 'system', 
          parts: [{ text: 'Always respond with JSON format. No other text.' }]
        },
        {
          role: 'user',
          parts: [{ text: 'What is 2+2?' }]
        }
      ];

      const providerInstance = provider();
      const result = await providerInstance.generateChatCompletion(contents, [], {});

      expect(() => JSON.parse(result.parts[0].text!)).not.toThrow();
    }, 30000);
  });
});
```

**Expected Behavior:**
- All providers correctly process system instructions 
- System context maintained throughout conversation
- Realistic system instructions produce appropriate responses
- No errors or degraded responses

#### 4.2 Tool Usage Integration Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/integration/ToolUsageIntegration.test.ts`

**Description:** Integration tests for tool calls across providers

```typescript
describe('Tool Usage Integration Tests', () => {
  const SEARCH_TOOL: ITool = {
    type: 'function',
    function: {
      name: 'search',
      description: 'Search for information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  };

  providers.forEach(({ name, provider }) => {
    it(`should handle complete tool usage flow - ${name}`, async () => {
      if (!process.env[`${name.toUpperCase()}_API_KEY`]) {
        return;
      }

      const contents: Content[] = [
        {
          role: 'system',
          parts: [{ text: 'Use the search tool when users ask for information.' }]
        },
        {
          role: 'user', 
          parts: [{ text: 'Search for TypeScript tutorials' }]
        }
      ];

      const providerInstance = provider();
      const result = await providerInstance.generateChatCompletion(
        contents, 
        [SEARCH_TOOL], 
        {}
      );

      // Should get a tool call
      expect(result.parts.some(part => part.functionCall)).toBe(true);
      
      const toolCall = result.parts.find(part => part.functionCall);
      expect(toolCall?.functionCall?.name).toBe('search');
      expect(toolCall?.functionCall?.args).toHaveProperty('query');
    }, 30000);

    it(`should process tool results correctly - ${name}`, async () => {
      if (!process.env[`${name.toUpperCase()}_API_KEY`]) {
        return;
      }

      const conversationWithToolResult: Content[] = [
        {
          role: 'system',
          parts: [{ text: 'Process search results and summarize them.' }]
        },
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
        },
        {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: 'search',
                response: {
                  results: [
                    'TypeScript Handbook - Official Guide',
                    'Learn TypeScript in 30 Minutes',
                    'TypeScript for Beginners'
                  ]
                }
              }
            }
          ]
        },
        {
          role: 'user',
          parts: [{ text: 'Summarize these results' }]
        }
      ];

      const providerInstance = provider();
      const result = await providerInstance.generateChatCompletion(
        conversationWithToolResult,
        [SEARCH_TOOL],
        {}
      );

      expect(result.parts[0].text).toContain('TypeScript');
      expect(result.parts[0].text).toContain('tutorial');
    }, 30000);
  });
});
```

**Expected Behavior:**
- Tool calls generated with correct format
- Tool results processed without errors
- Complete tool usage flow works end-to-end
- Tool IDs match properly in conversation

## 5. Converter Tests

### Priority: Medium

Comprehensive tests for content converters handling edge cases.

#### 5.1 OpenAI Converter Edge Case Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/converters/OpenAIContentConverter.edge.test.ts`

**Description:** Edge case testing for OpenAI converter

```typescript
describe('OpenAI Converter Edge Cases', () => {
  const converter = new OpenAIContentConverter();

  it('should handle Content with mixed system and user messages', () => {
    const contents: Content[] = [
      { role: 'system', parts: [{ text: 'System 1' }] },
      { role: 'user', parts: [{ text: 'User 1' }] },
      { role: 'system', parts: [{ text: 'System 2' }] },
      { role: 'user', parts: [{ text: 'User 2' }] }
    ];

    const result = converter.toProviderFormat(contents);

    expect(result).toEqual([
      { role: 'system', content: 'System 1' },
      { role: 'user', content: 'User 1' },
      { role: 'system', content: 'System 2' },
      { role: 'user', content: 'User 2' }
    ]);
  });

  it('should handle empty Content arrays', () => {
    const result = converter.toProviderFormat([]);
    expect(result).toEqual([]);
  });

  it('should handle Content with empty parts arrays', () => {
    const contents: Content[] = [
      { role: 'user', parts: [] }
    ];

    const result = converter.toProviderFormat(contents);
    expect(result).toEqual([]);
  });

  it('should handle complex JSON in function arguments', () => {
    const complexArgs = {
      nested: { object: { with: ['arrays', 123, true] } },
      specialChars: 'quotes "and" apostrophes \'here\'',
      unicode: '🚀 emoji and üñíçødé'
    };

    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'complexTool',
              args: complexArgs
            }
          }
        ]
      }
    ];

    const result = converter.toProviderFormat(contents);
    const toolCall = result[0].tool_calls[0];
    
    expect(JSON.parse(toolCall.function.arguments)).toEqual(complexArgs);
  });

  it('should handle malformed JSON gracefully', () => {
    const response = {
      choices: [{
        message: {
          role: 'assistant',
          tool_calls: [{
            id: 'call_123',
            type: 'function',
            function: {
              name: 'test',
              arguments: '{"invalid": json}' // Malformed JSON
            }
          }]
        }
      }]
    };

    expect(() => converter.fromProviderFormat(response)).toThrow();
  });
});
```

**Expected Behavior:**
- Mixed message types handled correctly
- Empty arrays handled gracefully
- Complex JSON serialized properly
- Malformed responses throw appropriate errors

#### 5.2 Anthropic Converter Edge Case Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/converters/AnthropicContentConverter.edge.test.ts`

**Description:** Edge case testing for Anthropic converter

```typescript
describe('Anthropic Converter Edge Cases', () => {
  const converter = new AnthropicContentConverter();

  it('should handle role transitions correctly', () => {
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'User 1' }] },
      { role: 'user', parts: [{ text: 'User 2' }] }, // Same role
      { role: 'model', parts: [{ text: 'Model 1' }] },
      { role: 'model', parts: [{ text: 'Model 2' }] }, // Same role
      { role: 'user', parts: [{ text: 'User 3' }] } // Role change
    ];

    const result = converter.toProviderFormat(contents);

    expect(result).toEqual([
      { role: 'user', content: 'User 1User 2' }, // Merged
      { role: 'assistant', content: 'Model 1Model 2' }, // Merged  
      { role: 'user', content: 'User 3' }
    ]);
  });

  it('should handle Content with only tool calls', () => {
    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'search',
              args: { query: 'test' }
            }
          }
        ]
      }
    ];

    const result = converter.toProviderFormat(contents);
    
    expect(result[0].content).toBeInstanceOf(Array);
    expect(result[0].content[0].type).toBe('tool_use');
  });

  it('should convert string content to array when adding tools', () => {
    const converter = new AnthropicContentConverter();
    
    // First add text
    const textContents: Content[] = [
      { role: 'model', parts: [{ text: 'I will search for that' }] }
    ];
    
    // Then add tool call to same message
    const mixedContents: Content[] = [
      {
        role: 'model',
        parts: [
          { text: 'I will search for that' },
          {
            functionCall: {
              name: 'search',
              args: { query: 'test' }
            }
          }
        ]
      }
    ];

    const result = converter.toProviderFormat(mixedContents);
    
    expect(result[0].content).toBeInstanceOf(Array);
    expect(result[0].content).toHaveLength(2);
    expect(result[0].content[0].type).toBe('text');
    expect(result[0].content[1].type).toBe('tool_use');
  });

  it('should handle Unicode and special characters', () => {
    const specialText = 'Special chars: 🚀 émojis, üñíçødé, "quotes", \'apostrophes\', & symbols';
    
    const contents: Content[] = [
      { role: 'user', parts: [{ text: specialText }] }
    ];

    const result = converter.toProviderFormat(contents);
    expect(result[0].content).toBe(specialText);
  });
});
```

**Expected Behavior:**
- Consecutive same-role messages merged properly
- String to array content conversion works
- Tool-only messages handled correctly
- Unicode and special characters preserved

## 6. Error Handling Tests

### Priority: Medium

Tests for proper error handling and validation.

#### 6.1 Provider Error Handling Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/validation/ProviderErrorHandling.test.ts`

**Description:** Test error conditions across providers

```typescript
describe('Provider Error Handling', () => {
  it('should validate Content before processing', async () => {
    const invalidContents = [
      { role: 'invalid', parts: [{ text: 'test' }] }
    ] as Content[];

    const provider = new OpenAIProvider(TEST_API_KEY);
    
    await expect(
      provider.generateChatCompletion(invalidContents, [], {})
    ).rejects.toThrow('Invalid Content role');
  });

  it('should handle missing API keys gracefully', async () => {
    const provider = new OpenAIProvider(''); // Empty API key
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Hello' }] }
    ];

    await expect(
      provider.generateChatCompletion(contents, [], {})
    ).rejects.toThrow('API key is required');
  });

  it('should validate system Content format', async () => {
    const invalidSystemContent: Content[] = [
      {
        role: 'system',
        parts: [
          { text: 'System message' },
          { functionCall: { name: 'invalid', args: {} } } // Invalid
        ]
      }
    ];

    const provider = new AnthropicProvider(TEST_API_KEY);
    
    await expect(
      provider.generateChatCompletion(invalidSystemContent, [], {})
    ).rejects.toThrow('System Content cannot contain function calls');
  });

  it('should handle network timeouts gracefully', async () => {
    // Mock network timeout
    const provider = new OpenAIProvider(TEST_API_KEY);
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Hello' }] }
    ];

    mockOpenAI.chat.completions.create.mockRejectedValueOnce(
      new Error('Network timeout')
    );

    await expect(
      provider.generateChatCompletion(contents, [], {})
    ).rejects.toThrow('Network timeout');
  });
});
```

**Expected Behavior:**
- Invalid Content rejected before API calls
- Missing credentials handled gracefully
- Network errors propagated correctly
- Clear error messages provided

## 7. Performance Tests

### Priority: Low

Basic performance validation tests.

#### 7.1 Converter Performance Tests

**File:** `/Users/acoliver/projects/llxprt-code/packages/core/src/providers/converters/ConverterPerformance.test.ts`

**Description:** Performance tests for content conversion

```typescript
describe('Converter Performance', () => {
  it('should handle large Content arrays efficiently', () => {
    const converter = new OpenAIContentConverter();
    
    // Generate large conversation
    const contents: Content[] = [];
    for (let i = 0; i < 1000; i++) {
      contents.push({
        role: i % 2 === 0 ? 'user' : 'model',
        parts: [{ text: `Message ${i}: ${'x'.repeat(100)}` }]
      });
    }

    const startTime = performance.now();
    const result = converter.toProviderFormat(contents);
    const duration = performance.now() - startTime;

    expect(result).toHaveLength(1000);
    expect(duration).toBeLessThan(100); // Should complete in <100ms
  });

  it('should handle complex tool calls efficiently', () => {
    const converter = new AnthropicContentConverter();
    
    // Generate many tool calls
    const parts = [];
    for (let i = 0; i < 100; i++) {
      parts.push({
        functionCall: {
          name: `tool_${i}`,
          args: { data: new Array(100).fill(`item_${i}`) }
        }
      });
    }

    const contents: Content[] = [
      { role: 'model', parts }
    ];

    const startTime = performance.now();
    const result = converter.toProviderFormat(contents);
    const duration = performance.now() - startTime;

    expect(result[0].content).toHaveLength(100);
    expect(duration).toBeLessThan(50); // Should complete in <50ms
  });
});
```

**Expected Behavior:**
- Large conversations processed quickly
- Complex tool calls handled efficiently  
- Memory usage remains reasonable
- No performance regression

## Summary

This test plan provides comprehensive coverage for:

1. **System Instruction Handling** - Validates each provider correctly handles system instructions in their native format
2. **Tool ID Matching** - Ensures tool_use and tool_result IDs match correctly with realistic API patterns  
3. **Content Format Validation** - Validates Content objects have proper roles and structure
4. **Integration Testing** - End-to-end tests with real API calls and realistic data
5. **Converter Testing** - Comprehensive edge case coverage for content conversion
6. **Error Handling** - Proper validation and error reporting
7. **Performance** - Basic performance validation

The tests are prioritized High/Medium/Low and include specific file locations, expected behaviors, and detailed test implementations. Each test validates specific aspects of the provider fixes and ensures the system works correctly after the simplification changes.