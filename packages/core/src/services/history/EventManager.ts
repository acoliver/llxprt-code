import { EventEmitter } from 'events';

export class EventManager extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Emit an event with optional data
   * @param event The event name to emit
   * @param data Optional data to pass with the event
   */
  emit(event: string, data?: any): boolean {
    throw new Error('Not implemented yet');
  }

  /**
   * Register an event listener
   * @param event The event name to listen for
   * @param listener The callback function to execute when the event is emitted
   */
  on(event: string, listener: (...args: any[]) => void): this {
    throw new Error('Not implemented yet');
  }

  /**
   * Remove an event listener
   * @param event The event name to remove listener from
   * @param listener The callback function to remove
   */
  off(event: string, listener: (...args: any[]) => void): this {
    throw new Error('Not implemented yet');
  }

  /**
   * Register an event listener that will be removed after first execution
   * @param event The event name to listen for
   * @param listener The callback function to execute when the event is emitted
   */
  once(event: string, listener: (...args: any[]) => void): this {
    throw new Error('Not implemented yet');
  }
}