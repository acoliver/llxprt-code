# Phase 04: System Prompt Implementation Phase

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P04`

## Prerequisites
- Required: Phase 03a completed
- Verification: All TDD tests failing appropriately with stub implementations  
- Expected: Comprehensive behavioral tests that define exact implementation requirements

## Implementation Tasks

### Goal
Implement complete system prompt handling to make ALL TDD tests pass. Replace stub implementations with fully functional code that properly separates system instructions from Content[] messages and handles each provider's native format.

### Implementation Approach
1. **Follow TDD tests exactly** - implement only what tests specify
2. **Make tests pass one by one** - incremental implementation
3. **Update existing files** - no new file creation, only modification
4. **Reference test requirements** - every implementation references specific test cases
5. **Preserve existing functionality** - don't break non-system-prompt features

### Files to Modify

#### 1. Update SystemPromptConfig Implementation

**File**: `packages/core/src/providers/types/SystemPromptConfig.ts`

**Replace stub with full implementation**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P04
 * @requirement REQ-001.1
 * @implements Full system prompt extraction and validation
 * @test_driven GeminiCompatibleWrapper.system.test.ts lines 45-87
 */

import { Content } from '@google/generative-ai';

export interface SystemPromptConfig {
  /** Raw system instruction text */
  systemInstruction: string;
  
  /** Whether provider supports native system instructions */
  supportsNativeSystemInstructions: boolean;
  
  /** Whether OAuth mode requires injection */
  requiresOAuthInjection: boolean;
}

export interface SystemPromptCapabilities {
  /** Provider supports separate system parameter */
  systemParameter: boolean;
  
  /** Provider supports system messages in conversation */
  systemMessages: boolean;
  
  /** OAuth mode needs conversation injection */
  oauthInjection: boolean;
}

/** 
 * Extract system prompt from various sources
 * @test_driven GeminiCompatibleWrapper.system.test.ts "should extract system instructions"
 */
export function extractSystemPrompt(sources: {
  config?: { systemInstruction?: string };
  contents?: Content[];
}): string {
  // Priority: config.systemInstruction takes precedence
  if (sources.config?.systemInstruction) {
    return sources.config.systemInstruction;
  }
  
  // Extract from Content[] system messages
  if (sources.contents) {
    const systemContents = sources.contents
      .filter(content => content.role === 'system')
      .flatMap(content => content.parts)
      .filter(part => 'text' in part)
      .map(part => part.text)
      .join('');
      
    return systemContents;
  }
  
  return '';
}

/** 
 * Validate system prompt format
 * @test_driven GeminiCompatibleWrapper.system.test.ts "should validate system Content"
 */
export function validateSystemPrompt(prompt: string): void {
  // Basic validation - empty strings are allowed
  if (typeof prompt !== 'string') {
    throw new Error('System prompt must be a string');
  }
  // Additional validation can be added here
}

/**
 * Validate system Content can only contain text parts
 * @test_driven GeminiCompatibleWrapper.system.test.ts "should validate system Content can only contain text parts"
 */
export function validateSystemContent(content: Content): void {
  if (content.role !== 'system') {
    return; // Only validate system Content
  }
  
  for (const part of content.parts) {
    if ('functionCall' in part) {
      throw new Error('System Content cannot contain function calls');
    }
    if ('functionResponse' in part) {
      throw new Error('System Content cannot contain function responses');
    }
    if (!('text' in part)) {
      throw new Error('System Content parts must contain text');
    }
  }
}

/**
 * Filter system Content from Content array
 * @test_driven GeminiCompatibleWrapper.system.test.ts "should never pass Content with system role"
 */
export function filterSystemContent(contents: Content[]): Content[] {
  // Validate each system Content before filtering
  contents.forEach(content => {
    if (content.role === 'system') {
      validateSystemContent(content);
    }
  });
  
  return contents.filter(content => content.role !== 'system');
}
```

#### 2. Update SystemPromptCapabilities Implementation

**File**: `packages/core/src/providers/capabilities/SystemPromptCapabilities.ts`

**Replace stub with full implementation**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P04
 * @requirement REQ-001.2
 * @implements Provider capability detection and auth mode detection
 * @test_driven AnthropicProvider.system.test.ts lines 180-195
 */

import { SystemPromptCapabilities } from '../types/SystemPromptConfig';

export function getSystemPromptCapabilities(provider: string, authToken?: string): SystemPromptCapabilities {
  switch (provider.toLowerCase()) {
    case 'gemini':
      return {
        systemParameter: true,
        systemMessages: false,
        oauthInjection: false
      };
    case 'openai':
      return {
        systemParameter: false,
        systemMessages: true,
        oauthInjection: false
      };
    case 'anthropic':
      const isOAuth = authToken ? detectAuthMode(authToken) === 'oauth' : false;
      return {
        systemParameter: !isOAuth,
        systemMessages: false,
        oauthInjection: isOAuth
      };
    default:
      return {
        systemParameter: false,
        systemMessages: false,
        oauthInjection: false
      };
  }
}

/**
 * Detect authentication mode from token format
 * @test_driven AnthropicProvider.system.test.ts "should correctly detect OAuth vs API mode"
 */
export function detectAuthMode(authToken: string): 'api' | 'oauth' | 'unknown' {
  if (!authToken || authToken.trim().length === 0) {
    return 'unknown';
  }
  
  if (authToken.startsWith('sk-ant-oat')) {
    return 'oauth';
  } else if (authToken.startsWith('sk-ant-api')) {
    return 'api';
  }
  
  return 'unknown';
}
```

#### 3. Update GeminiCompatibleWrapper System Handling

**File**: `packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts`

**Replace existing system handling (lines 284-322) with**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P04  
 * @requirement REQ-001.1
 * @implements Complete system instruction separation and delegation
 * @test_driven GeminiCompatibleWrapper.system.test.ts all test cases
 */

import { extractSystemPrompt, filterSystemContent, validateSystemContent } from '../types/SystemPromptConfig';

// Replace the existing handleSystemInstructions method
private handleSystemInstructions(
  contents: Content[], 
  config?: any
): { cleanContents: Content[], systemPrompt: string } {
  
  // Validate all system Content before processing
  contents.forEach(content => {
    if (content.role === 'system') {
      validateSystemContent(content);
    }
  });
  
  // Extract system prompt (config takes precedence)
  const systemPrompt = extractSystemPrompt({ 
    config, 
    contents 
  });
  
  // Remove system Content from conversation
  const cleanContents = filterSystemContent(contents);
  
  return { cleanContents, systemPrompt };
}

// Replace the existing generateContentWithSystemPrompt method
private async generateContentWithSystemPrompt(
  provider: any,
  cleanContents: Content[],
  systemPrompt: string,
  tools: ITool[],
  options: any
): Promise<Content> {
  
  // Pass system prompt via options for provider handling
  const enhancedOptions = {
    ...options,
    systemInstruction: systemPrompt
  };
  
  return provider.generateChatCompletion(cleanContents, tools, enhancedOptions);
}

// Update the main generateContent method to use new system handling
async generateContent(params: GenerateContentParameters): Promise<Content> {
  const { contents, tools = [], config, ...otherParams } = params;
  
  // Handle system instructions
  const { cleanContents, systemPrompt } = this.handleSystemInstructions(contents, config);
  
  // Generate with clean contents and system prompt as config
  return this.generateContentWithSystemPrompt(
    this.provider,
    cleanContents,
    systemPrompt,
    tools,
    otherParams
  );
}
```

#### 4. Update GeminiProvider System Implementation

**File**: `packages/core/src/providers/gemini/GeminiProvider.ts`

**Replace stub implementation with**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P04
 * @requirement REQ-001.2
 * @implements Gemini native systemInstruction parameter handling
 * @test_driven GeminiProvider.system.test.ts all test cases
 */

import { SystemPromptConfig } from '../types/SystemPromptConfig';

// Replace stub handleSystemInstruction method
private handleSystemInstruction(systemPrompt: string, requestParams: any): any {
  if (systemPrompt && systemPrompt.trim().length > 0) {
    // Add systemInstruction to request config
    if (!requestParams.config) {
      requestParams.config = {};
    }
    
    requestParams.config.systemInstruction = this.convertToGeminiSystemInstruction(systemPrompt);
  }
  return requestParams;
}

/**
 * Convert system prompt to Gemini systemInstruction format
 * @test_driven GeminiProvider.system.test.ts "should preserve system instruction structure"
 */
public convertToGeminiSystemInstruction(systemPrompt: string): { parts: { text: string }[] } {
  return {
    parts: [{ text: systemPrompt }]
  };
}

/**
 * Enhanced generateChatCompletion with system prompt support
 * @test_driven GeminiProvider.system.test.ts "should use systemInstruction parameter"
 */
public async generateChatCompletionWithSystemPrompt(
  contents: Content[],
  tools: ITool[],
  options: { systemInstruction?: string }
): Promise<Content> {
  
  let requestParams = {
    model: this.modelName,
    contents: contents,
    tools: tools.length > 0 ? tools : undefined,
    config: {}
  };
  
  // Handle system instruction if provided
  if (options.systemInstruction) {
    requestParams = this.handleSystemInstruction(options.systemInstruction, requestParams);
  }
  
  // Call Gemini API with systemInstruction in config
  const response = await this.geminiModel.generateContent(requestParams);
  
  // Convert response back to Content format
  return this.convertResponseToContent(response);
}

// Update main generateChatCompletion to support system prompts
async generateChatCompletion(
  contents: Content[], 
  tools: ITool[] = [], 
  options: any = {}
): Promise<Content> {
  
  if (options.systemInstruction) {
    return this.generateChatCompletionWithSystemPrompt(contents, tools, options);
  }
  
  // Existing implementation for non-system-prompt cases
  return this.generateChatCompletionOriginal(contents, tools, options);
}
```

#### 5. Update OpenAIProvider System Implementation

**File**: `packages/core/src/providers/openai/OpenAIProvider.ts`

**Replace stub implementation with**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P04
 * @requirement REQ-001.3
 * @implements OpenAI system message conversion and handling
 * @test_driven OpenAIProvider.system.test.ts all test cases
 */

import { SystemPromptConfig } from '../types/SystemPromptConfig';

// Replace stub addSystemMessage method
private addSystemMessage(systemPrompt: string, messages: any[]): any[] {
  if (!systemPrompt || systemPrompt.trim().length === 0) {
    return messages;
  }
  
  // Add system message at the beginning
  return [
    {
      role: 'system',
      content: systemPrompt
    },
    ...messages
  ];
}

/**
 * Convert Content[] to OpenAI messages with system message
 * @test_driven OpenAIProvider.system.test.ts "should convert system instruction to OpenAI system message format"
 */
public convertToOpenAIMessagesWithSystem(contents: Content[], systemPrompt: string): any[] {
  // Convert contents to OpenAI format first
  const baseMessages = this.converter.toProviderFormat(contents);
  
  // Add system message at the beginning
  return this.addSystemMessage(systemPrompt, baseMessages);
}

/**
 * Enhanced generateChatCompletion with system prompt support
 * @test_driven OpenAIProvider.system.test.ts all test cases
 */
public async generateChatCompletionWithSystemPrompt(
  contents: Content[],
  tools: ITool[],
  options: { systemInstruction?: string }
): Promise<Content> {
  
  // Convert to OpenAI format with system message
  const messages = options.systemInstruction 
    ? this.convertToOpenAIMessagesWithSystem(contents, options.systemInstruction)
    : this.converter.toProviderFormat(contents);
  
  const requestParams = {
    model: this.modelName,
    messages: messages,
    tools: tools.length > 0 ? this.formatToolsForOpenAI(tools) : undefined
  };
  
  // Call OpenAI API
  const response = await this.openai.chat.completions.create(requestParams);
  
  // Convert response back to Content format
  return this.converter.fromProviderFormat(response);
}

// Update main generateChatCompletion to support system prompts
async generateChatCompletion(
  contents: Content[], 
  tools: ITool[] = [], 
  options: any = {}
): Promise<Content> {
  
  if (options.systemInstruction) {
    return this.generateChatCompletionWithSystemPrompt(contents, tools, options);
  }
  
  // Existing implementation for non-system-prompt cases
  return this.generateChatCompletionOriginal(contents, tools, options);
}
```

#### 6. Update AnthropicProvider System Implementation

**File**: `packages/core/src/providers/anthropic/AnthropicProvider.ts`

**Replace stub implementation with**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P04
 * @requirement REQ-001.4
 * @implements Anthropic system parameter and OAuth injection handling
 * @test_driven AnthropicProvider.system.test.ts all test cases
 */

import { SystemPromptConfig } from '../types/SystemPromptConfig';
import { detectAuthMode } from '../capabilities/SystemPromptCapabilities';

// Replace stub handleSystemPrompt method
private handleSystemPrompt(systemPrompt: string, authToken: string, contents: Content[]): {
  requestParams: any;
  modifiedContents: Content[];
} {
  const authMode = this.detectAuthenticationMode(authToken);
  
  if (authMode === 'oauth' && systemPrompt && systemPrompt.trim().length > 0) {
    // OAuth mode: inject system prompt into first user message
    const modifiedContents = this.injectSystemPromptIntoConversation(contents, systemPrompt);
    return {
      requestParams: {},
      modifiedContents: modifiedContents
    };
  } else if (systemPrompt && systemPrompt.trim().length > 0) {
    // API mode: use system parameter
    return {
      requestParams: { system: systemPrompt },
      modifiedContents: contents
    };
  }
  
  return {
    requestParams: {},
    modifiedContents: contents
  };
}

/**
 * Detect authentication mode from token
 * @test_driven AnthropicProvider.system.test.ts "should correctly detect OAuth vs API mode"
 */
public detectAuthenticationMode(authToken: string): 'api' | 'oauth' | 'unknown' {
  return detectAuthMode(authToken);
}

/**
 * Inject system prompt into first user message for OAuth mode
 * @test_driven AnthropicProvider.system.test.ts "should inject system instruction into conversation for OAuth mode"
 */
private injectSystemPromptIntoConversation(contents: Content[], systemPrompt: string): Content[] {
  if (contents.length === 0) {
    return contents;
  }
  
  const modifiedContents = [...contents];
  
  // Find first user message and inject system prompt
  const firstUserIndex = modifiedContents.findIndex(c => c.role === 'user');
  if (firstUserIndex !== -1 && modifiedContents[firstUserIndex].parts.length > 0) {
    const firstUserMessage = modifiedContents[firstUserIndex];
    const firstPart = firstUserMessage.parts[0];
    
    if ('text' in firstPart) {
      // Inject system prompt with separator
      const injectedText = `${systemPrompt}\n\n---\n\n${firstPart.text}`;
      
      modifiedContents[firstUserIndex] = {
        ...firstUserMessage,
        parts: [
          { text: injectedText },
          ...firstUserMessage.parts.slice(1)
        ]
      };
    }
  }
  
  return modifiedContents;
}

/**
 * Process system instruction based on auth mode
 * @test_driven AnthropicProvider.system.test.ts property-based test
 */
public processSystemInstructionForMode(contents: Content[], systemPrompt: string): {
  messages: any[];
  systemParameter?: string;
} {
  const authMode = this.detectAuthenticationMode(this.authToken);
  const isOAuth = authMode === 'oauth';
  
  if (isOAuth && systemPrompt) {
    const modifiedContents = this.injectSystemPromptIntoConversation(contents, systemPrompt);
    const messages = this.converter.toProviderFormat(modifiedContents);
    return { messages };
  } else if (systemPrompt) {
    const messages = this.converter.toProviderFormat(contents);
    return { 
      messages, 
      systemParameter: systemPrompt 
    };
  }
  
  const messages = this.converter.toProviderFormat(contents);
  return { messages };
}

/**
 * Enhanced generateChatCompletion with system prompt support
 * @test_driven AnthropicProvider.system.test.ts "should use system parameter for API mode"
 */
public async generateChatCompletionWithSystemPrompt(
  contents: Content[],
  tools: ITool[],
  options: { systemInstruction?: string }
): Promise<Content> {
  
  const { requestParams, modifiedContents } = this.handleSystemPrompt(
    options.systemInstruction || '',
    this.authToken,
    contents
  );
  
  // Convert to Anthropic format
  const messages = this.converter.toProviderFormat(modifiedContents);
  
  const apiParams = {
    model: this.modelName,
    max_tokens: this.maxTokens,
    messages: messages,
    tools: tools.length > 0 ? this.formatToolsForAnthropic(tools) : undefined,
    ...requestParams // This includes system parameter for API mode
  };
  
  // Call Anthropic API
  const response = await this.anthropic.messages.create(apiParams);
  
  // Convert response back to Content format
  return this.converter.fromProviderFormat(response);
}

// Update main generateChatCompletion to support system prompts
async generateChatCompletion(
  contents: Content[], 
  tools: ITool[] = [], 
  options: any = {}
): Promise<Content> {
  
  if (options.systemInstruction) {
    return this.generateChatCompletionWithSystemPrompt(contents, tools, options);
  }
  
  // Existing implementation for non-system-prompt cases
  return this.generateChatCompletionOriginal(contents, tools, options);
}
```

### Required Code Markers

Every implemented method MUST include:

```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P04
 * @requirement REQ-001.X
 * @implements [Description of what this implements]
 * @test_driven [Specific test file and test case that drives this implementation]
 */
```

### Implementation Guidelines

1. **Test-Driven**: Each implementation must make specific failing tests pass
2. **Incremental**: Implement one provider at a time, verify tests pass
3. **Preserve Existing**: Don't break existing functionality without system prompts
4. **Provider-Specific**: Each provider handles system prompts in their native format
5. **OAuth Special Case**: Anthropic OAuth gets special injection handling

### Test Integration Points

Each implementation must reference specific test cases:
- `GeminiCompatibleWrapper.system.test.ts` → System extraction and filtering logic
- `GeminiProvider.system.test.ts` → systemInstruction parameter handling
- `OpenAIProvider.system.test.ts` → System message conversion and placement
- `AnthropicProvider.system.test.ts` → System parameter vs OAuth injection logic

## Verification Commands

### Automated Checks

```bash
# Verify implementation markers exist
grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P04" packages/core/src/providers/ | wc -l
# Expected: 15+ occurrences

# Verify all tests now pass
npm test -- --grep "system.*instruction" --reporter verbose
# Expected: All tests pass

# Verify TypeScript compilation
npm run typecheck
# Expected: Success

# Verify no TODO markers remain from stubs
grep -r "TODO.*Phase 04" packages/core/src/providers/
# Expected: Zero occurrences (all TODOs implemented)

# Verify system Content filtering works
node -e "
const { filterSystemContent } = require('./dist/packages/core/src/providers/types/SystemPromptConfig.js');
const contents = [
  { role: 'system', parts: [{ text: 'System' }] },
  { role: 'user', parts: [{ text: 'User' }] }
];
const filtered = filterSystemContent(contents);
console.log('Filtered length:', filtered.length);
console.log('Has system:', filtered.some(c => c.role === 'system'));
"
# Expected: Filtered length: 1, Has system: false
```

### Manual Verification Checklist

#### System Instruction Extraction
- [ ] `extractSystemPrompt()` prioritizes config over Content system messages
- [ ] `extractSystemPrompt()` combines multiple system Content correctly
- [ ] `validateSystemContent()` rejects non-text parts in system Content
- [ ] `filterSystemContent()` removes all system Content from arrays

#### GeminiCompatibleWrapper
- [ ] System instructions extracted from config and Content
- [ ] Clean contents (no system) passed to providers
- [ ] System prompt passed via options.systemInstruction
- [ ] System Content validation occurs before processing

#### GeminiProvider
- [ ] System prompt converted to systemInstruction parameter format
- [ ] Empty system prompts handled gracefully (no systemInstruction added)
- [ ] systemInstruction structure preserves original formatting
- [ ] generateChatCompletionWithSystemPrompt method works correctly

#### OpenAIProvider
- [ ] System prompt becomes first system message in messages array
- [ ] System message placement preserved regardless of Content order
- [ ] Tool calls work correctly with system messages
- [ ] Multiple system instructions combined into single system message

#### AnthropicProvider
- [ ] API mode uses system parameter (not in messages)
- [ ] OAuth mode injects into first user message with separator
- [ ] Auth mode detection works for sk-ant-api vs sk-ant-oat tokens
- [ ] Complex system instruction formatting preserved

## Success Criteria

- **All TDD tests pass**: 0 failing tests in system instruction test suites
- **Type safety maintained**: `npm run typecheck` passes
- **No stub TODOs remain**: All Phase 04 TODOs implemented
- **Real behavior implemented**: System prompts work with actual provider APIs
- **OAuth handling correct**: Anthropic OAuth mode injects properly
- **Existing functionality preserved**: Non-system-prompt flows still work

## Integration Testing

After implementation, test with realistic system prompts:

```bash
# Test each provider with complex system prompt
node -e "
const { GeminiProvider } = require('./dist/packages/core/src/providers/gemini/GeminiProvider.js');
const systemPrompt = 'You are Claude Code, an AI assistant specialized in software engineering.';
const provider = new GeminiProvider('test-key');

// Test system instruction handling
const geminiFormat = provider.convertToGeminiSystemInstruction(systemPrompt);
console.log('Gemini format:', geminiFormat);
console.log('Passes test:', geminiFormat.parts[0].text === systemPrompt);
"
```

## Phase Completion Marker

Create: `project-plans/simplification-p2/.completed/P04.md`

```markdown
Phase: P04 - System Prompt Implementation
Completed: 2025-08-24 HH:MM
Files Modified: 6 core system prompt handling files
Methods Implemented: 12 system prompt methods
Tests Passing: All system instruction TDD tests pass
Functionality: System prompts work correctly for all providers
OAuth Handling: Anthropic OAuth injection working
Type Safety: Full TypeScript strict mode compliance
Integration: All providers handle system prompts in native formats
```

This implementation makes all TDD tests pass and provides complete, working system prompt handling across all providers.