import { useState } from 'react'
import { Plus, Edit, Trash2, Phone, Mail, MessageCircle, User, Search, X, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import BuyerRequestForm from '../components/BuyerRequestForm'
import { BuyerRequest, Comment } from '../types'

const BuyerRequestsPage = () => {
  const buyerRequests = useAppStore((state) => state.buyerRequests)
  const comments = useAppStore((state) => state.comments)
  const addComment = useAppStore((state) => state.addComment)
  const deleteBuyerRequest = useAppStore((state) => state.deleteBuyerRequest)
  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(buyerRequests[0] || null)
  const [newComment, setNewComment] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRequest, setEditingRequest] = useState<BuyerRequest | null>(null)

  const filteredRequests = buyerRequests.filter(request =>
    request.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.phone.includes(searchQuery)
  )

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedRequest) return
    
    addComment({
      entityType: 'buyerRequest',
      entityId: selectedRequest.id,
      content: newComment,
      author: 'Даниил Петров'
    })
    
    setNewComment('')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'новый': return 'bg-blue-100 text-blue-700'
      case 'в поиске': return 'bg-yellow-100 text-yellow-700'
      case 'аванс': return 'bg-orange-100 text-orange-700'
      case 'сделка': return 'bg-green-100 text-green-700'
      case 'закрыт': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="h-full flex gap-6">
      {/* List */}
      <div className="w-96 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Анкеты покупателей</h2>
            <button
              onClick={() => { setEditingRequest(null); setIsModalOpen(true); }}
              className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по имени или телефону..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredRequests.map((request, i) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedRequest(request)}
              className={`p-4 rounded-xl cursor-pointer transition-all ${
                selectedRequest?.id === request.id
                  ? 'bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                  {request.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {request.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{request.phone}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-900">
                    {request.budgetFrom || 0} - {request.budgetTo || '∞'} ₽
                  </p>
                </div>
                <span className={`inline-block px-2 py-1 text-xs rounded-full font-semibold ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail */}
      {selectedRequest && (
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-4xl">
                  {selectedRequest.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">{selectedRequest.name}</h2>
                  <p className="text-gray-500 mt-1">ID: {selectedRequest.id}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`px-3 py-1 text-sm rounded-full font-semibold ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingRequest(selectedRequest); setIsModalOpen(true); }}
                  className="p-3 rounded-xl hover:bg-gray-100"
                >
                  <Edit className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => { if (confirm('Удалить анкету?')) deleteBuyerRequest(selectedRequest.id); }}
                  className="p-3 rounded-xl hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Контакты</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                    <Phone className="w-5 h-5 text-pink-600" />
                    <div>
                      <p className="text-sm text-gray-500">Телефон</p>
                      <p className="font-semibold text-gray-900">{selectedRequest.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Бюджет</h3>
                <div className="p-4 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50">
                  <p className="text-sm text-pink-600 font-medium">От - До</p>
                  <p className="text-3xl font-bold text-pink-700 mt-1">
                    {selectedRequest.budgetFrom ? selectedRequest.budgetFrom.toLocaleString('ru-RU') : '0'} - {selectedRequest.budgetTo ? selectedRequest.budgetTo.toLocaleString('ru-RU') : '∞'} ₽
                  </p>
                </div>
              </div>
            </div>

            {/* Требования к объекту */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Требования к объекту</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedRequest.districts.length > 0 && (
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500">Районы</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.districts.join(', ')}</p>
                  </div>
                )}
                {selectedRequest.rooms.length > 0 && (
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500">Комнат</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.rooms.join(', ')}</p>
                  </div>
                )}
                {selectedRequest.minArea && (
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500">Мин. площадь</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.minArea} м²</p>
                  </div>
                )}
                {selectedRequest.houseTypes.length > 0 && (
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500">Тип дома</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.houseTypes.join(', ')}</p>
                  </div>
                )}
                {selectedRequest.repairRequirements.length > 0 && (
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500">Ремонт</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.repairRequirements.join(', ')}</p>
                  </div>
                )}
                {selectedRequest.criticalParams && (
                  <div className="p-4 rounded-xl bg-gray-50 md:col-span-2">
                    <p className="text-sm text-gray-500">Критичные параметры</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.criticalParams}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Финансирование */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Финансирование</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">Тип расчета</p>
                  <p className="font-semibold text-gray-900">{selectedRequest.paymentType}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">Ипотека</p>
                  <p className="font-semibold text-gray-900">{selectedRequest.mortgageStatus}</p>
                </div>
                {selectedRequest.mortgageBank && (
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500">Банк</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.mortgageBank}</p>
                  </div>
                )}
                {selectedRequest.mortgageAmount && (
                  <div className="p-4 rounded-xl bg-gray-50">
                    <p className="text-sm text-gray-500">Сумма ипотеки</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.mortgageAmount.toLocaleString('ru-RU')} ₽</p>
                  </div>
                )}
                {selectedRequest.certificates.length > 0 && (
                  <div className="p-4 rounded-xl bg-gray-50 md:col-span-2">
                    <p className="text-sm text-gray-500">Сертификаты</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.certificates.join(', ')}</p>
                  </div>
                )}
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
                  .filter(c => c.entityType === 'buyerRequest' && c.entityId === selectedRequest.id)
                  .map((comment) => (
                    <div key={comment.id} className="p-5 rounded-xl bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900">{comment.author}</p>
                        <p className="text-sm text-gray-500">{comment.createdAt}</p>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  ))}
                {comments.filter(c => c.entityType === 'buyerRequest' && c.entityId === selectedRequest.id).length === 0 && (
                  <p className="text-center text-gray-500 py-8">Нет комментариев</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <BuyerRequestForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        buyerRequest={editingRequest}
      />
    </div>
  )
}

export default BuyerRequestsPage
