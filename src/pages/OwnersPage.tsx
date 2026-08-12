import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Edit, Mail, MapPin, Phone, Plus, Search, Star, Trash2, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import OwnerForm from '../components/OwnerForm'
import EntityFilesPanel from '../components/EntityFilesPanel'
import ActivityTimeline from '../components/ActivityTimeline'
import type { Client } from '../types'

interface LinkedProperty {
  id: string
  address: string
  price: number | null
  status: string
  ownerId: string | null
  listingType: string | null
}

interface OwnersPageProps {
  mode?: 'sale' | 'rent'
}

const mapClient = (item: Record<string, any>): Client => ({
  id: item.id,
  userId: item.user_id,
  type: item.type,
  firstName: item.first_name || '',
  lastName: item.last_name || '',
  middleName: item.middle_name || '',
  phone: item.phone || '',
  email: item.email || '',
  propertyType: item.property_type,
  preferredDistricts: item.preferred_districts || [],
  mortgageStatus: item.mortgage_status,
  paymentMethod: item.payment_method,
  budget: item.budget,
  rooms: item.rooms,
  tags: item.tags || [],
  isFavorite: item.is_favorite || false,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  photos: [],
  documents: [],
  notes: [],
  source: item.source,
  firstContactDate: item.first_contact_date,
  lastContactDate: item.last_contact_date,
  nextContactDate: item.next_contact_at,
  birthDate: item.birth_date,
  birthdayReminder: item.birthday_reminder,
  contactComment: item.contact_comment,
  roles: item.roles || [],
  status: item.status,
  leadTemperature: item.lead_temperature,
  description: item.description,
})

const fullName = (owner: Client) => [owner.lastName, owner.firstName, owner.middleName].filter(Boolean).join(' ') || 'Без имени'

const OwnersPage = ({ mode = 'sale' }: OwnersPageProps) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const role = mode === 'rent' ? 'landlord' : 'seller'
  const pageTitle = mode === 'rent' ? 'Арендодатели' : 'Собственники'
  const personLabel = mode === 'rent' ? 'арендодателя' : 'собственника'
  const [owners, setOwners] = useState<Client[]>([])
  const [properties, setProperties] = useState<LinkedProperty[]>([])
  const [selectedOwner, setSelectedOwner] = useState<Client | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingOwner, setEditingOwner] = useState<Client | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const [clientsResult, propertiesResult] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('properties').select('id,address,price,status,owner_id,listing_type').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      if (clientsResult.error) throw clientsResult.error
      if (propertiesResult.error) throw propertiesResult.error

      const mappedOwners = (clientsResult.data || [])
        .filter(item => (item.roles || []).includes(role) || (role === 'seller' && item.type === 'seller'))
        .map(mapClient)
      setOwners(mappedOwners)
      setProperties((propertiesResult.data || []).map(item => ({
        id: item.id,
        address: item.address,
        price: item.price === null ? null : Number(item.price),
        status: item.status,
        ownerId: item.owner_id,
        listingType: item.listing_type,
      })))
      setSelectedOwner(current => current ? mappedOwners.find(item => item.id === current.id) || null : null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : `Не удалось загрузить: ${pageTitle.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }, [pageTitle, role, user])

  useEffect(() => { void load() }, [load])

  const visibleOwners = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return owners
    return owners.filter(owner => `${fullName(owner)} ${owner.phone} ${owner.email || ''}`.toLowerCase().includes(value))
  }, [owners, query])

  const ownerProperties = useMemo(() => selectedOwner
    ? properties.filter(property => property.ownerId === selectedOwner.id && property.listingType === mode)
    : [], [mode, properties, selectedOwner])

  const toggleFavorite = async (owner: Client) => {
    if (!user) return
    const { error: updateError } = await supabase.from('clients').update({ is_favorite: !owner.isFavorite }).eq('id', owner.id).eq('user_id', user.id)
    if (updateError) setError(updateError.message)
    else await load()
  }

  const removeOwner = async (owner: Client) => {
    if (!window.confirm(`Удалить ${personLabel} «${fullName(owner)}»? Объекты останутся в базе без привязки.`)) return
    if (!user) return
    const { error: deleteError } = await supabase.from('clients').delete().eq('id', owner.id).eq('user_id', user.id)
    if (deleteError) setError(deleteError.message)
    else { setSelectedOwner(null); await load() }
  }

  if (loading) return <div className="lumi-muted flex items-center justify-center py-24">Загрузка: {pageTitle.toLowerCase()}…</div>

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
      <aside className="flex min-h-[24rem] w-full flex-col lg:min-h-0 lg:w-[34%]">
        <div className="mb-4">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="lumi-text text-2xl font-bold">{pageTitle}</h1>
            <button type="button" onClick={() => { setEditingOwner(null); setFormOpen(true) }} className="lumi-gradient-button rounded-xl p-3" aria-label={`Добавить ${personLabel}`}><Plus className="h-5 w-5" /></button>
          </div>
          <div className="relative">
            <Search className="lumi-muted absolute left-3 top-3.5 h-5 w-5" />
            <input value={query} onChange={event => setQuery(event.target.value)} className="lumi-control w-full rounded-xl py-3 pl-10 pr-4 outline-none" placeholder="Поиск…" />
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {visibleOwners.map(owner => (
            <button key={owner.id} type="button" onClick={() => setSelectedOwner(owner)} className={`lumi-content-auto w-full rounded-xl border-2 p-4 text-left transition ${selectedOwner?.id === owner.id ? 'border-blue-500 lumi-accent-soft' : 'lumi-panel border-transparent'}`}>
              <div className="flex items-center gap-3">
                <div className="lumi-accent-bg flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold">{owner.firstName[0] || '?'}{owner.lastName[0] || ''}</div>
                <div className="min-w-0 flex-1">
                  <p className="lumi-text truncate font-semibold">{fullName(owner)}</p>
                  <p className="lumi-muted truncate text-sm">{owner.phone || 'Телефон не указан'}</p>
                </div>
                {owner.isFavorite && <Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
              </div>
            </button>
          ))}
          {visibleOwners.length === 0 && <div className="lumi-muted py-12 text-center"><User className="mx-auto mb-3 h-12 w-12" />Ничего не найдено</div>}
        </div>
      </aside>

      <main className="lumi-panel min-h-[32rem] w-full overflow-y-auto rounded-2xl border p-4 sm:p-6 lg:min-h-0 lg:flex-1">
        {selectedOwner ? (
          <div className="space-y-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="lumi-accent-bg flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl text-3xl font-bold">{selectedOwner.firstName[0] || '?'}{selectedOwner.lastName[0] || ''}</div>
                <div>
                  <h2 className="lumi-text text-3xl font-bold">{fullName(selectedOwner)}</h2>
                  <p className="lumi-muted mt-1 text-sm">ID: {selectedOwner.id}</p>
                  <div className="mt-3 flex flex-wrap gap-2">{selectedOwner.tags.map(tag => <span key={tag} className="lumi-accent-soft rounded-full px-3 py-1 text-sm">{tag}</span>)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void toggleFavorite(selectedOwner)} className="lumi-control rounded-xl p-3"><Star className={`h-5 w-5 ${selectedOwner.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} /></button>
                <button type="button" onClick={() => { setEditingOwner(selectedOwner); setFormOpen(true) }} className="lumi-control rounded-xl p-3"><Edit className="h-5 w-5" /></button>
                <button type="button" onClick={() => void removeOwner(selectedOwner)} className="rounded-xl bg-red-500/10 p-3 text-red-500"><Trash2 className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section>
                <h3 className="lumi-text mb-3 flex items-center gap-2 text-lg font-semibold"><Phone className="h-5 w-5" />Контакты</h3>
                <div className="lumi-panel-muted space-y-3 rounded-xl border p-4">
                  <p className="lumi-text flex items-center gap-3"><Phone className="lumi-muted h-4 w-4" />{selectedOwner.phone || 'Телефон не указан'}</p>
                  <p className="lumi-text flex items-center gap-3"><Mail className="lumi-muted h-4 w-4" />{selectedOwner.email || 'Email не указан'}</p>
                </div>
              </section>
              <section>
                <h3 className="lumi-text mb-3 flex items-center gap-2 text-lg font-semibold"><Building2 className="h-5 w-5" />Объекты</h3>
                <div className="space-y-2">
                  {ownerProperties.length ? ownerProperties.map(property => (
                    <button type="button" key={property.id} onClick={() => navigate(`/properties/${property.id}`)} className="lumi-panel-muted flex w-full items-center gap-3 rounded-xl border p-4 text-left">
                      <MapPin className="lumi-accent-text h-5 w-5 shrink-0" />
                      <div className="min-w-0 flex-1"><p className="lumi-text truncate font-medium">{property.address}</p><p className="lumi-muted text-sm">{property.price ? `${property.price.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}</p></div>
                    </button>
                  )) : <div className="lumi-panel-muted lumi-muted rounded-xl border p-5 text-center text-sm">Объекты пока не привязаны. Добавьте адрес в редактировании собственника.</div>}
                </div>
              </section>
            </div>

            {(selectedOwner.source || selectedOwner.firstContactDate || selectedOwner.status) && (
              <section className="lumi-panel-muted grid gap-4 rounded-xl border p-4 md:grid-cols-3">
                <div><span className="lumi-muted text-sm">Источник</span><p className="lumi-text font-medium">{selectedOwner.source || '—'}</p></div>
                <div><span className="lumi-muted text-sm">Первый контакт</span><p className="lumi-text font-medium">{selectedOwner.firstContactDate ? new Date(selectedOwner.firstContactDate).toLocaleDateString('ru-RU') : '—'}</p></div>
                <div><span className="lumi-muted text-sm">Статус</span><p className="lumi-text font-medium">{selectedOwner.status || '—'}</p></div>
              </section>
            )}

            {selectedOwner.description && <section><h3 className="lumi-text mb-2 text-lg font-semibold">Личные примечания</h3><div className="lumi-panel-muted lumi-muted-strong whitespace-pre-wrap rounded-xl border p-4">{selectedOwner.description}</div></section>}
            <ActivityTimeline clientId={selectedOwner.id} />
            <EntityFilesPanel clientId={selectedOwner.id} title={`Документы ${personLabel}`} />
          </div>
        ) : (
          <div className="lumi-muted flex h-full flex-col items-center justify-center text-center"><User className="mb-4 h-20 w-20" /><h2 className="lumi-text text-2xl font-bold">Выберите {personLabel}</h2><p className="mt-2">В карточке доступны связанные объекты, история и документы</p></div>
        )}
      </main>

      {formOpen && <OwnerForm isOpen={formOpen} owner={editingOwner} mode={mode} onClose={() => { setFormOpen(false); setEditingOwner(null); void load() }} />}
    </div>
  )
}

export default OwnersPage
