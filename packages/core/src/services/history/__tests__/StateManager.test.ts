import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../StateManager';
import { HistoryState } from '../types';

describe('StateManager', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('validateStateTransition', () => {
    it('should accept valid transitions', () => {
      expect(() =>
        stateManager.validateStateTransition('IDLE->MODEL_RESPONDING'),
      ).not.toThrow();
    });

    it('should throw error for invalid transitions', () => {
      expect(() =>
        stateManager.validateStateTransition('INVALID->TRANSITION'),
      ).toThrow('Invalid state transition');
    });

    it('should throw error for malformed transition strings', () => {
      expect(() =>
        stateManager.validateStateTransition('IDLE-MODEL_RESPONDING'),
      ).toThrow('Invalid state transition');
    });
  });

  describe('getCurrentState', () => {
    it('should return current state', () => {
      expect(stateManager.getCurrentState()).toBe(HistoryState.IDLE);
    });
  });

  describe('setState', () => {
    it('should set the state directly', () => {
      stateManager.setState(HistoryState.MODEL_RESPONDING);
      expect(stateManager.getCurrentState()).toBe(
        HistoryState.MODEL_RESPONDING,
      );
    });
  });

  describe('canTransition', () => {
    it('should allow valid transition from IDLE to MODEL_RESPONDING', () => {
      expect(
        stateManager.canTransition(
          HistoryState.IDLE,
          HistoryState.MODEL_RESPONDING,
        ),
      ).toBe(true);
    });

    it('should disallow invalid transition', () => {
      expect(
        stateManager.canTransition(
          HistoryState.TOOLS_EXECUTING,
          HistoryState.MODEL_RESPONDING,
        ),
      ).toBe(false);
    });
  });
});
