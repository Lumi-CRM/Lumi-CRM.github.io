import { useState } from 'react'
import { Plus, Edit, Trash2, Phone, Mail, MessageCircle, User, Search, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import SellerPropertyForm from '../components/SellerPropertyForm'
import { SellerProperty, Comment } from '../types'

const SellerPropertiesPage = () => {
  const sellerProperties = useAppStore((state) => state.sellerProperties)
  const comments = useAppStore((state) => state.comments)
  const addComment = useAppStore((state) => state.addComment)
  const deleteSellerProperty = useAppStore((state) => state.deleteSellerProperty)
  const [selectedProperty, setSelectedProperty] = useState<SellerProperty | null>(sellerProperties[0] || null)
  const [newComment, setNewComment] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<SellerProperty | null>(null)

  const filteredProperties = sellerProperties.filter(property =>
    property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedProperty) return
    
    addComment({
      entityType: 'sellerProperty',
      entityId: selectedProperty.id,
      content: newComment,
      author: 'Даниил Петров'
    })
    
    setNewComment('')
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'чистая продажа': return 'bg-blue-100 text-blue-700'
      case 'встречная покупка': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="h-full flex gap-6">
      {/* List */}
      <div className="w-96 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Анкеты собственников</h2>
            <button
              onClick={() => { setEditingProperty(null); setIsModalOpen(true); }}
              className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по адресу или имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredProperties.map((property, i) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedProperty(property)}
              className={`p-4 rounded-xl cursor-pointer transition-all ${
                selectedProperty?.id === property.id
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <p className="font-semibold text-gray-900 truncate">{property.address}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {property.price.toLocaleString('ru-RU')} ₽
              </p>
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-gray-500">
                  {property.ownerName}
                </p>
                <span className={`px-3 py-1 text-xs rounded-full font-semibold ${getStatusColor(property.dealType)}`}>
                  {property.dealType}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail */}
      {selectedProperty && (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedProperty.address}</h2>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mt-2">
                  {selectedProperty.price.toLocaleString('ru-RU')} ₽
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(selectedProperty.dealType)}`}>
                    {selectedProperty.dealType}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingProperty(selectedProperty); setIsModalOpen(true); }}
                  className="p-3 rounded-xl hover:bg-gray-100"
                >
                  <Edit className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => deleteSellerProperty(selectedProperty.id)}
                  className="p-3 rounded-xl hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100">
                <p className="text-sm text-blue-600 font-medium">Количество комнат</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{selectedProperty.rooms}</p>
              </div>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100">
                <p className="text-sm text-indigo-600 font-medium">Площадь</p>
                <p className="text-3xl font-bold text-indigo-700 mt-1">{selectedProperty.area} м²</p>
              </div>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100">
                <p className="text-sm text-purple-600 font-medium">Этаж</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">{selectedProperty.floor}/{selectedProperty.totalFloors}</p>
              </div>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100">
                <p className="text-sm text-pink-600 font-medium">Владение</p>
                <p className="text-3xl font-bold text-pink-700 mt-1">{selectedProperty.ownershipYears} лет</p>
              </div>
            </div>

            {/* Основные данные */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Собственник</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Имя</p>
                    <p className="font-semibold text-gray-900">{selectedProperty.ownerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Телефон</p>
                    <p className="font-semibold text-gray-900">{selectedProperty.ownerPhone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Характеристики */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Характеристики объекта</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">Тип дома</p>
                  <p className="font-semibold text-gray-900">{selectedProperty.houseType}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">Планировка</p>
                  <p className="font-semibold text-gray-900">{selectedProperty.layout}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">Состояние</p>
                  <p className="font-semibold text-gray-900">{selectedProperty.condition}</p>
                </div>
              </div>
            </div>

            {/* Комментарии */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Комментарии</h3>
              
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Добавьте комментарий..."
                    className="w-full p-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  Добавить
                </button>
              </div>

              <div className="space-y-4">
                {comments
                  .filter(c => c.entityType === 'sellerProperty' && c.entityId === selectedProperty.id)
                  .map((comment) => (
                    <div key={comment.id} className="p-5 rounded-xl bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{comment.author}</p>
                        <p className="text-sm text-gray-500">{comment.createdAt}</p>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  ))}
                {comments.filter(c => c.entityType === 'sellerProperty' && c.entityId === selectedProperty.id).length === 0 && (
                  <p className="text-center text-gray-500 py-8">Нет комментариев</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <SellerPropertyForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sellerProperty={editingProperty}
      />
    </div>
  )
}

export default SellerPropertiesPage
