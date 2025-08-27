# OpenAI Responses API

The OpenAI Responses API is a new endpoint that provides enhanced capabilities for certain models. This document describes how the LLxprt Code integrates with the Responses API, including automatic model detection, streaming support, tool calling, and conversation tracking.

## Overview

The Responses API (`/v1/responses`) is automatically used for compatible models, providing:

- Enhanced streaming capabilities
- Improved tool calling format
- Automatic conversation tracking with sessionId support
- Response metadata with unique responseId values
- Better error handling and retry logic

## Supported Models

The following models automatically use the Responses API:

- `gpt-5` (supports conversation tracking)
- `o3-pro` (REQUIRES Responses API - will not work with legacy endpoint)
- `o3`
- `o3-mini`
- `o1`
- `o1-mini`
- `gpt-4.1`
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4o-realtime`
- `gpt-4-turbo`
- `gpt-4-turbo-preview`

All other models and custom models continue to use the legacy completions endpoint.

## Conversation Tracking

The Responses API supports automatic conversation tracking through sessionId parameters. This enables:

- **Persistent Context**: Conversations maintain context across multiple API calls
- **Response Linking**: Each response includes a unique `responseId` that links to previous messages
- **Automatic Caching**: Conversation history is cached to optimize token usage
- **Context Management**: Automatic handling of context limits with fallback to stateless mode

### Session ID Flow

```typescript
import { OpenAIProvider } from '@vybestack/llxprt-code';

const provider = new OpenAIProvider({ apiKey: 'your-key', model: 'gpt-5' });

// Start a conversation with a session ID
const sessionId = 'user-123-conversation';
const contents = [{ role: 'user', parts: [{ text: 'Hello!' }] }];

// Generate response with conversation tracking
for await (const content of provider.generateChatCompletion(
  contents,
  undefined,
  undefined,
  sessionId,
)) {
  // Each response includes metadata with responseId
  const contentWithMetadata = content as any;
  if (contentWithMetadata.metadata?.responseId) {
    console.log(`Response ID: ${contentWithMetadata.metadata.responseId}`);
  }
}
```

### Response Metadata

Each response from the Responses API includes metadata:

```json
{
  "role": "model",
  "parts": [{ "text": "Hello! How can I help you?" }],
  "metadata": {
    "responseId": "resp_abc123def456"
  }
}
```

The `responseId` is automatically used as the `parentId` for subsequent messages in the conversation, enabling the API to maintain proper conversation threading.

## Configuration

### Environment Variables

```bash
# Disable Responses API for all models (force legacy endpoint)
export OPENAI_RESPONSES_DISABLE=true

# Standard OpenAI configuration
export OPENAI_API_KEY=your-api-key
export OPENAI_BASE_URL=https://api.openai.com/v1  # Optional custom endpoint
```

### Automatic Endpoint Selection

The provider automatically selects the appropriate endpoint based on the model:

```typescript
// Example: Automatic selection
const provider = new OpenAIProvider({ model: 'gpt-4.1' });
// Uses: https://api.openai.com/v1/responses

const provider = new OpenAIProvider({ model: 'o3' });
// Uses: https://api.openai.com/v1/responses

const provider = new OpenAIProvider({ model: 'custom-model' });
// Uses: https://api.openai.com/v1/chat/completions
```

## Request Format

The Responses API uses a different request format than the legacy completions endpoint:

### Basic Request

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ],
  "model": "gpt-4.1",
  "stream": true
}
```

### Request with Tools

```json
{
  "input": [
    {
      "role": "user",
      "content": "What's the weather in San Francisco?"
    }
  ],
  "model": "o3",
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get the current weather",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "City name"
            }
          },
          "required": ["location"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
```

### Request with Conversation Tracking

```json
{
  "input": [
    {
      "role": "user",
      "content": "Hello, I need help with my project"
    }
  ],
  "model": "gpt-5",
  "conversation_id": "user-session-123",
  "previous_response_id": "resp_abc123def456",
  "store": true,
  "stream": true
}
```

## Response Format

### Streaming Responses

The Responses API uses Server-Sent Events (SSE) for streaming:

```
event: response.output_text.delta
data: {"type":"response.output_text.delta","delta":"Hello"}

event: response.output_text.delta
data: {"type":"response.output_text.delta","delta":" there!"}

event: response.completed
data: {"type":"response.completed","response":{"id":"resp_abc123def456","status":"completed","usage":{"input_tokens":10,"output_tokens":15,"total_tokens":25}}}

data: [DONE]
```

### Response with Metadata

Each streaming response includes the final response ID for conversation tracking:

```
event: response.completed
data: {
  "type": "response.completed",
  "response": {
    "id": "resp_abc123def456",
    "object": "response",
    "model": "gpt-5",
    "status": "completed",
    "usage": {
      "input_tokens": 25,
      "output_tokens": 42,
      "total_tokens": 67
    }
  }
}
```

### Tool Calls

Tool calls in the Responses API have a specific format:

```
data: {"type":"content_delta","delta":{"text":"I'll check the weather for you.\n\n"}}

data: {"type":"content_delta","delta":{"text":"<tool_call>"}}
data: {"type":"content_delta","delta":{"text":"\n{\"tool_name\": \"get_weather\", \"parameters\": {\"location\": \"San Francisco\"}}\n"}}
data: {"type":"content_delta","delta":{"text":"</tool_call>"}}
```

## Integration Examples

### Basic Usage

```typescript
import { OpenAIProvider } from '@vybestack/llxprt-code';
import { Content } from '@google/genai';

const provider = new OpenAIProvider({
  model: 'gpt-5',
  apiKey: process.env.OPENAI_API_KEY,
});

// Basic usage with conversation tracking
const sessionId = 'user-conversation-123';
const contents: Content[] = [
  {
    role: 'user',
    parts: [{ text: 'Hello' }],
  },
];

// Automatically uses Responses API with conversation tracking
for await (const content of provider.generateChatCompletion(
  contents,
  undefined,
  undefined,
  sessionId,
)) {
  console.log(content);
}
```

### Tool Calling

```typescript
import { ITool } from '@vybestack/llxprt-code';

const calculatorTool: ITool = {
  function: {
    name: 'calculate',
    description: 'Perform basic arithmetic',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression' },
      },
      required: ['expression'],
    },
  },
};

const contents: Content[] = [
  {
    role: 'user',
    parts: [{ text: 'What is 2+2?' }],
  },
];

const sessionId = 'calc-session-456';

// Handle streaming response with tool calls and conversation tracking
for await (const content of provider.generateChatCompletion(
  contents,
  [calculatorTool],
  undefined,
  sessionId,
)) {
  // Handle text content
  if (content.parts) {
    content.parts.forEach((part) => {
      if ('text' in part && part.text) {
        console.log(part.text);
      } else if ('functionCall' in part) {
        console.log(`Tool: ${part.functionCall.name}`);
        console.log(`Args: ${JSON.stringify(part.functionCall.args)}`);
      }
    });
  }

  // Extract response metadata for conversation tracking
  const contentWithMetadata = content as any;
  if (contentWithMetadata.metadata?.responseId) {
    console.log(`Response ID: ${contentWithMetadata.metadata.responseId}`);
  }
}
```

### Forcing Legacy Endpoint

```typescript
// Option 1: Environment variable
process.env.OPENAI_RESPONSES_DISABLE = 'true';

// Option 2: Use a custom model (not in the Responses API list)
const provider = new OpenAIProvider({
  model: 'my-custom-model', // Automatically uses legacy endpoint
});
```

## Differences from Legacy API

### Request Differences

| Feature     | Legacy (`/v1/chat/completions`) | Responses (`/v1/responses`) |
| ----------- | ------------------------------- | --------------------------- |
| Endpoint    | `/v1/chat/completions`          | `/v1/responses`             |
| Streaming   | Line-based JSON                 | Server-Sent Events          |
| Tool Format | `functions` array               | `tools` array               |
| Tool Choice | `function_call`                 | `tool_choice`               |

### Response Differences

| Feature       | Legacy                    | Responses                            |
| ------------- | ------------------------- | ------------------------------------ |
| Stream Format | `data: {"choices":[...]}` | `data: {"type":"content_delta",...}` |
| Tool Calls    | In `function_call` field  | Embedded in content with markers     |
| Message IDs   | Not provided              | Included in `message_start`          |

## Error Handling

The Responses API provides enhanced error information:

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Invalid tool specification",
    "param": "tools[0].function.parameters",
    "code": "invalid_tool_parameters"
  }
}
```

## Testing

### Unit Tests

```bash
# Run all OpenAI provider tests
npm test OpenAIProvider

# Run specific Responses API tests
npm test OpenAIProvider.responsesIntegration
npm test OpenAIProvider.switch
npm test parseResponsesStream
```

### Integration Tests

```bash
# Test with real API (requires OPENAI_API_KEY)
npm run test:integration -- --grep "Responses API"
```

### Manual Testing

```bash
# Test with gpt-5 (uses Responses API with conversation tracking)
llxprt --provider openai --model gpt-5 "Hello, remember I'm working on a project"

# Continue conversation in same session
llxprt --provider openai --model gpt-5 "What did I tell you about earlier?"

# Test with o3 (uses Responses API)
llxprt --provider openai --model o3 "Hello"

# Test with custom model (uses legacy endpoint, no conversation tracking)
llxprt --provider openai --model my-custom-model "Hello"

# Force legacy endpoint for gpt-5 (disables conversation tracking)
OPENAI_RESPONSES_DISABLE=true llxprt --provider openai --model gpt-5 "Hello"
```

## Performance Considerations

The Responses API generally provides:

- Lower latency for first token
- More consistent streaming performance
- Better handling of long responses
- Improved reliability for tool calls
- Efficient conversation context management through caching
- Automatic fallback to stateless mode when context limits are exceeded

## Conversation Features (Current)

The following conversation tracking features are now implemented:

### Automatic Session Management

```typescript
// Current API - conversation tracking is automatic
const sessionId = 'user-session-123';
for await (const content of provider.generateChatCompletion(
  contents,
  tools,
  undefined,
  sessionId,
)) {
  // Responses automatically include responseId metadata
  // Previous responseIds are used as parentId for context linking
}
```

### Response Caching

- ✅ Automatic caching of conversation responses
- ✅ Token usage tracking and context management
- ✅ Automatic cache invalidation on context overflow
- ✅ Conversation cache API for advanced operations

### Context Management

```typescript
// Check context usage
const contextInfo = provider.estimateContextUsage(
  sessionId,
  parentId,
  messages,
);
console.log(`Context used: ${contextInfo.contextUsedPercent}%`);

// Access conversation cache
const cache = provider.getConversationCache();
const totalTokens = cache.getAccumulatedTokens(sessionId, parentId);
```

## Troubleshooting

### Common Issues

1. **Responses API not being used**
   - Check if `OPENAI_RESPONSES_DISABLE` is set
   - Verify the model is in the supported list
   - Check debug logs: `DEBUG=llxprt:* llxprt --provider openai ...`

2. **Conversation tracking not working**
   - Ensure you're using a supported model (gpt-5, o3, etc.)
   - Verify sessionId is provided to `generateChatCompletion()`
   - Check that response includes `metadata.responseId`
   - Confirm model supports Responses API (check supported models list)

3. **Context limit exceeded**
   - Monitor conversation token usage with `estimateContextUsage()`
   - System automatically retries in stateless mode when context is full
   - Consider starting new sessions when approaching token limits
   - Use conversation cache API to manage long conversations

4. **Tool calls not working**
   - Ensure tools are properly formatted for Responses API
   - Check that `tool_choice` is used instead of `function_call`
   - Verify tool response format matches expected structure

5. **Streaming issues**
   - Ensure SSE parsing is working correctly
   - Check for proxy/firewall interference with streaming
   - Verify `stream: true` is set in request

### Debug Mode

Enable detailed logging to troubleshoot issues:

```bash
# Show all provider operations including conversation tracking
DEBUG=llxprt:provider:* llxprt --provider openai --model gpt-5 "Test conversation tracking"

# Show only OpenAI provider operations
DEBUG=llxprt:providers:openai llxprt --provider openai --model gpt-5 "Test"

# Show conversation cache operations
DEBUG=llxprt:cache:* llxprt --provider openai --model gpt-5 "Test caching"

# Show all debug information
DEBUG=llxprt:* llxprt --provider openai --model gpt-5 "Full debug mode"
```

## See Also

- [API Documentation](../api.md) - Comprehensive API reference with conversation tracking examples
- [Migration Guide](../migration.md) - Migrating from IMessage to Content format
- [OpenAI Provider Configuration](./configuration.md#openai-provider)
- [Tool Calling Guide](./tools.md)
- [Streaming Responses](./streaming.md)
