import { HistoryState } from './types';

// @plan PLAN-20250128-HISTORYSERVICE.P05
export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}

export class StateManager {
  private state: HistoryState = 'READY';
  
  // @requirement HS-023: Manage conversation state transitions
  // @pseudocode state-machine.md:10-35
  constructor() {
    // Initialization happens in property declarations above
  }
  
  // @requirement HS-023: Validate and perform state transitions
  // @pseudocode state-machine.md:37-62
  validateStateTransition(operation: string): void {
    // Line 39: GET allowedTransitions = this.getAllowedTransitions()
    const allowedTransitions = this.getAllowedTransitions();
    
    // Line 40: GET currentState = this.state
    const currentState = this.state;
    
    // Line 41: IF operation not in allowedTransitions[currentState] 
    if (!allowedTransitions[currentState] || !allowedTransitions[currentState].includes(operation)) {
      // Line 42: THROW StateError("Invalid operation (" + operation + ") for current state (" + currentState + ")")
      throw new StateError(`Invalid operation (${operation}) for current state (${currentState})`);
    }
    
    // Line 43: CALL this.updateState(operation)
    this.updateState(operation);
  }
  
  // @requirement HS-023: Define allowed state transitions
  // @pseudocode state-machine.md:64-83
  getAllowedTransitions(): Record<HistoryState, string[]> {
    // Line 66: RETURN map of state to allowed operations:
    return {
      READY: ['ADD_MESSAGE', 'GET_MESSAGES', 'CLEAR_HISTORY', 'UNDO_MESSAGE'],
      PROCESSING: ['ADD_MESSAGE', 'GET_MESSAGES'],
      TOOLS_PENDING: ['ADD_MESSAGE', 'GET_MESSAGES', 'EXECUTE_TOOLS'],
      TOOLS_EXECUTING: ['ADD_MESSAGE', 'GET_MESSAGES'],
      TOOLS_COMPLETED: ['ADD_MESSAGE', 'GET_MESSAGES', 'CLEAR_HISTORY'],
      ERROR: ['ADD_MESSAGE', 'GET_MESSAGES', 'CLEAR_HISTORY']
    };
  }
  
  // @requirement HS-023: Update state based on operation
  // @pseudocode state-machine.md:85-105
  updateState(operation: string): void {
    // Line 87: SWITCH operation
    switch (operation) {
      // Line 88: CASE ADD_MESSAGE:
      case 'ADD_MESSAGE':
        // Line 89: SET state = READY
        this.state = 'READY';
        break;
      // Line 90: CASE GET_MESSAGES:
      case 'GET_MESSAGES':
        // No state change required
        break;
      // Line 91: CASE CLEAR_HISTORY:
      case 'CLEAR_HISTORY':
        // Line 92: SET state = READY
        this.state = 'READY';
        break;
      // Line 93: CASE EXECUTE_TOOLS:
      case 'EXECUTE_TOOLS':
        // Line 94: SET state = TOOLS_EXECUTING
        this.state = 'TOOLS_EXECUTING';
        break;
      // Line 95: CASE UNDO_MESSAGE:
      case 'UNDO_MESSAGE':
        // Line 96: SET state = READY
        this.state = 'READY';
        break;
      // Line 97: DEFAULT case for any other operation:
      case 'DELETE_MESSAGE':
      case 'UPDATE_MESSAGE':
        // Line 98: SET state remains unchanged
        // No change to state
        break;
      default:
        // Line 98: SET state remains unchanged
        // No change to state
        break;
    }
  }
  
  // @requirement HS-023: Get current state
  // @pseudocode state-machine.md:107-115
  getCurrentState(): HistoryState {
    // Line 109: RETURN this.state
    return this.state;
  }
  
  // @requirement HS-023: Set state directly
  // @pseudocode state-machine.md:117-131
  setState(newState: HistoryState): void {
    // Line 119: IF newState not in HistoryState enum
    const validStates: HistoryState[] = ['READY', 'PROCESSING', 'TOOLS_PENDING', 'TOOLS_EXECUTING', 'TOOLS_COMPLETED', 'ERROR'];
    if (!validStates.includes(newState)) {
      // Line 120: THROW ValidationError("Invalid state")
      throw new Error("Invalid state");
    }
    // Line 122: SET this.state = newState
    this.state = newState;
  }

  // @requirement HS-023: Handle state transitions
  // @pseudocode state-machine.md:32-35
  transitionTo(newState: HistoryState, context?: any): void {
    // Line 33: IF newState not in HistoryState enum
    const validStates: HistoryState[] = ['READY', 'PROCESSING', 'TOOLS_PENDING', 'TOOLS_EXECUTING', 'TOOLS_COMPLETED', 'ERROR'];
    if (!validStates.includes(newState)) {
      // Line 34: THROW ValidationError("Invalid state: " + newState)
      throw new Error("Invalid state: " + newState);
    }
    // Line 35: SET this.state = newState
    this.state = newState;
  }
}