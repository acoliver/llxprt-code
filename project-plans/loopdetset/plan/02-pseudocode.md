# Phase 02: Pseudocode Development

## Phase ID

`PLAN-20250823-LOOPDETSET.P02`

## Prerequisites

- Required: Phase 01a completed
- Verification: `test -f project-plans/loopdetset/.completed/P01a-verification.md`

## Implementation Tasks

### Files to Create

- `project-plans/loopdetset/analysis/pseudocode/loop-detection-settings.md`
  - MUST include numbered lines
  - MUST cover all methods from specification
  - MUST include error handling
  - MUST specify validation steps

### Required Pseudocode Sections

1. **Config.getLoopDetectionEnabled()** (lines 10-30)
   - Resolution hierarchy logic
   - Profile check
   - Global check  
   - Default return

2. **LoopDetectionService.turnStarted() modification** (lines 40-55)
   - Early return check
   - Existing logic preservation

3. **SetCommand handler** (lines 60-115)
   - Input validation
   - Profile update
   - Save operation
   - Success/error responses

4. **Schema updates** (lines 120-133)
   - Profile interface
   - Global settings interface

## Verification Commands

```bash
# Check file exists
test -f project-plans/loopdetset/analysis/pseudocode/loop-detection-settings.md || exit 1

# Check for line numbers
grep -E "^[0-9]+:" project-plans/loopdetset/analysis/pseudocode/loop-detection-settings.md | wc -l
# Expected: 50+ lines

# Check key methods present
grep -q "getLoopDetectionEnabled" project-plans/loopdetset/analysis/pseudocode/loop-detection-settings.md
grep -q "turnStarted" project-plans/loopdetset/analysis/pseudocode/loop-detection-settings.md
grep -q "handleLoopDetectionCommand" project-plans/loopdetset/analysis/pseudocode/loop-detection-settings.md
```

## Success Criteria

- Every line numbered
- All methods from specification covered
- Clear algorithmic steps
- Error handling included
- No actual TypeScript code

## Phase Completion Marker

Create: `project-plans/loopdetset/.completed/P02.md`