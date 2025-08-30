/**
 * Centralized Tool ID Generator
 *
 * This module provides atomic, collision-free tool ID generation to fix
 * the race conditions and duplicate ID issues identified in the investigation.
 *
 * Key features:
 * - Atomic counter to ensure uniqueness even in parallel execution
 * - Consistent ID format across all providers
 * - No reliance on Math.random() which can collide
 * - Thread-safe ID generation
 */

export class ToolIdGenerator {
  private static counter = 0;
  private static readonly instanceId = process.hrtime.bigint().toString(36);
  private static readonly idCache = new Map<string, string>();

  /**
   * Generate a unique tool ID that is guaranteed to be collision-free
   * even in parallel execution scenarios.
   */
  static generateId(prefix: string = 'tool'): string {
    const timestamp = Date.now().toString(36);
    const count = (++this.counter).toString(36);
    const uniqueId = `${prefix}_${this.instanceId}_${timestamp}_${count}`;
    return uniqueId;
  }

  /**
   * Transform a tool ID to a provider-specific format while maintaining
   * consistency and preventing duplicates.
   *
   * @param id - The original tool ID
   * @param targetFormat - The target provider format ('anthropic', 'openai', 'gemini')
   * @returns The transformed ID
   */
  static transformId(
    id: string,
    targetFormat: 'anthropic' | 'openai' | 'gemini',
  ): string {
    if (!id) {
      // Generate a new ID if none provided
      return this.generateId(this.getPrefixForFormat(targetFormat));
    }

    // Check cache first to ensure consistent transformation
    const cacheKey = `${id}:${targetFormat}`;
    const cached = this.idCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let transformedId: string;

    switch (targetFormat) {
      case 'anthropic':
        // Anthropic uses toolu_ prefix
        if (id.startsWith('toolu_')) {
          transformedId = id;
        } else {
          // Remove any existing prefix and add toolu_
          const baseId = this.extractBaseId(id);
          transformedId = `toolu_${baseId}`;
        }
        break;

      case 'openai':
        // OpenAI uses call_ prefix
        if (id.startsWith('call_')) {
          transformedId = id;
        } else {
          const baseId = this.extractBaseId(id);
          transformedId = `call_${baseId}`;
        }
        break;

      case 'gemini':
        // Gemini doesn't require a specific prefix, but we'll ensure consistency
        transformedId = id;
        break;

      default:
        transformedId = id;
    }

    // Cache the transformation for consistency
    this.idCache.set(cacheKey, transformedId);
    return transformedId;
  }

  /**
   * Extract the base ID without any provider-specific prefix
   */
  private static extractBaseId(id: string): string {
    // Remove common prefixes
    return id.replace(/^(toolu_|call_|tool_|gemini_)/, '');
  }

  /**
   * Get the appropriate prefix for a provider format
   */
  private static getPrefixForFormat(
    format: 'anthropic' | 'openai' | 'gemini',
  ): string {
    switch (format) {
      case 'anthropic':
        return 'toolu';
      case 'openai':
        return 'call';
      case 'gemini':
        return 'gemini';
      default:
        return 'tool';
    }
  }

  /**
   * Validate that a tool ID is properly formatted and not empty
   */
  static validateId(id: string | undefined | null): boolean {
    return !!(id && typeof id === 'string' && id.trim().length > 0);
  }

  /**
   * Ensure a tool ID exists, generating one if needed
   */
  static ensureId(
    id: string | undefined | null,
    prefix: string = 'tool',
  ): string {
    if (this.validateId(id)) {
      return id as string;
    }
    return this.generateId(prefix);
  }

  /**
   * Clear the ID cache (useful for testing)
   */
  static clearCache(): void {
    this.idCache.clear();
    this.counter = 0;
  }
}

// Export a singleton instance for convenience
export const toolIdGenerator = ToolIdGenerator;
