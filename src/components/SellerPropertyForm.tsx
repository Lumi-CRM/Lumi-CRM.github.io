import { useState } from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '../store'
import Modal from './Modal'
import { Accordion } from './Accordion'
import { SellerProperty } from '../types'

interface SellerPropertyFormProps {
  isOpen: boolean
  onClose: () => void
  sellerProperty?: SellerProperty | null
}

const SellerPropertyForm = ({ isOpen, onClose, sellerProperty }: SellerPropertyFormProps) => {
  const addSellerProperty = useAppStore((state) => state.addSellerProperty)
  const updateSellerProperty = useAppStore((state) => state.updateSellerProperty)
  
  const [formData, setFormData] = useState({
    // Базовая информация
    price: sellerProperty?.price || 0,
    avitoAdNumber: sellerProperty?.avitoAdNumber || '',
    ownerName: sellerProperty?.ownerName || '',
    ownerPhone: sellerProperty?.ownerPhone || '',
    additionalPhones: sellerProperty?.additionalPhones?.join(', ') || '',
    
    // Параметры объекта
    address: sellerProperty?.address || '',
    rooms: sellerProperty?.rooms || 0,
    area: sellerProperty?.area || 0,
    floor: sellerProperty?.floor || 0,
    totalFloors: sellerProperty?.totalFloors || 0,
    houseType: sellerProperty?.houseType || 'кирпич',
    houseTypeCustom: sellerProperty?.houseType || '',
    layout: sellerProperty?.layout || 'изолированные',
    layoutCustom: sellerProperty?.layout || '',
    condition: sellerProperty?.condition || 'типовой ремонт',
    conditionCustom: sellerProperty?.condition || '',
    
    // Детали продажи и мотивация
    saleReason: sellerProperty?.saleReason || '',
    decisionMaker: sellerProperty?.decisionMaker || '',
    legalContact: sellerProperty?.legalContact || '',
    dealType: sellerProperty?.dealType || 'чистая продажа',
    urgency: sellerProperty?.urgency || '',
    mortgageApproved: sellerProperty?.mortgageApproved || false,
    financingSource: sellerProperty?.financingSource || '',
    priority: sellerProperty?.priority || 'безопасно',
    
    // Документы и обременения
    ownershipYears: sellerProperty?.ownershipYears || 0,
    ownerCount: sellerProperty?.ownerCount || 1,
    hasMinorChildren: sellerProperty?.hasMinorChildren || false,
    registeredPersons: sellerProperty?.registeredPersons || '',
    hasEncumbrances: sellerProperty?.hasEncumbrances || false,
    encumbranceDetails: sellerProperty?.encumbranceDetails || '',
    maternalCapitalUsed: sellerProperty?.maternalCapitalUsed || false,
    
    // Организационные моменты
    showingTime: sellerProperty?.showingTime || '',
    agentNotes: sellerProperty?.agentNotes || '',
    isFavorite: sellerProperty?.isFavorite || false,
    tags: sellerProperty?.tags || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = {
      ...formData,
      additionalPhones: formData.additionalPhones.split(',').map(s => s.trim()).filter(s => s),
      houseType: formData.houseType === 'custom' ? formData.houseTypeCustom : formData.houseType,
      layout: formData.layout === 'custom' ? formData.layoutCustom : formData.layout,
      condition: formData.condition === 'custom' ? formData.conditionCustom : formData.condition,
    }
    
    if (sellerProperty) {
      updateSellerProperty(sellerProperty.id, data)
    } else {
      addSellerProperty(data)
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={sellerProperty ? 'Редактировать анкету собственника' : 'Новая анкета собственника'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Accordion title="Базовая информация">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Цена объекта *</label>
              <input
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Номер объявления на Avito</label>
              <input
                type="text"
                value={formData.avitoAdNumber}
                onChange={(e) => setFormData({ ...formData, avitoAdNumber: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Имя клиента *</label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Номер телефона *</label>
              <input
                type="tel"
                required
                value={formData.ownerPhone}
                onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Дополнительные телефоны (через запятую)</label>
              <input
                type="text"
                value={formData.additionalPhones}
                onChange={(e) => setFormData({ ...formData, additionalPhones: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
        </Accordion>

        <Accordion title="Параметры объекта">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Адрес объекта *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Количество комнат *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.rooms}
                onChange={(e) => setFormData({ ...formData, rooms: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Площадь *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Этаж</label>
              <input
                type="number"
                min="0"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Этажность здания</label>
              <input
                type="number"
                min="0"
                value={formData.totalFloors}
                onChange={(e) => setFormData({ ...formData, totalFloors: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Тип дома</label>
              <select
                value={formData.houseType}
                onChange={(e) => setFormData({ ...formData, houseType: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="кирпич">Кирпич</option>
                <option value="панель">Панель</option>
                <option value="монолит">Монолит</option>
                <option value="custom">Добавить свой вариант</option>
              </select>
            </div>
            {formData.houseType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Свой вариант типа дома</label>
                <input
                  type="text"
                  value={formData.houseTypeCustom}
                  onChange={(e) => setFormData({ ...formData, houseTypeCustom: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Планировка комнат</label>
              <select
                value={formData.layout}
                onChange={(e) => setFormData({ ...formData, layout: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="изолированные">Изолированные</option>
                <option value="смежные">Смежные</option>
                <option value="custom">Добавить свой вариант</option>
              </select>
            </div>
            {formData.layout === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Свой вариант планировки</label>
                <input
                  type="text"
                  value={formData.layoutCustom}
                  onChange={(e) => setFormData({ ...formData, layoutCustom: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Состояние/Ремонт</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="без отделки">Без отделки</option>
                <option value="чистовая">Чистовая</option>
                <option value="типовой ремонт">Типовой ремонт</option>
                <option value="современный ремонт">Современный ремонт</option>
                <option value="дизайнерский ремонт">Дизайнерский ремонт</option>
                <option value="custom">Добавить свой вариант</option>
              </select>
            </div>
            {formData.condition === 'custom' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Свой вариант состояния</label>
                <input
                  type="text"
                  value={formData.conditionCustom}
                  onChange={(e) => setFormData({ ...formData, conditionCustom: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            )}
          </div>
        </Accordion>

        <Accordion title="Детали продажи и мотивация">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Причина продажи</label>
              <textarea
                value={formData.saleReason}
                onChange={(e) => setFormData({ ...formData, saleReason: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Лицо, принимающее решение (ЛПР)</label>
                <input
                  type="text"
                  value={formData.decisionMaker}
                  onChange={(e) => setFormData({ ...formData, decisionMaker: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">С кем обсуждать юридические детали</label>
                <input
                  type="text"
                  value={formData.legalContact}
                  onChange={(e) => setFormData({ ...formData, legalContact: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Тип сделки</label>
                <select
                  value={formData.dealType}
                  onChange={(e) => setFormData({ ...formData, dealType: e.target.value as 'чистая продажа' | 'встречная покупка' })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  <option value="чистая продажа">Чистая продажа</option>
                  <option value="встречная покупка">Встречная покупка</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Срочность продажи</label>
                <input
                  type="text"
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  placeholder="Например: 'Нужно в течение месяца'"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="mortgageApproved"
                  checked={formData.mortgageApproved}
                  onChange={(e) => setFormData({ ...formData, mortgageApproved: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="mortgageApproved" className="text-sm font-medium text-gray-700">Одобрена ли ипотека</label>
              </div>
              {formData.mortgageApproved && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Источник финансирования</label>
                  <input
                    type="text"
                    value={formData.financingSource}
                    onChange={(e) => setFormData({ ...formData, financingSource: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Приоритет клиента</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'быстро' | 'безопасно' | 'выгодно' })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="быстро">Быстро</option>
                <option value="безопасно">Безопасно</option>
                <option value="выгодно">Выгодно</option>
              </select>
            </div>
          </div>
        </Accordion>

        <Accordion title="Документы и обременения">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Сколько лет в собственности</label>
              <input
                type="number"
                min="0"
                value={formData.ownershipYears}
                onChange={(e) => setFormData({ ...formData, ownershipYears: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Количество собственников</label>
              <input
                type="number"
                min="1"
                value={formData.ownerCount}
                onChange={(e) => setFormData({ ...formData, ownerCount: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hasMinorChildren"
                checked={formData.hasMinorChildren}
                onChange={(e) => setFormData({ ...formData, hasMinorChildren: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="hasMinorChildren" className="text-sm font-medium text-gray-700">Наличие детей до 18 лет</label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="maternalCapitalUsed"
                checked={formData.maternalCapitalUsed}
                onChange={(e) => setFormData({ ...formData, maternalCapitalUsed: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="maternalCapitalUsed" className="text-sm font-medium text-gray-700">Использовался ли материнский капитал</label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Кто прописан в квартире</label>
              <input
                type="text"
                value={formData.registeredPersons}
                onChange={(e) => setFormData({ ...formData, registeredPersons: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="hasEncumbrances"
                checked={formData.hasEncumbrances}
                onChange={(e) => setFormData({ ...formData, hasEncumbrances: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="hasEncumbrances" className="text-sm font-medium text-gray-700">Наличие обременений (ипотека, задолженность, залог)</label>
            </div>
            {formData.hasEncumbrances && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Детали обременений</label>
                <textarea
                  value={formData.encumbranceDetails}
                  onChange={(e) => setFormData({ ...formData, encumbranceDetails: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
        </Accordion>

        <Accordion title="Организационные моменты">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">В какое время удобно показывать квартиру</label>
              <input
                type="text"
                value={formData.showingTime}
                onChange={(e) => setFormData({ ...formData, showingTime: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="Например: 'Будни после 18:00, выходные全天'"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Примечания агента</label>
              <textarea
                value={formData.agentNotes}
                onChange={(e) => setFormData({ ...formData, agentNotes: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                rows={4}
                placeholder="Выводы агента: реальный ли запрос, будем ли работать и т.д."
              />
            </div>
          </div>
        </Accordion>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            {sellerProperty ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default SellerPropertyForm
