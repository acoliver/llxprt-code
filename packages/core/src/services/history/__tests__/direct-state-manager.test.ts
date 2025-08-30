import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../StateManager';
import { HistoryState } from '../types';

describe('StateManager Direct Tests', () => {
  let stateManager: StateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  describe('initial state', () => {
    it('should start in IDLE state', () => {
      expect(stateManager.getCurrentState()).toBe(HistoryState.IDLE);
    });
  });

  describe('validateStateTransition', () => {
    it('should accept valid transitions', () => {
      expect(() =>
        stateManager.validateStateTransition('IDLE->MODEL_RESPONDING'),
      ).not.toThrow();
      expect(() =>
        stateManager.validateStateTransition('IDLE->TOOLS_PENDING'),
      ).not.toThrow();
      expect(() =>
        stateManager.validateStateTransition('MODEL_RESPONDING->IDLE'),
      ).not.toThrow();
      expect(() =>
        stateManager.validateStateTransition('MODEL_RESPONDING->TOOLS_PENDING'),
      ).not.toThrow();
      expect(() =>
        stateManager.validateStateTransition('TOOLS_PENDING->TOOLS_EXECUTING'),
      ).not.toThrow();
      expect(() =>
        stateManager.validateStateTransition('TOOLS_PENDING->IDLE'),
      ).not.toThrow();
      expect(() =>
        stateManager.validateStateTransition('TOOLS_EXECUTING->IDLE'),
      ).not.toThrow();
      expect(() =>
        stateManager.validateStateTransition('TOOLS_EXECUTING->TOOLS_PENDING'),
      ).not.toThrow();
    });

    it('should throw error for invalid transitions', () => {
      expect(() =>
        stateManager.validateStateTransition('IDLE->TOOLS_EXECUTING'),
      ).toThrow('Invalid state transition');
      expect(() =>
        stateManager.validateStateTransition(
          'MODEL_RESPONDING->TOOLS_EXECUTING',
        ),
      ).toThrow('Invalid state transition');
    });

    it('should throw error for malformed transition strings', () => {
      expect(() =>
        stateManager.validateStateTransition('IDLE-MODEL_RESPONDING'),
      ).toThrow('Invalid state transition');
      expect(() => stateManager.validateStateTransition('IDLE->')).toThrow(
        'Invalid state transition',
      );
      expect(() => stateManager.validateStateTransition('->IDLE')).toThrow(
        'Invalid state transition',
      );
    });
  });

  describe('setState and getCurrentState', () => {
    it('should set and get states correctly', () => {
      stateManager.setState(HistoryState.MODEL_RESPONDING);
      expect(stateManager.getCurrentState()).toBe(
        HistoryState.MODEL_RESPONDING,
      );

      stateManager.setState(HistoryState.TOOLS_PENDING);
      expect(stateManager.getCurrentState()).toBe(HistoryState.TOOLS_PENDING);

      stateManager.setState(HistoryState.TOOLS_EXECUTING);
      expect(stateManager.getCurrentState()).toBe(HistoryState.TOOLS_EXECUTING);

      stateManager.setState(HistoryState.IDLE);
      expect(stateManager.getCurrentState()).toBe(HistoryState.IDLE);
    });
  });

  describe('canTransition', () => {
    it('should correctly identify valid transitions', () => {
      expect(
        stateManager.canTransition(
          HistoryState.IDLE,
          HistoryState.MODEL_RESPONDING,
        ),
      ).toBe(true);
      expect(
        stateManager.canTransition(
          HistoryState.IDLE,
          HistoryState.TOOLS_PENDING,
        ),
      ).toBe(true);
      expect(
        stateManager.canTransition(
          HistoryState.MODEL_RESPONDING,
          HistoryState.IDLE,
        ),
      ).toBe(true);
      expect(
        stateManager.canTransition(
          HistoryState.MODEL_RESPONDING,
          HistoryState.TOOLS_PENDING,
        ),
      ).toBe(true);
      expect(
        stateManager.canTransition(
          HistoryState.TOOLS_PENDING,
          HistoryState.TOOLS_EXECUTING,
        ),
      ).toBe(true);
      expect(
        stateManager.canTransition(
          HistoryState.TOOLS_PENDING,
          HistoryState.IDLE,
        ),
      ).toBe(true);
      expect(
        stateManager.canTransition(
          HistoryState.TOOLS_EXECUTING,
          HistoryState.IDLE,
        ),
      ).toBe(true);
      expect(
        stateManager.canTransition(
          HistoryState.TOOLS_EXECUTING,
          HistoryState.TOOLS_PENDING,
        ),
      ).toBe(true);
    });

    it('should correctly identify invalid transitions', () => {
      expect(
        stateManager.canTransition(
          HistoryState.IDLE,
          HistoryState.TOOLS_EXECUTING,
        ),
      ).toBe(false);
      expect(
        stateManager.canTransition(
          HistoryState.MODEL_RESPONDING,
          HistoryState.TOOLS_EXECUTING,
        ),
      ).toBe(false);
      expect(
        stateManager.canTransition(
          HistoryState.TOOLS_EXECUTING,
          HistoryState.MODEL_RESPONDING,
        ),
      ).toBe(false);
    });
  });
});
