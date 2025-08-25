# Phase 07: Anthropic Tool ID Implementation Phase

## Phase ID
`PLAN-20250824-CONTENT-REMEDIATION.P07`

## Prerequisites
- Required: Phase 06a completed
- Verification: All tool ID TDD tests failing appropriately with stub implementations
- Expected: Comprehensive behavioral tests that define exact implementation requirements

## Implementation Tasks

### Goal
Implement complete Anthropic tool ID generation, tracking, and matching to make ALL TDD tests pass. Replace stub implementations with fully functional code that generates unique, realistic tool IDs and maintains proper tool_use/tool_result matching throughout conversation flows.

### Implementation Approach
1. **Follow TDD tests exactly** - implement only what tests specify
2. **Make tests pass one by one** - incremental implementation
3. **Update existing files** - no new file creation, only modification
4. **Reference test requirements** - every implementation references specific test cases
5. **Generate realistic IDs** - follow actual Anthropic ID patterns (toolu_xxxxx)

### Files to Modify

#### 1. Implement Tool ID Generation Utilities

**File**: `packages/core/src/providers/types/ToolIdConfig.ts`

**Replace stub implementations with**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P07
 * @requirement REQ-002.1
 * @implements Complete tool ID generation and validation
 * @test_driven ToolIdConfig.test.ts "should generate realistic Anthropic tool IDs"
 */

import { randomBytes } from 'crypto';

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
 * @test_driven ToolIdConfig.test.ts "should generate realistic Anthropic tool IDs with correct format"
 */
export function generateToolId(config: ToolIdConfig): string {
  // Generate cryptographically random suffix
  const randomSuffix = randomBytes(Math.ceil(config.suffixLength / 2))
    .toString('hex')
    .slice(0, config.suffixLength);
  
  return `${config.prefix}${randomSuffix}`;
}

/**
 * Validate tool ID format
 * @test_driven ToolIdConfig.test.ts "should validate correct Anthropic tool ID format"
 */
export function validateToolId(toolId: string, config: ToolIdConfig): boolean {
  if (!toolId || typeof toolId !== 'string') {
    return false;
  }
  
  // Check prefix
  if (!toolId.startsWith(config.prefix)) {
    return false;
  }
  
  // Check total length
  const expectedLength = config.prefix.length + config.suffixLength;
  if (toolId.length !== expectedLength) {
    return false;
  }
  
  // Check suffix is alphanumeric
  const suffix = toolId.slice(config.prefix.length);
  const alphanumericRegex = /^[A-Za-z0-9]+$/;
  
  return alphanumericRegex.test(suffix);
}
```

#### 2. Implement AnthropicToolIdTracker

**File**: `packages/core/src/providers/anthropic/AnthropicToolIdTracker.ts`

**Replace stub implementation with**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P07
 * @requirement REQ-002.2
 * @implements Complete Anthropic tool ID tracking and management
 * @test_driven AnthropicToolIdTracker.test.ts all test cases
 */

import { ToolCallTracker, ToolIdConfig, generateToolId } from '../types/ToolIdConfig';

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
   * @test_driven AnthropicToolIdTracker.test.ts "should generate realistic Anthropic tool IDs"
   */
  generateId(): string {
    return generateToolId(this.config);
  }

  /**
   * Store tool call mapping
   * @test_driven AnthropicToolIdTracker.test.ts "should store and retrieve tool call mappings correctly"
   */
  storeToolCall(functionName: string, toolId: string): void {
    this.toolCallMap.set(functionName, toolId);
  }

  /**
   * Retrieve tool ID for function result
   * @test_driven AnthropicToolIdTracker.test.ts "should store and retrieve tool call mappings correctly"
   */
  getToolIdForFunction(functionName: string): string | undefined {
    return this.toolCallMap.get(functionName);
  }

  /**
   * Clear stored mappings
   * @test_driven AnthropicToolIdTracker.test.ts "should clear all stored mappings"
   */
  clear(): void {
    this.toolCallMap.clear();
  }

  /**
   * Get configuration for Anthropic tool IDs
   * @test_driven AnthropicToolIdTracker.test.ts "should provide correct Anthropic configuration"
   */
  getConfig(): ToolIdConfig {
    return { ...this.config }; // Return copy to prevent modification
  }
}
```

#### 3. Implement AnthropicProvider Tool ID Integration

**File**: `packages/core/src/providers/anthropic/AnthropicProvider.ts`

**Replace stub implementations with**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P07
 * @requirement REQ-002.1
 * @implements Complete Anthropic tool ID generation and integration
 * @test_driven AnthropicProvider.toolid.test.ts all test cases
 */

// Update imports
import { AnthropicToolIdTracker } from './AnthropicToolIdTracker';

// Update class property
private toolIdTracker = new AnthropicToolIdTracker();

// Replace stub generateToolId method with:
/**
 * Generate unique tool ID for Anthropic
 * @test_driven AnthropicProvider.toolid.test.ts "should generate tool_use with realistic unique IDs"
 */
private generateToolId(): string {
  return this.toolIdTracker.generateId();
}

// Replace stub generateToolUse method with:
/**
 * Generate tool_use with proper ID
 * @test_driven AnthropicProvider.toolid.test.ts "should generate tool_use with realistic unique IDs"
 */
private generateToolUse(functionCall: any): any {
  const toolId = this.generateToolId();
  
  // Store the mapping for later tool_result matching
  this.toolIdTracker.storeToolCall(functionCall.name, toolId);
  
  return {
    type: 'tool_use',
    id: toolId,
    name: functionCall.name,
    input: functionCall.args
  };
}

// Replace stub generateToolResult method with:
/**
 * Generate tool_result with matching ID
 * @test_driven AnthropicProvider.toolid.test.ts "should generate tool_result with matching tool_use_id"
 */
private generateToolResult(functionResponse: any): any {
  // Get matching tool ID from previous tool_use
  const matchingId = this.toolIdTracker.getToolIdForFunction(functionResponse.name);
  
  if (!matchingId) {
    throw new Error(`No matching tool_use found for function: ${functionResponse.name}`);
  }
  
  return {
    type: 'tool_result',
    tool_use_id: matchingId,
    content: JSON.stringify(functionResponse.response)
  };
}

// Update convertContentsToAnthropicMessages method to use new tool generation:
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P07
 * Replace hardcoded tool ID usage with proper generation
 * @test_driven AnthropicProvider.toolid.test.ts "should assign unique IDs to multiple tool calls"
 */
private convertContentsToAnthropicMessages(contents: Content[]): any[] {
  // ... existing conversion logic ...
  
  // Replace the tool_use generation section (around line 686):
  if ('functionCall' in part) {
    const toolUse = this.generateToolUse(part.functionCall);
    
    // Convert content to array format if it's a string
    if (typeof currentMessage.content === 'string') {
      currentMessage.content = [{ type: 'text', text: currentMessage.content }];
    }
    
    currentMessage.content.push(toolUse);
  }
  
  // Replace the tool_result generation section (around line 706):
  if ('functionResponse' in part) {
    const toolResult = this.generateToolResult(part.functionResponse);
    
    // Convert content to array format if it's a string
    if (typeof currentMessage.content === 'string') {
      currentMessage.content = [{ type: 'text', text: currentMessage.content }];
    }
    
    currentMessage.content.push(toolResult);
  }
  
  // ... rest of existing conversion logic ...
}

// Add method to clear tool tracking between conversations:
/**
 * Clear tool ID tracking for new conversation
 * @test_driven AnthropicProvider.toolid.test.ts conversation flow tests
 */
public clearToolIdTracking(): void {
  this.toolIdTracker.clear();
}

// Update generateChatCompletion to clear tracking for new conversations:
async generateChatCompletion(
  contents: Content[], 
  tools: ITool[] = [], 
  options: any = {}
): Promise<Content> {
  
  // Clear tool tracking at start of new generation
  // (Keep tracking within single conversation flow)
  if (this.isNewConversation(contents)) {
    this.clearToolIdTracking();
  }
  
  // ... rest of existing implementation ...
}

// Helper method to detect new conversations:
private isNewConversation(contents: Content[]): boolean {
  // Simple heuristic: if first content is user message, it's likely a new conversation
  return contents.length > 0 && contents[0].role === 'user' && 
         !contents.some(c => c.role === 'model');
}
```

#### 4. Update AnthropicContentConverter Delegation

**File**: `packages/core/src/providers/converters/AnthropicContentConverter.ts`

**Update tool conversion methods**:
```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P07
 * @requirement REQ-002.4
 * @implements Complete converter delegation to provider
 * @test_driven AnthropicContentConverter.toolid.test.ts all test cases
 */

// Update toProviderFormat method tool handling sections:

// In tool_use conversion (around line 73):
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P07
 * @test_driven AnthropicContentConverter.toolid.test.ts "should delegate tool ID generation to provider"
 */
{
  type: 'tool_use',
  id: '', // Provider will replace with actual generated ID
  name: functionCall.name,
  input: functionCall.args
}

// In tool_result conversion (around line 85):
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P07
 * @test_driven AnthropicContentConverter.toolid.test.ts "should delegate tool result ID matching to provider"
 */
{
  type: 'tool_result',
  tool_use_id: '', // Provider will replace with matching tool_use ID
  content: JSON.stringify(functionResponse.response)
}

// Update the deprecated generateToolId method documentation:
/**
 * Generate tool ID - DEPRECATED
 * @deprecated Tool ID generation moved to AnthropicProvider for proper tracking
 * @test_driven AnthropicContentConverter.toolid.test.ts "should not generate any tool IDs internally"
 */
private generateToolId(): string {
  // This method is no longer used - provider handles all tool ID generation
  return '';
}

// Add comment explaining converter responsibility:
/**
 * Note: This converter creates the structure for tool_use and tool_result
 * but delegates all ID generation and matching to the AnthropicProvider.
 * This ensures proper tool ID tracking across conversation flows.
 */
```

### Required Code Markers

Every implemented method MUST include:

```typescript
/**
 * @plan PLAN-20250824-CONTENT-REMEDIATION.P07
 * @requirement REQ-002.X
 * @implements [Description of what this implements]
 * @test_driven [Specific test file and test case that drives this implementation]
 */
```

### Implementation Guidelines

1. **Test-Driven**: Each implementation must make specific failing tests pass
2. **Incremental**: Implement one file at a time, verify tests pass
3. **Realistic IDs**: Generate actual toolu_xxxxx format IDs using crypto randomness
4. **Proper Tracking**: Maintain tool_use/tool_result ID consistency throughout conversations
5. **Error Handling**: Throw clear errors when tool_result has no matching tool_use
6. **Performance**: Use efficient Map-based storage for tool ID tracking

### Test Integration Points

Each implementation must reference specific test cases:
- `ToolIdConfig.test.ts` → Tool ID generation utility functions
- `AnthropicToolIdTracker.test.ts` → Tool ID tracking and mapping functionality
- `AnthropicProvider.toolid.test.ts` → Provider integration and conversation flow
- `AnthropicContentConverter.toolid.test.ts` → Converter delegation behavior

## Verification Commands

### Automated Checks

```bash
# Verify implementation markers exist
grep -r "@plan:PLAN-20250824-CONTENT-REMEDIATION.P07" packages/core/src/providers/ | wc -l
# Expected: 15+ occurrences

# Verify all tool ID tests now pass
npm test -- --grep "tool.*id|Tool.*Id|generateId|storeToolCall" --reporter verbose
# Expected: All tests pass

# Verify no hardcoded IDs remain
grep -r "broken-tool-123" packages/core/src/providers/
# Expected: Zero occurrences

# Test realistic ID generation
node -e "
const { generateToolId } = require('./dist/packages/core/src/providers/types/ToolIdConfig.js');
const config = {
  idFormat: 'anthropic',
  prefix: 'toolu_',
  suffixLength: 12,
  requiresMatching: true
};
const id = generateToolId(config);
console.log('Generated ID:', id);
console.log('Matches pattern:', /^toolu_[A-Za-z0-9]{12}$/.test(id));
console.log('Length:', id.length);
"
# Expected: Valid toolu_xxxxx ID generation
```

### Manual Verification Checklist

#### Tool ID Generation Implementation
- [ ] `generateToolId()` uses crypto.randomBytes for entropy
- [ ] Generated IDs follow toolu_[12-hex-chars] pattern exactly
- [ ] `validateToolId()` properly validates format, length, and character set
- [ ] Multiple generations produce unique IDs
- [ ] Edge cases handled (empty config, invalid inputs)

#### AnthropicToolIdTracker Implementation
- [ ] `generateId()` returns realistic Anthropic format IDs
- [ ] `storeToolCall()` properly stores function name → tool ID mappings
- [ ] `getToolIdForFunction()` retrieves correct stored IDs
- [ ] `clear()` removes all stored mappings
- [ ] `getConfig()` returns correct Anthropic configuration
- [ ] Thread safety considerations (if needed)

#### AnthropicProvider Integration
- [ ] `generateToolId()` delegates to tracker correctly
- [ ] `generateToolUse()` creates proper tool_use structure with unique ID
- [ ] `generateToolResult()` finds matching tool_use ID correctly
- [ ] Tool ID tracking maintained throughout conversation flow
- [ ] Error thrown when tool_result has no matching tool_use
- [ ] `clearToolIdTracking()` resets state for new conversations
- [ ] Integration with existing message conversion logic

#### AnthropicContentConverter Updates
- [ ] Tool conversion methods leave IDs empty for provider to fill
- [ ] `generateToolId()` marked as deprecated with clear explanation
- [ ] No internal ID generation attempts
- [ ] Proper documentation of delegation to provider
- [ ] Existing functionality preserved for non-ID aspects

## Success Criteria

- **All tool ID TDD tests pass**: 0 failing tests in tool ID test suites
- **Realistic ID generation**: IDs follow toolu_[12-hex] pattern exactly
- **ID uniqueness guaranteed**: Different tool calls get different IDs
- **Proper matching**: tool_use and tool_result IDs match in conversation flow
- **Error handling**: Clear errors for unmatched tool results
- **Performance**: Efficient O(1) tool ID lookup and storage
- **Thread safety**: Safe for concurrent tool ID operations

## Integration Testing

After implementation, test with realistic tool call scenarios:

```bash
# Test tool ID generation and uniqueness
node -e "
const { AnthropicToolIdTracker } = require('./dist/packages/core/src/providers/anthropic/AnthropicToolIdTracker.js');

const tracker = new AnthropicToolIdTracker();

// Generate multiple IDs
const ids = [];
for (let i = 0; i < 100; i++) {
  ids.push(tracker.generateId());
}

console.log('Sample IDs:', ids.slice(0, 5));
console.log('All unique:', new Set(ids).size === 100);
console.log('All match pattern:', ids.every(id => /^toolu_[A-Za-z0-9]{12}$/.test(id)));
"

# Test tool call tracking
node -e "
const { AnthropicToolIdTracker } = require('./dist/packages/core/src/providers/anthropic/AnthropicToolIdTracker.js');

const tracker = new AnthropicToolIdTracker();

// Simulate tool use/result flow
const functions = ['search', 'calculate', 'weather'];
const idMap = new Map();

functions.forEach(func => {
  const id = tracker.generateId();
  tracker.storeToolCall(func, id);
  idMap.set(func, id);
});

// Verify retrieval
functions.forEach(func => {
  const stored = tracker.getToolIdForFunction(func);
  const expected = idMap.get(func);
  console.log(func + ':', stored === expected, stored);
});
"
```

## Phase Completion Marker

Create: `project-plans/simplification-p2/.completed/P07.md`

```markdown
Phase: P07 - Anthropic Tool ID Implementation
Completed: 2025-08-24 HH:MM
Files Modified: 4 core tool ID handling files
Methods Implemented: 12 tool ID generation and tracking methods
Tests Passing: All tool ID TDD tests pass
ID Format: Realistic toolu_[12-hex] generation working
ID Tracking: Complete tool_use/tool_result matching working
Error Handling: Clear errors for unmatched tool results
Performance: Efficient Map-based tool ID storage
Integration: Tool IDs work correctly throughout conversation flows
```

This implementation makes all TDD tests pass and provides complete, working tool ID generation and matching for Anthropic provider conversations.