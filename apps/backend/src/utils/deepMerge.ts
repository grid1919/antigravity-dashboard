/**
 * Deep merge utility for configuration objects
 * Ported from antigravity2api-nodejs
 */

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Check if a value is a plain object (not null, array, or other object types)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Deep merge two objects
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns The merged object
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: DeepPartial<T>
): T {
  const result = { ...target };

  for (const key of Object.keys(source) as Array<keyof T>) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as DeepPartial<Record<string, unknown>>
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Deep merge multiple objects
 * @param objects - Objects to merge (later objects take precedence)
 * @returns The merged object
 */
export function deepMergeAll<T extends Record<string, unknown>>(
  ...objects: Array<DeepPartial<T>>
): T {
  return objects.reduce((acc, obj) => {
    return deepMerge(acc as T, obj);
  }, {} as T) as T;
}

export default deepMerge;
