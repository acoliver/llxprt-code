# Phase 30b: Wire Tool Execution to HistoryService

## Objective
Connect the existing HistoryService infrastructure to the actual tool execution flow in CoreToolScheduler, ensuring all tool executions are properly recorded in the database.

## Current State Analysis
- HistoryService exists with complete database schema and operations
- CoreToolScheduler executes tools but doesn't record to history
- Turn class has no awareness of HistoryService
- Tool responses may be duplicated in conversation history

## Implementation Plan

### Step 1: Add HistoryService to Turn Constructor

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/turn.ts`

**Location**: Constructor (around line 50-70)

**Add**:
```typescript
import { HistoryService } from './history/history-service.js';

export class Turn {
  private historyService?: HistoryService;
  
  constructor(
    // existing parameters...
    options?: {
      historyService?: HistoryService;
      // other options...
    }
  ) {
    // existing initialization...
    this.historyService = options?.historyService;
  }
}
```

### Step 2: Modify CoreToolScheduler to Use HistoryService

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/tools/core-tool-scheduler.ts`

**Location**: `scheduleTool` method (around line 150-200)

**Replace existing implementation with**:
```typescript
async scheduleTool(
  toolName: string,
  toolArgs: Record<string, any>,
  toolId?: string
): Promise<ToolResult> {
  const startTime = Date.now();
  const actualToolId = toolId || crypto.randomUUID();
  
  try {
    // Record tool execution start if HistoryService available
    if (this.turn.historyService) {
      await this.turn.historyService.recordToolExecution({
        conversationId: this.turn.conversationId,
        messageId: this.turn.currentMessageId,
        toolName,
        toolId: actualToolId,
        arguments: toolArgs,
        status: 'pending',
        startedAt: new Date()
      });
    }
    
    // Execute the tool
    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    
    const result = await tool.execute(toolArgs, this.context);
    
    // Record successful completion
    if (this.turn.historyService) {
      await this.turn.historyService.updateToolExecution(
        actualToolId,
        {
          status: 'completed',
          result,
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        }
      );
    }
    
    return {
      toolId: actualToolId,
      toolName,
      result,
      isError: false
    };
    
  } catch (error) {
    // Record failure
    if (this.turn.historyService) {
      await this.turn.historyService.updateToolExecution(
        actualToolId,
        {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        }
      );
    }
    
    return {
      toolId: actualToolId,
      toolName,
      result: error instanceof Error ? error.message : String(error),
      isError: true
    };
  }
}
```

### Step 3: Prevent Duplicate Tool Responses

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/turn.ts`

**Location**: `addToolResponse` method (around line 300-350)

**Modify to**:
```typescript
private addToolResponse(toolResult: ToolResult): void {
  // Check if this tool response was already added via HistoryService
  const existingResponse = this.conversationMessages.find(
    msg => msg.role === 'tool' && 
           msg.toolId === toolResult.toolId
  );
  
  if (existingResponse) {
    // Update existing response instead of adding duplicate
    existingResponse.content = toolResult.result;
    return;
  }
  
  // Add new tool response
  this.conversationMessages.push({
    role: 'tool',
    toolId: toolResult.toolId,
    toolName: toolResult.toolName,
    content: toolResult.result,
    isError: toolResult.isError
  });
}
```

### Step 4: Initialize HistoryService in CLI

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/cli/src/commands/chat.ts`

**Location**: Where Turn is instantiated (around line 200-250)

**Add**:
```typescript
import { HistoryService } from '@llxprt/core/history/history-service.js';
import { DatabaseService } from '@llxprt/core/history/database-service.js';

// In the chat command handler
const dbService = new DatabaseService({
  dbPath: path.join(os.homedir(), '.llxprt', 'history.db')
});
await dbService.initialize();

const historyService = new HistoryService(dbService);

// When creating Turn
const turn = new Turn(
  provider,
  messages,
  {
    historyService,
    // other options...
  }
);
```

### Step 5: Add Conversation Context

**File**: `/Users/acoliver/projects/claude-llxprt/llxprt-code/packages/core/src/turn.ts`

**Add properties**:
```typescript
export class Turn {
  readonly conversationId: string;
  readonly currentMessageId: string;
  
  constructor(
    // existing params...
    options?: {
      conversationId?: string;
      messageId?: string;
      historyService?: HistoryService;
    }
  ) {
    this.conversationId = options?.conversationId || crypto.randomUUID();
    this.currentMessageId = options?.messageId || crypto.randomUUID();
    this.historyService = options?.historyService;
  }
}
```

## Verification Points

1. **HistoryService Integration**:
   - Turn class accepts HistoryService in constructor
   - CoreToolScheduler can access historyService via turn
   - Tool executions trigger database writes

2. **No Duplicate Responses**:
   - Tool responses appear only once in conversation
   - Database records match conversation messages
   - Tool IDs are consistent between systems

3. **Error Handling**:
   - Failed tools are recorded with error status
   - Database failures don't crash tool execution
   - Partial executions are properly logged

## Success Criteria

- [ ] All tool executions create database records
- [ ] Tool status transitions are captured (pending → completed/failed)
- [ ] No duplicate tool responses in conversation
- [ ] Database contains complete execution history
- [ ] Performance impact < 10ms per tool execution

## Rollback Plan

If issues arise:
1. Remove historyService parameter from Turn constructor
2. Remove recording calls from CoreToolScheduler
3. System continues to work without history recording

## Next Phase
Phase 30c will verify this integration works correctly across all providers and tool types.