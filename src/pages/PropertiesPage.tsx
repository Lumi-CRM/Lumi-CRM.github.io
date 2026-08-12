import { useState, useEffect } from 'react'
import { Archive, Plus, Edit, Trash2, Search, Star, Eye, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Property, Client } from '../types'
import PropertyForm from '../components/PropertyForm'
import { createSignedFileUrls, type CrmFileRecord } from '../lib/files'

const PropertiesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | null>(null)
  const [actionError, setActionError] = useState('')

  const fetchData = async () => {
    if (!user) return
    
    const [propertiesResult, clientsResult] = await Promise.all([
      supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false }),
      supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    ])

    if (propertiesResult.data) {
      const propertyRows = propertiesResult.data
      const ids = propertyRows.map(property => property.id)
      const { data: mediaRows } = ids.length
        ? await supabase.from('crm_files').select('*').eq('user_id', user.id).eq('bucket', 'crm-images').in('property_id', ids).order('is_primary', { ascending: false }).order('created_at', { ascending: true })
        : { data: [] }
      const covers = new Map<string, CrmFileRecord>()
      for (const file of (mediaRows || []) as CrmFileRecord[]) {
        if (file.property_id && !covers.has(file.property_id)) covers.set(file.property_id, file)
      }
      const coverFiles = Array.from(covers.values())
      const urls = await createSignedFileUrls(coverFiles)
      setProperties(propertyRows.map(p => ({
        ...p,
        userId: p.user_id,
        listingType: p.listing_type,
        propertyType: p.property_type,
        sourceUrl: p.source_url,
        ownerId: p.owner_id,
        totalFloors: p.total_floors,
        isFavorite: p.is_favorite,
        constructionYear: p.construction_year,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        photos: [],
        documents: [],
        notes: []
        ,coverUrl: covers.get(p.id) ? urls.get(covers.get(p.id)!.storage_path) : undefined
      })))
    }
    if (clientsResult.data) {
      setClients(clientsResult.data.map(c => ({
        ...c,
        userId: c.user_id,
        preferredDistricts: c.preferred_districts,
        mortgageStatus: c.mortgage_status,
        paymentMethod: c.payment_method,
        propertyType: c.property_type,
        isFavorite: c.is_favorite
        ,firstName: c.first_name
        ,lastName: c.last_name
        ,middleName: c.middle_name
        ,roles: c.roles || []
      })))
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const filteredProperties = properties.filter(prop =>
    (prop.address || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700'
      case 'reserved': return 'bg-amber-100 text-amber-700'
      case 'sold': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Доступно'
      case 'reserved': return 'Забронировано'
      case 'sold': return 'Продано'
      default: return status
    }
  }

  const toggleFavorite = async (propertyId: string) => {
    if (!user) return
    const property = properties.find(p => p.id === propertyId)
    if (!property) return

    const nextValue = !property.isFavorite
    setProperties(current => current.map(item => item.id === propertyId ? { ...item, isFavorite: nextValue } : item))
    const { error: updateError } = await supabase.from('properties').update({ is_favorite: nextValue }).eq('id', propertyId).eq('user_id', user.id)
    if (updateError) {
      setActionError('Не удалось обновить избранное.')
      await fetchData()
    }
  }

  const archiveProperty = async (propertyId: string) => {
    if (!user) return
    setActionError('')
    const { error: updateError } = await supabase.from('properties').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', propertyId).eq('user_id', user.id)
    if (updateError) {
      setActionError('Не удалось переместить объект в архив.')
      return
    }
    setProperties(current => current.filter(item => item.id !== propertyId))
  }

  const deleteProperty = async (propertyId: string) => {
    if (!user) return
    if (!confirm('Удалить объект?')) return
    await supabase.from('properties').delete().eq('id', propertyId).eq('user_id', user.id)
    await fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Объекты</h1>
        <button
          onClick={() => { setEditingProperty(null); setIsModalOpen(true); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-white transition-all hover:opacity-90 sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Добавить объект
        </button>
      </div>
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск по адресу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
        />
      </div>

      {actionError && <div className="rounded-xl border border-red-800/50 bg-red-950/25 px-4 py-3 text-sm text-red-300">{actionError}</div>}

      {filteredProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
          <Search className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">Нет объектов</p>
          <p className="text-sm mt-2">Добавьте первый объект недвижимости</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((prop, i) => (
            <motion.div
              key={prop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.03 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all"
            >
              <div className="flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
                {prop.coverUrl ? <img src={prop.coverUrl} alt={`Главное фото: ${prop.address}`} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                  <p className="text-sm text-gray-500">Фото нет</p>
                </div>}
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{prop.price?.toLocaleString('ru-RU')} ₽</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{prop.rooms}-комн., {prop.area} м²</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(prop.id)
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <Star className={`w-5 h-5 ${prop.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                  </button>
                </div>
                <p className="text-gray-900 dark:text-white font-semibold mb-3 line-clamp-2">{prop.address}</p>
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(prop.status)}`}>
                    {getStatusText(prop.status)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate(`/properties/${prop.id}`)}
                    className="flex min-w-32 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-100 px-4 py-2 text-blue-600 transition-colors hover:bg-blue-200"
                  >
                    <Eye className="w-4 h-4" />
                    Просмотр
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingProperty(prop)
                      setIsModalOpen(true)
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Переместить в архив"
                    onClick={(e) => {
                      e.stopPropagation()
                      void archiveProperty(prop.id)
                    }}
                    className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteProperty(prop.id)
                    }}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <PropertyForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); fetchData() }}
        property={editingProperty}
        clients={clients.filter(c => c.type === 'seller')}
      />
    </div>
  )
}

export default PropertiesPage
