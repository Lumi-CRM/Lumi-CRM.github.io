export const getErrorMessage = (error: unknown, fallback = 'Неизвестная ошибка') => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error
  if (error && typeof error === 'object') {
    const source = error as Record<string, unknown>
    const parts = [source.message, source.details, source.hint]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    if (parts.length) return parts.join(' · ')
    if (typeof source.code === 'string') return `Код ошибки: ${source.code}`
  }
  return fallback
}
