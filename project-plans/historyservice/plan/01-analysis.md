# Phase 01: Analysis Phase

## Phase ID
`PLAN-20250128-HISTORYSERVICE.P01`

## Prerequisites
- Required: specification.md and requirements.md exist
- Verification: `test -f project-plans/historyservice/specification.md && test -f project-plans/historyservice/requirements.md`

## Analysis Tasks

### Current State Analysis

#### GeminiChat.recordHistory Analysis (Lines 1034-1165)

1. **Method Signature Analysis**
   - Analyze `recordHistory(userInput: Content, modelOutput: Content[], automaticFunctionCallingHistory?: Content[])`
   - Map parameter usage patterns
   - Document all conditional logic branches
   - Identify direct `this.history` array manipulations

2. **Function Call Processing Analysis**
   - Extract tool call handling logic from lines 1044-1070
   - Map `automaticFunctionCallingHistory` processing
   - Document `extractCuratedHistory` integration pattern
   - Identify `isFunctionResponse` validation usage

3. **Model Output Processing Analysis**  
   - Analyze thought filtering logic (lines 1072-1076)
   - Map `nonThoughtModelOutput` processing
   - Document output content selection logic
   - Identify empty output handling patterns

4. **History State Validation Analysis**
   - Map existing validation patterns
   - Document orphaned tool call detection (lines 468-571)
   - Analyze `shouldMergeToolResponses` logic (lines 1198-1253)
   - Extract error recovery patterns

#### Integration Point Mapping

1. **Constructor Integration Analysis**
   - Current: `constructor(..., private history: Content[] = [])`
   - Map all direct `this.history` access points
   - Document validation calls: `validateHistory(history)`
   - Identify injection requirements for HistoryService

2. **Turn.ts Integration Analysis**
   - Analyze `handlePendingFunctionCall` method (lines 304-325)
   - Map tool ID generation pattern: `${fnCall.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`
   - Document `pendingToolCalls` array management
   - Extract tool execution callback patterns

3. **Provider Integration Analysis**
   - Document AnthropicProvider history access patterns
   - Map OpenAI synthetic response handling (lines 978-1061)
   - Analyze Gemini direct pass-through usage
   - Extract Content[] array usage across providers

#### State Transition Analysis

1. **Current State Management**
   - Map existing history states (if any)
   - Document conversation flow patterns
   - Analyze error state recovery
   - Extract rollback mechanisms

2. **Tool Call State Analysis**
   - Map pending tool call states in Turn.ts
   - Document tool completion patterns
   - Analyze tool cancellation handling
   - Extract orphaned tool detection logic

3. **Provider State Integration**
   - Analyze synthetic response generation triggers
   - Map provider-specific state handling
   - Document format conversion points
   - Extract error boundary patterns

### Domain Model Extraction

#### Core Entity Identification

1. **HistoryEntry Structure**
   - Analyze Content structure usage in existing code
   - Map Part structure variations (text, functionCall, functionResponse)
   - Document metadata requirements from current usage
   - Extract validation requirements from existing patterns

2. **Tool Management Entities**
   - Map ToolCall/ToolResponse relationships from current code
   - Extract tool ID management patterns
   - Document parallel tool execution patterns
   - Analyze tool cancellation scenarios

3. **State Entities**
   - Extract conversation state patterns
   - Map tool execution state transitions
   - Document validation state requirements
   - Analyze error recovery state patterns

#### Business Rule Extraction

1. **Validation Rules from Current Code**
   - Extract orphaned tool call detection logic
   - Map tool call/response pairing rules
   - Document conversation flow validation
   - Analyze error recovery rules

2. **Tool Management Rules**
   - Extract atomic tool operation patterns
   - Map parallel tool execution constraints
   - Document tool cancellation rules
   - Analyze synthetic response generation rules

3. **Provider Compatibility Rules**
   - Extract Content/Part structure requirements
   - Map provider-specific conversion patterns
   - Document synthetic response handling rules
   - Analyze direct replacement constraints

### Implementation Requirements Analysis

#### Current Method Replacement Strategy

1. **recordHistory() Replacement**
   - Map to: `addUserMessage()`, `addModelResponse()`, `commitToolTurn()`
   - Extract all conditional logic branches
   - Document parameter transformation requirements
   - Analyze error handling patterns

2. **extractCuratedHistory() Replacement**
   - Map to: `getCuratedHistory()`
   - Extract filtering logic patterns
   - Document curation rules
   - Analyze performance requirements

3. **shouldMergeToolResponses() Replacement**
   - Map to: `mergeToolResponses()`
   - Extract merging logic conditions
   - Document response combination patterns
   - Analyze validation requirements

#### Integration Architecture Requirements

1. **Constructor Injection Pattern**
   - Replace `private history: Content[]` with `private historyService: IHistoryService`
   - Map all direct history access to service method calls
   - Document service lifecycle requirements
   - Extract initialization patterns

2. **Event System Requirements**
   - Analyze current UI update patterns
   - Map real-time update requirements from chat-interaction.tsx
   - Document event subscription patterns
   - Extract performance requirements

3. **Provider Integration Requirements**
   - Maintain existing Content[] interfaces
   - Map provider history access patterns
   - Document conversion requirements
   - Extract compatibility constraints

## Verification Checklist

- [ ] All existing recordHistory logic patterns documented
- [ ] All integration points with exact line numbers identified
- [ ] All state transitions from current code mapped
- [ ] All business rules extracted from existing implementation
- [ ] All replacement method mappings documented
- [ ] All provider compatibility requirements analyzed
- [ ] All constructor injection patterns identified
- [ ] No implementation details included (analysis only)

## Success Criteria

- Complete mapping of geminiChat.recordHistory() to service methods
- Full integration point analysis with exact locations
- Comprehensive state transition documentation
- Business rule extraction from existing code
- Provider compatibility requirement analysis
- Constructor injection strategy documented

## Output

Create: `project-plans/historyservice/analysis/domain-model.md`

## Code Markers Required

```typescript
// @plan:PLAN-20250128-HISTORYSERVICE.P01 
// @requirement:HS-049 GeminiChat Integration
// @requirement:HS-055 API Compatibility  
// @requirement:HS-050 Tool Execution Integration
```

## Verification Commands

```bash
# Verify analysis file exists
test -f project-plans/historyservice/analysis/domain-model.md

# Check analysis completeness
grep -c "lines [0-9]" project-plans/historyservice/analysis/domain-model.md
# Expected: 5+ specific line number references

# Verify no implementation details
! grep -i "implement\|code\|function\|class" project-plans/historyservice/analysis/domain-model.md

# Confirm requirements coverage
grep -c "HS-0" project-plans/historyservice/analysis/domain-model.md  
# Expected: 10+ requirement references
```

This phase analyzes the current recordHistory implementation and maps all integration points to prepare for HistoryService creation. The analysis must be thorough and reference exact line numbers from existing code to ensure accurate replacement.