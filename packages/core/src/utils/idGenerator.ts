/**
 * Secure ID generation utilities
 */

import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure tool call ID
 * Format: call_<16-byte-hex> (e.g., call_a1b2c3d4e5f6789012345678)
 * This ensures uniqueness and prevents collisions
 */
export function generateToolCallId(): string {
  // Generate 16 random bytes (128 bits) for strong uniqueness
  // This gives us 2^128 possible values - essentially impossible to collide
  const bytes = randomBytes(16);
  const hex = bytes.toString('hex');
  return `call_${hex}`;
}

/**
 * Generate a secure ID with a custom prefix
 * @param prefix The prefix for the ID (e.g., 'msg', 'conv', 'prompt')
 * @returns A unique ID with the given prefix
 */
export function generateSecureId(prefix: string): string {
  const bytes = randomBytes(16);
  const hex = bytes.toString('hex');
  return `${prefix}_${hex}`;
}

/**
 * Generate a shorter secure ID (8 bytes / 64 bits)
 * Use this for less critical IDs where collision risk is acceptable
 * @param prefix The prefix for the ID
 * @returns A unique ID with the given prefix
 */
export function generateShortId(prefix: string): string {
  const bytes = randomBytes(8);
  const hex = bytes.toString('hex');
  return `${prefix}_${hex}`;
}

/**
 * Validate that an ID has the expected format
 * @param id The ID to validate
 * @param prefix The expected prefix
 * @returns True if the ID is valid
 */
export function isValidId(id: string, prefix: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const pattern = new RegExp(`^${prefix}_[a-f0-9]{16,32}$`);
  return pattern.test(id);
}

/**
 * Legacy ID generator for backwards compatibility
 * @deprecated Use generateToolCallId() or generateSecureId() instead
 */
export function generateLegacyId(prefix: string): string {
  console.warn(
    `[DEPRECATED] generateLegacyId is deprecated. Use generateSecureId('${prefix}') instead.`,
  );
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
