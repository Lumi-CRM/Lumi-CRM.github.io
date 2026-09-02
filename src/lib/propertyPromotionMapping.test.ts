import assert from 'node:assert/strict'
import test from 'node:test'
import { mapPropertyPromotionRow, propertyPromotionFromInput } from './propertyPromotionMapping.ts'

test('maps promotion journal metadata', () => {
  const promotion = mapPropertyPromotionRow({
    id: 'promotion-1', property_id: 'property-1', occurred_at: '2026-09-02T09:15:00.000Z',
    source: 'Авито', outcome: '12 просмотров', notes: 'Подняли объявление',
    metadata: { kind: 'property_promotion', channel: 'Авито', action: 'boosted', cost: 499, url: 'https://example.test/ad' },
  })
  assert.equal(promotion.action, 'boosted')
  assert.equal(promotion.cost, 499)
  assert.equal(promotion.channel, 'Авито')
})

test('creates an optimistic promotion with a durable id', () => {
  const promotion = propertyPromotionFromInput('promotion-1', 'property-1', {
    channel: 'ЦИАН', action: 'published', date: '2026-09-02', time: '12:30', cost: null, url: '', result: '', notes: '',
  })
  assert.equal(promotion.id, 'promotion-1')
  assert.match(promotion.occurredAt, /^2026-09-02T/)
})
