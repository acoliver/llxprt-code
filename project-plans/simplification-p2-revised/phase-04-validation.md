# Phase 4: Validation

## Objective
Comprehensive testing to ensure all fixes work correctly across all providers and modes.

## Integration Tests

### 1. Basic "Hello" Test
For each provider (Gemini, OpenAI, Anthropic):
```bash
# Test that simple messages work without errors
echo "hello" | llxprt --provider [provider]
```

**Expected**: Clean response, no errors about system roles or tool IDs

### 2. Tool Cancellation Test

**Interactive TUI Test**:
1. Start TUI: `llxprt`
2. Select each provider
3. Type: "Create a file called test.txt with hello world"
4. Press ESC while tool is executing
5. Verify:
   - No "multiple tool_result blocks" errors
   - Conversation continues normally
   - Tool shown as cancelled in UI

**Non-Interactive Test**:
```bash
# Tool cancellation not applicable in non-interactive mode
# Verify tools complete normally
echo "Read the current directory" | llxprt --provider [provider]
```

### 3. System Prompt Test

**Test core.md injection**:
1. Verify system prompts from core.md are applied
2. Check each provider handles them correctly:
   - Gemini: via systemInstruction parameter
   - OpenAI: via system message
   - Anthropic API: via system parameter
   - Anthropic OAuth: via message injection

### 4. Responses Endpoint Test

**For OpenAI with gpt-4o**:
```bash
# Should use responses endpoint
echo "hello" | llxprt --provider openai --model gpt-4o

# Test with tools
echo "What files are in the current directory?" | llxprt --provider openai --model gpt-4o
```

**Verify**:
- Responses endpoint is used (check debug logs)
- Tool calls work correctly
- Cancelled tools handled properly (in TUI)

### 5. Complex Conversation Test

**Multi-turn with tools**:
1. Start conversation
2. Use multiple tools
3. Cancel some tools
4. Continue conversation
5. Verify history is maintained correctly

## Automated Test Suite

Run existing tests to ensure no regressions:
```bash
# All provider tests
npm test -- providers

# Tool-related tests
npm test -- tool

# Cancellation tests
npm test -- cancel

# Integration tests
npm test -- integration
```

## Performance Validation

Check that cleanup didn't break performance:
- Message processing speed
- Tool execution speed
- Memory usage (no leaks from simplified code)

## Error Scenario Testing

### 1. Network Interruption
- Start tool execution
- Disconnect network
- Verify graceful error handling

### 2. Invalid Tool Response
- Mock invalid tool response
- Verify proper error propagation

### 3. Malformed Content
- Send Content with invalid structure
- Verify validation catches it

## Provider-Specific Tests

### Anthropic
- Test both API and OAuth modes
- Verify system prompt handling differs correctly
- Test tool ID format (toolu_*)

### OpenAI
- Test both completions and responses endpoints
- Verify synthetic responses for completions
- Test tool_call_id matching

### Gemini
- Test native format handling
- Verify no converters used
- Test functionCall/functionResponse matching by name

## Success Metrics

- ✅ 0 errors in basic usage
- ✅ 100% of existing tests pass
- ✅ Tool cancellations work for all providers
- ✅ System prompts applied correctly
- ✅ No performance regressions
- ✅ Clean debug logs (no warnings about IDs or system roles)

## Sign-off Checklist

- [ ] All providers tested interactively
- [ ] Tool cancellations verified
- [ ] System prompts verified
- [ ] Automated tests pass
- [ ] No hardcoded IDs in code
- [ ] No Content with role='system' reaching providers
- [ ] Code review completed
- [ ] Documentation updated

## Estimated Time: 4 hours