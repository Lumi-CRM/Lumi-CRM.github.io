import { useCallback, useEffect, useState } from 'react'
import { Archive, Building2, LoaderCircle, RotateCcw, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { moveToTrash } from '../lib/trash'

interface ArchivedProperty { id: string; address: string; price?: number; rooms?: number; area?: number; status: string }
interface ArchivedClient { id: string; first_name?: string; last_name?: string; middle_name?: string; phone?: string; type: string }

const ArchivePage = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'properties' | 'clients'>('properties')
  const [properties, setProperties] = useState<ArchivedProperty[]>([])
  const [clients, setClients] = useState<ArchivedClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadArchive = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    const [propertyResult, clientResult] = await Promise.all([
      supabase.from('properties').select('id,address,price,rooms,area,status').eq('user_id', user.id).is('deleted_at', null).in('status', ['sold', 'archived']).order('updated_at', { ascending: false }),
      supabase.from('clients').select('id,first_name,last_name,middle_name,phone,type,status').eq('user_id', user.id).is('deleted_at', null).eq('status', 'archived').order('updated_at', { ascending: false }),
    ])
    if (propertyResult.error || clientResult.error) setError('Не удалось загрузить архив.')
    setProperties((propertyResult.data ?? []) as ArchivedProperty[])
    setClients((clientResult.data ?? []) as ArchivedClient[])
    setLoading(false)
  }, [user])

  useEffect(() => { void loadArchive() }, [loadArchive])

  const restoreProperty = async (id: string) => {
    if (!user) return
    const { error: updateError } = await supabase.from('properties').update({ status: 'available', archived_at: null }).eq('id', id).eq('user_id', user.id)
    if (updateError) setError('Не удалось восстановить объект.')
    else setProperties(current => current.filter(item => item.id !== id))
  }

  const restoreClient = async (id: string) => {
    if (!user) return
    const { error: updateError } = await supabase.from('clients').update({ status: 'active', archived_at: null }).eq('id', id).eq('user_id', user.id)
    if (updateError) setError('Не удалось восстановить клиента.')
    else setClients(current => current.filter(item => item.id !== id))
  }

  const trashProperty = async (id: string) => {
    if (!user) return
    try { await moveToTrash('properties', id, user.id); setProperties(current => current.filter(item => item.id !== id)) }
    catch { setError('Не удалось переместить объект в корзину.') }
  }

  const trashClient = async (id: string) => {
    if (!user) return
    try { await moveToTrash('clients', id, user.id); setClients(current => current.filter(item => item.id !== id)) }
    catch { setError('Не удалось переместить клиента в корзину.') }
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="lumi-text text-3xl font-bold">Архив</h1><p className="lumi-muted mt-2">Проданные и временно скрытые записи.</p></div><Archive className="lumi-muted h-8 w-8" /></div>
    {error && <div className="rounded-xl border border-red-800/50 bg-red-950/25 px-4 py-3 text-sm text-red-300">{error}</div>}
    <div className="lumi-control grid w-full max-w-md grid-cols-2 rounded-xl p-1"><button type="button" onClick={() => setActiveTab('properties')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${activeTab === 'properties' ? 'lumi-panel lumi-text shadow-sm' : 'lumi-muted'}`}><Building2 className="h-4 w-4" />Объекты · {properties.length}</button><button type="button" onClick={() => setActiveTab('clients')} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${activeTab === 'clients' ? 'lumi-panel lumi-text shadow-sm' : 'lumi-muted'}`}><Users className="h-4 w-4" />Клиенты · {clients.length}</button></div>
    {loading ? <div className="lumi-muted flex justify-center py-20"><LoaderCircle className="h-9 w-9 animate-spin" /></div> : activeTab === 'properties' ? properties.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{properties.map(property => <article key={property.id} className="lumi-panel rounded-2xl border p-5"><h2 className="lumi-text font-semibold">{property.address}</h2><p className="lumi-muted mt-2 text-sm">{property.price ? `${Number(property.price).toLocaleString('ru-RU')} ₽` : 'Цена не указана'} · {property.rooms ?? '—'}-комн. · {property.area ?? '—'} м²</p><span className="mt-3 inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-400">{property.status === 'sold' ? 'Продан' : 'Архив'}</span><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => void restoreProperty(property.id)} className="lumi-accent-soft inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold"><RotateCcw className="h-4 w-4" />Вернуть</button><button type="button" onClick={() => void trashProperty(property.id)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500/15 px-3 py-2.5 text-sm font-semibold text-red-400"><Trash2 className="h-4 w-4" />В корзину</button></div></article>)}</div> : <Empty text="В архиве нет объектов" /> : clients.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{clients.map(client => <article key={client.id} className="lumi-panel rounded-2xl border p-5"><h2 className="lumi-text font-semibold">{client.last_name} {client.first_name} {client.middle_name}</h2><p className="lumi-muted mt-2 text-sm">{client.type === 'seller' ? 'Собственник' : 'Покупатель'} · {client.phone || 'Телефон не указан'}</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => void restoreClient(client.id)} className="lumi-accent-soft inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold"><RotateCcw className="h-4 w-4" />Вернуть</button><button type="button" onClick={() => void trashClient(client.id)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-500/15 px-3 py-2.5 text-sm font-semibold text-red-400"><Trash2 className="h-4 w-4" />В корзину</button></div></article>)}</div> : <Empty text="В архиве нет клиентов" />}
  </div>
}

const Empty = ({ text }: { text: string }) => <div className="lumi-panel-muted lumi-muted flex flex-col items-center rounded-2xl border border-dashed py-20"><Archive className="mb-4 h-14 w-14" /><p className="lumi-text font-semibold">{text}</p></div>

export default ArchivePage
