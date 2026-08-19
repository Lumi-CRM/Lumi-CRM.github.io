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
      if (navigator.onLine) {
        try {
          await new Promise(resolve => window.setTimeout(resolve, 900))
          setData(await getCrmOverview())
          return
        } catch {
          // Show the connection message only after a real second failure.
        }
      }
      console.error('Failed to load CRM overview:', requestError)
      setError('Не удалось загрузить данные из Supabase. Проверьте подключение и схему базы.')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, error, reload }
}
