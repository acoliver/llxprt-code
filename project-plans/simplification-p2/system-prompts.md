# System Prompt Injection Analysis

## Current Behavior (INCORRECT)

### Problem Summary
**Root Cause**: System instructions from core.md and other prompts are being injected as Content with `role: 'system'` instead of being passed as configuration parameters to each provider's native API.

### Current Injection Points and Flow

#### 1. Prompt Loading
- **Source**: `/packages/core/src/prompt-config/defaults/core-defaults.ts`
  - Loads `core.md` and other prompt files using `loadMarkdownFile()`
  - Creates `CORE_DEFAULTS` object with prompt content as strings
- **Content**: System instructions like "You are an interactive CLI agent specializing in software engineering tasks..."

#### 2. Prompt Service Integration
- **Source**: `/packages/core/src/core/prompts.ts`
  - Uses `PromptService` singleton to load and resolve prompts
  - Builds `PromptContext` from environment, model, tools, provider
  - Combines multiple prompt sources (core.md, environment-specific, tool-specific)

#### 3. System Message Creation (WRONG)
- **Source**: `/packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts` (lines 284-322)
  - Extracts system messages from `contents` array where `c.role === 'system'`
  - Also extracts from `params.config?.systemInstruction`
  - **Problem**: System prompts are being converted to Content format with `role: 'system'`

#### 4. Provider-Specific Handling (INCONSISTENT)

**GeminiCompatibleWrapper** (lines 312-322):
```typescript
// Handle system messages - NO provider supports system role in Content[]
if (systemMessages.length > 0) {
  // Remove system messages from contents for ALL providers
  contents = contents.filter(c => c.role !== 'system');
  
  // System messages will be handled by each provider's converter or passed separately
  // - Gemini: via systemInstruction parameter in the request
  // - OpenAI: converter will add as system message
  // - Anthropic: converter will handle as system parameter
}
```

**AnthropicProvider** (lines around 240-260):
```typescript
const systemMessage = this.extractSystemMessage(contents);
let finalMessages = anthropicMessages;

if (isOAuth && systemMessage && anthropicMessages.length === 0) {
  // In OAuth mode, inject system prompts as conversation content for first message
  const contextMessage = `Important context for using llxprt tools: ...`
}
```

## Why Current Approach is Wrong

### 1. API Incompatibility
- **Gemini API**: Expects system instructions via `systemInstruction` parameter, NOT as Content with `role: 'system'`
- **OpenAI API**: Supports `{role: 'system', content: '...'}` in messages array
- **Anthropic API**: Uses separate `system` parameter, NOT in messages array

### 2. OAuth Mode Issues
- **Anthropic OAuth**: Cannot use `system` parameter, requires injection as user message
- **Current hack**: Hard-coded injection in AnthropicProvider for OAuth mode only
- **Problem**: System prompts should be configuration, not conversation content

### 3. Content vs Configuration Confusion
- **Current**: System prompts treated as conversation Content
- **Correct**: System prompts are provider configuration, not messages
- **Impact**: Inconsistent behavior across providers and auth modes

### 4. Conversion Point Issues
- **Current**: System prompts converted to Content format too early (in prompt loading)
- **Correct**: Should remain as configuration until provider-specific conversion
- **Problem**: Loses distinction between system configuration and conversation messages

## Correct Architecture

### 1. System Prompts as Configuration
System prompts should be:
- Loaded as strings (current approach is correct here)
- Kept as configuration parameters, NOT converted to Content format
- Passed to providers as separate configuration, not in contents array

### 2. Provider-Specific Conversion
Each provider should handle system prompts in their native format:

**Gemini**:
```typescript
const requestParams: GenerateContentParameters = {
  model: modelToUse,
  contents: contents, // NO system messages here
  config: {
    ...otherConfig,
    systemInstruction: combinedSystemPrompts // HERE
  }
}
```

**OpenAI**:
```typescript
const messages = [
  { role: 'system', content: combinedSystemPrompts }, // HERE
  ...convertedContents
];
```

**Anthropic** (API Key):
```typescript
const requestParams = {
  model: modelToUse,
  system: combinedSystemPrompts, // HERE
  messages: convertedContents // NO system messages here
};
```

**Anthropic OAuth** (Special Case):
```typescript
// Only for OAuth mode - inject as first user message
const messages = [
  { role: 'user', content: `${combinedSystemPrompts}\n\n---\n\n${firstUserMessage}` },
  ...restOfMessages
];
```

### 3. New Flow Architecture

```
1. Prompt Loading (KEEP CURRENT)
   ├── core.md → string
   ├── environment prompts → strings
   └── tool prompts → strings

2. Prompt Resolution (KEEP CURRENT)
   ├── Combine prompts based on context
   └── Return: { systemPrompts: string, ...otherConfig }

3. Content Generation Request (CHANGE HERE)
   ├── Pass systemPrompts as config parameter
   ├── Pass contents WITHOUT system messages
   └── Let each provider handle system prompts natively

4. Provider Implementation (CHANGE HERE)
   ├── Gemini: use systemInstruction parameter
   ├── OpenAI: prepend system message to messages
   ├── Anthropic API: use system parameter  
   └── Anthropic OAuth: inject as first user message
```

## Special Handling for OAuth Mode

### Problem
Anthropic in OAuth mode cannot use the `system` parameter - this is an API limitation, not our bug.

### Solution
Only for Anthropic + OAuth:
1. Detect OAuth mode: `authToken.startsWith('sk-ant-oat')`
2. Inject system prompts as conversation content in first user message
3. All other providers use their native system prompt mechanisms

### Implementation
```typescript
// In AnthropicProvider.generateChatCompletion()
if (isOAuthMode && systemPrompts) {
  // Special handling: inject into conversation
  if (contents[0]?.role === 'user') {
    contents[0].parts[0].text = `${systemPrompts}\n\n---\n\n${contents[0].parts[0].text}`;
  }
} else {
  // Normal API mode: use system parameter
  requestParams.system = systemPrompts;
}
```

## Tests Needed (TDD Approach)

### Tests That Should Initially FAIL
These tests will prove the current behavior is wrong:

1. **Test: Gemini systemInstruction parameter**
```typescript
it('should pass system prompts via systemInstruction parameter, not in contents', async () => {
  const mockProvider = new MockGeminiProvider();
  const wrapper = new GeminiCompatibleWrapper(mockProvider);
  
  await wrapper.generateContent({
    model: 'gemini-pro',
    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
    config: { systemInstruction: 'You are helpful' }
  });
  
  // Should NOT have system message in contents
  expect(mockProvider.lastRequest.contents).not.toContainEqual(
    expect.objectContaining({ role: 'system' })
  );
  
  // Should have systemInstruction in config
  expect(mockProvider.lastRequest.config?.systemInstruction).toBe('You are helpful');
});
```

2. **Test: OpenAI system message format**
```typescript
it('should convert system prompts to OpenAI system message format', async () => {
  const provider = new OpenAIProvider('test-key');
  const systemPrompts = 'You are helpful';
  
  const result = await provider.convertSystemPrompts(systemPrompts, contents);
  
  // Should have system message as first message
  expect(result.messages[0]).toEqual({
    role: 'system',
    content: 'You are helpful'
  });
});
```

3. **Test: Anthropic API system parameter**
```typescript
it('should use system parameter for Anthropic API mode', async () => {
  const provider = new AnthropicProvider('sk-ant-api-key');
  const systemPrompts = 'You are helpful';
  
  const requestParams = provider.buildRequestParams(contents, systemPrompts);
  
  expect(requestParams.system).toBe('You are helpful');
  expect(requestParams.messages).not.toContainEqual(
    expect.objectContaining({ role: 'system' })
  );
});
```

4. **Test: Anthropic OAuth injection**
```typescript
it('should inject system prompts into conversation for Anthropic OAuth', async () => {
  const provider = new AnthropicProvider('sk-ant-oat-oauth-token');
  const systemPrompts = 'You are helpful';
  const contents = [{ role: 'user', parts: [{ text: 'Hello' }] }];
  
  const result = provider.handleOAuthSystemPrompts(contents, systemPrompts);
  
  // Should inject into first user message
  expect(result[0].parts[0].text).toContain('You are helpful');
  expect(result[0].parts[0].text).toContain('Hello');
  expect(result[0].parts[0].text).toContain('---'); // Separator
});
```

### Tests That Should PASS After Fixing

1. **Test: No system role in Content arrays**
```typescript
it('should never have system role in Content arrays sent to providers', async () => {
  // Test all providers
  const providers = [geminiProvider, openaiProvider, anthropicProvider];
  
  for (const provider of providers) {
    const contents = await provider.generateChatCompletion(testContents);
    contents.forEach(content => {
      expect(content.role).not.toBe('system');
    });
  }
});
```

2. **Test: System prompts handled by provider configuration**
```typescript
it('should handle system prompts through provider-specific configuration', async () => {
  const systemPrompts = 'You are helpful';
  
  // Each provider should handle system prompts in their native way
  expect(geminiProvider.supportsSystemInstruction()).toBe(true);
  expect(openaiProvider.supportsSystemMessage()).toBe(true);
  expect(anthropicProvider.supportsSystemParameter()).toBe(true);
});
```

## Files to Modify

### High Priority
1. `/packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts`
   - Remove system message handling logic (lines 284-322)
   - Pass system prompts as configuration to providers

2. `/packages/core/src/providers/gemini/GeminiProvider.ts`
   - Add system prompt handling via systemInstruction parameter

3. `/packages/core/src/providers/openai/OpenAIProvider.ts`
   - Add system prompt to messages array conversion

4. `/packages/core/src/providers/anthropic/AnthropicProvider.ts`
   - Fix system parameter vs OAuth injection logic

### Medium Priority
5. `/packages/core/src/core/prompts.ts`
   - Ensure prompts are returned as configuration, not Content

6. `/packages/core/src/providers/converters/`
   - Remove system message conversion from content converters
   - System prompts should be handled at provider level, not converter level

## Implementation Strategy

1. **Phase 1**: Write failing tests that demonstrate correct behavior
2. **Phase 2**: Refactor GeminiCompatibleWrapper to pass system prompts as config
3. **Phase 3**: Update each provider to handle system prompts natively
4. **Phase 4**: Add special OAuth handling for Anthropic
5. **Phase 5**: Remove system message handling from content converters
6. **Phase 6**: Verify all tests pass and behavior is consistent

## Success Criteria

- [ ] No Content objects with `role: 'system'` in provider API calls
- [ ] Gemini uses `systemInstruction` parameter
- [ ] OpenAI uses system messages in messages array
- [ ] Anthropic API uses `system` parameter
- [ ] Anthropic OAuth injects into conversation appropriately
- [ ] All tests pass
- [ ] Consistent behavior across all providers and auth modes