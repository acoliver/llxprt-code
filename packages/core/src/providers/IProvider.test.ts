/**
 * Copyright 2025 Vybestack LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, it, expect } from 'vitest';
import { Content } from '@google/genai';
import fc from 'fast-check';
import { IProvider, ITool, IModel } from './IProvider.js';

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
    const contents: Content[] = [{ role: 'user', parts: [{ text: 'Hello' }] }];

    // Should compile and run without errors
    const generator = provider.generateChatCompletion(
      contents,
      undefined,
      undefined,
      'test-session-123',
    );

    const results = [];
    for await (const content of generator) {
      results.push(content);
    }

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    // Verify sessionId is processed in the response
    expect(results[0].parts[0].text).toContain('test-session-123');
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
    const contents: Content[] = [{ role: 'user', parts: [{ text: 'Hello' }] }];

    // Old signature still works
    const generator = provider.generateChatCompletion(contents);

    const results = [];
    for await (const content of generator) {
      results.push(content);
    }

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    // Should indicate no session when none provided
    expect(results[0].parts[0].text).toContain('none');
  });

  /**
   * @requirement REQ-001.1
   * @scenario Type safety with sessionId
   * @given TypeScript strict mode
   * @when Valid string passed for sessionId
   * @then Method executes successfully
   */
  it('should enforce type safety for sessionId parameter', async () => {
    const provider = new TestProvider();
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Type test' }] },
    ];

    // This test verifies TypeScript would catch wrong types
    // In actual test, we verify the correct type works
    const generator = provider.generateChatCompletion(
      contents,
      undefined,
      undefined,
      'valid-string-session',
    );

    const results = [];
    for await (const content of generator) {
      results.push(content);
    }

    expect(results).toBeDefined();
    expect(results[0].parts[0].text).toContain('valid-string-session');
    // TypeScript would prevent: sessionId: 123 (number)
  });

  /**
   * @requirement REQ-001.1
   * @scenario Property-based testing for sessionId values
   * @given Various valid string sessionId values
   * @when generateChatCompletion is called with any string sessionId
   * @then The method processes all valid string values correctly
   */
  it('handles any valid sessionId string', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (sessionId) => {
        const provider = new TestProvider();
        const contents: Content[] = [
          { role: 'user', parts: [{ text: 'Property test' }] },
        ];

        const generator = provider.generateChatCompletion(
          contents,
          undefined,
          undefined,
          sessionId,
        );

        const results = [];
        for await (const content of generator) {
          results.push(content);
        }

        expect(results).toBeDefined();
        expect(results.length).toBeGreaterThan(0);
        // Verify sessionId flows through correctly - handle empty string case
        const expectedText = `Response with session: ${sessionId}`;
        expect(results[0].parts[0].text).toBe(expectedText);
      }),
    );
  });

  /**
   * @requirement REQ-001.1
   * @scenario Empty string sessionId handling
   * @given An empty string as sessionId
   * @when generateChatCompletion is called
   * @then The method handles empty string gracefully
   */
  it('should handle empty string sessionId', async () => {
    const provider = new TestProvider();
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Empty test' }] },
    ];

    const generator = provider.generateChatCompletion(
      contents,
      undefined,
      undefined,
      '',
    );

    const results = [];
    for await (const content of generator) {
      results.push(content);
    }

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    // Empty string should be handled as a valid sessionId
    expect(results[0].parts[0].text).toBe('Response with session: ');
  });

  /**
   * @requirement REQ-001.1
   * @scenario SessionId with special characters
   * @given SessionId containing UUID-like format with hyphens
   * @when generateChatCompletion is called
   * @then Special characters in sessionId are preserved
   */
  it('should preserve special characters in sessionId', async () => {
    const provider = new TestProvider();
    const contents: Content[] = [
      { role: 'user', parts: [{ text: 'Special chars test' }] },
    ];
    const sessionIdWithSpecialChars = 'session-123-abc_def.test@example.com';

    const generator = provider.generateChatCompletion(
      contents,
      undefined,
      undefined,
      sessionIdWithSpecialChars,
    );

    const results = [];
    for await (const content of generator) {
      results.push(content);
    }

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].parts[0].text).toContain(sessionIdWithSpecialChars);
  });

  /**
   * @requirement REQ-001.1
   * @scenario Property-based testing for Content array variations
   * @given Various combinations of roles and text parts
   * @when generateChatCompletion is called with different content arrays
   * @then The method handles all valid content combinations correctly
   */
  it('handles various content array combinations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            role: fc.constantFrom('user', 'model', 'system'),
            parts: fc.array(
              fc.record({
                text: fc.string({ minLength: 1, maxLength: 100 }),
              }),
              { minLength: 1, maxLength: 3 },
            ),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        fc.option(fc.string(), { nil: undefined }),
        async (contents, sessionId) => {
          const provider = new TestProvider();

          const generator = provider.generateChatCompletion(
            contents,
            undefined,
            undefined,
            sessionId,
          );

          const results = [];
          for await (const content of generator) {
            results.push(content);
          }

          expect(results).toBeDefined();
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].role).toBe('model');
          expect(results[0].parts).toBeDefined();
          expect(results[0].parts.length).toBeGreaterThan(0);

          // Verify sessionId handling
          const expectedSessionValue =
            sessionId !== undefined ? sessionId : 'none';
          expect(results[0].parts[0].text).toBe(
            `Response with session: ${expectedSessionValue}`,
          );
        },
      ),
    );
  });

  /**
   * @requirement REQ-001.1
   * @scenario Property-based testing for tool parameter combinations
   * @given Various tool configurations with different parameters
   * @when generateChatCompletion is called with different tool arrays
   * @then The method handles all valid tool combinations correctly
   */
  it('handles various tool parameter combinations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              description: fc.string({ minLength: 0, maxLength: 200 }),
              parametersJsonSchema: fc.option(fc.object(), { nil: undefined }),
            }),
            { minLength: 0, maxLength: 3 },
          ),
          { nil: undefined },
        ),
        fc.option(fc.string(), { nil: undefined }),
        fc.option(fc.string(), { nil: undefined }),
        async (tools, toolFormat, sessionId) => {
          const provider = new TestProvider();
          const contents: Content[] = [
            { role: 'user', parts: [{ text: 'Tool test' }] },
          ];

          const generator = provider.generateChatCompletion(
            contents,
            tools,
            toolFormat,
            sessionId,
          );

          const results = [];
          for await (const content of generator) {
            results.push(content);
          }

          expect(results).toBeDefined();
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].role).toBe('model');
          expect(results[0].parts).toBeDefined();
          expect(results[0].parts.length).toBeGreaterThan(0);

          // Verify response format regardless of tool parameters
          const expectedSessionValue =
            sessionId !== undefined ? sessionId : 'none';
          expect(results[0].parts[0].text).toBe(
            `Response with session: ${expectedSessionValue}`,
          );
        },
      ),
    );
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
    sessionId?: string,
  ): AsyncIterableIterator<Content> {
    // Return test content that demonstrates sessionId flow
    // Use explicit undefined check to distinguish between undefined and empty string
    const sessionValue = sessionId !== undefined ? sessionId : 'none';
    yield {
      role: 'model',
      parts: [{ text: `Response with session: ${sessionValue}` }],
    };
  }

  // Other required IProvider methods
  async getModels(): Promise<IModel[]> {
    return [{ id: 'test-model', name: 'Test Model' }];
  }

  getDefaultModel(): string {
    return 'test-model';
  }

  getServerTools(): string[] {
    return [];
  }

  async invokeServerTool(
    toolName: string,
    params: unknown,
    _config?: unknown,
  ): Promise<unknown> {
    return {
      result: `Tool ${toolName} invoked with params: ${JSON.stringify(params)}`,
    };
  }
}
