# Domain Analysis: Provider Content Simplification

## Entity Relationships

### Core Entities

1. **Content** (Gemini native format)
   - Source of truth for conversation history
   - Contains role and parts
   - Maintained by GeminiChat

2. **IContentConverter** (New interface)
   - Converts Content[] to provider-specific formats
   - Converts provider responses back to Content
   - Stateless, pure transformation

3. **Provider** (Modified)
   - Accepts Content[] instead of IMessage[]
   - Uses internal converter for format translation
   - No longer maintains conversation cache

4. **GeminiCompatibleWrapper** (Modified)
   - Passes Content[] directly from request
   - No intermediate format conversion

## State Transitions

### Content Flow
```
1. User Input → GeminiChat
2. GeminiChat stores as Content in history
3. GeminiChat creates request with Content[]
4. ContentGenerator receives request
5. ProviderContentGenerator extracts request.contents
6. GeminiCompatibleWrapper passes Content[] to provider
7. Provider uses converter to transform to API format
8. API call made with provider-specific format
9. Response converted back to Content by converter
10. Content returned through chain to GeminiChat
11. GeminiChat adds to history
```

### Provider State Changes
- **Before**: Maintains IMessage[] cache, converts from IMessage to API format
- **After**: Stateless, receives Content[], uses converter for format translation

## Business Rules

### Conversion Rules

1. **Role Mapping**
   - Content role 'user' → OpenAI 'user', Anthropic 'user'
   - Content role 'model' → OpenAI 'assistant', Anthropic 'assistant'
   - System messages handled specially per provider

2. **Tool Call Handling**
   - functionCall part → provider-specific tool call format
   - functionResponse part → provider-specific tool response format
   - IDs must be preserved across conversion

3. **Content Preservation**
   - All text content must be preserved
   - Tool calls and responses must maintain relationships
   - Order of messages must be maintained

### Migration Rules

1. **Backward Compatibility**
   - Changes must not break existing tests initially
   - Migration can be done incrementally per provider
   - IMessage can be deprecated after all providers migrated

2. **Type Safety**
   - All conversions must be type-safe
   - Unknown types should cause compilation errors
   - Runtime validation for external responses

## Edge Cases

### Empty Content
- Empty Content[] array should be handled gracefully
- Single Content with empty parts should be filtered
- Providers should handle empty conversation history

### Tool Call Mismatches
- Tool response without matching call should be handled
- Orphaned tool calls should generate synthetic responses
- Multiple tool calls in single message must be preserved

### Format Incompatibilities
- Provider-specific features (e.g., OpenAI's system role)
- Content types not supported by provider (e.g., images)
- Length limitations per provider

### Error Scenarios
- Converter fails to transform format
- API returns unexpected format
- Partial responses from streaming

## Validation Requirements

### Input Validation
- Content[] must have valid structure
- Roles must be 'user' or 'model'
- Parts must be valid Part types

### Conversion Validation
- Converted format must match provider schema
- Tool call IDs must be preserved
- No data loss during conversion

### Response Validation
- Provider responses must be valid format
- Converted Content must have required fields
- Streaming responses must be complete

## Performance Considerations

### Conversion Overhead
- Format conversion should be O(n) where n is message count
- No recursive transformations
- Minimize object allocations

### Memory Usage
- Converters should be stateless (no caching)
- Avoid duplicating large content during conversion
- Stream processing where possible

## Testing Strategy

### Unit Tests
- Each converter tested independently
- Test all content types and combinations
- Edge cases and error conditions

### Integration Tests
- Provider with converter end-to-end
- Content flow through entire chain
- Tool call round trips

### Compatibility Tests
- Existing provider tests should pass with minimal changes
- Verify no behavior changes from user perspective
- Performance benchmarks before/after