import { useState } from 'react'
import { useAppStore } from '../store'
import Modal from './Modal'
import { Accordion } from './Accordion'
import { BuyerRequest } from '../types'

interface BuyerRequestFormProps {
  isOpen: boolean
  onClose: () => void
  buyerRequest?: BuyerRequest | null
}

const BuyerRequestForm = ({ isOpen, onClose, buyerRequest }: BuyerRequestFormProps) => {
  const addBuyerRequest = useAppStore((state) => state.addBuyerRequest)
  const updateBuyerRequest = useAppStore((state) => state.updateBuyerRequest)
  
  const [formData, setFormData] = useState({
    // Контакты и статус
    name: buyerRequest?.name || '',
    phone: buyerRequest?.phone || '',
    additionalPhones: buyerRequest?.additionalPhones?.join(', ') || '',
    status: buyerRequest?.status || 'новый',
    statusCustom: buyerRequest?.status || '',
    
    // Требования к объекту
    budgetFrom: buyerRequest?.budgetFrom || 0,
    budgetTo: buyerRequest?.budgetTo || 0,
    districts: buyerRequest?.districts?.join(', ') || '',
    rooms: buyerRequest?.rooms?.map(String).join(', ') || '',
    minArea: buyerRequest?.minArea || 0,
    houseTypes: buyerRequest?.houseTypes?.join(', ') || '',
    houseTypeCustom: '',
    repairRequirements: buyerRequest?.repairRequirements?.join(', ') || '',
    repairRequirementCustom: '',
    criticalParams: buyerRequest?.criticalParams || '',
    
    // Финансирование
    paymentType: buyerRequest?.paymentType || 'наличные',
    paymentTypeCustom: buyerRequest?.paymentType || '',
    mortgageStatus: buyerRequest?.mortgageStatus || 'не требуется',
    mortgageStatusCustom: buyerRequest?.mortgageStatus || '',
    mortgageBank: buyerRequest?.mortgageBank || '',
    mortgageAmount: buyerRequest?.mortgageAmount || 0,
    certificates: buyerRequest?.certificates?.join(', ') || '',
    certificateCustom: '',
    
    // Мотивация и сроки
    purchaseGoal: buyerRequest?.purchaseGoal || 'для себя',
    purchaseGoalCustom: buyerRequest?.purchaseGoal || '',
    purchaseUrgency: buyerRequest?.purchaseUrgency || '',
    needsToSellProperty: buyerRequest?.needsToSellProperty || false,
    
    // Служебная информация
    leadSource: buyerRequest?.leadSource || '',
    leadSourceCustom: '',
    agentComment: buyerRequest?.agentComment || '',
    isFavorite: buyerRequest?.isFavorite || false,
    tags: buyerRequest?.tags || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = {
      ...formData,
      additionalPhones: formData.additionalPhones.split(',').map(s => s.trim()).filter(s => s),
      status: formData.status === 'custom' ? formData.statusCustom : formData.status,
      districts: formData.districts.split(',').map(s => s.trim()).filter(s => s),
      rooms: formData.rooms.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)),
      houseTypes: formData.houseTypes.split(',').map(s => s.trim()).filter(s => s),
      repairRequirements: formData.repairRequirements.split(',').map(s => s.trim()).filter(s => s),
      paymentType: formData.paymentType === 'custom' ? formData.paymentTypeCustom : formData.paymentType,
      mortgageStatus: formData.mortgageStatus === 'custom' ? formData.mortgageStatusCustom : formData.mortgageStatus,
      certificates: formData.certificates.split(',').map(s => s.trim()).filter(s => s),
      purchaseGoal: formData.purchaseGoal === 'custom' ? formData.purchaseGoalCustom : formData.purchaseGoal,
      leadSource: formData.leadSource === 'custom' ? formData.leadSourceCustom : formData.leadSource,
    }
    
    if (buyerRequest) {
      updateBuyerRequest(buyerRequest.id, data)
    } else {
      addBuyerRequest(data)
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={buyerRequest ? 'Редактировать анкету покупателя' : 'Новая анкета покупателя'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Accordion title="Контакты и статус">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Имя клиента *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Номер телефона *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Дополнительные телефоны (через запятую)</label>
              <input
                type="text"
                value={formData.additionalPhones}
                onChange={(e) => setFormData({ ...formData, additionalPhones: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Текущий статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="новый">Новый</option>
                <option value="в поиске">В поиске</option>
                <option value="аванс">Аванс</option>
                <option value="сделка">Сделка</option>
                <option value="закрыт">Закрыт</option>
                <option value="custom">Добавить свой вариант</option>
              </select>
            </div>
            {formData.status === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Свой вариант статуса</label>
                <input
                  type="text"
                  value={formData.statusCustom}
                  onChange={(e) => setFormData({ ...formData, statusCustom: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            )}
          </div>
        </Accordion>

        <Accordion title="Требования к объекту">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Бюджет от</label>
                <input
                  type="number"
                  min="0"
                  value={formData.budgetFrom}
                  onChange={(e) => setFormData({ ...formData, budgetFrom: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Бюджет до</label>
                <input
                  type="number"
                  min="0"
                  value={formData.budgetTo}
                  onChange={(e) => setFormData({ ...formData, budgetTo: Number(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Желаемые районы/микрорайоны (через запятую)</label>
              <input
                type="text"
                value={formData.districts}
                onChange={(e) => setFormData({ ...formData, districts: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="Центральный, Северный, ..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Количество комнат (через запятую)</label>
              <input
                type="text"
                value={formData.rooms}
                onChange={(e) => setFormData({ ...formData, rooms: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="1, 2, 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Минимальная площадь</label>
              <input
                type="number"
                min="0"
                value={formData.minArea}
                onChange={(e) => setFormData({ ...formData, minArea: Number(e.target.value)})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Типы домов (через запятую)</label>
              <input
                type="text"
                value={formData.houseTypes}
                onChange={(e) => setFormData({ ...formData, houseTypes: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="кирпич, панель, монолит"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Требования к ремонту (через запятую)</label>
              <input
                type="text"
                value={formData.repairRequirements}
                onChange={(e) => setFormData({ ...formData, repairRequirements: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="без ремонта, косметика, евро, дизайнерский"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Критичные параметры</label>
              <textarea
                value={formData.criticalParams}
                onChange={(e) => setFormData({ ...formData, criticalParams: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                rows={3}
                placeholder="только не первый этаж, обязательно балкон, окна на юг..."
              />
            </div>
          </div>
        </Accordion>

        <Accordion title="Финансирование">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Тип расчета</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="наличные">Наличные</option>
                <option value="ипотека">Ипотека</option>
                <option value="рассрочка">Рассрочка</option>
                <option value="custom">Добавить свой вариант</option>
              </select>
            </div>
            {formData.paymentType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Свой вариант расчета</label>
                <input
                  type="text"
                  value={formData.paymentTypeCustom}
                  onChange={(e) => setFormData({ ...formData, paymentTypeCustom: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Статус ипотеки</label>
              <select
                value={formData.mortgageStatus}
                onChange={(e) => setFormData({ ...formData, mortgageStatus: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="одобрена">Одобрена</option>
                <option value="необходима помощь">Необходима помощь в одобрении</option>
                <option value="не требуется">Не требуется</option>
                <option value="custom">Добавить свой вариант</option>
              </select>
            </div>
            {formData.mortgageStatus === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Свой вариант статуса ипотеки</label>
                <input
                  type="text"
                  value={formData.mortgageStatusCustom}
                  onChange={(e) => setFormData({ ...formData, mortgageStatusCustom: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            )}
            {formData.mortgageStatus === 'одобрена' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Банк</label>
                  <input
                    type="text"
                    value={formData.mortgageBank}
                    onChange={(e) => setFormData({ ...formData, mortgageBank: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Сумма</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.mortgageAmount}
                    onChange={(e) => setFormData({ ...formData, mortgageAmount: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Использование сертификатов (через запятую)</label>
              <input
                type="text"
                value={formData.certificates}
                onChange={(e) => setFormData({ ...formData, certificates: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="Материнский капитал, Военная ипотека..."
              />
            </div>
          </div>
        </Accordion>

        <Accordion title="Мотивация и сроки">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Цель покупки</label>
              <select
                value={formData.purchaseGoal}
                onChange={(e) => setFormData({ ...formData, purchaseGoal: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="для себя">Для себя</option>
                <option value="инвестиции">Инвестиции (сдача в аренду)</option>
                <option value="перепродажа">Перепродажа</option>
                <option value="custom">Добавить свой вариант</option>
              </select>
            </div>
            {formData.purchaseGoal === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Свой вариант цели</label>
                <input
                  type="text"
                  value={formData.purchaseGoalCustom}
                  onChange={(e) => setFormData({ ...formData, purchaseGoalCustom: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Срочность покупки (как быстро нужно заехать)</label>
              <input
                type="text"
                value={formData.purchaseUrgency}
                onChange={(e) => setFormData({ ...formData, purchaseUrgency: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                placeholder="Например: 'В течение 2 месяцев'"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="needsToSellProperty"
                checked={formData.needsToSellProperty}
                onChange={(e) => setFormData({ ...formData, needsToSellProperty: e.target.checked})}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="needsToSellProperty" className="text-sm font-medium text-gray-700">Необходима ли продажа своей недвижимости для покупки этой</label>
            </div>
          </div>
        </Accordion>

        <Accordion title="Служебная информация">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Источник лида</label>
              <select
                value={formData.leadSource}
                onChange={(e) => setFormData({ ...formData, leadSource: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="Звонок">Звонок</option>
                <option value="Avito">Avito</option>
                <option value="Рекомендация">Рекомендация</option>
                <option value="Сайт">Сайт</option>
                <option value="custom">Добавить свой вариант</option>
              </select>
            </div>
            {formData.leadSource === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Свой вариант источника</label>
                <input
                  type="text"
                  value={formData.leadSourceCustom}
                  onChange={(e) => setFormData({ ...formData, leadSourceCustom: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Комментарии агента</label>
              <textarea
                value={formData.agentComment}
                onChange={(e) => setFormData({ ...formData, agentComment: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                rows={4}
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
            {buyerRequest ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default BuyerRequestForm
