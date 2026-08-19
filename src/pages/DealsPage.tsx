import { useCallback, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Building2, Edit, FileText, Plus, Trash2, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { dealFinanceKey, formatMoney, indexDealFinance } from '../lib/dealFinance'
import Modal from '../components/Modal'
import type { Deal } from '../types'

type DealFormData = {
  propertyId: string
  buyerId: string
  ownerId: string
  price: number | undefined
  agencyIncome: number | undefined
  agentIncome: number | undefined
  status: Deal['status']
  notes: string
}

type DealProperty = {
  id: string
  address: string
  price?: number
  ownerId?: string
}

type DealClient = {
  id: string
  firstName: string
  lastName: string
  phone: string
  type: 'buyer' | 'seller'
  roles: string[]
}

const emptyForm: DealFormData = {
  propertyId: '',
  buyerId: '',
  ownerId: '',
  price: undefined,
  agencyIncome: undefined,
  agentIncome: undefined,
  status: 'active',
  notes: '',
}

const clientName = (client?: DealClient) => client
  ? [client.lastName, client.firstName].filter(Boolean).join(' ') || client.phone || 'Без имени'
  : 'Не выбран'

const DealsPage = () => {
  const { user } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [financeActivityIds, setFinanceActivityIds] = useState<Map<string, string>>(new Map())
  const [properties, setProperties] = useState<DealProperty[]>([])
  const [clients, setClients] = useState<DealClient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [formData, setFormData] = useState<DealFormData>(emptyForm)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const [dealsResult, propertiesResult, clientsResult, financeResult] = await Promise.all([
        supabase.from('deals').select('*').eq('user_id', user.id).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('properties').select('id,address,price,owner_id').eq('user_id', user.id).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('clients').select('id,first_name,last_name,phone,type,roles').eq('user_id', user.id).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('crm_activities').select('id,external_key,metadata').eq('user_id', user.id).eq('type', 'note').ilike('external_key', 'deal-finance:%').is('deleted_at', null),
      ])
      const firstError = [dealsResult.error, propertiesResult.error, clientsResult.error, financeResult.error].find(Boolean)
      if (firstError) throw firstError

      const mappedProperties = (propertiesResult.data ?? []).map(item => ({
        id: item.id,
        address: item.address || 'Адрес не указан',
        price: item.price === null ? undefined : Number(item.price),
        ownerId: item.owner_id || undefined,
      }))
      setProperties(mappedProperties)
      setClients((clientsResult.data ?? []).map(item => ({
        id: item.id,
        firstName: item.first_name || '',
        lastName: item.last_name || '',
        phone: item.phone || '',
        type: item.type,
        roles: item.roles || [],
      })))
      const financeByDeal = indexDealFinance(financeResult.data ?? [])
      setFinanceActivityIds(new Map((financeResult.data ?? []).map(item => [String(item.external_key).replace(/^deal-finance:/, ''), String(item.id)])))
      setDeals((dealsResult.data ?? []).map(item => ({
        id: item.id,
        userId: item.user_id,
        propertyId: item.property_id,
        buyerId: item.buyer_id || undefined,
        ownerId: mappedProperties.find(property => property.id === item.property_id)?.ownerId,
        price: item.price === null ? undefined : Number(item.price),
        agencyIncome: financeByDeal.get(item.id)?.agencyIncome,
        agentIncome: financeByDeal.get(item.id)?.agentIncome,
        status: item.status,
        notes: item.notes || undefined,
        createdAt: item.created_at,
        updatedAt: item.updated_at || item.created_at,
      })))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить сделки')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { void load() }, [load])

  const buyers = useMemo(
    () => clients.filter(client => client.type === 'buyer' || client.roles.includes('buyer') || client.roles.includes('tenant')),
    [clients],
  )
  const owners = useMemo(
    () => clients.filter(client => client.type === 'seller' || client.roles.includes('seller') || client.roles.includes('landlord')),
    [clients],
  )

  const openModal = (deal?: Deal) => {
    setError('')
    setEditingDeal(deal ?? null)
    setFormData(deal ? {
      propertyId: deal.propertyId,
      buyerId: deal.buyerId || '',
      ownerId: deal.ownerId || properties.find(property => property.id === deal.propertyId)?.ownerId || '',
      price: deal.price,
      agencyIncome: deal.agencyIncome,
      agentIncome: deal.agentIncome,
      status: deal.status,
      notes: deal.notes || '',
    } : emptyForm)
    setIsModalOpen(true)
  }

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(item => item.id === propertyId)
    setFormData(current => ({
      ...current,
      propertyId,
      ownerId: property?.ownerId || current.ownerId,
      price: current.price ?? property?.price,
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const selectedProperty = properties.find(property => property.id === formData.propertyId)
      if (formData.ownerId && selectedProperty?.ownerId !== formData.ownerId) {
        const { error: propertyError } = await supabase
          .from('properties')
          .update({ owner_id: formData.ownerId })
          .eq('id', formData.propertyId)
          .eq('user_id', user.id)
        if (propertyError) throw propertyError
      }

      const payload = {
        user_id: user.id,
        property_id: formData.propertyId,
        buyer_id: formData.buyerId,
        price: formData.price ?? null,
        status: formData.status,
        notes: formData.notes || null,
      }
      let dealId = editingDeal?.id
      if (editingDeal) {
        const { error: dealError } = await supabase.from('deals').update(payload).eq('id', editingDeal.id).eq('user_id', user.id)
        if (dealError) throw dealError
      } else {
        const { data: createdDeal, error: dealError } = await supabase.from('deals').insert(payload).select('id').single()
        if (dealError) throw dealError
        dealId = createdDeal.id
      }

      const financePayload = {
        user_id: user.id,
        property_id: formData.propertyId,
        type: 'note',
        status: 'completed',
        title: 'Финансы сделки',
        occurred_at: formData.status === 'closed' ? new Date().toISOString() : null,
        external_key: dealFinanceKey(dealId!),
        metadata: {
          deal_id: dealId,
          final_amount: formData.price ?? null,
          agency_income: formData.agencyIncome ?? null,
          agent_income: formData.agentIncome ?? null,
        },
      }
      const existingFinanceId = financeActivityIds.get(dealId!)
      const { error: financeError } = existingFinanceId
        ? await supabase.from('crm_activities').update(financePayload).eq('id', existingFinanceId).eq('user_id', user.id)
        : await supabase.from('crm_activities').insert(financePayload)
      if (financeError) throw financeError

      setIsModalOpen(false)
      setEditingDeal(null)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Не удалось сохранить сделку')
    } finally {
      setSaving(false)
    }
  }

  const removeDeal = async (deal: Deal) => {
    if (!user) return
    const { error: deleteError } = await supabase.from('deals').update({ deleted_at: new Date().toISOString() }).eq('id', deal.id).eq('user_id', user.id)
    if (deleteError) setError(deleteError.message)
    else await load()
  }

  const statusLabel: Record<Deal['status'], string> = {
    pending: 'Подготовка',
    active: 'Активна',
    closed: 'Закрыта',
    cancelled: 'Отменена',
  }
  const statusClass: Record<Deal['status'], string> = {
    pending: 'bg-amber-500/15 text-amber-500',
    active: 'bg-emerald-500/15 text-emerald-500',
    closed: 'lumi-accent-soft',
    cancelled: 'bg-red-500/15 text-red-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="lumi-text text-3xl font-bold">Сделки</h1>
          <p className="lumi-muted mt-1 text-sm">Объекты и участники выбираются из вашей облачной базы.</p>
        </div>
        <button type="button" onClick={() => openModal()} className="lumi-gradient-button flex items-center gap-2 rounded-xl px-5 py-3 font-semibold">
          <Plus className="h-5 w-5" />Новая сделка
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
      {loading ? (
        <div className="lumi-muted py-20 text-center">Загружаем сделки…</div>
      ) : deals.length === 0 ? (
        <div className="lumi-panel lumi-muted flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
          <FileText className="mb-4 h-16 w-16" />
          <p className="lumi-text text-lg font-medium">Сделок пока нет</p>
          <p className="mt-2 text-sm">Создайте сделку и свяжите объект с клиентами</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {deals.map((deal, index) => {
            const property = properties.find(item => item.id === deal.propertyId)
            const buyer = buyers.find(item => item.id === deal.buyerId)
            const owner = owners.find(item => item.id === (deal.ownerId || property?.ownerId))
            return (
              <motion.article key={deal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }} className="lumi-panel rounded-2xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="lumi-text truncate text-lg font-semibold">{property?.address || 'Объект не найден'}</p>
                    <p className="lumi-text mt-1 text-2xl font-bold">{formatMoney(deal.price)}</p>
                    <p className="lumi-muted mt-1 text-xs">Итоговая стоимость объекта</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusClass[deal.status]}`}>{statusLabel[deal.status]}</span>
                </div>
                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="lumi-panel-muted rounded-xl border p-3"><p className="lumi-muted text-xs">Приход агентства</p><p className="lumi-text mt-1 font-semibold">{formatMoney(deal.agencyIncome)}</p></div>
                    <div className="lumi-panel-muted rounded-xl border p-3"><p className="lumi-muted text-xs">Доход агента</p><p className="lumi-text mt-1 font-semibold">{formatMoney(deal.agentIncome)}</p></div>
                  </div>
                  <div className="lumi-panel-muted flex items-center gap-3 rounded-xl border p-3"><Building2 className="lumi-accent-text h-4 w-4" /><span className="lumi-muted-strong text-sm">{property?.address || 'Объект не найден'}</span></div>
                  <div className="lumi-panel-muted flex items-center gap-3 rounded-xl border p-3"><Users className="lumi-accent-text h-4 w-4" /><span className="lumi-muted-strong text-sm">Покупатель: {clientName(buyer)}</span></div>
                  <div className="lumi-panel-muted flex items-center gap-3 rounded-xl border p-3"><Users className="lumi-accent-text h-4 w-4" /><span className="lumi-muted-strong text-sm">Собственник: {clientName(owner)}</span></div>
                  {deal.notes && <p className="lumi-muted whitespace-pre-wrap text-sm">{deal.notes}</p>}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => openModal(deal)} className="lumi-control rounded-lg p-2" aria-label="Редактировать сделку"><Edit className="h-4 w-4" /></button>
                  <button type="button" onClick={() => void removeDeal(deal)} className="rounded-lg bg-red-500/10 p-2 text-red-500" aria-label="Удалить сделку"><Trash2 className="h-4 w-4" /></button>
                </div>
              </motion.article>
            )
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDeal ? 'Редактировать сделку' : 'Новая сделка'}>
        <form onSubmit={event => void handleSubmit(event)} className="space-y-5">
          {(properties.length === 0 || buyers.length === 0 || owners.length === 0) && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
              Для сделки нужны объект, покупатель и собственник. Создайте отсутствующие карточки в соответствующих разделах.
            </div>
          )}
          <div>
            <label className="lumi-muted-strong mb-2 block text-sm font-medium">Объект *</label>
            <select required value={formData.propertyId} onChange={event => handlePropertyChange(event.target.value)} className="lumi-control w-full rounded-xl px-4 py-3 outline-none">
              <option value="">Выберите объект</option>
              {properties.map(property => <option key={property.id} value={property.id}>{property.address}</option>)}
            </select>
          </div>
          <div>
            <label className="lumi-muted-strong mb-2 block text-sm font-medium">Покупатель *</label>
            <select required value={formData.buyerId} onChange={event => setFormData(current => ({ ...current, buyerId: event.target.value }))} className="lumi-control w-full rounded-xl px-4 py-3 outline-none">
              <option value="">Выберите покупателя</option>
              {buyers.map(buyer => <option key={buyer.id} value={buyer.id}>{clientName(buyer)}{buyer.phone ? ` · ${buyer.phone}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="lumi-muted-strong mb-2 block text-sm font-medium">Собственник *</label>
            <select required value={formData.ownerId} onChange={event => setFormData(current => ({ ...current, ownerId: event.target.value }))} className="lumi-control w-full rounded-xl px-4 py-3 outline-none">
              <option value="">Выберите собственника</option>
              {owners.map(owner => <option key={owner.id} value={owner.id}>{clientName(owner)}{owner.phone ? ` · ${owner.phone}` : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="lumi-muted-strong mb-2 block text-sm font-medium">Итоговая стоимость объекта *</label>
              <input type="number" required min="0" step="any" value={formData.price ?? ''} onChange={event => setFormData(current => ({ ...current, price: event.target.value ? Number(event.target.value) : undefined }))} className="lumi-control w-full rounded-xl px-4 py-3 outline-none" placeholder="0" />
            </div>
            <div>
              <label className="lumi-muted-strong mb-2 block text-sm font-medium">Приход агентства</label>
              <input type="number" min="0" step="any" value={formData.agencyIncome ?? ''} onChange={event => setFormData(current => ({ ...current, agencyIncome: event.target.value ? Number(event.target.value) : undefined }))} className="lumi-control w-full rounded-xl px-4 py-3 outline-none" placeholder="0" />
            </div>
            <div>
              <label className="lumi-muted-strong mb-2 block text-sm font-medium">Доход агента</label>
              <input type="number" min="0" step="any" value={formData.agentIncome ?? ''} onChange={event => setFormData(current => ({ ...current, agentIncome: event.target.value ? Number(event.target.value) : undefined }))} className="lumi-control w-full rounded-xl px-4 py-3 outline-none" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="lumi-muted-strong mb-2 block text-sm font-medium">Статус</label>
            <select value={formData.status} onChange={event => setFormData(current => ({ ...current, status: event.target.value as Deal['status'] }))} className="lumi-control w-full rounded-xl px-4 py-3 outline-none">
              {Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label className="lumi-muted-strong mb-2 block text-sm font-medium">Заметки</label>
            <textarea value={formData.notes} onChange={event => setFormData(current => ({ ...current, notes: event.target.value }))} rows={4} className="lumi-control w-full resize-none rounded-xl px-4 py-3 outline-none" placeholder="Условия и договорённости по сделке" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button type="button" onClick={() => setIsModalOpen(false)} className="lumi-control flex-1 rounded-xl px-6 py-3 font-medium">Отмена</button>
            <button type="submit" disabled={saving || !properties.length || !buyers.length || !owners.length} className="lumi-gradient-button flex-1 rounded-xl px-6 py-3 font-semibold disabled:opacity-50"><BriefcaseBusiness className="mr-2 inline h-4 w-4" />{saving ? 'Сохраняем…' : editingDeal ? 'Сохранить' : 'Создать сделку'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DealsPage
