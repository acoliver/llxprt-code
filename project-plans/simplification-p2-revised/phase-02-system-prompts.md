# Phase 2: System Prompt Architecture

## Objective
Fix system prompts being incorrectly passed as Content with role='system'.

## Current Problem
- System instructions from core.md are being injected as Content with `role: 'system'`
- Gemini's Content type only supports `role: 'user' | 'model'`
- Causes "Content with system role is not supported" errors

## Solution Architecture

### 1. Extract System Prompts in GeminiCompatibleWrapper

**File**: `packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts`

**Around lines 284-322**, modify to:
```typescript
async generateContent(request: GenerateContentRequest): Promise<Content> {
  // Extract system instructions from Content array
  const systemContents = request.contents.filter(c => c.role === 'system');
  const conversationContents = request.contents.filter(c => c.role !== 'system');
  
  // Combine system instructions
  const systemInstruction = systemContents
    .flatMap(c => c.parts)
    .filter(p => 'text' in p)
    .map(p => p.text)
    .join('\n');
  
  // Add to config if not already present
  const config = {
    ...request.config,
    systemInstruction: request.config.systemInstruction || systemInstruction
  };
  
  // Pass clean contents to provider
  return this.provider.generateChatCompletion(
    conversationContents,
    request.tools,
    config
  );
}
```

### 2. Update Each Provider's Handling

#### GeminiProvider
Already supports `systemInstruction` parameter natively.
No changes needed.

#### OpenAIProvider
**File**: `packages/core/src/providers/openai/OpenAIProvider.ts`

Modify to handle systemInstruction in config:
```typescript
async generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  options?: { systemInstruction?: string }
): AsyncIterableIterator<Content> {
  // Convert to OpenAI format
  const messages = this.converter.toProviderFormat(contents);
  
  // Add system message if present
  if (options?.systemInstruction) {
    messages.unshift({
      role: 'system',
      content: options.systemInstruction
    });
  }
  
  // Continue with existing logic...
}
```

#### AnthropicProvider
**File**: `packages/core/src/providers/anthropic/AnthropicProvider.ts`

Handle both API and OAuth modes:
```typescript
async generateChatCompletion(
  contents: Content[],
  tools?: ITool[],
  options?: { systemInstruction?: string }
): AsyncIterableIterator<Content> {
  const isOAuth = this.apiKey.startsWith('sk-ant-oat');
  
  if (isOAuth && options?.systemInstruction) {
    // OAuth mode: inject into first user message
    const modifiedContents = [...contents];
    const firstUserIdx = modifiedContents.findIndex(c => c.role === 'user');
    if (firstUserIdx >= 0) {
      const original = modifiedContents[firstUserIdx];
      modifiedContents[firstUserIdx] = {
        ...original,
        parts: [{
          text: `${options.systemInstruction}\n\n---\n\n${original.parts[0].text}`
        }]
      };
    }
    // Use modified contents
    contents = modifiedContents;
  }
  
  // API mode: pass as system parameter
  const apiOptions = !isOAuth && options?.systemInstruction
    ? { system: options.systemInstruction }
    : {};
  
  // Continue with existing logic...
}
```

### 3. Remove Invalid Tests

Remove tests that expect Content with role='system' to be valid:
- `packages/core/src/providers/converters/SystemMessageHandling.test.ts`
- Tests validating system role in Content[]

### 4. Add New Tests

Create tests that verify:
- System prompts are extracted from Content[]
- System prompts are passed as configuration
- Each provider handles system prompts correctly
- No Content with role='system' reaches providers

## Success Criteria

- ✅ No "Content with system role is not supported" errors
- ✅ System prompts work for all providers
- ✅ OAuth mode handles system prompts correctly
- ✅ core.md contents properly injected
- ✅ Tests validate correct behavior

## Estimated Time: 1 day