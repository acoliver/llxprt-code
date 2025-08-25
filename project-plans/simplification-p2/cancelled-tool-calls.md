# Cancelled Tool Calls Analysis

## Current Implementation Overview

### 1. **Cancellation Mechanisms**

The system has multiple ways tool calls can be cancelled:

1. **User ESC Key Cancellation**:
   - Users press ESC during tool execution to cancel pending tools
   - Handled in `useGeminiStream.ts` with `cancelOngoingRequest()` function
   - Emits `GeminiEventType.UserCancelled` events

2. **AbortSignal Cancellation**:
   - Tools can be cancelled via AbortController signals
   - Handled in `coreToolScheduler.ts` and `turn.ts`
   - Sets tool status to 'cancelled'

3. **User Approval Denial**:
   - User denies tool execution in approval mode
   - Handled in `coreToolScheduler.ts` via `ToolConfirmationOutcome.Cancel`

### 2. **Synthetic Response Generation**

#### OpenAI Provider Only
The **synthetic response handling is currently only implemented for OpenAI** via `SyntheticToolResponseHandler`:

**Location**: `/packages/core/src/providers/openai/syntheticToolResponses.ts`

**Key Features**:
- Creates synthetic tool responses for cancelled tools to satisfy OpenAI API requirements
- Every `tool_call` must have a corresponding `tool` message with matching `tool_call_id`
- Generates standard message: `"Tool execution cancelled by user"`
- Adds metadata flags: `_synthetic: true`, `_cancelled: true`

**Usage**:
```typescript
// In OpenAI Provider responses endpoint
const patchedMessages = SyntheticToolResponseHandler.patchMessageHistory(messages);

// In OpenAI Provider streaming endpoint  
const existingSyntheticCount = messages.filter(
  (msg) => msg._synthetic
).length;
```

#### Other Providers
- **Anthropic Provider**: No synthetic response handling
- **Gemini Provider**: No synthetic response handling  
- **Other OpenAI-compatible providers**: May benefit from synthetic responses but only get them if using OpenAI provider

### 3. **Content[] Format Impact**

#### Current Content[] Representation
Cancelled tools are represented in Content[] format as:
```typescript
{
  role: 'tool',
  tool_call_id: 'call_123',
  content: 'Tool execution cancelled by user',
  _synthetic: true,      // Internal metadata
  _cancelled: true       // Internal metadata
}
```

#### Metadata Handling
- Internal flags (`_synthetic`, `_cancelled`) are stripped before sending to APIs
- These flags are preserved during message history patching
- Used for debugging and preventing duplicate synthetic response generation

## Issues Found

### 1. **Inconsistent Cross-Provider Handling**
- **Critical Issue**: Only OpenAI provider handles synthetic responses
- Anthropic and Gemini may receive incomplete conversation histories when tools are cancelled
- Could lead to context confusion for non-OpenAI providers

### 2. **Content[] Format Compatibility**
- The `_synthetic` and `_cancelled` metadata fields are OpenAI-specific
- Other providers may not handle or expect these fields
- Converters don't appear to have special handling for synthetic responses

### 3. **Edge Case: All Tools Cancelled**
In `useGeminiStream.ts`, there's special handling when all tools are cancelled:
```typescript
const allToolsCancelled = toolsToProcess.every(tc => tc.status === 'cancelled');
if (allToolsCancelled) {
  // Don't submit response to Gemini - but add responses to history
}
```

This could create inconsistent behavior between providers.

### 4. **Tool Scheduler Integration**
- Tool scheduler tracks cancelled tools in `CoreToolScheduler`
- Status set to 'cancelled' with reason strings
- But integration with synthetic response generation is provider-specific

## Recommendations

### 1. **Unify Synthetic Response Handling** ⚠️ High Priority
```typescript
// Move synthetic response logic to base provider or common utility
interface SyntheticResponseConfig {
  enabled: boolean;
  message: string;
  requiresToolCallId: boolean;
}

// Provider-specific configs
const PROVIDER_CONFIGS = {
  openai: { enabled: true, message: "Tool execution cancelled by user", requiresToolCallId: true },
  anthropic: { enabled: false, message: "Tool cancelled", requiresToolCallId: false },
  gemini: { enabled: false, message: "Tool cancelled", requiresToolCallId: false }
}
```

### 2. **Standardize Content[] Format** 🔄 Medium Priority
- Define standard way to represent cancelled tools in Content[]
- Remove provider-specific metadata fields
- Ensure all converters handle cancelled tools consistently

### 3. **Provider Capability Detection** 📋 Medium Priority
Add provider capability flags:
```typescript
interface ProviderCapabilities {
  requiresToolResponseForAllCalls: boolean;  // OpenAI: true, others: false
  supportsSyntheticResponses: boolean;
  handlesPartialToolExecution: boolean;
}
```

### 4. **Enhanced Error Handling** 🐛 Low Priority
- Add validation for cancelled tool scenarios
- Improve error messages when tool cancellation causes format issues
- Better logging for debugging cancelled tool flows

## Impact on Remediation Plan

### Minimal Impact on Core Simplification
The cancelled tool call handling is primarily:
1. **Provider-specific logic** - affects individual provider implementations
2. **UI interaction handling** - affects user experience but not core architecture 
3. **Edge case management** - doesn't block main Content[] format unification

### Integration Points
1. **Provider Adapters**: Need consistent cancellation handling across all providers
2. **Content Converters**: Should handle synthetic responses uniformly  
3. **Tool Scheduler**: Already has good cancellation tracking, needs better provider integration

### Recommended Timeline
- **Phase 1** (Current): Document current behavior ✅ 
- **Phase 2** (Post-unification): Standardize synthetic response handling across providers
- **Phase 3** (Polish): Enhanced error handling and edge case management

## Conclusion

**Tool call cancellation is well-implemented but inconsistent across providers.** The OpenAI-specific synthetic response handling creates a divergence that should be addressed post-unification. The current implementation won't block the main Content[] format remediation but should be standardized for consistency.

**Key Risk**: Cancelled tools may cause context issues for non-OpenAI providers, but this is an existing limitation rather than a new regression from the remediation work.