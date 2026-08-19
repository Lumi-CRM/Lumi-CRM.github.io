import { useEffect, useRef, useState } from 'react'
import { BriefcaseBusiness, Building2, CalendarDays, CheckSquare, LoaderCircle, Search, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

type SearchResult = {
  id: string
  label: string
  subtitle: string
  group: string
  route: string
  icon: typeof Search
}

const normalizeTerm = (value: string) => value.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ')

const GlobalSearch = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef(0)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const term = normalizeTerm(query)
    if (!user || term.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    const requestId = ++requestRef.current
    const timer = window.setTimeout(async () => {
      setLoading(true)
      const pattern = `%${term}%`
      const settled = await Promise.allSettled([
        supabase.from('properties').select('id,address,price,status').eq('user_id', user.id).is('deleted_at', null).ilike('address', pattern).limit(6),
        supabase.from('clients').select('id,first_name,last_name,middle_name,phone,email,type,roles').eq('user_id', user.id).is('deleted_at', null).or(`first_name.ilike.${pattern},last_name.ilike.${pattern},middle_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`).limit(8),
        supabase.from('tasks').select('id,title,description,due_date').eq('user_id', user.id).is('deleted_at', null).or(`title.ilike.${pattern},description.ilike.${pattern}`).limit(5),
        supabase.from('events').select('id,title,type,event_date,location').eq('user_id', user.id).is('deleted_at', null).or(`title.ilike.${pattern},location.ilike.${pattern}`).limit(5),
        supabase.from('deals').select('id,notes,status,price').eq('user_id', user.id).is('deleted_at', null).ilike('notes', pattern).limit(4),
      ])
      if (requestId !== requestRef.current) return

      const rows = <T,>(index: number) => {
        const result = settled[index]
        return result.status === 'fulfilled' && !result.value.error ? (result.value.data ?? []) as T[] : []
      }
      const next: SearchResult[] = [
        ...rows<any>(0).map(property => ({ id: property.id, label: property.address || 'Объект без адреса', subtitle: property.price ? `${Number(property.price).toLocaleString('ru-RU')} ₽ · ${property.status}` : property.status || 'Объект', group: 'Объекты', route: `/properties/${property.id}`, icon: Building2 })),
        ...rows<any>(1).map(client => {
          const roles = client.roles || []
          const isTenant = roles.includes('tenant')
          const isLandlord = roles.includes('landlord')
          const route = client.type === 'buyer'
            ? `${isTenant ? '/tenants' : '/buyers'}?client=${client.id}`
            : `${isLandlord ? '/landlords' : '/owners'}?client=${client.id}`
          return { id: client.id, label: [client.last_name, client.first_name, client.middle_name].filter(Boolean).join(' ') || 'Без имени', subtitle: client.phone || client.email || 'Контакт', group: client.type === 'buyer' ? (isTenant ? 'Арендаторы' : 'Покупатели') : (isLandlord ? 'Арендодатели' : 'Собственники'), route, icon: UserRound }
        }),
        ...rows<any>(2).map(task => ({ id: task.id, label: task.title, subtitle: task.due_date ? `Срок: ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString('ru-RU')}` : task.description || 'Задача', group: 'Задачи', route: '/tasks', icon: CheckSquare })),
        ...rows<any>(3).map(event => ({ id: event.id, label: event.title, subtitle: `${event.type === 'call' ? 'Звонок' : 'Встреча'} · ${new Date(`${event.event_date}T00:00:00`).toLocaleDateString('ru-RU')}`, group: 'Календарь', route: '/calendar', icon: CalendarDays })),
        ...rows<any>(4).map(deal => ({ id: deal.id, label: deal.notes || 'Сделка', subtitle: `${deal.status} · ${deal.price ? `${Number(deal.price).toLocaleString('ru-RU')} ₽` : 'цена не указана'}`, group: 'Сделки', route: '/deals', icon: BriefcaseBusiness })),
      ]
      setResults(next.slice(0, 24))
      setLoading(false)
      setOpen(true)
    }, 280)
    return () => window.clearTimeout(timer)
  }, [query, user])

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const choose = (result: SearchResult) => {
    navigate(result.route)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <Search className="lumi-muted pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2" />
      <input
        type="search"
        value={query}
        onChange={event => { setQuery(event.target.value); setOpen(true) }}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter' && results[0]) choose(results[0])
        }}
        placeholder="Глобальный поиск"
        aria-label="Глобальный поиск по CRM"
        className="lumi-control w-full rounded-xl py-2.5 pl-10 pr-10 text-sm outline-none"
      />
      {loading ? <LoaderCircle className="lumi-muted absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin" /> : query && <button type="button" onClick={() => { setQuery(''); setResults([]) }} className="lumi-muted absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1" aria-label="Очистить поиск"><X className="h-4 w-4" /></button>}
      {open && query.trim().length >= 2 && (
        <div className="lumi-theme-menu absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[110] max-h-[min(32rem,70dvh)] overflow-y-auto rounded-2xl p-2">
          {!loading && results.length === 0 && <div className="lumi-muted px-4 py-8 text-center text-sm">Ничего не найдено</div>}
          {results.map((result, index) => {
            const Icon = result.icon
            return <button type="button" key={`${result.group}-${result.id}-${index}`} onClick={() => choose(result)} className="lumi-theme-option flex w-full items-center gap-3 rounded-xl p-3 text-left transition">
              <span className="lumi-accent-soft rounded-xl p-2"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="lumi-text block truncate text-sm font-semibold">{result.label}</span><span className="lumi-muted mt-0.5 block truncate text-xs">{result.group} · {result.subtitle}</span></span>
            </button>
          })}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
