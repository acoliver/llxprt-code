/**
 * Safe JSON parsing with fallback
 */
export function safeJsonParse<T = unknown>(str: string, fallback: T): T {
  if (!str || typeof str !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(str) as T;
  } catch (e) {
    console.warn(
      '[jsonUtils] Failed to parse JSON:',
      e instanceof Error ? e.message : e,
    );
    console.debug('[jsonUtils] Invalid JSON string:', str.substring(0, 100));
    return fallback;
  }
}

/**
 * Safe JSON stringify with fallback
 */
export function safeJsonStringify(
  obj: unknown,
  fallback: string = '{}',
): string {
  if (obj === undefined || obj === null) {
    return fallback;
  }

  try {
    return JSON.stringify(obj);
  } catch (e) {
    console.warn(
      '[jsonUtils] Failed to stringify object:',
      e instanceof Error ? e.message : e,
    );
    return fallback;
  }
}
