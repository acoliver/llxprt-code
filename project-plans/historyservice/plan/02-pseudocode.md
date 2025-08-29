# Phase 02: Pseudocode Development Phase

## Phase ID
`PLAN-20250128-HISTORYSERVICE.P02`

## Prerequisites
- Required: Phase 01 and 01a completed successfully
- Verification: `grep "@plan:PLAN-20250128-HISTORYSERVICE.P01" project-plans/historyservice/analysis/domain-model.md`
- Expected: Complete domain analysis with integration point mapping

## Pseudocode Creation Tasks

### Files to Create

1. `analysis/pseudocode/history-service.md` - Core HistoryService operations
2. `analysis/pseudocode/state-machine.md` - State management algorithms
3. `analysis/pseudocode/tool-management.md` - Tool call/response handling
4. `analysis/pseudocode/validation.md` - Orphan detection and validation
5. `analysis/pseudocode/event-system.md` - Event emission and subscription

### Implementation Requirements

Each pseudocode file MUST:
- **Number every line sequentially** (1:, 2:, 3:, etc.)
- **Reference specific HS-XXX requirements** in line comments
- **Define clear algorithmic steps** without implementation syntax
- **Include all error handling paths** from current code analysis
- **Mark transaction boundaries** for atomic operations
- **Note validation points** for consistency checks
- **Map to exact current code patterns** from Phase 01 analysis

### Core Algorithm Specifications

#### HistoryService Core Operations (history-service.md)

1. **addUserMessage() Algorithm**
   - Line-by-line algorithm replacing recordHistory() user input handling
   - Reference current logic from lines 1044-1070 in geminiChat.ts
   - Include state validation and transition logic
   - Map to HS-001, HS-002, HS-015 requirements

2. **addModelResponse() Algorithm**
   - Line-by-line algorithm replacing recordHistory() model output handling  
   - Reference current logic from lines 1072-1165 in geminiChat.ts
   - Include tool call detection and processing
   - Map to HS-003, HS-004, HS-015 requirements

3. **getCuratedHistory() Algorithm**
   - Line-by-line algorithm replacing extractCuratedHistory() (lines 232-276)
   - Include filtering and curation logic
   - Reference compression and optimization patterns
   - Map to HS-005, HS-006, HS-037 requirements

4. **mergeToolResponses() Algorithm**
   - Line-by-line algorithm replacing shouldMergeToolResponses() (lines 1198-1253)
   - Include response combination logic
   - Reference current merging conditions
   - Map to HS-007, HS-008 requirements

#### State Machine Operations (state-machine.md)

1. **State Transition Algorithms**
   - IDLE → MODEL_RESPONDING transition logic
   - MODEL_RESPONDING → TOOLS_PENDING transition logic  
   - TOOLS_PENDING → TOOLS_EXECUTING transition logic
   - TOOLS_EXECUTING → IDLE transition logic
   - Map to HS-015, HS-016, HS-017 requirements

2. **State Validation Algorithms**
   - Current state verification before operations
   - Invalid transition prevention logic
   - State rollback on operation failure
   - Map to HS-016, HS-044 requirements

#### Tool Management Operations (tool-management.md)

1. **addPendingToolCall() Algorithm**
   - Pending tool call registration logic
   - Tool ID generation and tracking (reference Turn.ts lines 304-325)
   - Parallel tool support with group tracking
   - Map to HS-009, HS-011, HS-014 requirements

2. **commitToolTurn() Algorithm**
   - Atomic tool call/response commitment
   - All-or-nothing tool completion logic
   - Tool response validation and pairing
   - Map to HS-010, HS-011, HS-012 requirements

3. **abortPendingToolCalls() Algorithm**
   - Pending tool call cancellation logic
   - Synthetic response generation (reference OpenAI lines 978-1061)
   - Cleanup and state restoration
   - Map to HS-013, HS-024, HS-025 requirements

#### Validation Operations (validation.md)

1. **validateHistoryStructure() Algorithm**
   - Conversation flow validation logic
   - Tool call/response pairing verification
   - Orphaned entry detection (reference lines 468-571)
   - Map to HS-018, HS-019, HS-020 requirements

2. **fixOrphanedToolCalls() Algorithm**
   - Orphaned tool call detection and repair
   - Synthetic response insertion logic
   - History consistency restoration
   - Map to HS-021, HS-022, HS-042 requirements

3. **validateEntry() Algorithm**
   - Individual entry validation logic
   - Content/Part structure verification
   - Provider compatibility validation
   - Map to HS-021, HS-040, HS-041 requirements

#### Event System Operations (event-system.md)

1. **Event Emission Algorithms**
   - EntryAdded event generation logic
   - ToolMerged event generation logic
   - SyntheticAdded event generation logic
   - Map to HS-026, HS-027, HS-028 requirements

2. **Event Subscription Management**
   - Subscriber registration and removal
   - Event delivery and error handling
   - UI integration event patterns
   - Map to HS-029, HS-056 requirements

### Algorithm Accuracy Requirements

#### Current Code Pattern Mapping

1. **Exact Logic Translation**
   - Each algorithm must map to specific current code sections
   - Preserve all conditional branches from existing logic
   - Maintain error handling patterns from current implementation
   - Reference exact line numbers from Phase 01 analysis

2. **State Preservation Logic**
   - Map current history array manipulation patterns
   - Preserve validation logic from validateHistory()
   - Maintain tool call handling from Turn.handlePendingFunctionCall
   - Reference current error recovery patterns

3. **Provider Compatibility Logic**
   - Preserve Content/Part structure handling
   - Maintain synthetic response generation patterns
   - Map current provider conversion points
   - Reference current format compatibility logic

#### Requirements Compliance

1. **Performance Algorithm Constraints**
   - O(1) algorithms for recent message access (HS-037)
   - O(n) algorithms for validation operations (HS-038)
   - Efficient handling for 1000+ messages (HS-036)
   - Memory-conscious operation patterns

2. **Atomic Operation Algorithms**
   - Transaction boundary marking for all multi-step operations
   - Rollback logic for failed operations
   - Consistency preservation during errors
   - State safety guarantees (HS-044)

3. **Integration Algorithm Requirements**
   - Constructor injection integration patterns
   - Method delegation algorithms
   - Event emission timing specifications
   - Provider interface preservation logic

## Verification Commands

```bash
# Check all pseudocode files exist
ls -la project-plans/historyservice/analysis/pseudocode/*.md | wc -l
# Expected: 5 files

# Verify line numbering in all files
for file in project-plans/historyservice/analysis/pseudocode/*.md; do
  echo "Checking $file:"
  grep -E "^[0-9]+:" "$file" | wc -l
done
# Expected: 30+ lines per file

# Check requirement references
grep -r "@requirement:HS-" project-plans/historyservice/analysis/pseudocode/
# Expected: 15+ requirement references across all files

# Verify transaction boundary marking
grep -r "transaction\|atomic\|rollback" project-plans/historyservice/analysis/pseudocode/
# Expected: 5+ transaction references

# Check current code references
grep -r "lines\? [0-9]" project-plans/historyservice/analysis/pseudocode/
# Expected: 10+ current code references
```

## Success Criteria

- All 5 pseudocode files created with comprehensive algorithms
- Every line numbered sequentially (1:, 2:, 3:, etc.)
- Clear algorithmic flow without implementation syntax
- All error handling paths included from current code
- Transaction boundaries marked for atomic operations
- Requirements referenced throughout (HS-001 to HS-060)
- Current code patterns mapped with line numbers
- Provider compatibility logic preserved

## Code Markers Required

```typescript
// @plan:PLAN-20250128-HISTORYSERVICE.P02
// @requirement:HS-001 through HS-060 (specific per algorithm)
```

## Output

Create pseudocode files in: `project-plans/historyservice/analysis/pseudocode/`

### File Structure Example

Each pseudocode file follows this pattern:
```
# [Algorithm Name] Pseudocode

## Overview
Brief description and requirements mapping

## Algorithm: [Method Name]
1: Start operation with state validation
2: Check prerequisites (reference HS-XXX)
3: [Continue with numbered steps...]
...
n: End operation with event emission
```

This phase creates detailed, numbered pseudocode that will guide line-by-line implementation in subsequent TDD phases. The pseudocode must be precise enough to implement directly without ambiguity.