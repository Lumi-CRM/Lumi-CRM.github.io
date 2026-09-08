const privateIpv4 = (hostname: string) => {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false
  return parts[0] === 0
    || parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
}

export const safeExternalUrl = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 2048) return null
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || privateIpv4(hostname)) return null
    if (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe8') || hostname.startsWith('fe9') || hostname.startsWith('fea') || hostname.startsWith('feb')) return null
    return url.toString()
  } catch {
    return null
  }
}
