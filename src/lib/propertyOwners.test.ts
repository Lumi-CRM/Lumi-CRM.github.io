import assert from 'node:assert/strict'
import test from 'node:test'
import {
  indexPropertyOwners,
  makePropertyOwnerRows,
  normalizePropertyOwners,
  propertyOwnerShareError,
  propertyOwnersWithLegacyFallback,
} from './propertyOwners.ts'

test('indexes several owners and keeps one primary owner first', () => {
  const indexed = indexPropertyOwners([
    { id: 'link-2', property_id: 'property-1', client_id: 'owner-2', ownership_share: '40', is_primary: false },
    { id: 'link-1', property_id: 'property-1', client_id: 'owner-1', ownership_share: 60, is_primary: true },
  ])

  assert.deepEqual(indexed.get('property-1'), [
    { id: 'link-1', clientId: 'owner-1', ownershipShare: 60, isPrimary: true },
    { id: 'link-2', clientId: 'owner-2', ownershipShare: 40, isPrimary: false },
  ])
})

test('preserves legacy owner_id until relation rows are created', () => {
  assert.deepEqual(propertyOwnersWithLegacyFallback({ id: 'property-1', ownerId: 'legacy-owner' }, []), [
    { clientId: 'legacy-owner', ownershipShare: null, isPrimary: true },
  ])
})

test('normalizes duplicates and creates cloud rows', () => {
  const owners = normalizePropertyOwners([
    { id: 'link-1', clientId: 'owner-1', ownershipShare: 50, isPrimary: false },
    { id: 'link-1-copy', clientId: 'owner-1', ownershipShare: 25, isPrimary: true },
    { id: 'link-2', clientId: 'owner-2', ownershipShare: 50, isPrimary: false },
  ])
  assert.equal(owners.length, 2)
  assert.equal(owners[0].isPrimary, true)

  const rows = makePropertyOwnerRows('user-1', 'property-1', owners)
  assert.deepEqual(rows.map(row => ({ id: row.id, client: row.client_id, primary: row.is_primary, share: row.ownership_share })), [
    { id: 'link-1', client: 'owner-1', primary: true, share: 50 },
    { id: 'link-2', client: 'owner-2', primary: false, share: 50 },
  ])
})

test('rejects invalid ownership share totals', () => {
  assert.equal(propertyOwnerShareError([
    { clientId: 'owner-1', ownershipShare: 60, isPrimary: true },
    { clientId: 'owner-2', ownershipShare: 50, isPrimary: false },
  ]), 'Сумма долей собственников не может превышать 100%.')
  assert.equal(propertyOwnerShareError([
    { clientId: 'owner-1', ownershipShare: 60, isPrimary: true },
    { clientId: 'owner-2', ownershipShare: 40, isPrimary: false },
  ]), '')
})
