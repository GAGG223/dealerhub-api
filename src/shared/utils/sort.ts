/**
 * Converte um parâmetro de ordenação no formato "campo_asc" / "campo_desc"
 * em um objeto orderBy do Prisma, validando o campo contra uma allowlist.
 *
 * Ex.: parseSort('price_asc', ['price','year'], { createdAt: 'desc' })
 *      => { price: 'asc' }
 */
export function parseSort<T extends string>(
  sort: string | undefined,
  allowedFields: readonly T[],
  fallback: Record<string, 'asc' | 'desc'>,
): Record<string, 'asc' | 'desc'> {
  if (!sort) {
    return fallback;
  }

  const lastUnderscore = sort.lastIndexOf('_');
  if (lastUnderscore <= 0) {
    return fallback;
  }

  const field = sort.slice(0, lastUnderscore);
  const direction = sort.slice(lastUnderscore + 1);

  if (!allowedFields.includes(field as T) || (direction !== 'asc' && direction !== 'desc')) {
    return fallback;
  }

  return { [field]: direction };
}
