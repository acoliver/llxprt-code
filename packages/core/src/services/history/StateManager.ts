import { HistoryState } from './types.js';

export class StateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateError';
  }
}

// @plan PLAN-20250128-HISTORYSERVICE.P09
export class StateManager {
  // @requirement HS-015: Manage conversation state transitions
  private currentState: HistoryState = HistoryState.IDLE;

  constructor() {
    // Initialization happens in property declarations above
  }

  // @plan PLAN-20250128-HISTORYSERVICE.P09
  // @requirement HS-016: Validate state transitions
  validateStateTransition(transition: string): void {
    // Parse transition and check if valid
    if (!this.isValidTransition(transition)) {
      throw new Error(`Invalid state transition: ${transition}`);
    }
  }

  // @plan PLAN-20250128-HISTORYSERVICE.P09
  // @requirement HS-015: Get current conversation state
  getCurrentState(): HistoryState {
    return this.currentState;
  }

  // @plan PLAN-20250128-HISTORYSERVICE.P09
  // @requirement HS-017: Set state directly
  setState(state: HistoryState): void {
    this.currentState = state;
  }

  // Transition to a new state
  transitionTo(state: HistoryState): void {
    this.currentState = state;
  }

  // @plan PLAN-20250128-HISTORYSERVICE.P09
  // @requirement HS-017: Check if state transition is allowed
  canTransition(from: HistoryState, to: HistoryState): boolean {
    // Define valid transitions between states
    // Allow transitions from a state to itself
    // @pseudocode tool-transactions.md:227-235
    const validTransitions: Record<HistoryState, HistoryState[]> = {
      [HistoryState.IDLE]: [
        HistoryState.IDLE,
        HistoryState.MODEL_RESPONDING,
        HistoryState.TRANSACTION_ACTIVE,
      ],
      [HistoryState.MODEL_RESPONDING]: [
        HistoryState.MODEL_RESPONDING,
        HistoryState.IDLE,
        HistoryState.TRANSACTION_ACTIVE,
      ],
      [HistoryState.TRANSACTION_ACTIVE]: [HistoryState.TRANSACTION_COMMITTING],
      [HistoryState.TRANSACTION_COMMITTING]: [HistoryState.IDLE],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  // Helper method to validate transition strings
  private isValidTransition(transition: string): boolean {
    // A valid transition format is "FROM_STATE->TO_STATE"
    const transitionRegex = /^([A-Z_]+)->([A-Z_]+)$/;
    const match = transition.match(transitionRegex);

    if (!match) {
      return false;
    }

    const fromState = match[1] as HistoryState;
    const toState = match[2] as HistoryState;

    // Check if both states are valid HistoryState values
    const validStates = Object.values(HistoryState);
    if (!validStates.includes(fromState) || !validStates.includes(toState)) {
      return false;
    }

    // Check if the transition is allowed
    return this.canTransition(fromState, toState);
  }
}
