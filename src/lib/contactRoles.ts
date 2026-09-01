export type ContactRole = 'seller' | 'buyer' | 'landlord' | 'tenant'

const supportedRoles = new Set<ContactRole>(['seller', 'buyer', 'landlord', 'tenant'])

export const inferContactRoles = (row: Record<string, unknown>): ContactRole[] => {
  const result = new Set<ContactRole>()
  for (const role of Array.isArray(row.roles) ? row.roles : []) {
    if (typeof role === 'string' && supportedRoles.has(role as ContactRole)) result.add(role as ContactRole)
  }
  if (row.type === 'seller') result.add('seller')
  if (row.type === 'buyer') result.add('buyer')
  return Array.from(result)
}
