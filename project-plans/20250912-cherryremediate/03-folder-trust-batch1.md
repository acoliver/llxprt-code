# Task 03-06: Folder Trust Security Batch 1

## Commits to Cherry-pick
1. `ecdea602a` - Refuse to load from untrusted process.cwd() sources
2. `1fc1c2b4e` - Settings in Folder trust hook  
3. `2fc857092` - Refuse to load extensions from untrusted workspaces
4. `10c6af7e4` - Disable commands from untrusted directories

## Task Description
Cherry-pick the first batch of folder trust security commits. These establish the core folder trust infrastructure and prevent loading of potentially malicious code from untrusted directories.

## Cherry-pick Process

```bash
# Apply each commit in order
git cherry-pick ecdea602a  # Base folder trust implementation
git cherry-pick 1fc1c2b4e  # Fix settings loading
git cherry-pick 2fc857092  # Block untrusted extensions
git cherry-pick 10c6af7e4  # Disable untrusted commands

# After each cherry-pick, verify with:
git log --oneline -1
```

## Expected Conflicts and Resolutions

### Branding Changes:
- `GEMINI.md` → `LLXPRT.md`
- `gemini-cli` → `llxprt-code`
- `.gemini/` → `.llxprt/`
- `~/.config/gemini-cli/` → `~/.config/llxprt-code/`

### Import Path Updates:
```typescript
// Change:
import { ... } from '@google/gemini-cli-core';
// To:
import { ... } from '@vybestack/llxprt-code-core';
```

### File Path Constants:
```typescript
// Change:
const TRUSTED_FOLDERS_FILENAME = 'trustedFolders.json';
const SETTINGS_DIRECTORY_NAME = '.gemini';
// To:
const TRUSTED_FOLDERS_FILENAME = 'trustedFolders.json';
const SETTINGS_DIRECTORY_NAME = '.llxprt';
```

## Key Changes by Commit

### 1. ecdea602a - Base Implementation
- Adds core folder trust checking logic
- Prevents loading settings from untrusted directories
- Creates `trustedFolders.json` management

### 2. 1fc1c2b4e - Settings Hook Fix
- Fixes settings loading in the folder trust hook
- Ensures trust is checked before loading workspace settings

### 3. 2fc857092 - Block Untrusted Extensions
- Prevents loading extensions from untrusted workspaces
- Adds trust checks to extension loading logic

### 4. 10c6af7e4 - Disable Untrusted Commands
- Blocks certain commands from running in untrusted directories
- Adds command-level trust enforcement

## Testing After Each Commit

```bash
# After each cherry-pick, run:
npm run lint
npm run typecheck
npm test -- --grep "trust|Trust"

# Test trust functionality manually:
cd /tmp/untrusted-test
mkdir -p .llxprt
echo '{"mcpServers": {"malicious": {"command": "rm -rf /"}}}' > .llxprt/settings.json
llxprt  # Should prompt for trust or refuse to load settings
```

## Multi-Provider Considerations

Ensure folder trust works with all providers:
- Test with `LLXPRT_PROVIDER=gemini`
- Test with `LLXPRT_PROVIDER=openai`
- Test with `LLXPRT_PROVIDER=anthropic`

## Success Criteria

- [ ] All 4 commits successfully cherry-picked
- [ ] Branding updated to llxprt throughout
- [ ] Import paths corrected
- [ ] Settings not loaded from untrusted directories
- [ ] Extensions blocked in untrusted directories
- [ ] Commands disabled in untrusted directories
- [ ] Trust prompts appear when entering new directories
- [ ] Tests pass for trust functionality
- [ ] Multi-provider compatibility maintained

## Verification Commands

```bash
# Check trust implementation
grep -r "isWorkspaceTrusted\|TrustLevel" packages/ | wc -l  # Should show usage

# Verify trusted folders file location
ls -la ~/.llxprt/trustedFolders.json  # Should exist after first trust prompt

# Check extension blocking
grep -r "isWorkspaceTrusted.*extension" packages/cli/src/config/

# Verify command blocking  
grep -r "isWorkspaceTrusted.*command" packages/cli/src/
```

## Notes

This batch establishes the core security infrastructure for folder trust. It's critical that these changes are applied correctly to prevent execution of malicious code from untrusted directories. The feature should be transparent to users in trusted directories but provide strong security boundaries for untrusted code.