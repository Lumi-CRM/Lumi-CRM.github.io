import { useEffect, useRef, useState } from 'react'
import { BriefcaseBusiness, Building2, CalendarDays, CheckSquare, LoaderCircle, Search, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWorkspaceSearch } from '../hooks/useWorkspaceSearch'
import { normalizeSearchTerm, type WorkspaceSearchResult } from '../lib/workspaceSearch'

const resultIcons = {
  property: Building2,
  client: UserRound,
  task: CheckSquare,
  event: CalendarDays,
  deal: BriefcaseBusiness,
}

const GlobalSearch = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')
  const [open, setOpen] = useState(false)
  const { data: searchedResults = [], isFetching } = useWorkspaceSearch(user?.id, debouncedTerm)
  const normalizedQuery = normalizeSearchTerm(query)
  const results = normalizedQuery === debouncedTerm ? searchedResults : []
  const loading = normalizedQuery.length >= 2 && (normalizedQuery !== debouncedTerm || isFetching)

  useEffect(() => {
    const term = normalizeSearchTerm(query)
    const timer = window.setTimeout(() => setDebouncedTerm(term), 280)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const choose = (result: WorkspaceSearchResult) => {
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
      {loading ? <LoaderCircle className="lumi-muted absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin" /> : query && <button type="button" onClick={() => { setQuery(''); setDebouncedTerm('') }} className="lumi-muted absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1" aria-label="Очистить поиск"><X className="h-4 w-4" /></button>}
      {open && query.trim().length >= 2 && (
        <div className="lumi-theme-menu absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[110] max-h-[min(32rem,70dvh)] overflow-y-auto rounded-2xl p-2">
          {!loading && results.length === 0 && <div className="lumi-muted px-4 py-8 text-center text-sm">Ничего не найдено</div>}
          {results.map((result, index) => {
            const Icon = resultIcons[result.kind]
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
