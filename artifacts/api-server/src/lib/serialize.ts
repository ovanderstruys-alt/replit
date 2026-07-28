/**
 * Recursively converts Date objects to ISO strings so Zod schemas
 * expecting `string` don't throw on Drizzle's timestamp columns.
 */
export function serializeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString() as unknown as T;
  if (Array.isArray(obj)) return obj.map(serializeDates) as unknown as T;
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, serializeDates(v)])
    ) as T;
  }
  return obj;
}
