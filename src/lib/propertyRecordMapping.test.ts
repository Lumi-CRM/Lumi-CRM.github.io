import assert from 'node:assert/strict'
import test from 'node:test'
import { propertyFromInput, type PropertyUpsertInput } from './propertyRecordMapping.ts'

const input: PropertyUpsertInput = {
  address: '  г. Курск, ул. Ленина, 1  ',
  listingType: 'sale',
  workStream: 'active',
  propertyType: 'Квартира',
  sourceUrl: '',
  price: 7_500_000,
  rooms: 2,
  area: 58,
  floor: 4,
  totalFloors: 9,
  status: 'available',
  ownerId: 'owner-1',
  tags: ['эксклюзив'],
  description: 'Тестовый объект',
  constructionYear: 2018,
  repair: 'cosmetic',
  balcony: true,
  elevator: true,
  parking: false,
  heating: 'central',
  walls: 'brick',
}

test('builds an optimistic property from form input', () => {
  const property = propertyFromInput('user-1', 'property-1', input)
  assert.equal(property.id, 'property-1')
  assert.equal(property.address, 'г. Курск, ул. Ленина, 1')
  assert.equal(property.price, 7_500_000)
  assert.equal(property.ownerId, 'owner-1')
  assert.equal(property.isFavorite, false)
})

test('preserves cloud-only fields while editing a property', () => {
  const previous = propertyFromInput('user-1', 'property-1', input)
  previous.isFavorite = true
  previous.coverUrl = 'https://example.test/photo.jpg'
  const property = propertyFromInput('user-1', 'property-1', { ...input, price: 7_300_000 }, previous)
  assert.equal(property.price, 7_300_000)
  assert.equal(property.isFavorite, true)
  assert.equal(property.coverUrl, previous.coverUrl)
  assert.equal(property.createdAt, previous.createdAt)
})
