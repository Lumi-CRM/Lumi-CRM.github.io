import { BarChart3, TrendingUp, DollarSign, Clock, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'

const AnalyticsPage = () => {
  const calls = useAppStore((state) => state.calls)
  const meetings = useAppStore((state) => state.meetings)
  const deals = useAppStore((state) => state.deals)
  const properties = useAppStore((state) => state.properties)

  const conversionRate = calls.length > 0 ? Math.round((meetings.length / calls.length) * 100) : 0
  const showingsThisMonth = meetings.length
  const totalPotentialCommission = properties
    .filter(p => p.status === 'available')
    .reduce((sum, prop) => sum + (prop.price ?? 0) * 0.03, 0)

  const stats = [
    {
      title: 'Конверсия звонков во встречи',
      value: `${conversionRate}%`,
      change: '+12% за месяц',
      icon: Target,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Количество показов',
      value: showingsThisMonth.toString(),
      change: '+8 за месяц',
      icon: Clock,
      color: 'from-emerald-500 to-teal-500'
    },
    {
      title: 'Потенциальная комиссия',
      value: `${totalPotentialCommission.toLocaleString('ru-RU')} ₽`,
      change: '+15% за месяц',
      icon: DollarSign,
      color: 'from-purple-500 to-violet-500'
    }
  ]

  const funnelData = [
    { stage: 'Звонки', value: calls.length, color: 'bg-blue-500' },
    { stage: 'Встречи', value: meetings.length, color: 'bg-cyan-500' },
    { stage: 'Показы', value: showingsThisMonth, color: 'bg-emerald-500' },
    { stage: 'Сделки', value: deals.length, color: 'bg-purple-500' }
  ]

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Аналитика</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-gray-500 text-sm mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</p>
              <p className="text-emerald-600 text-sm font-medium">{stat.change}</p>
            </div>
          </motion.div>
        )
      })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Воронка продаж</h3>
          <div className="space-y-4">
            {funnelData.map((item, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">{item.stage}</span>
                <span className="text-gray-500 font-semibold">{item.value}</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all`}
                  style={{ width: `${Math.min((item.value / (calls.length || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6">Показы по неделям</h3>
          <div className="h-64 flex items-end gap-4">
            {[
              { week: 'Нед. 1', value: Math.floor(showingsThisMonth * 0.25) },
              { week: 'Нед. 2', value: Math.floor(showingsThisMonth * 0.3) },
              { week: 'Нед. 3', value: Math.floor(showingsThisMonth * 0.2) },
              { week: 'Нед. 4', value: Math.floor(showingsThisMonth * 0.25) }
            ].map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-purple-600 rounded-t-xl"
                  style={{ height: `${Math.min((item.value / (showingsThisMonth || 1)) * 100, 100)}%` }}
                />
                <span className="text-gray-500 text-sm">{item.week}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default AnalyticsPage
