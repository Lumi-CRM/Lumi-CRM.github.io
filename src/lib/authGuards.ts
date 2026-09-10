interface SignUpUserLike {
  identities?: unknown[] | null
}

export const isTemporarySessionError = (error: { name?: string; status?: number } | null | undefined) =>
  Boolean(error && (error.name === 'AuthRetryableFetchError' || error.status === 0 || (error.status ?? 0) >= 500))

export const isExistingEmailSignUp = (user: SignUpUserLike | null | undefined) => (
  Boolean(user) && Array.isArray(user?.identities) && user.identities.length === 0
)

export const loginErrorMessage = (message?: string) => {
  const normalized = (message ?? '').toLowerCase()
  if (normalized.includes('email not confirmed')) return 'Сначала подтвердите почту по ссылке из письма.'
  if (normalized.includes('invalid login credentials')) return 'Неверный логин или пароль'
  if (/failed to fetch|fetch failed|network|timeout|timed out|aborted|gateway|temporarily unavailable/.test(normalized)) {
    return 'Не удалось подключиться к облаку. Проверьте интернет или повторите позже.'
  }
  return 'Не удалось выполнить вход. Повторите попытку.'
}
