import { useState } from 'react'
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CrmOverview } from '../lib/crm'

interface Props {
  analytics: CrmOverview['analytics']
  config: { firstKey: string; secondKey: string; firstLabel: string; secondLabel: string; firstColor: string; secondColor: string }
}

const pieColors = ['#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#f59e0b', '#22c55e']

const DashboardAnalytics = ({ analytics, config }: Props) => {
  const [range, setRange] = useState<'days' | 'weeks' | 'months'>('months')
  const data = analytics.periods[range] || analytics.months
  return <div className="grid min-w-0 grid-cols-1 gap-6 p-5 xl:grid-cols-3">
    <div className="lumi-panel-muted min-w-0 rounded-2xl border p-5 xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="lumi-text font-semibold">Динамика базы</h3><p className="lumi-muted mt-1 text-sm">{config.firstLabel} и {config.secondLabel.toLowerCase()}</p></div><div className="flex gap-1 overflow-x-auto">{([['days', '30 дней'], ['weeks', '12 недель'], ['months', '12 месяцев']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setRange(value)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium ${range === value ? 'lumi-accent-bg' : 'lumi-control'}`}>{label}</button>)}</div></div>
      <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--lumi-chart-grid)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" stroke="var(--lumi-muted)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis stroke="var(--lumi-muted)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip contentStyle={{ background: 'var(--lumi-panel)', border: '1px solid var(--lumi-border)', borderRadius: 12, color: 'var(--lumi-text)' }} labelStyle={{ color: 'var(--lumi-text)' }} itemStyle={{ color: 'var(--lumi-text)' }} /><Line type="monotone" dataKey={config.firstKey} name={config.firstLabel} stroke={config.firstColor} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} /><Line type="monotone" dataKey={config.secondKey} name={config.secondLabel} stroke={config.secondColor} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
    </div>
    <div className="lumi-panel-muted min-w-0 rounded-2xl border p-5"><h3 className="lumi-text font-semibold">Объекты по типам</h3><p className="lumi-muted mt-1 text-sm">Структура текущей базы</p><div className="h-52">{analytics.propertyTypes.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.propertyTypes} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>{analytics.propertyTypes.map((item, index) => <Cell key={item.name} fill={pieColors[index % pieColors.length]} />)}</Pie><Tooltip contentStyle={{ background: 'var(--lumi-panel)', border: '1px solid var(--lumi-border)', borderRadius: 12, color: 'var(--lumi-text)' }} itemStyle={{ color: 'var(--lumi-text)' }} labelStyle={{ color: 'var(--lumi-text)' }} /></PieChart></ResponsiveContainer> : <div className="lumi-muted flex h-full items-center justify-center text-sm">Данные появятся после импорта</div>}</div><div className="grid grid-cols-2 gap-2">{analytics.propertyTypes.slice(0, 6).map((item, index) => <div key={item.name} className="lumi-muted flex min-w-0 items-center gap-2 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pieColors[index % pieColors.length] }} /><span className="truncate">{item.name}: {item.value}</span></div>)}</div></div>
  </div>
}

export default DashboardAnalytics
