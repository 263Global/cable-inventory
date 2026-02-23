type SearchableRecord = Record<string, unknown>

function includesText(value: unknown, query: string): boolean {
  return typeof value === 'string' && value.toLowerCase().includes(query)
}

export function matchesReferenceSearch<T extends SearchableRecord>(
  item: T,
  rawSearch: string,
  searchKey: keyof T,
): boolean {
  const query = rawSearch.trim().toLowerCase()
  if (!query) return true

  const keyValue = item[searchKey]
  if (includesText(keyValue, query)) return true

  return Object.values(item).some((value) => includesText(value, query))
}
