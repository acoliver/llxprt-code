# Phase 04: Content Converter Interface TDD

## Phase ID
`PLAN-20250113-SIMPLIFICATION.P04`

## Prerequisites
- Required: Phase 03 completed
- Verification: `grep -r "@plan:PLAN-20250113-SIMPLIFICATION.P03" .`

## Implementation Tasks

### Files to Create

- `packages/core/src/providers/converters/converters.test.ts`
  ```typescript
  /**
   * @plan PLAN-20250113-SIMPLIFICATION.P04
   * @requirement REQ-002
   */
  import { describe, it, expect } from 'vitest';
  import { Content } from '@google/genai';
  import { OpenAIContentConverter } from './OpenAIContentConverter.js';
  import { AnthropicContentConverter } from './AnthropicContentConverter.js';

  describe('OpenAIContentConverter', () => {
    const converter = new OpenAIContentConverter();

    /**
     * @requirement REQ-002.2
     * @scenario Convert simple text message
     * @given Content with user text
     * @when toProviderFormat() is called
     * @then Returns OpenAI message with user role and content
     */
    it('should convert user text message to OpenAI format', () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Hello' }] }
      ];
      
      const result = converter.toProviderFormat(contents);
      
      expect(result).toEqual([
        { role: 'user', content: 'Hello' }
      ]);
    });

    /**
     * @requirement REQ-002.4
     * @scenario Convert tool call
     * @given Content with function call
     * @when toProviderFormat() is called  
     * @then Returns OpenAI message with tool_calls
     */
    it('should convert function calls to OpenAI tool calls', () => {
      const contents: Content[] = [
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
      
      const result = converter.toProviderFormat(contents);
      
      expect(result).toEqual([
        {
          role: 'assistant',
          content: 'I will search for that',
          tool_calls: [
            {
              id: expect.any(String),
              type: 'function',
              function: {
                name: 'search',
                arguments: '{"query":"test"}'
              }
            }
          ]
        }
      ]);
    });

    /**
     * @requirement REQ-002.4
     * @scenario Convert tool response
     * @given Content with function response
     * @when toProviderFormat() is called
     * @then Returns OpenAI tool message
     */
    it('should convert function responses to OpenAI tool messages', () => {
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
      
      expect(result).toEqual([
        {
          role: 'tool',
          content: '{"results":["item1","item2"]}',
          tool_call_id: expect.any(String)
        }
      ]);
    });

    /**
     * @requirement REQ-002.2
     * @scenario Convert response back to Content
     * @given OpenAI response with text
     * @when fromProviderFormat() is called
     * @then Returns Content with model role
     */
    it('should convert OpenAI response to Content', () => {
      const response = {
        choices: [{
          message: {
            role: 'assistant',
            content: 'Here is my response'
          }
        }]
      };
      
      const result = converter.fromProviderFormat(response);
      
      expect(result).toEqual({
        role: 'model',
        parts: [{ text: 'Here is my response' }]
      });
    });
  });

  describe('AnthropicContentConverter', () => {
    const converter = new AnthropicContentConverter();

    /**
     * @requirement REQ-002.3
     * @scenario Convert simple text message
     * @given Content with user text
     * @when toProviderFormat() is called
     * @then Returns Anthropic message format
     */
    it('should convert user text to Anthropic format', () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'Hello Claude' }] }
      ];
      
      const result = converter.toProviderFormat(contents);
      
      expect(result).toEqual([
        { role: 'user', content: 'Hello Claude' }
      ]);
    });

    /**
     * @requirement REQ-002.3
     * @scenario Merge consecutive same-role messages
     * @given Multiple Contents with same role
     * @when toProviderFormat() is called
     * @then Returns single merged message
     */
    it('should merge consecutive messages with same role', () => {
      const contents: Content[] = [
        { role: 'user', parts: [{ text: 'First part' }] },
        { role: 'user', parts: [{ text: 'Second part' }] }
      ];
      
      const result = converter.toProviderFormat(contents);
      
      expect(result).toEqual([
        { role: 'user', content: 'First partSecond part' }
      ]);
    });
  });
  ```

## Verification Commands

```bash
# Run tests (should fail with stub implementations)
npm test packages/core/src/providers/converters/
# Expected: Tests exist but fail naturally

# Check for behavioral assertions
grep -E "toBe\(|toEqual\(" packages/core/src/providers/converters/converters.test.ts
# Expected: Multiple occurrences

# Check no reverse testing
grep "NotYetImplemented" packages/core/src/providers/converters/converters.test.ts
# Expected: No output
```

## Success Criteria
- Tests created for both converters
- Tests expect real behavior (format conversion)
- Tests fail naturally with stub implementations
- No mock-only or structure-only tests