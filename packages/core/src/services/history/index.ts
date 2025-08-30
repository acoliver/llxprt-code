// @plan PLAN-20250128-HISTORYSERVICE.P05

export { HistoryService } from './HistoryService.js';
export {
  Message,
  MessageRole,
  MessageMetadata,
  HistoryState,
} from './types.js';
export { MessageValidator, ValidationError } from './MessageValidator.js';
export { StateManager } from './StateManager.js';
// ToolCallManager was a fraudulent stub - DELETED
export { ErrorHandler } from './ErrorHandler.js';
// EventManager removed - events were unnecessary overengineering
