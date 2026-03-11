/**
 * Shared enum validation utility (Story 2.3 - AI-Review LOW)
 */

export function isValidEnum<T extends Record<string, string>>(
  value: string | null | undefined,
  enumObj: T,
): value is T[keyof T] {
  if (!value) return false;
  return Object.values(enumObj).includes(value as T[keyof T]);
}
