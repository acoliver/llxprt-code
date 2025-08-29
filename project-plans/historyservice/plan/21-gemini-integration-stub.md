# Phase 21: GeminiChat Integration Stub

**Phase ID:** PLAN-20250128-HISTORYSERVICE.P21  
**Title:** GeminiChat Integration Stub (Direct Replacement)  
**Requirements:** HS-049 (GeminiChat Integration)

## Prerequisites

- [ ] Phase 20a: Event System Implementation Verification passed
- [ ] HistoryService core system fully functional
- [ ] All subsystems (State, Validation, Tools, Events) implemented and tested

## Phase Overview

Create direct integration for GeminiChat.ts by modifying existing implementation at specific line numbers. This phase performs DIRECT REPLACEMENT of existing methods with HistoryService delegation - NO direct replacement shims. HistoryService is a required dependency.

## Critical Implementation Points (from memo.md)

**Target Line Numbers for Direct Modification:**
- **Line 306**: Add required historyService parameter to constructor  
- **Lines 1034-1165**: Replace recordHistory with HistoryService wrapper (132 lines)
- **Lines 232-276**: Replace extractCuratedHistory with HistoryService wrapper (45 lines)  
- **Lines 1198-1253**: Replace shouldMergeToolResponses with HistoryService wrapper (56 lines)

**Strategy**: Direct replacement with service delegation, no direct replacement.

## Implementation Tasks

### Task 1: Constructor Integration (Line 306)

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P21
// @requirement HS-049: Direct constructor modification at line 306
// REPLACE existing constructor signature with:

constructor(
  apiKey: string,
  model: string,
  systemPrompt: string,
  historyService: IHistoryService  // REQUIRED: HistoryService dependency
) {
  this.apiKey = apiKey;
  this.model = model;
  this.systemPrompt = systemPrompt;
  
  // Direct service assignment - no service delegation
  this.historyService = historyService;
  // Remove: this.history array - no longer needed
}
```

### Task 2: Property Declarations

```typescript
// @requirement HS-049: Add integration properties near line 306
// Remove: private history: Content[] = []; // No longer needed
private readonly historyService: IHistoryService; // Required service instance
```

### Task 3: Replace recordHistory (Lines 1034-1165) 

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P21
// @requirement HS-049: Direct replacement of recordHistory method
// REPLACE entire method at lines 1034-1165 with:

private recordHistory(content: Content): void {
  // @marker HISTORYSERVICE_INTEGRATION_P21
  // Direct service call - no service delegation needed
  const role = this.convertContentRole(content.role);
  const messageContent = this.extractContentText(content);
  const metadata = {
    timestamp: Date.now(),
    source: 'geminiChat',
    contentType: this.getContentType(content),
    originalContent: content
  };
  
  this.historyService.addMessage(messageContent, role, metadata);
  // No array manipulation - service handles all history
}
```

### Task 4: Replace extractCuratedHistory (Lines 232-276)

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P21  
// @requirement HS-049: Direct replacement of extractCuratedHistory method
// REPLACE entire method at lines 232-276 with:

private extractCuratedHistory(): Content[] {
  // @marker HISTORYSERVICE_INTEGRATION_P21
  // Direct service call - no service delegation needed
  const messages = this.historyService.getCuratedHistory();
  return messages.map(msg => this.convertMessageToContent(msg));
  // No array filtering - service handles curation
}
```

### Task 5: Replace shouldMergeToolResponses (Lines 1198-1253)

```typescript
// @plan PLAN-20250128-HISTORYSERVICE.P21
// @requirement HS-049: Direct replacement of shouldMergeToolResponses method  
// REPLACE entire method at lines 1198-1253 with:

private shouldMergeToolResponses(newContent: Content): boolean {
  // @marker HISTORYSERVICE_INTEGRATION_P21
  // Direct service call - no service delegation needed
  const lastMessage = this.historyService.getLastMessage();
  if (!lastMessage) return false;
  
  return this.historyService.shouldMergeToolResponses(
    this.convertContentToMessage(newContent),
    lastMessage
  );
  // No array-based logic - service handles tool merging
}
```

### Task 6: Content Conversion Helpers

```typescript
// @requirement HS-049: Conversion utilities for Content ↔ Message
private convertContentRole(contentRole: string): MessageRole {
  switch (contentRole?.toLowerCase()) {
    case 'user': return MessageRole.USER;
    case 'assistant': return MessageRole.ASSISTANT;  
    case 'system': return MessageRole.SYSTEM;
    case 'tool': return MessageRole.TOOL;
    default: return MessageRole.USER;
  }
}

private extractContentText(content: Content): string {
  if (typeof content === 'string') return content;
  if (content.parts) {
    return content.parts.map(p => p.text || '').join(' ');
  }
  return content.text || JSON.stringify(content);
}

private convertMessageToContent(message: Message): Content {
  const originalContent = message.metadata?.originalContent as Content;
  if (originalContent) return originalContent;
  
  return {
    role: message.role.toLowerCase(),
    parts: [{ text: message.content }]
  };
}

private convertContentToMessage(content: Content): Message {
  return {
    id: `gemini_${Date.now()}`,
    content: this.extractContentText(content),
    role: this.convertContentRole(content.role),
    timestamp: Date.now(),
    metadata: {
      source: 'geminiChat',
      originalContent: content
    }
  };
}

private getContentType(content: Content): string {
  if (content.parts) {
    const hasText = content.parts.some(p => p.text);
    const hasMedia = content.parts.some(p => p.inlineData || p.fileData);
    
    if (hasText && hasMedia) return 'multimodal';
    if (hasMedia) return 'media';
    return 'text';
  }
  return 'text';
}
```

### Task 7: Service Integration Verification

```typescript
// @requirement HS-049: Service integration verification
public getHistoryService(): IHistoryService {
  return this.historyService;
}

public isServiceIntegrated(): boolean {
  return this.historyService !== undefined;
}
```

## Code Markers Required

All modified methods must include:
```typescript
// @marker HISTORYSERVICE_INTEGRATION_P21
```

## Integration Strategy

1. **Direct Replacement**: Replace existing methods completely
2. **Service Delegation**: All history operations delegate directly to HistoryService  
3. **Required Dependency**: Constructor requires HistoryService parameter
4. **No direct replacement**: No service delegation-based approach

## Success Criteria

- [ ] Constructor requires historyService parameter (line 306)
- [ ] recordHistory method replaced with direct service delegation (lines 1034-1165)
- [ ] extractCuratedHistory method replaced with direct service delegation (lines 232-276)  
- [ ] shouldMergeToolResponses method replaced with direct service delegation (lines 1198-1253)
- [ ] All conversion helpers implemented and functional
- [ ] Direct service integration without service integrations
- [ ] Code markers present in all modified methods
- [ ] TypeScript compilation passes without errors
- [ ] All integration points delegate to service methods

## Verification Commands

```bash
# Verify constructor modification
grep -n "historyService.*IHistoryService" /packages/core/src/core/geminiChat.ts

# Check method replacements have markers
grep -A 5 "@marker HISTORYSERVICE_INTEGRATION_P21" /packages/core/src/core/geminiChat.ts

# Verify specific line ranges modified
sed -n '1034,1165p' /packages/core/src/core/geminiChat.ts | grep -c "historyService"
sed -n '232,276p' /packages/core/src/core/geminiChat.ts | grep -c "getCuratedHistory"
sed -n '1198,1253p' /packages/core/src/core/geminiChat.ts | grep -c "shouldMergeToolResponses"

# Check conversion helpers exist
grep -n "convertContentRole\|extractContentText\|convertMessageToContent" /packages/core/src/core/geminiChat.ts

# Verify compilation
npx tsc --noEmit /packages/core/src/core/geminiChat.ts
```

## Risk Mitigation

- **service delegation Mechanism**: Array-based implementation preserved for error cases
- **service integration**: Safe transition between implementations
- **Error Handling**: Comprehensive try-catch blocks around HistoryService calls
- **Type Safety**: Full TypeScript integration maintained

## Next Phase

Phase 21a: GeminiChat Integration Stub Verification - Validate direct replacement implementation quality and service integration behavior.