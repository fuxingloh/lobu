export function normalizeDomainPattern(pattern: string): string {
  const trimmed = pattern.trim();

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  const normalized = trimmed.toLowerCase();

  if (normalized.startsWith("*.")) {
    return `.${normalized.slice(2)}`;
  }

  return normalized;
}

export function normalizeDomainPatterns(
  patterns?: string[]
): string[] | undefined {
  if (!patterns) return undefined;

  return [...new Set(patterns.map(normalizeDomainPattern).filter(Boolean))];
}
