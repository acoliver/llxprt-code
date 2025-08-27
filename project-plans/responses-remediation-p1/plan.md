# OpenAI Responses API Remediation - Implementation Plan

## Objective
Fix the OpenAI Responses API implementation to correctly handle function calls, message ordering, and ID management while preserving the unified Content[] architecture.

## Critical Constraints
- **DO NOT** refactor the entire system or change the Content[] format
- **DO NOT** modify how other providers work
- **DO NOT** remove the adapter pattern or OpenAIContentConverter
- **DO NOT** change the public API or how tools are defined
- **PRESERVE** all existing functionality while fixing the specific issues

## Implementation Tasks

### Task 1: Fix ID Preservation in OpenAIContentConverter
**File**: `packages/core/src/providers/converters/OpenAIContentConverter.ts`

#### Current Problem
- Lines 82-86: Function response IDs are extracted but may be missing
- Lines 114-119: Function call IDs may be missing, causing errors
- The `fixOrphanedToolResponses` method (lines 169-252) is a band-aid

#### Required Changes
1. **Line 114-119**: Replace the error throwing with ID generation:
```typescript
// OLD: Throws error if ID missing
if (!callId) {
  throw new Error(`Function call for '${part.functionCall.name}' is missing required ID`);
}

// NEW: Generate fallback ID with warning
if (!callId) {
  callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.warn(`[OpenAIContentConverter] Missing function call ID for '${part.functionCall.name}', generated: ${callId}`);
}
```

2. **Line 82-86**: Similar fix for function responses:
```typescript
// OLD: Throws error if ID missing
if (!responseId) {
  throw new Error(`Function response for '${part.functionResponse.name}' is missing required ID`);
}

// NEW: Generate fallback ID
if (!responseId) {
  // Try to find matching call ID from pendingToolCalls
  responseId = pendingToolCalls.get(part.functionResponse.name || 'unknown') || 
              `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.warn(`[OpenAIContentConverter] Missing function response ID for '${part.functionResponse.name}', using: ${responseId}`);
}
```

3. **Line 277**: Ensure IDs are preserved in fromProviderFormat:
```typescript
// Ensure we always set the ID
const functionCall: FunctionCall = {
  id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name: tc.function.name,
  args: JSON.parse(tc.function.arguments)
};
```

### Task 2: Fix Message Ordering in buildResponsesRequest
**File**: `packages/core/src/providers/openai/buildResponsesRequest.ts`

#### Current Problem
- Lines 204-314: Extracts all function calls first, then messages, then appends at end
- This destroys the conversational flow

#### Required Changes
Replace the entire section (lines 200-314) with proper ordering:

```typescript
// Transform messages for Responses API format
let transformedMessages: ResponsesMessage[] = [];

if (openAIMessages) {
  // Build input array in conversational order
  for (let i = 0; i < openAIMessages.length; i++) {
    const msg = openAIMessages[i];
    
    if (!msg) continue;
    
    // Handle different message types in order
    if (msg.role === 'assistant') {
      // Add assistant message content if present
      if (msg.content || !msg.tool_calls) {
        // Ensure content is always a string for Responses API
        transformedMessages.push({
          role: 'assistant',
          content: ensureJsonSafe(msg.content || ''),
          ...(msg.usage ? { usage: msg.usage } : {})
        });
      }
      
      // Add function calls immediately after assistant message
      if (msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          if (toolCall.type === 'function') {
            transformedMessages.push({
              type: 'function_call' as const,
              call_id: toolCall.id,
              name: toolCall.function.name,
              arguments: ensureJsonSafe(toolCall.function.arguments) // Apply sanitization
            });
          }
        }
      }
    } else if (msg.role === 'tool') {
      // Add function output in order
      if (msg.tool_call_id && msg.content) {
        transformedMessages.push({
          type: 'function_call_output' as const,
          call_id: msg.tool_call_id,
          output: ensureJsonSafe(msg.content)
        });
      }
    } else if (msg.role === 'user' || msg.role === 'system') {
      // Add user/system messages in order
      transformedMessages.push({
        role: msg.role,
        content: ensureJsonSafe(msg.content || '')
      });
    }
  }
}

// Update request building (line 293-314)
if (transformedMessages.length > 0) {
  request.input = transformedMessages;
}
```

### Task 3: Fix Message Trimming for Stateful Mode
**File**: `packages/core/src/providers/openai/buildResponsesRequest.ts`

#### Current Problem
- Lines 162-177: Trimming can break function call/output pairs

#### Required Changes
Replace the trimming logic (lines 162-177) with stateful-aware trimming:

```typescript
// Apply message trimming for stateful mode
if (parentId && validMessages.length > 0) {
  // For stateful mode with parent_id, we only need the latest user input
  // The server maintains conversation history
  
  // Find the last user message
  const lastUserIndex = validMessages.findLastIndex(msg => msg && msg.role === 'user');
  
  if (lastUserIndex >= 0) {
    // Include only from the last user message onwards
    // This preserves any pending function calls/outputs that follow
    validMessages = validMessages.slice(lastUserIndex);
    
    console.debug(`[buildResponsesRequest] Stateful mode: trimmed to ${validMessages.length} messages from index ${lastUserIndex}`);
  }
} else if (!parentId && conversationId && validMessages.length > 20) {
  // Non-stateful but with conversation: apply smart trimming
  // Keep system messages, trim middle, preserve recent messages
  
  const systemMessages = validMessages.filter(msg => msg && msg.role === 'system');
  const nonSystemMessages = validMessages.filter(msg => msg && msg.role !== 'system');
  
  if (nonSystemMessages.length > 15) {
    // Keep first 5 and last 10 non-system messages
    const trimmedMessages = [
      ...nonSystemMessages.slice(0, 5),
      ...nonSystemMessages.slice(-10)
    ];
    validMessages = [...systemMessages, ...trimmedMessages];
    
    console.debug(`[buildResponsesRequest] Trimmed conversation to ${validMessages.length} messages`);
  }
}
```

### Task 4: Add Safe JSON Operations
**File**: Create new file `packages/core/src/utils/jsonUtils.ts`

```typescript
/**
 * Safe JSON parsing with fallback
 */
export function safeJsonParse<T = any>(str: string, fallback: T): T {
  if (!str || typeof str !== 'string') {
    return fallback;
  }
  
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    console.warn('[jsonUtils] Failed to parse JSON:', e instanceof Error ? e.message : e);
    console.debug('[jsonUtils] Invalid JSON string:', str.substring(0, 100));
    return fallback;
  }
}

/**
 * Safe JSON stringify with fallback
 */
export function safeJsonStringify(obj: any, fallback: string = '{}'): string {
  if (obj === undefined || obj === null) {
    return fallback;
  }
  
  try {
    return JSON.stringify(obj);
  } catch (e) {
    console.warn('[jsonUtils] Failed to stringify object:', e instanceof Error ? e.message : e);
    return fallback;
  }
}
```

Then update all JSON operations:
- `OpenAIContentConverter.ts` line 125: Use `safeJsonStringify`
- `OpenAIContentConverter.ts` line 279: Use `safeJsonParse`
- `OpenAIContentConverter.ts` line 321: Use `safeJsonParse`
- `parseResponsesStream.ts` line 153: Use `safeJsonParse`

### Task 5: Fix Stream Parser ID Handling
**File**: `packages/core/src/providers/openai/parseResponsesStream.ts`

#### Current Problem
- Lines 395-400: Inconsistent use of item.id vs call_id

#### Required Changes
Fix the ID handling in function call tracking (lines 395-400):

```typescript
// A new function call is starting
if (event.item?.type === 'function_call' && event.item.id) {
  // Use item.id as the map key (what we'll get in later events)
  // Store call_id as the actual ID for the function call
  const callId = event.item.call_id || event.item.id;
  
  functionCalls.set(event.item.id, {
    id: callId, // This is what goes in the Content
    name: event.item.name || '',
    arguments: event.item.arguments || '',
    output_index: event.output_index || 0,
  });
  
  console.debug(`[parseResponsesStream] Tracking function call: map_key=${event.item.id}, call_id=${callId}, name=${event.item.name}`);
}
```

### Task 6: Apply Complete Unicode Sanitization
Already handled in Task 2 - all strings going to the API are wrapped with `ensureJsonSafe()`

## Testing Requirements

After implementing ALL changes:

1. **Test function calling flow**:
   - Create a simple test that calls a function
   - Verify the function call has an ID
   - Verify the function response matches the call ID

2. **Test message ordering**:
   - Send a conversation with mixed messages and function calls
   - Verify the `input` array maintains conversational order

3. **Test stateful mode**:
   - Send a request with `parentId` set
   - Verify only recent messages are included
   - Verify conversation still works (server has history)

4. **Test error handling**:
   - Send malformed JSON in function arguments
   - Verify it doesn't crash, uses fallback

## Validation Checklist

- [ ] All changes are made to the specified files only
- [ ] No changes to Content[] format or other providers
- [ ] Function calls always have IDs (generated if needed)
- [ ] Message order in `input` array matches conversation flow
- [ ] Stateful mode with parentId only sends recent messages
- [ ] All JSON operations use safe wrappers
- [ ] Unicode sanitization applied to all user-facing strings
- [ ] Debug logging added for ID generation and trimming
- [ ] Existing tests still pass
- [ ] New test cases added for the fixes

## What NOT to Do

- **DO NOT** create new abstractions or patterns
- **DO NOT** refactor working code outside the specified sections
- **DO NOT** change how tools are defined or registered
- **DO NOT** modify the streaming logic beyond ID handling
- **DO NOT** remove the fixOrphanedToolResponses method (keep as safety net)
- **DO NOT** change the Content[] structure
- **DO NOT** modify any other providers

## Expected Outcome

After these changes:
1. OpenAI Responses API will work with function calls
2. IDs will be consistent between calls and outputs
3. Messages will maintain proper conversational order
4. Stateful mode will efficiently use parentId
5. System will be robust against malformed data
6. All existing functionality remains intact