# HistoryService Domain Analysis

## Overview

This document provides a comprehensive domain analysis for the HistoryService implementation, based on requirements HS-001 to HS-060 and the current codebase reality. The analysis focuses on the EXACT integration points and constraints identified in the memo.

## 1. Entity Relationships

### Core Entities

```
HistoryEntry (Primary Entity)
├── id: string (unique identifier)
├── timestamp: number (creation time)
├── type: 'user' | 'model' | 'tool' | 'synthetic'
├── content: Content (Google GenAI Content structure)
├── metadata: HistoryMetadata
└── state: EntryState

Content (From @google/genai)
├── role: 'user' | 'model'
└── parts: Part[] (array of content parts)

Part (From @google/genai) 
├── text?: string
├── functionCall?: FunctionCall
├── functionResponse?: FunctionResponse
└── [other Google GenAI part types]

HistoryMetadata
├── source: 'user' | 'provider' | 'tool_scheduler' | 'synthetic'
├── toolCallIds?: string[] (for tool-related entries)
├── parentEntryId?: string (for merged entries)
├── isMerged?: boolean (merged tool responses)
├── isSynthetic?: boolean (cancelled/orphaned tools)
├── cancellationReason?: CancellationReason
└── validationState: 'valid' | 'invalid' | 'pending'

ToolCall (Extracted from Content.parts)
├── id: string
├── name: string
└── args: Record<string, unknown>

ToolResponse (Extracted from Content.parts)
├── id: string (matches ToolCall.id)
├── name: string
└── response: unknown
```

### Entity Relationships

```
1. HistoryEntry contains Content (1:1)
2. Content contains multiple Parts (1:N)
3. Parts may contain ToolCall or ToolResponse (0:1 each)
4. ToolCall.id must match ToolResponse.id (1:1 when complete)
5. HistoryEntry may reference parent entries (N:1)
6. Multiple HistoryEntries may share toolCallIds (N:M)
```

### Constraints from Current Code

- **Content Structure**: Must use Google GenAI Content interface exactly (line 16, geminiChat.ts)
- **History Array**: Currently `private history: Content[] = []` (line 306, geminiChat.ts) 
- **Tool IDs**: Generated as `${fnCall.name}-${Date.now()}-${Math.random().toString(16).slice(2)}` (turn.ts line 309)
- **Synthetic Responses**: Only exist in OpenAI provider currently (lines 978-1061)

## 2. State Transitions

### HistoryService States (HS-015 to HS-017)

```
States:
- IDLE: No operations in progress, ready for new operations
- MODEL_RESPONDING: Model is generating response, no history changes allowed
- TOOLS_PENDING: Tool calls received but not executed
- TOOLS_EXECUTING: Tools are running, awaiting responses

Transitions:
IDLE → MODEL_RESPONDING (addUserMessage triggers model call)
MODEL_RESPONDING → IDLE (model response without tools)
MODEL_RESPONDING → TOOLS_PENDING (model response contains tool calls)
TOOLS_PENDING → TOOLS_EXECUTING (tool execution begins)
TOOLS_EXECUTING → IDLE (all tools complete, responses committed)
TOOLS_EXECUTING → IDLE (tools aborted, synthetic responses added)
ANY → IDLE (clear() operation)
```

### Invalid State Transitions (HS-016)

```
Prevented Operations:
- addUserMessage() while MODEL_RESPONDING or TOOLS_EXECUTING
- addModelResponse() while TOOLS_PENDING or TOOLS_EXECUTING  
- commitToolResponses() while IDLE or MODEL_RESPONDING
- abortPendingToolCalls() while IDLE or MODEL_RESPONDING
```

### Entry States

```
EntryState:
- VALID: Entry passed validation
- INVALID: Entry failed validation (orphaned calls/responses)
- PENDING: Entry waiting for completion (incomplete tool pairs)
- MERGED: Entry created by merging tool responses
- SYNTHETIC: Entry created for cancelled/orphaned tools
```

## 3. Business Rules (HS-018 to HS-022)

### Tool Call/Response Validation

```
Rule: Tool calls and responses must be paired (HS-018, HS-019, HS-020)
- Every ToolCall must have matching ToolResponse with same ID
- Every ToolResponse must have matching ToolCall with same ID  
- Tool pairs must be in same message or adjacent messages
- Synthetic responses are allowed for cancelled tools

Rule: Tool calls and responses are atomic (HS-011)
- Tool calls and responses NEVER added separately
- Must use pending → commit pattern
- Failed commits leave no partial state

Rule: Multiple parallel tools supported (HS-014)
- Single model message can contain multiple tool calls
- All tool calls tracked together as group
- All must complete before commit or all must abort
```

### History Structure Validation (HS-021)

```
Rule: History must maintain conversation flow
- User messages followed by model responses
- Tool calls within model messages only
- Tool responses follow tool calls in next message
- No orphaned entries allowed in final state

Rule: Provider-agnostic validation (HS-022)  
- Validation logic cannot depend on specific provider formats
- Must work with Google GenAI Content structure only
- Provider-specific handling isolated to converters
```

### Error Recovery Rules (HS-023 to HS-025)

```
Rule: Conditional removal only (HS-023)
- removeLastEntry() only if content matches exactly
- No automatic cleanup of valid entries
- Explicit confirmation required for removal

Rule: Preserve tool responses (HS-024, HS-025)
- Tool responses remain in history even on errors
- Empty model responses do not remove tool responses
- Synthetic responses preserve tool call context
```

## 4. Edge Cases

### Tool Execution Edge Cases

```
1. Cancelled Tool Calls (from geminiChat.ts lines 468-571)
   - User cancels during tool execution
   - Stream interrupted mid-tool
   - Tool times out
   - Solution: Generate synthetic response with cancellation reason

2. Orphaned Tool Calls (existing in geminiChat.recordHistory)
   - Model generates tool calls but response missing
   - Provider fails to return tool response
   - Solution: Scan backwards, insert synthetic responses

3. Multiple Tool Calls in Single Message
   - Some tools succeed, some fail
   - Partial completion scenarios
   - Solution: Commit all or abort all (atomic operation)

4. Tool Response Without Call
   - Malformed provider response
   - ID mismatch between call and response  
   - Solution: Validation error, reject entry
```

### Provider-Specific Edge Cases

```
1. OpenAI Synthetic Response Handling (lines 978-1061)
   - Currently only OpenAI handles _synthetic metadata
   - Need to standardize across all providers
   - Solution: Move to HistoryService

2. Gemini Direct Pass-Through (GeminiProvider line 480)
   - No format conversion currently
   - Must maintain compatibility
   - Solution: HistoryService provides Content[] directly

3. Anthropic Message Conversion (lines 754-897)
   - No synthetic response support
   - Solution: HistoryService handles before conversion
```

### Stream Processing Edge Cases

```
1. EmptyStreamError (geminiChat.ts lines 777-793)
   - Model returns empty stream
   - User message may need removal
   - Exception: Preserve if function responses present
   - Solution: Conditional removal based on content

2. Stream Interruption During Tools
   - Connection lost during tool execution
   - Partial tool results received
   - Solution: Mark remaining tools as cancelled synthetic
```

## 5. Error Scenarios and Recovery

### Critical Error Scenarios

```
1. History Corruption
   - Concurrent modifications
   - State inconsistency
   - Recovery: Rollback to last valid state, emit error event

2. Tool ID Collision
   - Duplicate tool IDs generated
   - Multiple tools with same ID
   - Recovery: Generate new unique ID, log collision

3. Provider Format Incompatibility
   - Content structure changes
   - Invalid Part objects
   - Recovery: Validation error, reject invalid entries

4. Memory Exhaustion (HS-036)
   - History exceeds 1000 messages limit
   - Performance degradation
   - Recovery: Automatic compression (when enabled)
```

### Recovery Strategies

```
1. Atomic Operations
   - All multi-step operations use transactions
   - Rollback on any step failure
   - Leave history in consistent state

2. Event System Error Handling (HS-026 to HS-029)
   - Emit error events for subscribers
   - Allow external error handling
   - Continue operation after error events

3. Validation Recovery
   - Invalid entries marked but not removed
   - Repair operations for orphaned tools
   - Graceful degradation for malformed content
```

## 6. Integration Points (Current Code Reality)

### GeminiChat Constructor Integration

```typescript
// CURRENT: /packages/core/src/core/geminiChat.ts line 302-310
constructor(
  private readonly config: Config,
  private readonly contentGenerator: ContentGenerator,
  private readonly generationConfig: GenerateContentConfig = {},
  private history: Content[] = [],
) {
  validateHistory(history);
  this.logger = new DebugLogger('llxprt:core:geminiChat');
}

// NEW: Add historyService parameter
constructor(
  private readonly config: Config,
  private readonly contentGenerator: ContentGenerator,
  private readonly generationConfig: GenerateContentConfig = {},
  private readonly historyService: IHistoryService,
) {
  this.logger = new DebugLogger('llxprt:core:geminiChat');
}
```

### Turn.handlePendingFunctionCall Integration

```typescript
// CURRENT: /packages/core/src/core/turn.ts lines 304-325
private handlePendingFunctionCall(
  fnCall: FunctionCall,
): ServerGeminiStreamEvent | null {
  const callId = fnCall.id ?? `${fnCall.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  // ... existing logic
  this.pendingToolCalls.push(toolCallRequest);
  return { type: GeminiEventType.ToolCallRequest, value: toolCallRequest };
}

// NEW: Integrate with HistoryService
private async handlePendingFunctionCall(
  fnCall: FunctionCall,
): Promise<ServerGeminiStreamEvent | null> {
  const callId = fnCall.id ?? `${fnCall.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  // ... existing logic
  await this.historyService.addPendingToolCall(callId, fnCall);
  return { type: GeminiEventType.ToolCallRequest, value: toolCallRequest };
}
```

### Provider History Access Points

```typescript
// CURRENT: Providers receive Content[] arrays directly
// AnthropicProvider.convertContentsToAnthropicMessages(contents: Content[])
// OpenAIProvider.sendMessage(contents: Content[]) 
// GeminiProvider uses contents directly

// NEW: Providers get history from HistoryService
const history = await this.historyService.getCuratedHistory();
// Then convert as normal
```

### Methods to Replace (EXACT locations)

```typescript
// 1. geminiChat.recordHistory() (lines 1034-1165)
//    Replace with: historyService.addUserMessage() and historyService.addModelResponse()

// 2. geminiChat.extractCuratedHistory() (lines 232-276)  
//    Replace with: historyService.getCuratedHistory()

// 3. geminiChat.shouldMergeToolResponses() (lines 1198-1253)
//    Replace with: historyService.mergeToolResponses()

// 4. Direct history array access (line 306 and throughout)
//    Replace with: historyService method calls

// 5. Orphaned tool fixing (lines 468-571)
//    Replace with: historyService.fixOrphanedToolCalls()
```

## 7. Constraints (HS-057 to HS-060)

### Technical Constraints

```
1. TypeScript with strict checking (HS-057)
   - All interfaces must be strictly typed
   - No 'any' types allowed  
   - Proper generic constraints

2. No new external dependencies (HS-058)
   - Use existing libraries only
   - No additional npm packages
   - Leverage existing utilities

3. Follow project coding standards (HS-059)
   - Match existing file structure
   - Use existing naming conventions
   - Follow established patterns

4. Use DebugLogger for all logging (HS-060)
   - No console.log statements
   - Consistent log levels
   - Structured log messages
```

### Performance Constraints (HS-036 to HS-038)

```
1. Handle 1000+ messages without degradation (HS-036)
   - Efficient data structures
   - Avoid O(n²) operations
   - Memory-conscious implementation

2. O(1) time for recent messages (HS-037)
   - getLastEntry(), getLastUserMessage(), getLastModelMessage()
   - Use direct array access or caching
   - No iteration for common operations

3. O(n) time for validation (HS-038)
   - Single pass validation where possible
   - Incremental validation preferred
   - Batch validation for full history
```

### Compatibility Constraints (HS-039 to HS-041)

```
1. Work with interactive and non-interactive modes (HS-039)
   - Support both CLI and programmatic usage
   - No mode-specific dependencies

2. Maintain Content and Part interface compatibility (HS-040)
   - Use Google GenAI types exactly
   - No custom content structures
   - Preserve all existing fields

3. No changes to provider implementations (HS-041)
   - Providers receive same Content[] format
   - No new provider interfaces required
   - Backward compatible history access
```

### Migration Constraints (HS-053 to HS-056)

```
1. Preserve existing conversation history (HS-053)
   - Migrate in-place without data loss
   - Maintain conversation continuity
   - No format changes required

2. Incremental migration possible (HS-054)
   - Can migrate component by component
   - No big-bang deployment required
   - Graceful fallback during migration

3. Maintain all public APIs (HS-055)
   - GeminiChat public interface unchanged
   - No breaking changes to callers
   - Internal refactoring only

4. No UI component changes required (HS-056)
   - Existing React components work unchanged
   - Event interfaces remain compatible
   - No new UI integration needed
```

## 8. Critical Implementation Requirements

### No Backward Compatibility Shims

```
- Direct replacement only (memo constraint)
- No dual-mode operation
- No compatibility layers
- Rip out old, put in new approach
```

### Requirements-Driven Development

```
- Every test must reference specific HS-XXX requirement
- No features beyond requirements scope
- No performance optimization beyond HS-036/037/038
- Focus on requirements fulfillment only
```

### Pseudocode Compliance

```
- Phase 02 creates numbered pseudocode
- Implementation must follow pseudocode line-by-line
- TDD phases reference specific pseudocode lines
- Verification checks pseudocode compliance
```

### Integration-First Approach

```
- Modify existing files, don't create isolated systems
- Integration modifies real constructor signatures
- Real method replacements, not new parallel systems
- Work within existing architecture patterns
```

This domain analysis provides the foundation for implementing the HistoryService according to the exact requirements and current code reality, ensuring successful integration without breaking existing functionality.