import { ArrowDownRight, ArrowUpRight, CircleDollarSign, History, LoaderCircle, Milestone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePropertyHistory } from '../hooks/usePropertyHistory'
import { propertyStatusLabel, type PropertyHistoryItem } from '../lib/propertyHistoryMapping'

const money = (value: number | null) => value == null ? 'Не указана' : `${value.toLocaleString('ru-RU')} ₽`
const title = (item: PropertyHistoryItem) => item.kind === 'created'
  ? 'Объект добавлен'
  : item.kind === 'price'
    ? 'Цена изменена'
    : item.kind === 'status'
      ? 'Этап изменён'
      : 'Цена и этап изменены'

const PropertyHistoryPanel = ({ propertyId }: { propertyId: string }) => {
  const { user } = useAuth()
  const { data: items = [], isPending, error } = usePropertyHistory(user?.id, propertyId)

  return <section className="lumi-panel rounded-2xl border p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="lumi-text flex items-center gap-2 text-xl font-semibold"><History className="h-5 w-5" />Цена и этапы объекта</h2><p className="lumi-muted mt-1 text-sm">Изменения фиксируются автоматически при сохранении карточки.</p></div>
      <span className="lumi-accent-soft rounded-full px-3 py-1 text-sm font-semibold">{items.length}</span>
    </div>

    {error && <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">Не удалось загрузить историю объекта.</p>}
    {isPending ? <div className="lumi-muted flex items-center gap-2 py-8"><LoaderCircle className="h-5 w-5 animate-spin" />Загрузка истории…</div>
      : items.length === 0 ? <div className="lumi-panel-muted lumi-muted mt-5 rounded-xl border p-6 text-center">Изменений цены и этапа пока нет</div>
        : <div className="mt-5 space-y-3">{items.map(item => {
          const priceDelta = item.oldPrice != null && item.newPrice != null ? item.newPrice - item.oldPrice : 0
          const PriceIcon = priceDelta > 0 ? ArrowUpRight : ArrowDownRight
          return <article key={item.id} className="lumi-panel-muted rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="lumi-text font-semibold">{title(item)}</h3><p className="lumi-muted mt-1 text-xs">{new Date(item.createdAt).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>{item.kind === 'created' ? <Milestone className="lumi-accent-text h-5 w-5" /> : item.kind.includes('price') ? <CircleDollarSign className="lumi-accent-text h-5 w-5" /> : <Milestone className="lumi-accent-text h-5 w-5" />}</div>
            {(item.kind === 'created' || item.kind.includes('price')) && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="lumi-muted">{item.kind === 'created' ? 'Начальная цена' : money(item.oldPrice)}</span>{item.kind !== 'created' && <PriceIcon className={`h-4 w-4 ${priceDelta > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />}<span className="lumi-text font-semibold">{money(item.newPrice)}</span></div>}
            {(item.kind === 'created' || item.kind.includes('status')) && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="lumi-muted">{item.kind === 'created' ? 'Начальный этап' : propertyStatusLabel(item.oldStatus)}</span>{item.kind !== 'created' && <span className="lumi-muted">→</span>}<span className="lumi-text font-semibold">{propertyStatusLabel(item.newStatus)}</span></div>}
          </article>
        })}</div>}
  </section>
}

export default PropertyHistoryPanel
