/**
 * Centralized HistoryService singleton instance
 */

import { HistoryService } from './HistoryService.js';

let historyServiceInstance: HistoryService | null = null;

/**
 * Get or create the global HistoryService singleton instance
 */
export function getHistoryService(): HistoryService {
  if (!historyServiceInstance) {
    // Create with a default conversation ID
    // In a real app, this might come from a session or context
    historyServiceInstance = new HistoryService('default-conversation');
  }

  return historyServiceInstance;
}

/**
 * Reset the history service instance (for testing)
 */
export function resetHistoryService(): void {
  historyServiceInstance = null;
}

/**
 * Set a specific HistoryService instance (for testing or custom initialization)
 */
export function setHistoryService(instance: HistoryService): void {
  historyServiceInstance = instance;
}
