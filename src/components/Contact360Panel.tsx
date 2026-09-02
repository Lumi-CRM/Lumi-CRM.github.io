import { useMemo, useState } from 'react'
import { Link2, Mail, Phone, Plus, Trash2, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useContactExtras } from '../hooks/useContactExtras'
import type { ContactPointKind } from '../lib/contactExtrasMapping'
import type { Client } from '../types'

const fullName = (client?: Client) => client ? [client.lastName, client.firstName, client.middleName].filter(Boolean).join(' ') || 'Без имени' : 'Контакт не найден'

const Contact360Panel = ({ client, clients }: { client: Client; clients: Client[] }) => {
  const { user } = useAuth()
  const { data, isPending, error: queryError, addPoint, removePoint, addRelationship, removeRelationship, mutationPending } = useContactExtras(user?.id, client.id)
  const [kind, setKind] = useState<ContactPointKind>('phone')
  const [value, setValue] = useState('')
  const [label, setLabel] = useState('')
  const [targetId, setTargetId] = useState('')
  const [relationship, setRelationship] = useState('Супруг/супруга')
  const [error, setError] = useState('')
  const clientById = useMemo(() => new Map(clients.map(item => [item.id, item])), [clients])
  const available = clients.filter(item => item.id !== client.id)

  const savePoint = async (event: React.FormEvent) => {
    event.preventDefault(); if (!value.trim()) return
    setError('')
    try { await addPoint({ kind, value: value.trim(), label }); setValue(''); setLabel('') }
    catch { setError('Не удалось добавить контакт') }
  }
  const saveRelation = async (event: React.FormEvent) => {
    event.preventDefault(); if (!targetId || !relationship.trim()) return
    setError('')
    try { await addRelationship({ targetClientId: targetId, relationship }); setTargetId('') }
    catch { setError('Не удалось добавить связь') }
  }

  return <section className="lumi-panel rounded-2xl border p-5 sm:p-6">
    <div className="mb-5"><h3 className="lumi-text flex items-center gap-2 text-lg font-semibold"><Users className="h-5 w-5" />Карточка контакта 360°</h3><p className="lumi-muted mt-1 text-sm">Дополнительные телефоны, email и связанные люди.</p></div>
    {(error || queryError) && <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error || 'Не удалось загрузить дополнительные данные'}</p>}
    {isPending ? <p className="lumi-muted py-6 text-center">Загружаем связи…</p> : <div className="grid gap-6 xl:grid-cols-2">
      <div>
        <h4 className="lumi-text mb-3 font-semibold">Телефоны и email</h4>
        <div className="space-y-2"><div className="lumi-panel-muted flex items-center gap-3 rounded-xl border p-3"><Phone className="lumi-accent-text h-4 w-4" /><div className="min-w-0 flex-1"><p className="lumi-text break-all text-sm font-medium">{client.phone || 'Не указан'}</p><p className="lumi-muted text-xs">Основной телефон</p></div></div>{client.email && <div className="lumi-panel-muted flex items-center gap-3 rounded-xl border p-3"><Mail className="lumi-accent-text h-4 w-4" /><div className="min-w-0 flex-1"><p className="lumi-text break-all text-sm font-medium">{client.email}</p><p className="lumi-muted text-xs">Основной email</p></div></div>}{data?.points.map(point => { const Icon = point.kind === 'email' ? Mail : Phone; return <div key={point.id} className="lumi-panel-muted flex items-center gap-3 rounded-xl border p-3"><Icon className="lumi-accent-text h-4 w-4" /><div className="min-w-0 flex-1"><p className="lumi-text break-all text-sm font-medium">{point.value}</p><p className="lumi-muted text-xs">{point.label || (point.kind === 'email' ? 'Дополнительный email' : 'Дополнительный телефон')}</p></div><button type="button" onClick={() => void removePoint(point.id)} className="rounded-lg bg-red-500/10 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div>})}</div>
        <form onSubmit={savePoint} className="mt-3 grid gap-2 sm:grid-cols-[9rem_1fr_1fr_auto]"><select value={kind} onChange={event => setKind(event.target.value as ContactPointKind)} className="lumi-control rounded-xl px-3 py-2.5 text-sm"><option value="phone">Телефон</option><option value="email">Email</option></select><input required type={kind === 'email' ? 'email' : 'tel'} value={value} onChange={event => setValue(event.target.value)} className="lumi-control min-w-0 rounded-xl px-3 py-2.5 text-sm" placeholder={kind === 'email' ? 'name@example.com' : '+7…'} /><input value={label} onChange={event => setLabel(event.target.value)} className="lumi-control min-w-0 rounded-xl px-3 py-2.5 text-sm" placeholder="Личный, рабочий…" /><button disabled={mutationPending} className="lumi-gradient-button rounded-xl p-2.5" aria-label="Добавить контакт"><Plus className="h-5 w-5" /></button></form>
      </div>
      <div>
        <h4 className="lumi-text mb-3 font-semibold">Связанные люди</h4>
        <div className="space-y-2">{data?.relationships.map(item => { const otherId = item.sourceClientId === client.id ? item.targetClientId : item.sourceClientId; return <div key={item.id} className="lumi-panel-muted flex items-center gap-3 rounded-xl border p-3"><Link2 className="lumi-accent-text h-4 w-4" /><div className="min-w-0 flex-1"><p className="lumi-text truncate text-sm font-medium">{fullName(clientById.get(otherId))}</p><p className="lumi-muted text-xs">{item.relationship}</p></div><button type="button" onClick={() => void removeRelationship(item.id)} className="rounded-lg bg-red-500/10 p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div>})}{data?.relationships.length === 0 && <div className="lumi-panel-muted lumi-muted rounded-xl border border-dashed p-5 text-center text-sm">Связанных людей пока нет</div>}</div>
        <form onSubmit={saveRelation} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><select required value={targetId} onChange={event => setTargetId(event.target.value)} className="lumi-control min-w-0 rounded-xl px-3 py-2.5 text-sm"><option value="">Выберите контакт</option>{available.map(item => <option key={item.id} value={item.id}>{fullName(item)}</option>)}</select><input required value={relationship} onChange={event => setRelationship(event.target.value)} className="lumi-control min-w-0 rounded-xl px-3 py-2.5 text-sm" placeholder="Супруг, родственник, партнёр…" /><button disabled={mutationPending} className="lumi-gradient-button rounded-xl p-2.5" aria-label="Добавить связь"><Plus className="h-5 w-5" /></button></form>
      </div>
    </div>}
  </section>
}

export default Contact360Panel
