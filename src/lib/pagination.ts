type PageResult<T> = { data: T[] | null; error: unknown; count?: number | null }
type PageQuery<T> = {
  order(column: string, options: { ascending: boolean }): PageQuery<T>
  range(from: number, to: number): PromiseLike<PageResult<T>>
}

export const COLLECTION_PAGE_SIZE = 500
export const MAX_COLLECTION_ROWS = 100_000

/** Read every server page. A short page is not EOF: PostgREST may cap it below our requested limit. */
export const readAllPages = async <T>(
  loadPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  options: { pageSize?: number; maxRows?: number; key?: (row: T) => unknown } = {},
): Promise<{ data: T[]; error: null }> => {
  const pageSize = options.pageSize ?? COLLECTION_PAGE_SIZE
  const maxRows = options.maxRows ?? MAX_COLLECTION_ROWS
  if (!Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(maxRows) || maxRows < 1) {
    throw new Error('Invalid pagination limits')
  }
  const rows: T[] = []
  const seen = new Set<unknown>()
  for (;;) {
    const result = await loadPage(rows.length, rows.length + pageSize - 1)
    if (result.error) throw result.error
    if (!Array.isArray(result.data)) throw new Error('Сервер вернул неверный формат списка записей.')
    if (!result.data.length) return { data: rows, error: null }
    if (rows.length + result.data.length > maxRows) {
      throw new Error(`В разделе больше ${maxRows.toLocaleString('ru-RU')} записей. Загрузка остановлена; данные не были обрезаны молча.`)
    }
    for (const row of result.data) {
      const key = options.key?.(row)
      if (key !== undefined && key !== null) {
        if (seen.has(key)) throw new Error('Список изменился во время загрузки. Повторите загрузку, чтобы получить полные данные.')
        seen.add(key)
      }
      rows.push(row)
    }
    if (result.count != null && rows.length >= result.count) return { data: rows, error: null }
  }
}

/** Supply a fresh builder per page because Supabase builders mutate their URL. */
export const fetchAllRows = <T>(createQuery: () => PageQuery<T>, keyColumn = 'id') => readAllPages(
  (from, to) => createQuery().order(keyColumn, { ascending: true }).range(from, to),
  { key: row => (row as Record<string, unknown>)[keyColumn] },
)

export const mapWithConcurrency = async <T, R>(items: readonly T[], concurrency: number, map: (item: T, index: number) => Promise<R>): Promise<R[]> => {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Invalid concurrency')
  const results = new Array<R>(items.length)
  let nextIndex = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++
      results[index] = await map(items[index], index)
    }
  }))
  return results
}
