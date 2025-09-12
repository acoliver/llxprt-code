# Task 01: Cherry-pick OAuth MCP Instance-based Storage

## Commit Information
- **Hash:** `35a841f71`
- **Message:** "Feat(security) - Make the OAuthTokenStorage non static"
- **Author:** shishu314

## Task Description
Cherry-pick and adapt the OAuth MCP storage changes to make it instance-based instead of static. This improves isolation between different MCP servers that require OAuth.

## Cherry-pick Process

```bash
# Cherry-pick the commit
git cherry-pick 35a841f71

# If conflicts arise, resolve them preserving:
# - Package naming: @vybestack/llxprt-code-core
# - Multi-provider architecture
# - llxprt branding
```

## Expected Changes

### Files Modified:
- `packages/cli/src/ui/commands/mcpCommand.test.ts`
- `packages/cli/src/ui/commands/mcpCommand.ts`
- `packages/core/src/mcp/oauth-provider.test.ts`
- `packages/core/src/mcp/oauth-provider.ts`
- `packages/core/src/mcp/oauth-token-storage.test.ts`
- `packages/core/src/mcp/oauth-token-storage.ts`
- `packages/core/src/tools/mcp-client.ts`

### Key Changes:
1. Convert `MCPOAuthTokenStorage` from static class to instance-based
2. Update all references to use instances instead of static calls
3. Allow multiple OAuth storage instances for different MCP servers

## Conflict Resolution Guidelines

### Import Paths:
- Change `@google/gemini-cli-core` → `@vybestack/llxprt-code-core`

### Class Structure:
```typescript
// From (static):
class MCPOAuthTokenStorage {
  static async saveToken(serverName: string, token: MCPOAuthToken) { ... }
  static async getToken(serverName: string) { ... }
}

// To (instance-based):
class MCPOAuthTokenStorage {
  constructor(private readonly serverName?: string) { ... }
  async saveToken(token: MCPOAuthToken) { ... }
  async getToken() { ... }
}
```

### Usage Updates:
```typescript
// From:
await MCPOAuthTokenStorage.saveToken('server1', token);

// To:
const storage = new MCPOAuthTokenStorage('server1');
await storage.saveToken(token);
```

## Testing Requirements

After applying the changes:

1. **Unit Tests**:
   ```bash
   npm test -- oauth-token-storage
   npm test -- oauth-provider
   npm test -- mcp-client
   ```

2. **Integration Tests**:
   - Test MCP server with OAuth works
   - Test multiple MCP servers with different OAuth contexts
   - Verify token isolation between servers

3. **Full Verification**:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

## Success Criteria

- [ ] Commit successfully cherry-picked
- [ ] All conflicts resolved with llxprt patterns
- [ ] MCPOAuthTokenStorage converted to instance-based
- [ ] All references updated to use instances
- [ ] Tests pass for OAuth functionality
- [ ] Multiple MCP servers can have isolated OAuth contexts
- [ ] Full verification suite passes

## Notes

This change improves security and isolation for MCP servers that require OAuth authentication. Each MCP server can now have its own OAuth storage instance, preventing token conflicts and improving security boundaries between different MCP servers.