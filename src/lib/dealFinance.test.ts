import assert from 'node:assert/strict'
import test from 'node:test'
import { dealFinanceKey, formatMoney, indexDealFinance, readDealFinance } from './dealFinance.ts'

test('reads non-negative deal finance values', () => {
  assert.deepEqual(readDealFinance({ agency_income: '200000', agent_income: 75000 }), {
    agencyIncome: 200000,
    agentIncome: 75000,
  })
  assert.deepEqual(readDealFinance({ agency_income: -1, agent_income: 'invalid' }), {
    agencyIncome: undefined,
    agentIncome: undefined,
  })
})

test('indexes finance records by deal id', () => {
  const index = indexDealFinance([
    { external_key: dealFinanceKey('deal-1'), metadata: { agency_income: 300000, agent_income: 120000 } },
    { external_key: 'another-record', metadata: { agency_income: 900000 } },
  ])
  assert.equal(index.size, 1)
  assert.deepEqual(index.get('deal-1'), { agencyIncome: 300000, agentIncome: 120000 })
})

test('formats deal money without treating zero as missing', () => {
  assert.equal(formatMoney(0), '0 ₽')
  assert.equal(formatMoney(undefined), 'Не указано')
})
