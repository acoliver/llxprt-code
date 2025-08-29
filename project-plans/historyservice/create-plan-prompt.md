# Prompt: Create HistoryService Implementation Plan

## Your Task

Create a complete, executable implementation plan for the HistoryService feature in the `/llxprt-code/project-plans/historyservice/plan/` directory.

## Critical Documents to Read FIRST

1. **Read `/llxprt-code/project-plans/historyservice/memo.md`** - Contains all critical context including:
   - Key constraints (NO backward compatibility shims)
   - Current code reality with exact line numbers
   - Integration points that actually exist
   - What NOT to do

2. **Read `/llxprt-code/project-plans/historyservice/requirements.md`** - Contains all HS-XXX requirements
   - Every test must map to a requirement
   - Don't exceed requirements (especially performance)

3. **Read `/llxprt-code/project-plans/historyservice/specification.md`** - Technical design details

4. **Read `/llxprt-code/docs/PLAN.md`** - Plan creation template and rules

5. **Read `/llxprt-code/docs/RULES.md`** - TDD requirements

## Plan Structure to Create

```
project-plans/historyservice/
  analysis/
    domain-model.md           # Create: Current state analysis
    pseudocode/
      history-service.md       # Create: NUMBERED pseudocode for core methods
      state-machine.md         # Create: NUMBERED state transitions
      validation.md            # Create: NUMBERED validation logic
      tool-management.md       # Create: NUMBERED tool management
  plan/
    00-overview.md            # Create: Generated from specification
    01-analysis.md            # Create: Domain analysis phase
    01a-analysis-verification.md
    02-pseudocode.md          # Create: Pseudocode development phase
    02a-pseudocode-verification.md
    [Phases 03-32 as listed in memo.md]
```

## Critical Constraints (FROM memo.md)

1. **NO BACKWARD COMPATIBILITY**
   - Direct replacement only
   - No shims, adapters, or dual-mode
   - Just rip out old, put in new

2. **Requirements-Driven**
   - Every test: `@requirement HS-XXX`
   - NO performance beyond HS-036/037/038
   - NO features without requirements

3. **Pseudocode MUST Be Used**
   - Number EVERY line
   - Implementation MUST reference line numbers
   - Like this:
   ```
   10: METHOD addPendingToolCalls(calls)
   11:   VALIDATE state not TOOLS_EXECUTING
   12:   IF state is TOOLS_EXECUTING
   13:     THROW StateError
   ```

4. **Integration from Day One**
   - Phases 21-26 are integration phases
   - Must modify existing files:
     - geminiChat.ts (lines specified in memo.md)
     - turn.ts (handleFunctionCalls method)
     - NOT create new isolated systems

## Phase Creation Rules

### For Each Stub Phase (03, 06, 09, etc.)
```markdown
# XX-component-stub.md

## Purpose
@requirement HS-XXX

## Implementation
UPDATE packages/core/src/services/history/HistoryService.ts
(NEVER create ServiceV2 or ServiceNew)

Methods throw new Error('NotYetImplemented') OR return empty values
NO TODO comments
```

### For Each TDD Phase (04, 07, 10, etc.)
```markdown
# XX-component-tdd.md

## Tests Required

/**
 * @requirement HS-009
 * @pseudocode lines 11-13
 * @scenario Adding pending calls during execution
 * @given State is TOOLS_EXECUTING
 * @when addPendingToolCalls() called
 * @then Throws StateError
 */
it('should throw when adding pending calls during execution', () => {
  // Test real behavior, not stubs
});
```

### For Each Implementation Phase (05, 08, 11, etc.)
```markdown
# XX-component-impl.md

## Implementation

Follow pseudocode from analysis/pseudocode/component.md:

- Line 11: VALIDATE state
  → if (this.state === HistoryState.TOOLS_EXECUTING)
- Line 13: THROW error
  → throw new StateError("Cannot add pending calls")
```

## Specific Phases to Create

### Foundation (01-02)
- 01-analysis.md: Analyze current geminiChat.ts recordHistory (lines 1034-1165)
- 02-pseudocode.md: Create NUMBERED pseudocode for all methods

### Core Implementation (03-08)
- Requirements HS-001 to HS-008
- Basic history operations

### State Machine (09-11)
- Requirements HS-015 to HS-017
- State transitions

### Validation (12-14)
- Requirements HS-018 to HS-022
- Orphan detection

### Tool Management (15-17)
- Requirements HS-009 to HS-014
- Pending/commit pattern

### Event System (18-20)
- Requirements HS-026 to HS-029
- Event emission

### GeminiChat Integration (21-23)
- Requirement HS-049
- MODIFY geminiChat.ts constructor
- REPLACE recordHistory method

### Turn Integration (24-26)
- Requirement HS-050
- MODIFY handleFunctionCalls

### Provider Updates (27-29)
- Requirement HS-041
- Remove orphan checking from providers

### Final Integration (30-32)
- Requirements HS-046 to HS-048
- Integration tests
- NO migration scripts if no backward compatibility

## Validation After Creation

Run validation using `/llxprt-code/project-plans/historyservice/validation.md`:
- Check all requirements mapped
- Verify pseudocode referencedottled- Confirm no backward compatibility
- Ensure integration not isolation

## What Success Looks Like

1. Every phase references specific requirements
2. Pseudocode is numbered and used in implementation
3. Integration phases modify existing files
4. NO backward compatibility code anywhere
5. NO performance optimization beyond requirements
6. Tests map directly to requirements
7. Plan passes validation.md checklist

## Start With

1. Create `analysis/domain-model.md` analyzing current state
2. Create `analysis/pseudocode/*.md` with NUMBERED lines
3. Create phases 00-02 following PLAN.md template
4. Continue with implementation phases 03-32
5. Validate using validation.md checklist

## Remember

- Read memo.md for all the context
- NO backward compatibility shims
- Pseudocode line numbers are MANDATORY
- Integration not isolation
- Requirements drive everything
- Direct replacement only