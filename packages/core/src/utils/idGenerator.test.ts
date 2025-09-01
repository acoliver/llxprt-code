import { describe, it, expect } from 'vitest';
import {
  generateToolCallId,
  generateSecureId,
  generateShortId,
  isValidId,
} from './idGenerator.js';

describe('ID Generator', () => {
  describe('generateToolCallId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        ids.add(generateToolCallId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(count);
    });

    it('should generate IDs with call_ prefix', () => {
      const id = generateToolCallId();
      expect(id).toMatch(/^call_[a-f0-9]{32}$/);
    });

    it('should generate IDs quickly in succession', () => {
      // Generate many IDs as fast as possible
      const ids = [];
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        ids.push(generateToolCallId());
      }

      const duration = Date.now() - start;

      // Should be fast (less than 100ms for 1000 IDs)
      expect(duration).toBeLessThan(100);

      // All should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('generateSecureId', () => {
    it('should generate IDs with custom prefix', () => {
      const id = generateSecureId('msg');
      expect(id).toMatch(/^msg_[a-f0-9]{32}$/);
    });

    it('should generate unique IDs with same prefix', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateSecureId('test'));
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe('generateShortId', () => {
    it('should generate shorter IDs', () => {
      const id = generateShortId('short');
      expect(id).toMatch(/^short_[a-f0-9]{16}$/);
    });

    it('should still be unique for practical purposes', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(generateShortId('test'));
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe('isValidId', () => {
    it('should validate correct IDs', () => {
      const id = generateToolCallId();
      expect(isValidId(id, 'call')).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(isValidId('', 'call')).toBe(false);
      expect(isValidId('call_123', 'call')).toBe(false);
      expect(isValidId('call_xyz', 'call')).toBe(false);
      expect(isValidId('wrong_a1b2c3d4e5f67890', 'call')).toBe(false);
    });
  });
});
