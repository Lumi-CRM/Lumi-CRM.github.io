import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from './Modal'
import type { Event, Client, Property } from '../types'

interface NewEventFormProps {
  isOpen: boolean
  onClose: () => void
  defaultType?: 'meeting' | 'call'
  editData?: Event | null
}

const NewEventForm = ({ isOpen, onClose, defaultType = 'meeting', editData = null }: NewEventFormProps) => {
  const { user } = useAuth()
  const [eventType, setEventType] = useState<'meeting' | 'call'>(defaultType)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [relatedClientType, setRelatedClientType] = useState<'owner' | 'buyer' | ''>('')
  const [relatedClientId, setRelatedClientId] = useState('')
  const [relatedPropertyId, setRelatedPropertyId] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [owners, setOwners] = useState<Client[]>([])
  const [buyers, setBuyers] = useState<Client[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  const fetchData = async () => {
    if (!user) return
    const [clientsRes, propsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabase.from('properties').select('*').eq('user_id', user.id).is('deleted_at', null)
    ])
    if (clientsRes.data) {
      const mappedClients = clientsRes.data.map(c => ({
        ...c,
        userId: c.user_id,
        preferredDistricts: c.preferred_districts,
        mortgageStatus: c.mortgage_status,
        paymentMethod: c.payment_method,
        propertyType: c.property_type,
        isFavorite: c.is_favorite
      }))
      setOwners(mappedClients.filter(c => c.type === 'seller'))
      setBuyers(mappedClients.filter(c => c.type === 'buyer'))
    }
    if (propsRes.data) {
      const mappedProps = propsRes.data.map(p => ({
        ...p,
        userId: p.user_id,
        totalFloors: p.total_floors,
        isFavorite: p.is_favorite
      }))
      setProperties(mappedProps)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  useEffect(() => {
    if (editData) {
      setTitle(editData.title)
      setDate(editData.eventDate)
      setTime(editData.eventTime || '')
      setRelatedClientId(editData.relatedClientId || '')
      setRelatedClientType(editData.relatedClientType || '')
      setNotes(editData.notes || '')
      if (editData.type === 'meeting') {
        setEventType('meeting')
        setLocation(editData.location || '')
        setRelatedPropertyId(editData.relatedPropertyId || '')
      } else {
        setEventType('call')
      }
    } else {
      resetForm()
      setEventType(defaultType)
    }
  }, [editData, defaultType])

  const resetForm = () => {
    setTitle('')
    setDate('')
    setTime('')
    setRelatedClientType('')
    setRelatedClientId('')
    setRelatedPropertyId('')
    setLocation('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const eventData = {
      user_id: user.id,
      type: eventType,
      title,
      event_date: date,
      event_time: time || null,
      location: eventType === 'meeting' ? location || null : null,
      notes: notes || null,
      related_client_id: relatedClientId || null,
      related_client_type: relatedClientType || null,
      related_property_id: relatedPropertyId || null
    }

    if (editData) {
      await supabase.from('events').update(eventData).eq('id', editData.id).eq('user_id', user.id)
    } else {
      await supabase.from('events').insert(eventData)
    }

    resetForm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Редактировать событие' : 'Новое событие'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {!editData && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Тип события</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="eventType"
                  value="meeting"
                  checked={eventType === 'meeting'}
                  onChange={(e) => setEventType(e.target.value as 'meeting' | 'call')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Встреча</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="eventType"
                  value="call"
                  checked={eventType === 'call'}
                  onChange={(e) => setEventType(e.target.value as 'meeting' | 'call')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Звонок</span>
              </label>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            placeholder="Например, Показ квартиры"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Дата</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Время</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Тип клиента</label>
          <select
            value={relatedClientType}
            onChange={(e) => {
              setRelatedClientType(e.target.value as 'owner' | 'buyer' | '')
              setRelatedClientId('')
            }}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          >
            <option value="">Не выбран</option>
            <option value="owner">Собственник</option>
            <option value="buyer">Покупатель</option>
          </select>
        </div>

        {relatedClientType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Клиент</label>
            <select
              value={relatedClientId}
              onChange={(e) => setRelatedClientId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">Не выбран</option>
              {relatedClientType === 'owner'
                ? owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.lastName} {owner.firstName}
                    </option>
                  ))
                : buyers.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.lastName} {buyer.firstName}
                    </option>
                  ))}
            </select>
          </div>
        )}

        {eventType === 'meeting' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Объект</label>
            <select
              value={relatedPropertyId}
              onChange={(e) => setRelatedPropertyId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">Не выбран</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.address}
                </option>
              ))}
            </select>
          </div>
        )}

        {eventType === 'meeting' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Локация</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Адрес встречи"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Заметки</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
            placeholder="Дополнительные заметки"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all"
          >
            {editData ? 'Сохранить изменения' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default NewEventForm
