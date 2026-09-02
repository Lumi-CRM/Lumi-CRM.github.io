import { CheckCircle2, Phone, Users, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePropertyMatches } from '../hooks/usePropertyMatches'
import type { Property } from '../types'

const PropertyMatchesPanel = ({ property }: { property: Property }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data = [], isPending, error } = usePropertyMatches(user?.id, property)
  return <div className="space-y-5">
    <section className="lumi-panel rounded-2xl border p-5"><h2 className="lumi-text text-xl font-semibold">Подбор покупателей</h2><p className="lumi-muted mt-1 text-sm">Автоматическое сравнение объекта с бюджетом, площадью, комнатами, этажом и районом заявок.</p></section>
    {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400">Не удалось выполнить подбор покупателей</p>}
    {isPending ? <div className="lumi-muted py-14 text-center">Сравниваем с заявками…</div> : data.length === 0 ? <div className="lumi-panel lumi-muted rounded-2xl border py-14 text-center"><Users className="mx-auto mb-3 h-11 w-11" /><p className="lumi-text font-semibold">Подходящих заявок пока нет</p><p className="mt-1 text-sm">Добавьте критерии в карточках покупателей.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{data.map(match => <article key={match.client.id} className="lumi-panel rounded-2xl border p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="lumi-text font-semibold">{[match.client.lastName, match.client.firstName, match.client.middleName].filter(Boolean).join(' ')}</h3><p className="lumi-muted mt-1 flex items-center gap-2 text-sm"><Phone className="h-4 w-4" />{match.client.phone || 'Телефон не указан'}</p></div><span className={`rounded-full px-3 py-1 text-sm font-bold ${match.score >= 80 ? 'bg-emerald-500/15 text-emerald-400' : match.score >= 60 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>{match.score}%</span></div><div className="mt-4 space-y-2 text-sm">{match.matched.slice(0, 4).map(reason => <p key={reason} className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="h-4 w-4 shrink-0" />{reason}</p>)}{match.conflicts.slice(0, 3).map(reason => <p key={reason} className="flex items-center gap-2 text-amber-400"><XCircle className="h-4 w-4 shrink-0" />{reason}</p>)}</div><button type="button" onClick={() => navigate(`/${property.listingType === 'rent' ? 'tenants' : 'buyers'}?client=${encodeURIComponent(match.client.id)}`)} className="lumi-control mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold">Открыть карточку</button></article>)}</div>}
  </div>
}

export default PropertyMatchesPanel
