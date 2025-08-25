# Phase 05: Anthropic Tool ID Stub Phase

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P05`

## Prerequisites
- Required: Phase 04a completed
- Verification: All system prompt tests passing
- Expected: Clean foundation for tool ID remediation work

## Implementation Tasks

### Goal
Create minimal stub implementation for Anthropic tool ID generation and tracking system that replaces hardcoded `'broken-tool-123'` with proper unique ID generation infrastructure.

### Architecture Overview

Tool ID system must provide:
- **Unique ID generation** for each tool call (no hardcoded values)
- **ID matching** between tool_use and tool_result in conversation flow
- **Realistic ID formats** following Anthropic patterns (toolu_xxxxx)
- **State tracking** to maintain ID consistency across conversation turns
- **Multi-tool support** with different IDs for each tool call

### Files to Create

#### 1. Tool ID Generation Interface
**File**: `packages/core/src/providers/types/ToolIdConfig.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05
 * @requirement REQ-002.1
 * @stub Tool ID configuration and generation interfaces
 */

export interface ToolIdConfig {
  /** Tool ID format pattern for the provider */
  idFormat: 'anthropic' | 'openai' | 'gemini';
  
  /** Prefix used for tool IDs (e.g., 'toolu_' for Anthropic) */
  prefix: string;
  
  /** Length of random suffix */
  suffixLength: number;
  
  /** Whether IDs must be tracked for matching */
  requiresMatching: boolean;
}

export interface ToolCallTracker {
  /** Generate new tool ID */
  generateId(): string;
  
  /** Store tool call with generated ID */
  storeToolCall(functionName: string, toolId: string): void;
  
  /** Retrieve tool ID for tool result */
  getToolIdForFunction(functionName: string): string | undefined;
  
  /** Clear stored mappings */
  clear(): void;
}

/**
 * Generate realistic tool ID for provider
 * @stub Returns empty string - will implement in Phase 07
 */
export function generateToolId(config: ToolIdConfig): string {
  // Stub: return empty string for now
  return '';
}

/**
 * Validate tool ID format
 * @stub No validation yet - will implement in Phase 07
 */
export function validateToolId(toolId: string, config: ToolIdConfig): boolean {
  // Stub: always return true
  return true;
}
```

#### 2. Anthropic Tool ID Tracker
**File**: `packages/core/src/providers/anthropic/AnthropicToolIdTracker.ts`
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05
 * @requirement REQ-002.2
 * @stub Anthropic-specific tool ID tracking system
 */

import { ToolCallTracker, ToolIdConfig } from '../types/ToolIdConfig';

export class AnthropicToolIdTracker implements ToolCallTracker {
  private toolCallMap = new Map<string, string>();
  
  private config: ToolIdConfig = {
    idFormat: 'anthropic',
    prefix: 'toolu_',
    suffixLength: 12,
    requiresMatching: true
  };

  /**
   * Generate new Anthropic tool ID
   * @stub Returns empty string - will implement realistic generation in Phase 07
   */
  generateId(): string {
    // Stub: return empty for now
    return '';
  }

  /**
   * Store tool call mapping
   * @stub Empty implementation - will implement storage in Phase 07
   */
  storeToolCall(functionName: string, toolId: string): void {
    // Stub: no storage yet
  }

  /**
   * Retrieve tool ID for function result
   * @stub Returns undefined - will implement retrieval in Phase 07
   */
  getToolIdForFunction(functionName: string): string | undefined {
    // Stub: return undefined for now
    return undefined;
  }

  /**
   * Clear stored mappings
   * @stub Empty implementation - will implement clearing in Phase 07
   */
  clear(): void {
    // Stub: no clearing needed yet
  }

  /**
   * Get configuration for Anthropic tool IDs
   * @stub Returns basic config - will enhance in Phase 07
   */
  getConfig(): ToolIdConfig {
    return this.config;
  }
}
```

### Files to Modify

#### 1. AnthropicProvider Tool ID Stub Updates

**File**: `packages/core/src/providers/anthropic/AnthropicProvider.ts`

**Add after existing imports**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05
 * @requirement REQ-002.1
 * @stub Anthropic tool ID generation replacement
 */

import { AnthropicToolIdTracker } from './AnthropicToolIdTracker';

// Add property to class
private toolIdTracker = new AnthropicToolIdTracker();

// Replace existing generateToolId method (line 811) with stub:
/**
 * Generate unique tool ID for Anthropic
 * @stub Returns empty string - will implement proper generation in Phase 07
 */
private generateToolId(): string {
  // Stub: delegate to tracker but tracker returns empty
  return this.toolIdTracker.generateId();
}

// Add new method to replace hardcoded tool_use ID generation
/**
 * Generate tool_use with proper ID
 * @stub Uses empty ID for now - will implement in Phase 07
 */
private generateToolUse(functionCall: any): any {
  const toolId = this.generateToolId();
  
  // Store the mapping for later tool_result matching
  this.toolIdTracker.storeToolCall(functionCall.name, toolId);
  
  return {
    type: 'tool_use',
    id: toolId, // Stub: empty for now
    name: functionCall.name,
    input: functionCall.args
  };
}

// Add new method to replace hardcoded tool_result ID matching  
/**
 * Generate tool_result with matching ID
 * @stub Uses empty ID for now - will implement matching in Phase 07
 */
private generateToolResult(functionResponse: any): any {
  // Get matching tool ID from previous tool_use
  const matchingId = this.toolIdTracker.getToolIdForFunction(functionResponse.name);
  
  return {
    type: 'tool_result',
    tool_use_id: matchingId || '', // Stub: empty if no match found
    content: JSON.stringify(functionResponse.response)
  };
}

// Replace hardcoded sections in convertContentsToAnthropicMessages
// Find lines 686 & 706 and replace with stub calls:
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05
 * Replace hardcoded 'broken-tool-123' with stub tool ID generation
 */

// Replace line 686 area:
// OLD: const toolId = 'broken-tool-123';
// NEW: const toolUse = this.generateToolUse(part.functionCall);

// Replace line 706 area:  
// OLD: const toolUseId = 'broken-tool-123';
// NEW: const toolResult = this.generateToolResult(part.functionResponse);
```

#### 2. AnthropicContentConverter Tool ID Updates

**File**: `packages/core/src/providers/converters/AnthropicContentConverter.ts`

**Add after existing imports**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05
 * @requirement REQ-002.3
 * @stub Remove tool ID generation from converter (delegate to provider)
 */

// Remove or comment out the existing generateToolId method (line 162)
// and replace with stub that delegates to provider:

/**
 * Generate tool ID - delegated to provider
 * @stub Returns empty string - provider handles tool ID generation
 * @deprecated Tool ID generation moved to AnthropicProvider
 */
private generateToolId(): string {
  // Stub: converter no longer generates IDs
  return '';
}
```

**Update tool conversion methods**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05
 * Update tool conversion to use provider-generated IDs
 */

// Modify the toProviderFormat method tool handling sections
// to use empty IDs (provider will fill them in Phase 07):

// In tool_use conversion (around line 73):
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05
 * @stub Tool use conversion with empty ID
 */
{
  type: 'tool_use',
  id: '', // Stub: empty, provider will generate proper ID
  name: functionCall.name,
  input: functionCall.args
}

// In tool_result conversion (around line 85):
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05
 * @stub Tool result conversion with empty matching ID
 */
{
  type: 'tool_result',
  tool_use_id: '', // Stub: empty, provider will match to proper tool_use ID
  content: JSON.stringify(functionResponse.response)
}
```

### Required Code Markers

Every stub function, class, and interface MUST include:

```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P05
 * @requirement REQ-002.X
 * @stub [Brief description of what this will do in Phase 07]
 */
```

### Stub Implementation Rules

1. **Compile Successfully**: All code must compile with TypeScript strict mode
2. **Return Appropriate Types**: Functions return correct types but with empty/default values
3. **No Hardcoded IDs**: Remove all 'broken-tool-123' references
4. **Preserve Interfaces**: Maintain expected method signatures
5. **Clear Delegation**: Show where real implementation will happen

### Stub Behaviors

#### Valid Stub Returns:
```typescript
// For string tool IDs
return '';

// For tool ID maps  
return new Map<string, string>();

// For optional tool IDs
return undefined;

// For configuration objects
return {
  idFormat: 'anthropic' as const,
  prefix: 'toolu_',
  suffixLength: 12,
  requiresMatching: true
};
```

#### Invalid Stub Returns:
```typescript
// DON'T use hardcoded broken IDs
return 'broken-tool-123'; // Remove all references

// DON'T throw NotYetImplemented
throw new Error('NotYetImplemented');

// DON'T return null for required types
return null;
```

## Verification Commands

### Automated Checks

```bash
# Check stub markers exist
grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P05" packages/core/src/providers/ | wc -l
# Expected: 10+ occurrences

# Verify no more hardcoded broken IDs
grep -r "broken-tool-123" packages/core/src/providers/
# Expected: Zero occurrences

# Verify compilation
npm run typecheck
# Expected: Success

# Check stub method signatures
grep -r "generateId\|storeToolCall\|getToolIdForFunction" packages/core/src/providers/ | wc -l
# Expected: 6+ method signatures
```

### Manual Verification Checklist

- [ ] `ToolIdConfig.ts`: Created with interfaces and stub utility functions
- [ ] `AnthropicToolIdTracker.ts`: Created with stub implementation of ToolCallTracker
- [ ] `AnthropicProvider.ts`: Hardcoded IDs replaced with stub method calls
- [ ] `AnthropicContentConverter.ts`: Tool ID generation marked as deprecated/stubbed
- [ ] All files compile successfully
- [ ] No 'broken-tool-123' references remain anywhere
- [ ] All stub methods return appropriate types without throwing
- [ ] Plan markers present on all new/modified code
- [ ] Tool ID generation infrastructure in place but not implemented

## Success Criteria

- **Compiles Successfully**: `npm run typecheck` passes
- **No Hardcoded IDs**: Zero 'broken-tool-123' references in codebase
- **Architecture in Place**: Tool ID generation and tracking infrastructure created
- **Type Safety**: All stub methods return correct interface types
- **Clean Delegation**: Clear separation between provider and converter responsibilities
- **Foundation Ready**: Clean base for TDD tests and implementation in Phases 06-07

## Architecture Validation

The stub creates these architectural pieces:

1. **Tool ID Configuration**: `ToolIdConfig` interface defines tool ID structure
2. **Tool ID Tracking**: `ToolCallTracker` interface and `AnthropicToolIdTracker` class
3. **Provider Integration**: `AnthropicProvider` uses tracker for tool ID management
4. **Converter Delegation**: `AnthropicContentConverter` delegates ID generation to provider

This architecture separates:
- **ID Generation** (provider responsibility) from **Content Conversion** (converter responsibility)
- **Tool Call Tracking** (per-conversation state) from **Tool ID Format** (provider configuration)
- **Anthropic-Specific Logic** from **Generic Tool ID Interfaces**

## Phase Completion Marker

Create: `project-plans/simplification-p2/.completed/P05.md`

```markdown
Phase: P05 - Anthropic Tool ID Stub
Completed: 2025-08-24 HH:MM
Files Created: 2 (ToolIdConfig.ts, AnthropicToolIdTracker.ts)
Files Modified: 2 (AnthropicProvider.ts, AnthropicContentConverter.ts)
Hardcoded IDs Removed: All 'broken-tool-123' references eliminated
Stub Methods: 8 tool ID handling methods
Compilation: Success
Architecture: Tool ID generation and tracking infrastructure in place
Type Safety: All stubs return correct types
Foundation: Ready for comprehensive TDD in Phase 06
```

The stub phase eliminates hardcoded tool IDs and provides a solid, compilable foundation for writing comprehensive TDD tests in Phase 06.