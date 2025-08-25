# Phase 02: System Prompt Architecture Stub

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P02`

## Prerequisites
- Required: Phase 01a completed
- Verification: `grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P01" . | wc -l` returns 8+
- Expected: Clean test foundation without broken tests

## Implementation Tasks

### Goal
Create minimal skeleton implementation for system prompt handling that separates system instructions from Content[] messages. This stub will compile and provide the foundation for TDD tests in Phase 03.

### Architecture Overview

System prompts must be:
- Loaded as configuration strings (not Content objects)
- Passed to providers as separate parameters
- Handled natively by each provider:
  - **Gemini**: `systemInstruction` parameter
  - **OpenAI**: System messages in messages array
  - **Anthropic API**: `system` parameter
  - **Anthropic OAuth**: Injected into conversation

### Files to Create

#### 1. System Prompt Configuration Interface
**File**: `packages/core/src/providers/types/SystemPromptConfig.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P02
 * @requirement REQ-001.1
 * @stub SystemPromptConfig interface and utilities
 */

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

/** Extract system prompt from various sources */
export function extractSystemPrompt(sources: {
  config?: { systemInstruction?: string };
  contents?: Content[];
}): string {
  // Stub: return empty for now
  return '';
}

/** Validate system prompt format */
export function validateSystemPrompt(prompt: string): void {
  // Stub: no validation yet
  return;
}
```

#### 2. Provider Capability Detection
**File**: `packages/core/src/providers/capabilities/SystemPromptCapabilities.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P02
 * @requirement REQ-001.2
 * @stub Provider capability detection for system prompts
 */

import { SystemPromptCapabilities } from '../types/SystemPromptConfig';

export function getSystemPromptCapabilities(provider: string, authToken?: string): SystemPromptCapabilities {
  // Stub implementation - will be properly implemented in Phase 04
  switch (provider) {
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
      const isOAuth = authToken?.startsWith('sk-ant-oat') ?? false;
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

export function detectAuthMode(authToken: string): 'api' | 'oauth' | 'unknown' {
  // Stub: basic detection
  if (authToken.startsWith('sk-ant-oat')) {
    return 'oauth';
  } else if (authToken.startsWith('sk-ant-api')) {
    return 'api';
  }
  return 'unknown';
}
```

### Files to Modify

#### 1. GeminiCompatibleWrapper System Handling
**File**: `packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts`

**Modify lines 284-322** (existing system message handling):
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P02  
 * @requirement REQ-001.1
 * @stub Updated system instruction handling
 */

// REMOVE this section and replace with stub:
private handleSystemInstructions(
  contents: Content[], 
  config?: any
): { cleanContents: Content[], systemPrompt: string } {
  // Stub: minimal implementation for compilation
  const systemPrompt = config?.systemInstruction || '';
  const cleanContents = contents.filter(c => c.role !== 'system');
  
  return { cleanContents, systemPrompt };
}

private async generateContentWithSystemPrompt(
  provider: any,
  cleanContents: Content[],
  systemPrompt: string,
  tools: ITool[],
  options: any
): Promise<Content> {
  // Stub: delegate to provider without system prompt handling yet
  return provider.generateChatCompletion(cleanContents, tools, options);
}
```

#### 2. Individual Provider Stub Updates

**File**: `packages/core/src/providers/gemini/GeminiProvider.ts`

**Add after existing imports**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P02
 * @requirement REQ-001.2
 * @stub Gemini system instruction handling
 */

import { SystemPromptConfig } from '../types/SystemPromptConfig';

// Add method to handle system instructions
private handleSystemInstruction(systemPrompt: string, requestParams: any): any {
  // Stub: will implement systemInstruction parameter in Phase 04
  if (systemPrompt) {
    // TODO: Add to requestParams.config.systemInstruction
  }
  return requestParams;
}
```

**File**: `packages/core/src/providers/openai/OpenAIProvider.ts`

**Add after existing imports**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P02
 * @requirement REQ-001.3
 * @stub OpenAI system message handling
 */

import { SystemPromptConfig } from '../types/SystemPromptConfig';

// Add method to handle system messages
private addSystemMessage(systemPrompt: string, messages: any[]): any[] {
  // Stub: will implement system message prepending in Phase 04
  if (systemPrompt) {
    // TODO: Add { role: 'system', content: systemPrompt } to start of messages
  }
  return messages;
}
```

**File**: `packages/core/src/providers/anthropic/AnthropicProvider.ts`

**Add after existing imports**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P02
 * @requirement REQ-001.4
 * @stub Anthropic system parameter/injection handling
 */

import { SystemPromptConfig } from '../types/SystemPromptConfig';
import { detectAuthMode } from '../capabilities/SystemPromptCapabilities';

// Add method to handle system prompts
private handleSystemPrompt(systemPrompt: string, authToken: string, contents: Content[]): {
  requestParams: any;
  modifiedContents: Content[];
} {
  // Stub: will implement proper system handling in Phase 04
  const authMode = detectAuthMode(authToken);
  
  if (authMode === 'oauth' && systemPrompt) {
    // TODO: Inject into first user message
    return {
      requestParams: {},
      modifiedContents: contents
    };
  } else if (systemPrompt) {
    // TODO: Add to requestParams.system
    return {
      requestParams: { system: '' },
      modifiedContents: contents
    };
  }
  
  return {
    requestParams: {},
    modifiedContents: contents
  };
}
```

### Required Code Markers

Every function, class, and interface MUST include:

```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P02
 * @requirement REQ-001.X
 * @stub [Brief description of what this will do]
 */
```

### Stub Implementation Rules

1. **Compile Successfully**: All code must compile with TypeScript strict mode
2. **Return Appropriate Types**: Functions return correct types but with empty/default values
3. **No NotYetImplemented Errors**: Use empty returns or default values
4. **Preserve Existing Behavior**: Don't break currently working functionality
5. **Clear TODOs**: Mark where real implementation will go

### Stub Behaviors

#### Valid Stub Returns:
```typescript
// For string returns
return '';

// For object returns  
return {};

// For array returns
return [];

// For Promise returns
return Promise.resolve(defaultValue);

// For complex objects with required fields
return {
  cleanContents: contents,
  systemPrompt: ''
};
```

#### Invalid Stub Returns:
```typescript
// DON'T use NotYetImplemented
throw new Error('NotYetImplemented');

// DON'T return undefined for required types
return undefined;

// DON'T break existing interfaces
return null;
```

## Verification Commands

### Automated Checks

```bash
# Check stub markers exist
grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P02" packages/core/src/providers/ | wc -l
# Expected: 6+ occurrences

# Verify compilation
npm run typecheck
# Expected: Success

# Verify no NotYetImplemented
grep -r "NotYetImplemented" packages/core/src/providers/
# Expected: Zero occurrences in new code

# Check TODO markers for future implementation
grep -r "TODO.*Phase 04" packages/core/src/providers/
# Expected: Multiple occurrences showing implementation points
```

### Manual Verification Checklist

- [ ] `SystemPromptConfig.ts`: Created with interface definitions
- [ ] `SystemPromptCapabilities.ts`: Created with capability detection
- [ ] `GeminiCompatibleWrapper.ts`: Updated with stub system handling
- [ ] `GeminiProvider.ts`: Added stub systemInstruction handling
- [ ] `OpenAIProvider.ts`: Added stub system message handling
- [ ] `AnthropicProvider.ts`: Added stub system parameter/injection handling
- [ ] All files compile successfully
- [ ] No NotYetImplemented exceptions
- [ ] All stub functions return appropriate types
- [ ] Plan markers present on all new code
- [ ] TODO markers indicate where real implementation goes

## Success Criteria

- **Compiles Successfully**: `npm run typecheck` passes
- **No Runtime Errors**: Stub functions don't throw exceptions
- **Type Safety**: All returns match expected interfaces
- **Clear TODOs**: Implementation points marked for Phase 04
- **Preserves Functionality**: Existing behavior not broken
- **Foundation Ready**: Clean base for TDD tests in Phase 03

## Architecture Validation

The stub creates these architectural pieces:

1. **Configuration Types**: `SystemPromptConfig` interface defines system prompt structure
2. **Capability Detection**: `SystemPromptCapabilities` identifies what each provider can do
3. **Provider Interfaces**: Each provider has stub methods for system prompt handling
4. **Wrapper Integration**: `GeminiCompatibleWrapper` has stub system prompt processing

This architecture separates:
- **Configuration** (system prompts) from **Messages** (Content[])
- **Provider Capabilities** from **Implementation Details**
- **OAuth Handling** from **API Handling**

## Phase Completion Marker

Create: `project-plans/simplification-p2/.completed/P02.md`

```markdown
Phase: P02 - System Prompt Architecture Stub
Completed: 2025-08-24 HH:MM
Files Created: 2 (SystemPromptConfig.ts, SystemPromptCapabilities.ts)
Files Modified: 4 (GeminiCompatibleWrapper.ts, GeminiProvider.ts, OpenAIProvider.ts, AnthropicProvider.ts)
Stub Methods: 6 system prompt handling methods
Compilation: Success
Type Safety: All stubs return correct types
TODOs: 8 implementation points marked for Phase 04
```

The stub phase provides a solid, compilable foundation for writing comprehensive TDD tests in Phase 03.