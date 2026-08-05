export interface AuthCallbackCredentials {
  accessToken: string
  refreshToken: string
}

export const parseAuthCallbackCredentials = (hash: string): AuthCallbackCredentials | null => {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}
