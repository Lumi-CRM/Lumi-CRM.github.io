import { useState } from 'react'
import { Plus, FileText, Trash2, Edit, Building2, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import Modal from '../components/Modal'
import { Deal } from '../types'

type DealFormData = {
  propertyId: string
  buyerId: string
  ownerId: string
  price: number | undefined
  status: Deal['status']
  notes: string
}

const DealsPage = () => {
  const deals = useAppStore((state) => state.deals)
  const properties = useAppStore((state) => state.properties)
  const buyers = useAppStore((state) => state.buyers)
  const owners = useAppStore((state) => state.owners)
  const addDeal = useAppStore((state) => state.addDeal)
  const updateDeal = useAppStore((state) => state.updateDeal)
  const deleteDeal = useAppStore((state) => state.deleteDeal)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [formData, setFormData] = useState<DealFormData>({
    propertyId: '',
    buyerId: '',
    ownerId: '',
    price: undefined as number | undefined,
    status: 'active',
    notes: ''
  })

  const handleOpenModal = (deal?: Deal) => {
    if (deal) {
      setEditingDeal(deal)
      setFormData({
        propertyId: deal.propertyId,
        buyerId: deal.buyerId || '',
        ownerId: deal.ownerId || '',
        price: deal.price,
        status: deal.status,
        notes: deal.notes || ''
      })
    } else {
      setEditingDeal(null)
      setFormData({
        propertyId: '',
        buyerId: '',
        ownerId: '',
        price: undefined,
        status: 'active',
        notes: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingDeal) {
      updateDeal(editingDeal.id, formData)
    } else {
      addDeal(formData)
    }
    setIsModalOpen(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700'
      case 'closed': return 'bg-blue-100 text-blue-700'
      case 'failed': return 'bg-red-100 text-red-700'
      case 'archived': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активна'
      case 'closed': return 'Закрыта'
      case 'failed': return 'Отменена'
      case 'archived': return 'Архив'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Сделки</h1>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить сделку
        </button>
      </div>
      {deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
          <FileText className="w-16 h-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">Нет сделок</p>
          <p className="text-sm mt-2">Добавьте первую сделку</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deals.map((deal, i) => {
            const property = properties.find(p => p.id === deal.propertyId)
            const buyer = deal.buyerId ? buyers.find(b => b.id === deal.buyerId) : null
            const owner = deal.ownerId ? owners.find(o => o.id === deal.ownerId) : null
            return (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{property?.address || 'Объект не найден'}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{deal.price?.toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusColor(deal.status)}`}>
                    {getStatusText(deal.status)}
                  </span>
                </div>
                <div className="space-y-3">
                  {buyer && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Users className="w-4 h-4" />
                      <span>Покупатель: {buyer.lastName} {buyer.firstName}</span>
                    </div>
                  )}
                  {owner && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Users className="w-4 h-4" />
                      <span>Собственник: {owner.lastName} {owner.firstName}</span>
                    </div>
                  )}
                  {deal.notes && (
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-300">{deal.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => handleOpenModal(deal)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button onClick={() => deleteDeal(deal.id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDeal ? 'Редактировать сделку' : 'Новая сделка'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Объект *</label>
            <select
              required
              value={formData.propertyId}
              onChange={(e) => {
                const property = properties.find(p => p.id === e.target.value)
                setFormData({
                  ...formData,
                  propertyId: e.target.value,
                  ownerId: property?.ownerId || ''
                })
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">Выберите объект</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.address}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Покупатель</label>
            <select
              value={formData.buyerId}
              onChange={(e) => setFormData({ ...formData, buyerId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">Выберите покупателя</option>
              {buyers.map(buyer => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.lastName} {buyer.firstName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Собственник</label>
            <select
              value={formData.ownerId}
              onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">Выберите собственника</option>
              {owners.map(owner => (
                <option key={owner.id} value={owner.id}>
                  {owner.lastName} {owner.firstName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Цена *</label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={formData.price ?? ''}
                onChange={(e) => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="active">Активна</option>
                <option value="closed">Закрыта</option>
                <option value="failed">Отменена</option>
                <option value="archived">Архив</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Заметки</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
              placeholder="Введите заметки..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              {editingDeal ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DealsPage
