# Feature Specification: Provider Content Simplification

## Purpose

Eliminate the IMessage interface and pass Content[] directly from GeminiChat to providers, using dedicated converter classes for format translation. This simplifies the architecture by removing unnecessary intermediate formats and duplicate conversation tracking.

## Architectural Decisions

- **Pattern**: Adapter Pattern with dedicated converters
- **Technology Stack**: TypeScript, existing Gemini Content types
- **Data Flow**: GeminiChat Content[] → Provider → Converter → API
- **Integration Points**: All existing providers (OpenAI, Anthropic, Gemini)

## Project Structure

```
packages/core/src/
  providers/
    converters/
      IContentConverter.ts         # Interface for converters
      OpenAIContentConverter.ts     # OpenAI format conversion
      AnthropicContentConverter.ts  # Anthropic format conversion
      converters.test.ts           # Converter tests
    openai/
      OpenAIProvider.ts            # Modified to use Content[]
    anthropic/
      AnthropicProvider.ts         # Modified to use Content[]
    gemini/
      GeminiProvider.ts            # Modified to use Content[] directly
    adapters/
      GeminiCompatibleWrapper.ts  # Modified to pass Content[]
```

## Technical Environment
- **Type**: Core library refactoring
- **Runtime**: Node.js 20.x
- **Dependencies**: Existing @google/genai types

## Integration Points (MANDATORY SECTION)

### Existing Code That Will Use This Feature
- `/packages/core/src/providers/adapters/GeminiCompatibleWrapper.ts` - Will pass Content[] to providers
- `/packages/core/src/providers/ProviderContentGenerator.ts` - Will pass request.contents directly
- `/packages/core/src/core/geminiChat.ts` - Already provides Content[] in requests

### Existing Code To Be Replaced
- `/packages/core/src/providers/IMessage.ts` - Interface to be removed after migration
- `/packages/core/src/providers/openai/OpenAIProvider.ts` - generateChatCompletion signature change
- `/packages/core/src/providers/anthropic/AnthropicProvider.ts` - generateChatCompletion signature change
- `/packages/core/src/providers/gemini/GeminiProvider.ts` - convertMessagesToGeminiFormat to be removed
- All IMessage[] parameters throughout provider code

### User Access Points
- No user-facing changes - internal refactoring only
- CLI commands continue to work identically
- Provider switching remains transparent

### Migration Requirements
- All providers must be updated simultaneously to prevent type mismatches
- Existing tests need updating to use Content[] instead of IMessage[]
- GeminiCompatibleWrapper needs modification to pass Content[] directly

## Formal Requirements

[REQ-001] Content Format Unification
  [REQ-001.1] Providers accept Content[] instead of IMessage[]
  [REQ-001.2] Remove IMessage interface after migration
  [REQ-001.3] Preserve all existing provider functionality

[REQ-002] Converter Implementation
  [REQ-002.1] Create IContentConverter interface
  [REQ-002.2] Implement OpenAIContentConverter for OpenAI format translation
  [REQ-002.3] Implement AnthropicContentConverter for Anthropic format translation
  [REQ-002.4] Converters must handle tool calls and responses correctly

[REQ-003] Provider Simplification
  [REQ-003.1] OpenAIProvider uses OpenAIContentConverter internally
  [REQ-003.2] AnthropicProvider uses AnthropicContentConverter internally
  [REQ-003.3] GeminiProvider passes Content[] directly without conversion
  [REQ-003.4] Remove duplicate conversation caches from providers

[REQ-INT-001] Integration Requirements
  [REQ-INT-001.1] GeminiCompatibleWrapper passes Content[] from request
  [REQ-INT-001.2] ProviderContentGenerator passes request.contents directly
  [REQ-INT-001.3] All existing tests continue to pass
  [REQ-INT-001.4] No changes to external API or user-facing behavior

## Data Schemas

```typescript
// Existing Gemini Content type (from @google/genai)
interface Content {
  role: 'user' | 'model';
  parts: Part[];
}

interface Part {
  text?: string;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
  // ... other part types
}

// New converter interface
interface IContentConverter {
  toProviderFormat(contents: Content[]): unknown;
  fromProviderFormat(response: unknown): Content;
}

// OpenAI format (target of conversion)
interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

// Anthropic format (target of conversion)
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}
```

## Example Data

```json
{
  "geminiContent": [
    {
      "role": "user",
      "parts": [{ "text": "Hello" }]
    },
    {
      "role": "model",
      "parts": [
        { "text": "I'll help you" },
        { "functionCall": { "name": "search", "args": { "query": "test" } } }
      ]
    },
    {
      "role": "user",
      "parts": [
        { "functionResponse": { "name": "search", "response": { "results": [] } } }
      ]
    }
  ],
  "openAIMessages": [
    { "role": "user", "content": "Hello" },
    {
      "role": "assistant",
      "content": "I'll help you",
      "tool_calls": [{ "id": "1", "type": "function", "function": { "name": "search", "arguments": "{\"query\":\"test\"}" } }]
    },
    { "role": "tool", "content": "{\"results\":[]}", "tool_call_id": "1" }
  ]
}
```

## Constraints

- Must maintain backward compatibility during migration
- No changes to external provider APIs
- All existing tests must continue to pass
- Type safety must be maintained throughout

## Performance Requirements

- No performance degradation from current implementation
- Format conversion should be negligible overhead (<1ms)
- Memory usage should not increase