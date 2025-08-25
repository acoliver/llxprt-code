# Phase 06: Anthropic Tool ID TDD Phase

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P06`

## Prerequisites
- Required: Phase 05a completed
- Verification: All tool ID stub infrastructure in place
- Expected: Clean foundation without hardcoded IDs

## Implementation Tasks

### Goal
Write comprehensive BEHAVIORAL tests for correct Anthropic tool ID generation, tracking, and matching that will initially FAIL with the current stub implementation. These tests define the exact behavior needed for unique tool IDs and proper tool_use/tool_result matching.

### TDD Approach
1. **Write tests that expect CORRECT tool ID behavior** (will fail with stubs)
2. **Test actual ID generation patterns**, not mock interactions
3. **Validate realistic Anthropic ID formats** (toolu_xxxxx patterns)
4. **Test tool ID matching across conversation flow**
5. **Include property-based testing** for ID uniqueness and format validation
6. **NO testing for empty strings** or stub behavior

### Files to Create

#### 1. Tool ID Generation and Validation Tests

**File**: `packages/core/src/providers/types/ToolIdConfig.test.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P06
 * @requirement REQ-002.1
 * @test_behavior Tool ID generation and validation utility functions
 */

import { generateToolId, validateToolId, ToolIdConfig } from './ToolIdConfig';
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

describe('Tool ID Configuration and Generation', () => {
  const anthropicConfig: ToolIdConfig = {
    idFormat: 'anthropic',
    prefix: 'toolu_',
    suffixLength: 12,
    requiresMatching: true
  };

  const openaiConfig: ToolIdConfig = {
    idFormat: 'openai', 
    prefix: 'call_',
    suffixLength: 16,
    requiresMatching: true
  };

  /**
   * @requirement REQ-002.1
   * @scenario Tool ID generation follows provider-specific format
   * @given ToolIdConfig for Anthropic provider
   * @when generateToolId is called
   * @then Returns ID matching toolu_[12-char-suffix] pattern
   */
  it('should generate realistic Anthropic tool IDs with correct format', () => {
    const toolId = generateToolId(anthropicConfig);
    
    expect(toolId).toMatch(/^toolu_[A-Za-z0-9]{12}$/);
    expect(toolId.startsWith('toolu_')).toBe(true);
    expect(toolId.length).toBe(18); // 'toolu_' (6) + 12 chars
  });

  /**
   * @requirement REQ-002.1
   * @scenario OpenAI tool ID generation follows different format
   * @given ToolIdConfig for OpenAI provider
   * @when generateToolId is called
   * @then Returns ID matching call_[16-char-suffix] pattern
   */
  it('should generate realistic OpenAI tool IDs with correct format', () => {
    const toolId = generateToolId(openaiConfig);
    
    expect(toolId).toMatch(/^call_[A-Za-z0-9]{16}$/);
    expect(toolId.startsWith('call_')).toBe(true);
    expect(toolId.length).toBe(21); // 'call_' (5) + 16 chars
  });

  /**
   * @requirement REQ-002.5
   * @scenario Multiple tool ID generation produces unique IDs
   * @given Same ToolIdConfig used multiple times
   * @when generateToolId called repeatedly
   * @then Each call returns a different unique ID
   */
  it('should generate unique IDs on repeated calls', () => {
    const ids = new Set<string>();
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
      const toolId = generateToolId(anthropicConfig);
      expect(ids.has(toolId)).toBe(false); // No duplicates
      ids.add(toolId);
    }
    
    expect(ids.size).toBe(iterations);
  });

  /**
   * @requirement REQ-002.3
   * @scenario Tool ID validation accepts valid format
   * @given Valid Anthropic tool ID
   * @when validateToolId is called
   * @then Returns true for correct format
   */
  it('should validate correct Anthropic tool ID format', () => {
    const validIds = [
      'toolu_abc123def456',
      'toolu_XYZ789uvw123', 
      'toolu_000111222333'
    ];
    
    validIds.forEach(id => {
      expect(validateToolId(id, anthropicConfig)).toBe(true);
    });
  });

  /**
   * @requirement REQ-002.3
   * @scenario Tool ID validation rejects invalid format
   * @given Invalid tool IDs
   * @when validateToolId is called
   * @then Returns false for incorrect format
   */
  it('should reject invalid tool ID formats', () => {
    const invalidIds = [
      'broken-tool-123',      // Old hardcoded format
      'call_abc123',          // Wrong prefix  
      'toolu_',               // Missing suffix
      'toolu_abc',            // Too short suffix
      'toolu_abc123def456789', // Too long suffix
      '',                     // Empty string
      'invalid'               // Completely wrong
    ];
    
    invalidIds.forEach(id => {
      expect(validateToolId(id, anthropicConfig)).toBe(false);
    });
  });

  // Property-based test for ID generation consistency
  it.prop([fc.constantFrom(anthropicConfig, openaiConfig)])(
    'should always generate IDs matching the provider format',
    (config) => {
      const toolId = generateToolId(config);
      
      expect(toolId.startsWith(config.prefix)).toBe(true);
      expect(toolId.length).toBe(config.prefix.length + config.suffixLength);
      expect(validateToolId(toolId, config)).toBe(true);
    }
  );

  // Property-based test for uniqueness
  it.prop([
    fc.constantFrom(anthropicConfig, openaiConfig),
    fc.integer({ min: 10, max: 100 })
  ])('should generate specified number of unique IDs', (config, count) => {
    const ids = new Set<string>();
    
    for (let i = 0; i < count; i++) {
      const id = generateToolId(config);
      ids.add(id);
    }
    
    expect(ids.size).toBe(count); // All unique
  });
});
```

#### 2. Anthropic Tool ID Tracker Tests

**File**: `packages/core/src/providers/anthropic/AnthropicToolIdTracker.test.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P06
 * @requirement REQ-002.2
 * @test_behavior Anthropic tool ID tracking and mapping functionality
 */

import { AnthropicToolIdTracker } from './AnthropicToolIdTracker';
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

describe('Anthropic Tool ID Tracker', () => {
  let tracker: AnthropicToolIdTracker;
  
  beforeEach(() => {
    tracker = new AnthropicToolIdTracker();
  });

  /**
   * @requirement REQ-002.3
   * @scenario Tool ID generation follows Anthropic format
   * @given Fresh AnthropicToolIdTracker instance
   * @when generateId is called
   * @then Returns realistic Anthropic tool ID (toolu_xxxxx)
   */
  it('should generate realistic Anthropic tool IDs', () => {
    const toolId = tracker.generateId();
    
    expect(toolId).toMatch(/^toolu_[A-Za-z0-9]{12}$/);
    expect(toolId.startsWith('toolu_')).toBe(true);
    expect(toolId.length).toBe(18);
  });

  /**
   * @requirement REQ-002.5
   * @scenario Multiple tool calls get unique IDs
   * @given AnthropicToolIdTracker instance
   * @when generateId called multiple times
   * @then Each call returns different unique ID
   */
  it('should generate unique IDs for different tool calls', () => {
    const ids = [];
    for (let i = 0; i < 10; i++) {
      ids.push(tracker.generateId());
    }
    
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(10); // All different
    
    ids.forEach(id => {
      expect(id).toMatch(/^toolu_[A-Za-z0-9]{12}$/);
    });
  });

  /**
   * @requirement REQ-002.2
   * @scenario Tool call storage and retrieval
   * @given Function name and generated tool ID
   * @when storeToolCall then getToolIdForFunction
   * @then Retrieves same ID that was stored
   */
  it('should store and retrieve tool call mappings correctly', () => {
    const functionName = 'search';
    const toolId = tracker.generateId();
    
    tracker.storeToolCall(functionName, toolId);
    const retrievedId = tracker.getToolIdForFunction(functionName);
    
    expect(retrievedId).toBe(toolId);
  });

  /**
   * @requirement REQ-002.2
   * @scenario Multiple function calls with different IDs
   * @given Multiple function names and IDs
   * @when stored separately
   * @then Each retrieves its correct ID
   */
  it('should handle multiple function mappings independently', () => {
    const functions = ['search', 'calculate', 'weather', 'translate'];
    const mappings = new Map<string, string>();
    
    // Store different tool IDs for each function
    functions.forEach(func => {
      const toolId = tracker.generateId();
      tracker.storeToolCall(func, toolId);
      mappings.set(func, toolId);
    });
    
    // Verify each function retrieves its correct ID
    functions.forEach(func => {
      const expectedId = mappings.get(func);
      const actualId = tracker.getToolIdForFunction(func);
      expect(actualId).toBe(expectedId);
    });
  });

  /**
   * @requirement REQ-002.2
   * @scenario Unknown function lookup
   * @given Function name that was never stored
   * @when getToolIdForFunction called
   * @then Returns undefined (not found)
   */
  it('should return undefined for unknown function names', () => {
    const unknownId = tracker.getToolIdForFunction('nonexistent');
    expect(unknownId).toBeUndefined();
  });

  /**
   * @requirement REQ-002.2
   * @scenario Tracker clearing
   * @given Stored tool call mappings
   * @when clear is called
   * @then All mappings are removed
   */
  it('should clear all stored mappings', () => {
    // Store some mappings
    tracker.storeToolCall('function1', tracker.generateId());
    tracker.storeToolCall('function2', tracker.generateId());
    
    // Verify they exist
    expect(tracker.getToolIdForFunction('function1')).toBeDefined();
    expect(tracker.getToolIdForFunction('function2')).toBeDefined();
    
    // Clear and verify removal
    tracker.clear();
    expect(tracker.getToolIdForFunction('function1')).toBeUndefined();
    expect(tracker.getToolIdForFunction('function2')).toBeUndefined();
  });

  /**
   * @requirement REQ-002.3
   * @scenario Configuration validation
   * @given AnthropicToolIdTracker instance
   * @when getConfig is called
   * @then Returns correct Anthropic configuration
   */
  it('should provide correct Anthropic configuration', () => {
    const config = tracker.getConfig();
    
    expect(config).toEqual({
      idFormat: 'anthropic',
      prefix: 'toolu_',
      suffixLength: 12,
      requiresMatching: true
    });
  });

  // Property-based test for conversation simulation
  it.prop([
    fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 1, maxLength: 10 })
  ])('should handle conversation with multiple tool calls', (functionNames) => {
    const toolIdMap = new Map<string, string>();
    
    // Simulate tool_use generation
    functionNames.forEach(funcName => {
      const toolId = tracker.generateId();
      tracker.storeToolCall(funcName, toolId);
      toolIdMap.set(funcName, toolId);
    });
    
    // Simulate tool_result ID lookup
    functionNames.forEach(funcName => {
      const retrievedId = tracker.getToolIdForFunction(funcName);
      const expectedId = toolIdMap.get(funcName);
      expect(retrievedId).toBe(expectedId);
      expect(retrievedId).toMatch(/^toolu_[A-Za-z0-9]{12}$/);
    });
  });

  // Property-based test for ID format consistency
  it.prop([fc.integer({ min: 1, max: 50 })])(
    'should maintain format consistency across any number of generations',
    (count) => {
      const ids = [];
      for (let i = 0; i < count; i++) {
        ids.push(tracker.generateId());
      }
      
      ids.forEach(id => {
        expect(id).toMatch(/^toolu_[A-Za-z0-9]{12}$/);
        expect(id.startsWith('toolu_')).toBe(true);
        expect(id.length).toBe(18);
      });
      
      // Ensure uniqueness
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(count);
    }
  );
});
```

#### 3. Anthropic Provider Tool ID Integration Tests

**File**: `packages/core/src/providers/anthropic/AnthropicProvider.toolid.test.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P06
 * @requirement REQ-002.2
 * @test_behavior Anthropic provider tool ID integration and conversation flow
 */

import { AnthropicProvider } from './AnthropicProvider';
import { Content } from '@google/generative-ai';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

describe('Anthropic Provider Tool ID Integration', () => {
  let provider: AnthropicProvider;
  
  beforeEach(() => {
    provider = new AnthropicProvider('sk-ant-api-12345');
  });

  /**
   * @requirement REQ-002.1
   * @scenario Tool use generation with unique IDs
   * @given Content with function call
   * @when converted to Anthropic format
   * @then tool_use has realistic unique ID matching toolu_ pattern
   */
  it('should generate tool_use with realistic unique IDs', async () => {
    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'search',
              args: { query: 'TypeScript tutorials' }
            }
          }
        ]
      }
    ];

    // Mock the Anthropic API response for testing
    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'toolu_expected_from_provider',
          name: 'search',
          input: { query: 'TypeScript tutorials' }
        }
      ]
    });
    
    vi.mocked(provider.anthropic.messages.create = mockCreate);

    const result = await provider.generateChatCompletion(contents, [], {});

    // Verify API was called with proper tool_use format
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            role: 'assistant',
            content: [
              expect.objectContaining({
                type: 'tool_use',
                id: expect.stringMatching(/^toolu_[A-Za-z0-9]{12}$/),
                name: 'search',
                input: { query: 'TypeScript tutorials' }
              })
            ]
          })
        ]
      })
    );
  });

  /**
   * @requirement REQ-002.2
   * @scenario Tool result with matching ID
   * @given Content with function response
   * @when processed after corresponding tool_use
   * @then tool_result has matching tool_use_id
   */
  it('should generate tool_result with matching tool_use_id', async () => {
    // First: Simulate tool_use generation and storage
    const toolUseContents: Content[] = [
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

    // Generate and store the tool_use (this would happen in real flow)
    const mockToolUse = vi.spyOn(provider as any, 'generateToolUse').mockReturnValue({
      type: 'tool_use',
      id: 'toolu_abc123def456',
      name: 'search',
      input: { query: 'test' }
    });

    // Second: Process tool_result
    const toolResultContents: Content[] = [
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: 'search',
              response: { results: ['TypeScript Guide', 'TS Handbook'] }
            }
          }
        ]
      }
    ];

    // Mock the provider's tool result generation
    const mockToolResult = vi.spyOn(provider as any, 'generateToolResult').mockReturnValue({
      type: 'tool_result',
      tool_use_id: 'toolu_abc123def456',
      content: JSON.stringify({ results: ['TypeScript Guide', 'TS Handbook'] })
    });

    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Here are the search results...' }]
    });
    
    vi.mocked(provider.anthropic.messages.create = mockCreate);

    await provider.generateChatCompletion(toolResultContents, [], {});

    // Verify tool_result has matching ID
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            role: 'user',
            content: [
              expect.objectContaining({
                type: 'tool_result',
                tool_use_id: 'toolu_abc123def456',
                content: expect.any(String)
              })
            ]
          })
        ]
      })
    );
  });

  /**
   * @requirement REQ-002.5
   * @scenario Multiple tool calls with unique IDs
   * @given Content with multiple function calls
   * @when processed by provider
   * @then Each tool_use gets different unique ID
   */
  it('should assign unique IDs to multiple tool calls in same message', async () => {
    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'search',
              args: { query: 'JavaScript' }
            }
          },
          {
            functionCall: {
              name: 'calculate',
              args: { expression: '2 + 2' }
            }
          },
          {
            functionCall: {
              name: 'weather',
              args: { location: 'San Francisco' }
            }
          }
        ]
      }
    ];

    const mockCreate = vi.fn().mockResolvedValue({
      content: [
        { type: 'tool_use', id: 'toolu_search123', name: 'search' },
        { type: 'tool_use', id: 'toolu_calc456', name: 'calculate' },
        { type: 'tool_use', id: 'toolu_weather789', name: 'weather' }
      ]
    });
    
    vi.mocked(provider.anthropic.messages.create = mockCreate);

    await provider.generateChatCompletion(contents, [], {});

    const calledMessages = mockCreate.mock.calls[0][0].messages;
    const toolUses = calledMessages[0].content.filter((item: any) => item.type === 'tool_use');
    
    // Verify all tool_uses have unique IDs
    const toolIds = toolUses.map((tool: any) => tool.id);
    const uniqueIds = new Set(toolIds);
    
    expect(uniqueIds.size).toBe(3); // All different
    toolIds.forEach((id: string) => {
      expect(id).toMatch(/^toolu_[A-Za-z0-9]{12}$/);
    });
  });

  /**
   * @requirement REQ-002.2
   * @scenario Complete tool usage conversation flow
   * @given Full conversation with tool_use and tool_result
   * @when processed through provider
   * @then IDs match correctly throughout conversation
   */
  it('should maintain ID consistency throughout tool usage conversation', async () => {
    // Simulate complete tool usage flow
    const conversationFlow: Content[] = [
      // User asks for help
      {
        role: 'user',
        parts: [{ text: 'Search for Python tutorials' }]
      },
      // Assistant decides to use tool
      {
        role: 'model',
        parts: [
          { text: 'I\'ll search for Python tutorials for you.' },
          {
            functionCall: {
              name: 'search',
              args: { query: 'Python tutorials' }
            }
          }
        ]
      },
      // User provides tool result
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: 'search',
              response: { results: ['Python.org Tutorial', 'Automate the Boring Stuff'] }
            }
          }
        ]
      },
      // Assistant responds with results
      {
        role: 'user',
        parts: [{ text: 'Summarize these results' }]
      }
    ];

    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Here\'s a summary of the Python tutorials...' }]
    });
    
    vi.mocked(provider.anthropic.messages.create = mockCreate);

    await provider.generateChatCompletion(conversationFlow, [], {});

    // Verify the conversation was processed with proper ID matching
    const calledMessages = mockCreate.mock.calls[0][0].messages;
    
    // Find tool_use and tool_result in the conversation
    let toolUseId: string | undefined;
    let toolResultId: string | undefined;
    
    calledMessages.forEach((message: any) => {
      if (Array.isArray(message.content)) {
        message.content.forEach((item: any) => {
          if (item.type === 'tool_use') {
            toolUseId = item.id;
          } else if (item.type === 'tool_result') {
            toolResultId = item.tool_use_id;
          }
        });
      }
    });

    // Verify IDs match
    expect(toolUseId).toBeDefined();
    expect(toolResultId).toBeDefined();
    expect(toolUseId).toBe(toolResultId);
    expect(toolUseId).toMatch(/^toolu_[A-Za-z0-9]{12}$/);
  });

  // Property-based test for tool ID generation
  it.prop([
    fc.array(
      fc.record({
        name: fc.string({ minLength: 3, maxLength: 12 }),
        args: fc.record({ query: fc.string() })
      }),
      { minLength: 1, maxLength: 5 }
    )
  ])('should handle any number of function calls with unique IDs', (functionCalls) => {
    const contents: Content[] = [
      {
        role: 'model',
        parts: functionCalls.map(fc => ({
          functionCall: fc
        }))
      }
    ];

    // This test verifies the structure - real implementation will make it pass
    return provider.generateChatCompletion(contents, [], {}).then((result) => {
      // Should not throw and should process all function calls
      expect(result).toBeDefined();
      expect(result.role).toBe('model');
    });
  });
});
```

#### 4. Content Conversion Tool ID Tests

**File**: `packages/core/src/providers/converters/AnthropicContentConverter.toolid.test.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P06
 * @requirement REQ-002.4
 * @test_behavior Content converter tool ID delegation and format compliance
 */

import { AnthropicContentConverter } from './AnthropicContentConverter';
import { Content } from '@google/generative-ai';
import { describe, it, expect, beforeEach } from 'vitest';

describe('Anthropic Content Converter Tool ID Handling', () => {
  let converter: AnthropicContentConverter;
  
  beforeEach(() => {
    converter = new AnthropicContentConverter();
  });

  /**
   * @requirement REQ-002.4
   * @scenario Tool ID generation delegated to provider
   * @given Content with function calls
   * @when converted by converter
   * @then Tool IDs are left empty for provider to fill
   */
  it('should delegate tool ID generation to provider', () => {
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

    // Converter should create structure but leave ID empty
    expect(toolUse.type).toBe('tool_use');
    expect(toolUse.name).toBe('search');
    expect(toolUse.input).toEqual({ query: 'test' });
    expect(toolUse.id).toBe(''); // Empty - provider will fill this
  });

  /**
   * @requirement REQ-002.4
   * @scenario Tool result ID delegation
   * @given Content with function response
   * @when converted by converter
   * @then tool_use_id is left empty for provider to match
   */
  it('should delegate tool result ID matching to provider', () => {
    const contents: Content[] = [
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: 'search',
              response: { results: ['item1', 'item2'] }
            }
          }
        ]
      }
    ];

    const result = converter.toProviderFormat(contents);
    const toolResult = result[0].content[0];

    // Converter should create structure but leave tool_use_id empty
    expect(toolResult.type).toBe('tool_result');
    expect(toolResult.content).toBe(JSON.stringify({ results: ['item1', 'item2'] }));
    expect(toolResult.tool_use_id).toBe(''); // Empty - provider will match this
  });

  /**
   * @requirement REQ-002.4
   * @scenario Multiple tool calls with empty IDs
   * @given Content with multiple function calls
   * @when converted by converter
   * @then All tool_use entries have empty IDs for provider to fill
   */
  it('should leave all tool IDs empty for provider to assign uniquely', () => {
    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: 'function1',
              args: { param: 'value1' }
            }
          },
          {
            functionCall: {
              name: 'function2', 
              args: { param: 'value2' }
            }
          }
        ]
      }
    ];

    const result = converter.toProviderFormat(contents);
    const toolUses = result[0].content;

    expect(toolUses).toHaveLength(2);
    toolUses.forEach((toolUse: any) => {
      expect(toolUse.type).toBe('tool_use');
      expect(toolUse.id).toBe(''); // All empty for provider assignment
    });
  });

  /**
   * @requirement REQ-002.4
   * @scenario Mixed content with tool calls
   * @given Content with text and function calls
   * @when converted by converter
   * @then Tool calls have empty IDs, text content unchanged
   */
  it('should handle mixed content types with proper tool ID delegation', () => {
    const contents: Content[] = [
      {
        role: 'model',
        parts: [
          { text: 'I\'ll help you with that.' },
          {
            functionCall: {
              name: 'helper',
              args: { task: 'assist' }
            }
          },
          { text: 'Processing your request...' }
        ]
      }
    ];

    const result = converter.toProviderFormat(contents);
    const content = result[0].content;

    expect(content).toHaveLength(3);
    expect(content[0]).toEqual({ type: 'text', text: 'I\'ll help you with that.' });
    expect(content[1]).toEqual({
      type: 'tool_use',
      id: '', // Empty for provider
      name: 'helper',
      input: { task: 'assist' }
    });
    expect(content[2]).toEqual({ type: 'text', text: 'Processing your request...' });
  });

  /**
   * @requirement REQ-002.4
   * @scenario Converter no longer generates IDs
   * @given Any content requiring tool IDs
   * @when processed by converter
   * @then Converter does not attempt to generate any IDs
   */
  it('should not generate any tool IDs internally', () => {
    const contents: Content[] = [
      {
        role: 'model',
        parts: Array.from({ length: 10 }, (_, i) => ({
          functionCall: {
            name: `function${i}`,
            args: { index: i }
          }
        }))
      }
    ];

    const result = converter.toProviderFormat(contents);
    const toolUses = result[0].content;

    // Verify no IDs generated by converter
    toolUses.forEach((toolUse: any, index: number) => {
      expect(toolUse.type).toBe('tool_use');
      expect(toolUse.name).toBe(`function${index}`);
      expect(toolUse.id).toBe(''); // Always empty
    });

    // Verify all IDs are exactly the same empty string (not unique)
    const allIds = toolUses.map((tool: any) => tool.id);
    expect(new Set(allIds).size).toBe(1); // All the same (empty)
    expect(allIds[0]).toBe('');
  });
});
```

### Required Test Markers

Every test MUST include detailed behavioral annotations:

```typescript
/**
 * @requirement REQ-002.X
 * @scenario [Clear description of what should happen]
 * @given [Input conditions]
 * @when [Action taken] 
 * @then [Expected outcome]
 * @and [Additional expectations]
 */
```

### Test Quality Requirements

1. **NO Testing Empty Strings**: Tests must expect realistic tool IDs, not stub behavior
2. **Real ID Patterns**: Tests must validate actual Anthropic toolu_xxxxx format
3. **ID Uniqueness**: Tests must verify different tool calls get different IDs
4. **Matching Logic**: Tests must verify tool_use and tool_result IDs match correctly
5. **Property-Based Testing**: 30% of tests use property-based testing for edge cases
6. **Conversation Flow**: Tests must validate tool IDs work across multi-turn conversations

## Verification Commands

### Automated Checks

```bash
# Verify TDD test files created
find packages/core/src/providers -name "*.toolid.test.ts" -o -name "ToolIdConfig.test.ts" | wc -l
# Expected: 4 files

# Check test behavior annotations
grep -r "@scenario\|@given\|@when\|@then" packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l
# Expected: 40+ behavioral annotations

# Verify property-based tests
grep -r "it\.prop\|fc\." packages/core/src/providers/*toolid*.test.ts packages/core/src/providers/types/ToolIdConfig.test.ts | wc -l
# Expected: 8+ property-based tests (30% minimum)

# Verify realistic ID pattern testing
grep -r "toolu_.*\[A-Za-z0-9\]" packages/core/src/providers/*toolid*.test.ts | wc -l
# Expected: 10+ tests validating realistic Anthropic ID patterns

# Verify tests will fail with stubs
npm test -- --grep "tool.*id|Tool.*Id" --reporter verbose
# Expected: Most tests should fail with stub implementations
```

## Success Criteria

- **4 new test files created** with comprehensive tool ID behavior tests
- **40+ test scenarios** covering all tool ID generation and matching requirements  
- **30%+ property-based tests** for edge case coverage
- **Realistic ID validation** - tests expect toolu_xxxxx patterns, not empty strings
- **Conversation flow testing** - tests verify tool ID matching across conversation turns
- **Tests fail naturally** with stub implementations (proving they test real behavior)
- **All requirements covered** - REQ-002.1 through REQ-002.5 have comprehensive test coverage

These tests will drive the correct implementation in Phase 07 and ensure Anthropic tool calls work properly with unique, matching IDs throughout conversation flows.