export const DEAL_FINANCE_PREFIX = 'deal-finance:'

export type DealFinance = {
  agencyIncome?: number
  agentIncome?: number
}

export type DealFinanceActivity = {
  external_key?: string | null
  metadata?: Record<string, unknown> | null
}

const optionalMoney = (value: unknown) => {
  if (value === null || value === undefined || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : undefined
}

export const dealFinanceKey = (dealId: string) => `${DEAL_FINANCE_PREFIX}${dealId}`

export const readDealFinance = (metadata?: Record<string, unknown> | null): DealFinance => ({
  agencyIncome: optionalMoney(metadata?.agency_income),
  agentIncome: optionalMoney(metadata?.agent_income),
})

export const indexDealFinance = (activities: DealFinanceActivity[]) => {
  const result = new Map<string, DealFinance>()
  for (const activity of activities) {
    if (!activity.external_key?.startsWith(DEAL_FINANCE_PREFIX)) continue
    result.set(activity.external_key.slice(DEAL_FINANCE_PREFIX.length), readDealFinance(activity.metadata))
  }
  return result
}

export const formatMoney = (value?: number) => value === undefined
  ? 'Не указано'
  : `${value.toLocaleString('ru-RU')} ₽`
