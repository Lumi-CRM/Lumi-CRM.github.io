import { useCallback, useEffect, useState } from 'react'
import { CrmOverview, getCrmOverview } from '../lib/crm'

const initialValue: CrmOverview = {
  owners: 0,
  buyers: 0,
  properties: 0,
  activeDeals: 0,
  tasks: [],
  events: [],
  recentProperties: [],
  analytics: { months: [], periods: { days: [], weeks: [], months: [] }, propertyTypes: [], totalDealVolume: 0, totalAgencyIncome: 0, totalAgentIncome: 0 },
}

export function useCrmOverview(enabled: boolean) {
  const [data, setData] = useState<CrmOverview>(initialValue)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)

    try {
      setData(await getCrmOverview())
    } catch (requestError) {
      console.error('Failed to load CRM overview:', requestError)
      setError('Облако сейчас не ответило. Локальные данные остаются на устройстве; нажмите «Обновить», когда связь восстановится.')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, error, reload }
}
