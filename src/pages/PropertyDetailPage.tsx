import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, FileText, Edit, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PropertyForm from '../components/PropertyForm'
import Modal from '../components/Modal'
import EntityFilesPanel from '../components/EntityFilesPanel'
import PropertyMediaPanel from '../components/PropertyMediaPanel'
import ActivityTimeline from '../components/ActivityTimeline'
import PropertyShowingsPanel from '../components/PropertyShowingsPanel'
import SharePropertyButton from '../components/SharePropertyButton'
import { Property, Client } from '../types'

const PropertyDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const [owners, setOwners] = useState<Client[]>([])
  const [owner, setOwner] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'photos' | 'documents' | 'showings'>('info')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const fetchData = async () => {
    if (!id || !user) return
    setLoading(true)
    
    const [propResult, clientsResult] = await Promise.all([
      supabase.from('properties').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('clients').select('*').eq('user_id', user.id)
    ])

    if (propResult.data) {
      const mappedProperty: Property = {
        ...propResult.data,
        userId: propResult.data.user_id,
        ownerId: propResult.data.owner_id,
        listingType: propResult.data.listing_type,
        propertyType: propResult.data.property_type,
        sourceUrl: propResult.data.source_url,
        totalFloors: propResult.data.total_floors,
        isFavorite: propResult.data.is_favorite,
        constructionYear: propResult.data.construction_year,
        photos: [],
        documents: [],
        notes: []
      }
      setProperty(mappedProperty)
      
      if (clientsResult.data) {
        const mappedOwners = clientsResult.data.map(c => ({
          ...c,
          firstName: c.first_name,
          lastName: c.last_name,
          middleName: c.middle_name,
          phone: c.phone,
          email: c.email,
          userId: c.user_id,
          preferredDistricts: c.preferred_districts,
          mortgageStatus: c.mortgage_status,
          paymentMethod: c.payment_method,
          propertyType: c.property_type,
          isFavorite: c.is_favorite,
          roles: c.roles || [],
          tags: c.tags || [],
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          photos: [],
          documents: [],
          notes: []
        }))
        setOwners(mappedOwners)
        const foundOwner = mappedOwners.find(o => o.id === mappedProperty.ownerId)
        setOwner(foundOwner || null)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id, user])

  const handleDelete = async () => {
    if (!id || !user) return
    await supabase.from('properties').delete().eq('id', id).eq('user_id', user.id)
    navigate('/properties')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-100 text-emerald-700'
      case 'reserved': return 'bg-yellow-100 text-yellow-700'
      case 'sold': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Доступно'
      case 'reserved': return 'Забронировано'
      case 'sold': return 'Продано'
      default: return 'Статус'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500 dark:text-gray-400">Загрузка...</div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500 dark:text-gray-400">
        <h2 className="text-2xl font-bold mb-2">Объект не найден</h2>
        <button onClick={() => navigate('/properties')} className="text-blue-600 hover:underline">
          Вернуться к списку
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button onClick={() => navigate('/properties')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="break-words text-3xl font-bold text-gray-900 dark:text-white">{property.address}</h1>
            <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium mt-1 ${getStatusColor(property.status)}`}>
              {getStatusText(property.status)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SharePropertyButton property={property} />
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Редактировать
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Удалить
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
            ${activeTab === 'info' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
        >
          <FileText className="w-4 h-4" />
          Информация
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
            ${activeTab === 'photos' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
        >
          <Camera className="w-4 h-4" />
          Фотографии
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
            ${activeTab === 'documents' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'}`}
        >
          <FileText className="w-4 h-4" />
          Документы
        </button>
        <button onClick={() => setActiveTab('showings')} className={`flex shrink-0 items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium transition-all ${activeTab === 'showings' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}><Users className="h-4 w-4" />Показы</button>
      </div>

      {/* Content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Основные данные</h3>
              <div className="space-y-3">
                {property.price && (
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-300">Цена</span>
                    <span className="font-bold text-gray-900 dark:text-white">{property.price.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                {property.rooms && (
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-300">Комнат</span>
                    <span className="font-bold text-gray-900 dark:text-white">{property.rooms}</span>
                  </div>
                )}
                {property.area && (
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-300">Площадь</span>
                    <span className="font-bold text-gray-900 dark:text-white">{property.area} м²</span>
                  </div>
                )}
                {property.floor && (
                  <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-300">Этаж</span>
                    <span className="font-bold text-gray-900 dark:text-white">{property.floor}/{property.totalFloors}</span>
                  </div>
                )}
              </div>
            </div>

            {(property.constructionYear || property.repair || property.heating || property.walls) && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Характеристики</h3>
                <div className="space-y-3">
                  {property.constructionYear && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-300">Год постройки</span>
                      <span className="font-medium text-gray-900 dark:text-white">{property.constructionYear}</span>
                    </div>
                  )}
                  {property.repair && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-300">Ремонт</span>
                      <span className="font-medium text-gray-900 dark:text-white">{
                        property.repair === 'without' ? 'Без ремонта' :
                        property.repair === 'cosmetic' ? 'Косметический' :
                        property.repair === 'designer' ? 'Дизайнерский' :
                        property.repair === 'euro' ? 'Евроремонт' : property.repair
                      }</span>
                    </div>
                  )}
                  {property.heating && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-300">Отопление</span>
                      <span className="font-medium text-gray-900 dark:text-white">{
                        property.heating === 'central' ? 'Центральное' :
                        property.heating === 'autonomous' ? 'Автономное' :
                        property.heating === 'electric' ? 'Электрическое' : property.heating
                      }</span>
                    </div>
                  )}
                  {property.walls && (
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-300">Тип стен</span>
                      <span className="font-medium text-gray-900 dark:text-white">{
                        property.walls === 'panel' ? 'Панельные' :
                        property.walls === 'brick' ? 'Кирпичные' :
                        property.walls === 'monolithic' ? 'Монолитные' :
                        property.walls === 'wood' ? 'Деревянные' : property.walls
                      }</span>
                    </div>
                  )}
                </div>
                {(property.balcony || property.elevator || property.parking) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-wrap gap-3">
                      {property.balcony && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                          Балкон/Лоджия
                        </span>
                      )}
                      {property.elevator && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                          Лифт
                        </span>
                      )}
                      {property.parking && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-sm">
                          Паркинг
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {property.description && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Описание</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{property.description}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {owner && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Собственник</h3>
                <div className="space-y-3">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {owner.lastName} {owner.firstName} {owner.middleName || ''}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 text-sm flex items-center gap-2">
                    Телефон: {owner.phone}
                  </p>
                  {owner.email && (
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Email: {owner.email}
                    </p>
                  )}
                </div>
              </div>
            )}

            {property.tags?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Теги</h3>
                <div className="flex flex-wrap gap-2">
                  {property.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2">
            <ActivityTimeline propertyId={property.id} title="История объекта и комментарии" />
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <PropertyMediaPanel propertyId={property.id} propertyAddress={property.address} />
      )}

      {activeTab === 'documents' && (
        <EntityFilesPanel propertyId={property.id} title="Документы объекта" />
      )}

      {activeTab === 'showings' && <PropertyShowingsPanel propertyId={property.id} />}

      {/* Modals */}
      <PropertyForm
        isOpen={isEditModalOpen} 
        onClose={() => { setIsEditModalOpen(false); fetchData() }} 
        property={property}
        clients={owners}
      />
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Подтвердите удаление">
        <div className="text-center">
          <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">Вы действительно хотите удалить этот объект?</p>
          <div className="flex gap-3">
            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition">
              Отмена
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
            >
              Удалить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default PropertyDetailPage
