# CAREFUL - OAuth Token Storage Security Enhancement

## Commit

### 35a841f71 - Non-Static OAuth Token Storage
**Title:** `Feat(security) - Make the OAuthTokenStorage non static (#7716)`  
**Date:** Sep 6, 2025  
**Risk:** MEDIUM - OAuth security enhancement  
**Files:** (Need to check with git show)

## Analysis

### What This Commit Likely Does
Based on the title, this commit makes OAuth token storage non-static, which is a security improvement because:
- Static storage can lead to shared state issues
- Non-static allows better scoping and isolation  
- Reduces risk of token leakage between sessions
- Enables per-instance security controls

## LLXPRT OAuth Context

**Current Implementation:**
- OAuth tokens stored in ~/.llxprt/oauth/ directory
- Separate files per provider (anthropic.json, gemini.json, qwen.json)  
- Custom TokenStore implementation with file-based persistence
- Migration system from legacy locations

**Key Concerns:**
- Ensure LLXPRT token storage paths are preserved
- Maintain compatibility with our TokenStore implementation  
- Don't break existing user OAuth setups

## Pre-Cherry-Pick Investigation

### Step 1: Understand Current OAuth Architecture  
```bash
# Check our OAuth implementation
ls -la packages/core/src/mcp/
grep -r "OAuthTokenStorage\|TokenStorage" packages/core/src/mcp/

# Check CLI OAuth management
ls -la packages/cli/src/auth/
grep -r "static.*oauth\|oauth.*static" packages/cli/src/auth/
```

### Step 2: Review Upstream Changes
```bash
# See exactly what this commit changes  
git show 35a841f71 --stat
git show 35a841f71 --name-only

# Look for static -> non-static changes
git show 35a841f71 | grep -A10 -B10 "static\|Static"
```

### Step 3: Check Integration Points
```bash  
# Find where OAuth storage is used
grep -r "OAuthTokenStorage" packages/cli/src/
grep -r "TokenStorage" packages/core/src/
```

## Potential Integration Issues

### Token Storage Paths  
- **Risk:** Commit might reference gemini-cli paths
- **Solution:** Ensure ~/.llxprt/oauth/ paths are preserved

### Static Method Dependencies
- **Risk:** LLXPRT code might depend on static methods being removed
- **Solution:** Update call sites to use instance methods

### Provider Integration
- **Risk:** Our multi-provider setup (anthropic, gemini, qwen) might be affected  
- **Solution:** Ensure all providers work with non-static storage

## Execution Strategy

### Option A: Direct Cherry-Pick (PREFERRED)
1. Cherry-pick the commit  
2. Immediately test OAuth functionality
3. Fix any llxprt-specific issues that arise

### Option B: Manual Integration
1. Review the security improvements manually
2. Apply similar changes to llxprt OAuth code
3. Maintain full control over integration

## Testing Plan

### Pre-Cherry-Pick State  
```bash
# Test current OAuth functionality
llxprt auth status

# Check token storage  
ls -la ~/.llxprt/oauth/

# Test login/logout cycle
llxprt auth logout anthropic
llxprt auth login anthropic  
```

### Post-Cherry-Pick Validation
```bash
# Test OAuth still works
llxprt auth status

# Verify token storage location unchanged
ls -la ~/.llxprt/oauth/

# Test all providers
for provider in anthropic gemini qwen; do
  echo "Testing $provider OAuth..."
  llxprt auth status $provider
done

# Test security improvement works  
# (non-static should prevent state sharing)
```

## Expected Benefits

- **Security:** Better token isolation between sessions
- **Reliability:** Reduced risk of state sharing bugs  
- **Architecture:** Cleaner, more maintainable OAuth code
- **Testability:** Easier to test with instance-based approach

## Required Adaptations

### Path Preservation
```bash  
# Ensure all OAuth paths remain ~/.llxprt/oauth/
grep -r "\.gemini\|gemini/" packages/ && echo "NEED TO FIX PATHS"
```

### Instance Method Updates
```typescript
// Update any static method calls to instance methods
// Before: OAuthTokenStorage.getToken(provider)
// After:  oauthTokenStorage.getToken(provider)
```

### Provider Configuration  
```typescript
// Ensure provider configs still reference llxprt paths
const LLXPRT_OAUTH_PATHS = {
  anthropic: '~/.llxprt/oauth/anthropic.json',
  gemini: '~/.llxprt/oauth/gemini.json', 
  qwen: '~/.llxprt/oauth/qwen.json'
};
```

## Success Criteria

- ✅ OAuth security enhancement integrated
- ✅ All providers (anthropic, gemini, qwen) still work  
- ✅ Token storage remains in ~/.llxprt/oauth/
- ✅ No regression in login/logout functionality
- ✅ No static state sharing vulnerabilities
- ✅ Existing user tokens still accessible

## Risk Mitigation

### Token Backup
```bash  
# Backup OAuth tokens before changes
cp -r ~/.llxprt/oauth ~/.llxprt/oauth.backup.$(date +%Y%m%d_%H%M%S)
```

### Gradual Testing
1. Test with one provider first
2. Verify token persistence works
3. Test all providers if first works
4. Test login/logout cycles

## Rollback Plan

If OAuth functionality breaks:
```bash
# Revert the commit
git revert 35a841f71

# Restore OAuth tokens if needed  
cp -r ~/.llxprt/oauth.backup.* ~/.llxprt/oauth/

# Test rollback worked
llxprt auth status
```

## Security Verification

Post-integration, verify these security improvements:
- [ ] No static shared state for OAuth tokens  
- [ ] Each OAuth session properly isolated
- [ ] Token storage scoped to appropriate instances
- [ ] No cross-session token leakage possible
- [ ] File permissions on ~/.llxprt/oauth/ remain secure (600)