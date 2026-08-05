import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Heart, LoaderCircle, Phone, Star, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Client, Property } from '../types'

const mapProperty = (item: Record<string, unknown>): Property => ({
  ...item,
  id: String(item.id), userId: String(item.user_id), address: String(item.address ?? ''), price: item.price == null ? null : Number(item.price), rooms: item.rooms == null ? null : Number(item.rooms), area: item.area == null ? null : Number(item.area), floor: item.floor == null ? null : Number(item.floor), totalFloors: item.total_floors == null ? null : Number(item.total_floors), status: item.status as Property['status'], listingType: item.listing_type as Property['listingType'], ownerId: item.owner_id ? String(item.owner_id) : undefined, tags: Array.isArray(item.tags) ? item.tags as string[] : [], isFavorite: Boolean(item.is_favorite), createdAt: String(item.created_at ?? ''), updatedAt: String(item.updated_at ?? ''), photos: [], documents: [], notes: [],
})

const mapClient = (item: Record<string, unknown>): Client => ({
  ...item,
  id: String(item.id), userId: String(item.user_id), type: item.type as Client['type'], firstName: String(item.first_name ?? ''), lastName: String(item.last_name ?? ''), middleName: String(item.middle_name ?? '') || undefined, phone: String(item.phone ?? ''), email: String(item.email ?? '') || undefined, tags: Array.isArray(item.tags) ? item.tags as string[] : [], roles: Array.isArray(item.roles) ? item.roles as string[] : [], isFavorite: Boolean(item.is_favorite), createdAt: String(item.created_at ?? ''), updatedAt: String(item.updated_at ?? ''), photos: [], documents: [], notes: [],
})

const FavoritesPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'properties' | 'clients'>('properties')
  const [properties, setProperties] = useState<Property[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadFavorites = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    const [propertyResult, clientResult] = await Promise.all([
      supabase.from('properties').select('*').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }),
      supabase.from('clients').select('*').eq('user_id', user.id).eq('is_favorite', true).order('updated_at', { ascending: false }),
    ])
    if (propertyResult.error || clientResult.error) setError('Не удалось загрузить избранное. Повторите попытку.')
    setProperties((propertyResult.data ?? []).map(item => mapProperty(item as Record<string, unknown>)))
    setClients((clientResult.data ?? []).map(item => mapClient(item as Record<string, unknown>)))
    setLoading(false)
  }, [user])

  useEffect(() => { void loadFavorites() }, [loadFavorites])

  const removeProperty = async (id: string) => {
    if (!user) return
    setProperties(current => current.filter(item => item.id !== id))
    const { error: updateError } = await supabase.from('properties').update({ is_favorite: false }).eq('id', id).eq('user_id', user.id)
    if (updateError) { setError('Не удалось изменить избранное.'); await loadFavorites() }
  }

  const removeClient = async (id: string) => {
    if (!user) return
    setClients(current => current.filter(item => item.id !== id))
    const { error: updateError } = await supabase.from('clients').update({ is_favorite: false }).eq('id', id).eq('user_id', user.id)
    if (updateError) { setError('Не удалось изменить избранное.'); await loadFavorites() }
  }

  const counts = useMemo(() => ({ properties: properties.length, clients: clients.length }), [clients.length, properties.length])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="lumi-text text-3xl font-bold">Избранное</h1><p className="lumi-muted mt-2">Важные объекты и контакты из облачной базы.</p></div><Star className="h-8 w-8 fill-amber-400 text-amber-400" /></div>
      {error && <div className="rounded-xl border border-red-800/50 bg-red-950/25 px-4 py-3 text-sm text-red-300">{error}</div>}
      <div className="lumi-control flex w-fit rounded-xl p-1">
        <button type="button" onClick={() => setActiveTab('properties')} className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold ${activeTab === 'properties' ? 'lumi-panel lumi-text shadow-sm' : 'lumi-muted'}`}><Building2 className="h-4 w-4" />Объекты · {counts.properties}</button>
        <button type="button" onClick={() => setActiveTab('clients')} className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold ${activeTab === 'clients' ? 'lumi-panel lumi-text shadow-sm' : 'lumi-muted'}`}><Users className="h-4 w-4" />Клиенты · {counts.clients}</button>
      </div>
      {loading ? <div className="lumi-muted flex justify-center py-20"><LoaderCircle className="h-9 w-9 animate-spin" /></div> : activeTab === 'properties' ? (
        properties.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{properties.map(property => <article key={property.id} className="lumi-panel overflow-hidden rounded-2xl border"><div className="lumi-panel-muted flex h-32 items-center justify-center"><Building2 className="lumi-muted h-12 w-12" /></div><div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="lumi-text text-xl font-bold">{property.price ? `${property.price.toLocaleString('ru-RU')} ₽` : 'Цена не указана'}</p><p className="lumi-muted mt-1 text-sm">{property.rooms ?? '—'}-комн. · {property.area ?? '—'} м²</p></div><button type="button" aria-label="Удалить из избранного" onClick={() => void removeProperty(property.id)} className="rounded-xl p-2 text-amber-400 hover:bg-amber-400/10"><Star className="h-5 w-5 fill-current" /></button></div><p className="lumi-text mt-4 font-semibold">{property.address}</p><button type="button" onClick={() => navigate(`/properties/${property.id}`)} className="lumi-accent-soft mt-5 w-full rounded-xl py-2.5 text-sm font-semibold">Открыть объект</button></div></article>)}</div> : <Empty icon={Building2} title="Нет избранных объектов" />
      ) : clients.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{clients.map(client => <article key={client.id} className="lumi-panel rounded-2xl border p-5"><div className="flex items-start justify-between"><div className="lumi-gradient-button flex h-12 w-12 items-center justify-center rounded-2xl font-bold">{client.firstName[0]}{client.lastName[0]}</div><button type="button" aria-label="Удалить из избранного" onClick={() => void removeClient(client.id)} className="rounded-xl p-2 text-amber-400 hover:bg-amber-400/10"><Star className="h-5 w-5 fill-current" /></button></div><h2 className="lumi-text mt-4 text-lg font-bold">{client.lastName} {client.firstName} {client.middleName}</h2><p className="lumi-muted mt-1 text-sm">{client.type === 'seller' ? 'Собственник / арендодатель' : 'Покупатель / арендатор'}</p><p className="lumi-muted-strong mt-4 flex items-center gap-2 text-sm"><Phone className="h-4 w-4" />{client.phone || 'Телефон не указан'}</p><button type="button" onClick={() => navigate(client.type === 'seller' ? '/owners' : '/buyers')} className="lumi-accent-soft mt-5 w-full rounded-xl py-2.5 text-sm font-semibold">Открыть раздел</button></article>)}</div> : <Empty icon={Heart} title="Нет избранных клиентов" />}
    </div>
  )
}

const Empty = ({ icon: Icon, title }: { icon: typeof Building2; title: string }) => <div className="lumi-panel-muted lumi-muted flex flex-col items-center justify-center rounded-2xl border border-dashed py-20"><Icon className="mb-4 h-14 w-14" /><p className="lumi-text font-semibold">{title}</p><p className="mt-2 text-sm">Нажмите звезду в карточке, чтобы добавить запись.</p></div>

export default FavoritesPage
