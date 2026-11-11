/** Accept the documented scope string/list and the handler's userScopes DTO.
 * Unexpected values grant no scopes; never infer permissions from object keys.
 */
export function normalizeScopes(payload: unknown): string[] {
  const value =
    payload !== null && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as { userScopes?: unknown }).userScopes
      : payload;
  const entries = typeof value === 'string' ? value.split(/[\s,]+/) : value;
  if (!Array.isArray(entries)) return [];
  return [
    ...new Set(
      entries
        .filter(
          (entry): entry is string =>
            typeof entry === 'string' && entry.trim().length > 0,
        )
        .map((entry) => entry.trim()),
    ),
  ];
}
