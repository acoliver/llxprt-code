# Phase 30: Migration Stub - IMessage Removal Preparation

## Phase ID
`PLAN-20250826-RESPONSES.P30`

## Task Description

Prepare for IMessage removal by identifying all dependencies and creating a migration plan. This phase sets up for the actual removal.

## Analysis Tasks

### 1. Find all IMessage imports

```bash
grep -r "IMessage" packages/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Document all files that import or use IMessage.

### 2. Create migration checklist

For each file using IMessage:
- File path
- How IMessage is used
- What Content[] replacement looks like
- Tests affected

### 3. Verify Content[] compatibility

Based on pseudocode lines 82-91:

```typescript
/**
 * @plan PLAN-20250826-RESPONSES.P30
 * @requirement REQ-003.1
 * @pseudocode lines 82-91
 */
// Document migration pattern:
// BEFORE:
import { IMessage } from '../providers/IMessage';
function processMessage(msg: IMessage) { }

// AFTER:
import { Content } from '@google/genai';
function processMessage(msg: Content) { }
```

## Output Files

Create `/project-plans/responses-revised/analysis/imessage-migration.md`:

```markdown
# IMessage Migration Plan

## Files to Modify
1. packages/core/src/providers/openai/parseResponsesStream.ts
   - Currently returns IMessage
   - Change to return Content[]
   - Add metadata field

2. [List all other files...]

## Migration Steps
1. Remove all IMessage imports (the file doesn't exist)
2. Change type annotations from IMessage to Content
3. Update return types to Content[]
4. Verify TypeScript compilation succeeds
5. No file to delete (IMessage.ts already gone)

## Test Impact
- [List affected test files]
```

## Requirements

1. Complete inventory of IMessage usage
2. Document migration for each file
3. Identify test impacts
4. Create removal checklist
5. Reference pseudocode

## Success Criteria

- All IMessage usages documented
- Migration plan complete
- No files missed
- Clear removal strategy

## Execution Instructions

```bash
# For subagent execution:
1. Search for all IMessage references
2. Document each usage
3. Create migration plan
4. Identify order of changes
5. List affected tests
6. Save to imessage-migration.md
```

## Verification Commands

```bash
# Check migration plan created
test -f project-plans/responses-revised/analysis/imessage-migration.md
# Expected: File exists

# Verify all IMessage uses found
grep -c "IMessage" packages/ --include="*.ts" -r
# Expected: Matches count in migration plan

# Check plan markers
grep "@plan PLAN-20250826-RESPONSES.P30" project-plans/responses-revised/analysis/imessage-migration.md
# Expected: Present
```

## Output Status

Save to: `/project-plans/responses-revised/workers/phase-15.json`
```json
{
  "phase": "15",
  "completed": true,
  "imessage_files_found": 5,
  "migration_plan_created": true,
  "tests_identified": 3
}
```