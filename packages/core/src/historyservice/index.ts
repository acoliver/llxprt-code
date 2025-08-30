/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// @plan PLAN-20250128-HISTORYSERVICE
// @requirement HS-050: HistoryService exports for Turn integration

// Export the REAL HistoryService from services/history
export { HistoryService } from '../services/history/HistoryService.js';
export type {
  ToolCall,
  ToolResponse,
  HistoryState,
  Message,
  MessageRole,
  MessageMetadata,
} from '../services/history/types.js';

// Re-export IHistoryService interface and ToolExecutionStatus
export type {
  IHistoryService,
  ToolExecutionStatus,
} from './interfaces/IHistoryService.js';
