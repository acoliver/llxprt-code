import { Message } from './types.js';

// @plan PLAN-20250128-HISTORYSERVICE.P15
export class ErrorHandler {
  /**
   * Handle an error in the history service
   * @param _error The error to handle
   * @param _context Optional context about when/where the error occurred
   */
  handleError(_error: Error, _context?: string): void {
    throw new Error('Not implemented yet');
  }

  /**
   * Log an error to the history
   * @param _error The error to log
   * @param _context Optional context about when/where the error occurred
   * @returns The ID of the created error log message
   */
  logError(_error: Error, _context?: string): string {
    throw new Error('Not implemented yet');
  }

  /**
   * Get the last error that occurred
   * @returns The last error message or null if no errors
   */
  getLastError(): Message | null {
    throw new Error('Not implemented yet');
  }

  /**
   * Clear all error records
   * @returns The number of error records cleared
   */
  clearErrors(): number {
    throw new Error('Not implemented yet');
  }
}
