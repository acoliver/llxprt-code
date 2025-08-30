# Phase 30c: Verify Tool Integration

## Objective
Thoroughly test and verify that the HistoryService integration with CoreToolScheduler is working correctly, capturing all tool executions, and preventing duplicate responses.

## Test Plan

### Test 1: Basic Tool Execution Recording

**Command**:
```bash
# Clean start
rm -f ~/.llxprt/history.db
ps -ef | grep -i vitest | grep -v grep | awk '{print $2}' | xargs -r kill -9

# Run a simple tool execution
echo "What time is it?" | npm run cli -- chat --provider anthropic --model claude-3-haiku-20240307

# Check database
sqlite3 ~/.llxprt/history.db "SELECT * FROM tool_executions;"
```

**Expected Output**:
- Database should contain 1 tool_execution record
- Status should be 'completed'
- Tool name should match executed tool
- Duration should be > 0

**PASS Criteria**:
- [ ] Tool execution record exists in database
- [ ] All fields populated correctly
- [ ] No duplicate records

### Test 2: Multiple Tool Execution

**Command**:
```bash
# Test multiple tools in one conversation
cat > /tmp/multi-tool-test.txt << 'EOF'
What's the weather in New York?
Also, calculate 15% tip on $87.50
And what time is it in Tokyo?
EOF

npm run cli -- chat --provider anthropic --model claude-3-haiku-20240307 < /tmp/multi-tool-test.txt

# Verify all tools recorded
sqlite3 ~/.llxprt/history.db "SELECT toolName, status FROM tool_executions ORDER BY startedAt;"
```

**Expected Output**:
```
weather|completed
calculator|completed
timezone|completed
```

**PASS Criteria**:
- [ ] All 3 tool executions recorded
- [ ] Each has unique toolId
- [ ] Chronological order preserved

### Test 3: Failed Tool Execution

**Command**:
```bash
# Test with invalid tool arguments to trigger failure
echo "Calculate the square root of negative one" | npm run cli -- chat --provider anthropic

# Check for failed status
sqlite3 ~/.llxprt/history.db "SELECT toolName, status, error FROM tool_executions WHERE status='failed';"
```

**Expected Output**:
- At least one record with status='failed'
- Error field contains meaningful error message

**PASS Criteria**:
- [ ] Failed executions are recorded
- [ ] Error messages are captured
- [ ] Status is 'failed', not 'pending'

### Test 4: Duplicate Response Prevention

**Command**:
```bash
# Create test that would previously cause duplicates
npm run test -- src/tools/core-tool-scheduler.test.ts --grep "duplicate"

# Manual verification
echo "What's 2+2?" | npm run cli -- chat --provider anthropic --verbose | grep -c "tool.*result"
```

**Expected Output**:
- Test passes
- Only 1 tool result in output

**PASS Criteria**:
- [ ] No duplicate tool responses in conversation
- [ ] Each tool ID appears exactly once
- [ ] Database and conversation messages match

### Test 5: Multi-Provider Verification

**Script**: `/tmp/test-all-providers.sh`
```bash
#!/bin/bash
set -e

PROVIDERS=("anthropic" "openai" "groq" "cerebras")
TEST_PROMPT="What's the current time?"

for provider in "${PROVIDERS[@]}"; do
  echo "Testing $provider..."
  
  # Clear previous data
  rm -f ~/.llxprt/history.db
  
  # Run test
  echo "$TEST_PROMPT" | npm run cli -- chat --provider "$provider" 2>/dev/null
  
  # Verify recording
  COUNT=$(sqlite3 ~/.llxprt/history.db "SELECT COUNT(*) FROM tool_executions;")
  
  if [ "$COUNT" -ge 1 ]; then
    echo "✓ $provider: Recorded $COUNT tool execution(s)"
  else
    echo "✗ $provider: No tool executions recorded"
    exit 1
  fi
done

echo "All providers passed!"
```

**Run**:
```bash
chmod +x /tmp/test-all-providers.sh
/tmp/test-all-providers.sh
```

**PASS Criteria**:
- [ ] All providers record tool executions
- [ ] No provider-specific failures
- [ ] Consistent behavior across providers

### Test 6: Performance Verification

**Command**:
```bash
# Measure performance impact
cat > /tmp/perf-test.js << 'EOF'
const start = Date.now();
const runs = 10;

for (let i = 0; i < runs; i++) {
  // Execute tool-heavy operation
  await exec('echo "Calculate factorial of 5" | npm run cli -- chat');
}

const avgTime = (Date.now() - start) / runs;
console.log(`Average time: ${avgTime}ms`);
console.log(avgTime < 5000 ? 'PASS' : 'FAIL');
EOF

node /tmp/perf-test.js
```

**PASS Criteria**:
- [ ] Average execution time < 5 seconds
- [ ] No memory leaks detected
- [ ] Database operations < 10ms overhead

### Test 7: Integration Test Suite

**Command**:
```bash
# Kill any running vitest
ps -ef | grep -i vitest | grep -v grep | awk '{print $2}' | xargs -r kill -9

# Run full integration test
npm test -- --run src/history/history-service.test.ts src/tools/core-tool-scheduler.test.ts

# Verify no orphaned processes
ps -ef | grep -i vitest | grep -v grep
```

**PASS Criteria**:
- [ ] All tests pass
- [ ] No test timeouts
- [ ] No orphaned processes

### Test 8: Database Integrity Check

**Command**:
```bash
# After running several tests, check database integrity
sqlite3 ~/.llxprt/history.db << 'EOF'
PRAGMA integrity_check;
SELECT COUNT(*) as total_executions FROM tool_executions;
SELECT COUNT(DISTINCT conversationId) as unique_conversations FROM tool_executions;
SELECT COUNT(*) as orphaned_tools FROM tool_executions WHERE conversationId NOT IN (SELECT id FROM conversations);
EOF
```

**Expected Output**:
```
ok
[number] (total executions)
[number] (unique conversations)
0 (no orphaned tools)
```

**PASS Criteria**:
- [ ] Database integrity check passes
- [ ] No orphaned tool records
- [ ] Foreign key constraints satisfied

## Debugging Commands

If tests fail, use these commands to diagnose:

```bash
# Check if HistoryService is being initialized
grep -r "new HistoryService" packages/

# Verify Turn accepts historyService
grep -A5 -B5 "historyService" packages/core/src/turn.ts

# Check CoreToolScheduler integration
grep -A10 -B10 "historyService.recordToolExecution" packages/core/src/tools/

# View recent tool executions
sqlite3 ~/.llxprt/history.db "SELECT datetime(startedAt), toolName, status, durationMs FROM tool_executions ORDER BY startedAt DESC LIMIT 10;"

# Check for duplicate tool IDs
sqlite3 ~/.llxprt/history.db "SELECT toolId, COUNT(*) as count FROM tool_executions GROUP BY toolId HAVING count > 1;"
```

## Final Verification Checklist

**MUST PASS ALL**:
- [ ] Tool executions are recorded in database
- [ ] No duplicate tool responses in conversation
- [ ] Failed tools are properly recorded
- [ ] All providers work correctly
- [ ] Performance overhead < 10ms
- [ ] Database maintains integrity
- [ ] No orphaned records
- [ ] Tool IDs are unique
- [ ] Status transitions are correct
- [ ] Error messages are captured

## Success Criteria

The integration is considered successful when:
1. Every tool execution creates exactly one database record
2. No duplicate tool responses appear in conversations
3. All providers behave consistently
4. Performance impact is negligible (< 10ms)
5. Database maintains referential integrity
6. Failed executions are properly recorded

## Failure Recovery

If verification fails:
1. Check Turn constructor for historyService parameter
2. Verify CoreToolScheduler has access to historyService
3. Ensure database is initialized before use
4. Check for race conditions in async operations
5. Verify tool IDs are being generated correctly

## Sign-off

Phase 30c is complete when:
- [ ] All 8 tests pass
- [ ] No duplicate responses bug remains
- [ ] Database contains complete history
- [ ] Performance meets requirements
- [ ] Code review completed