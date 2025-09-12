# Task 07-10: Folder Trust Security Batch 2

## Commits to Cherry-pick
1. `a0fbe000e` - Skip MCP server connections in untrusted folders
2. `2a0e69d83` - Update config.isTrustedFolder
3. `5e5f2dffc` - Respect folder trust setting when reading GEMINI.md
4. `421f989fa` - Show parent name in trust folder confirmation

## Task Description
Cherry-pick the second batch of folder trust commits. These enhance the folder trust system with MCP server protection, configuration updates, and UX improvements.

## Cherry-pick Process

```bash
# Apply each commit in order
git cherry-pick a0fbe000e  # Skip MCP in untrusted folders
git cherry-pick 2a0e69d83  # Update config trust status
git cherry-pick 5e5f2dffc  # Respect trust for LLXPRT.md
git cherry-pick 421f989fa  # Better trust prompts

# After each cherry-pick, verify with:
git log --oneline -1
```

## Expected Conflicts and Resolutions

### Key File Changes:

#### For GEMINI.md → LLXPRT.md:
```typescript
// Change:
const instructionsFile = 'GEMINI.md';
// To:
const instructionsFile = 'LLXPRT.md';

// Change:
if (filename === 'GEMINI.md' && !isWorkspaceTrusted()) {
// To:
if (filename === 'LLXPRT.md' && !isWorkspaceTrusted()) {
```

#### MCP Server Trust Checks:
The MCP server blocking should work with llxprt's multi-provider MCP system.

## Key Changes by Commit

### 1. a0fbe000e - Skip MCP in Untrusted
- Prevents MCP servers from starting in untrusted folders
- Critical security feature - MCP servers can execute arbitrary code
- Updates `mcp-client-manager.ts` and `mcp-client.ts`

### 2. 2a0e69d83 - Config Trust Status
- Adds `isTrustedFolder` property to config
- Allows other parts of the system to check trust status
- Updates configuration initialization

### 3. 5e5f2dffc - LLXPRT.md Trust
- Prevents reading `LLXPRT.md` (instructions file) from untrusted folders
- **Important**: Change `GEMINI.md` to `LLXPRT.md` throughout

### 4. 421f989fa - Better Trust Prompts
- Shows parent folder name in trust confirmation dialog
- Improves UX by making it clear what directory is being trusted
- Helps users make informed trust decisions

## Testing After Each Commit

```bash
# Test MCP server blocking
cd /tmp/untrusted-mcp-test
mkdir -p .llxprt
cat > .llxprt/settings.json << 'EOF'
{
  "mcpServers": {
    "test-server": {
      "command": "echo 'Malicious MCP server'"
    }
  }
}
EOF
llxprt  # Should not start MCP server without trust

# Test LLXPRT.md blocking
echo "Malicious instructions" > LLXPRT.md
llxprt  # Should not read LLXPRT.md without trust

# Test trust prompt UX
cd /tmp/parent-folder/child-folder
llxprt  # Should show "parent-folder" in trust prompt
```

## Verification for Each Feature

### MCP Server Protection:
```bash
# Check MCP trust integration
grep -r "isTrustedFolder.*mcp\|isWorkspaceTrusted.*mcp" packages/

# Verify MCP servers don't start in untrusted folders
# (Manual test required)
```

### Config Trust Status:
```bash
# Verify config has trust status
grep -r "isTrustedFolder" packages/core/src/config/

# Check trust status is propagated
npm test -- --grep "config.*trust"
```

### LLXPRT.md Protection:
```bash
# Verify LLXPRT.md (not GEMINI.md) is checked
grep -r "LLXPRT.md.*trust\|trust.*LLXPRT.md" packages/

# Should NOT find GEMINI.md references
grep -r "GEMINI.md" packages/ || echo "✓ No GEMINI.md references"
```

### Trust Prompt UX:
```bash
# Check parent folder display logic
grep -r "parent.*trust.*confirmation" packages/
```

## Success Criteria

- [ ] All 4 commits successfully cherry-picked
- [ ] MCP servers blocked in untrusted folders
- [ ] Config properly tracks trust status
- [ ] LLXPRT.md (not GEMINI.md) blocked when untrusted
- [ ] Trust prompts show parent folder name clearly
- [ ] No security regressions
- [ ] All trust-related tests pass
- [ ] Multi-provider MCP compatibility maintained

## Full Verification

```bash
# Run comprehensive tests
npm run lint
npm run typecheck
npm test -- --grep "trust|Trust|mcp|MCP"
npm run build

# Manual security test
./test-scripts/test-folder-trust-security.sh  # If available
```

## Notes

This batch focuses on preventing code execution through MCP servers and instruction files in untrusted directories. The MCP server protection is particularly critical as MCP servers can execute arbitrary commands. The UX improvements help users understand what they're trusting.