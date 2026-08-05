import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Clock, MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import NewEventForm from '../components/NewEventForm'
import type { Event } from '../types'

const MeetingsPage = () => {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Event | null>(null)

  const fetchMeetings = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('events').select('*').eq('type', 'meeting')
    if (data) {
      const mapped = data.map(e => ({
        ...e,
        userId: e.user_id,
        eventDate: e.event_date,
        eventTime: e.event_time,
        isFavorite: e.is_favorite,
        isCompleted: e.is_completed,
        relatedClientId: e.related_client_id,
        relatedClientType: e.related_client_type,
        relatedPropertyId: e.related_property_id
      }))
      setMeetings(mapped)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMeetings()
  }, [user])

  const deleteMeeting = async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    fetchMeetings()
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'showing': return 'from-emerald-500 to-teal-500'
      default: return 'from-purple-500 to-violet-500'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'showing': return 'Показ'
      default: return 'Встреча'
    }
  }

  const handleEdit = (meeting: Event) => {
    setEditingMeeting(meeting)
    setIsModalOpen(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-gray-400">Загрузка...</div>
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Встречи</h1>
        <button
          onClick={() => {
          setEditingMeeting(null)
          setIsModalOpen(true)
        }}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Новое событие
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 content-start">
        {meetings.map((meeting, i) => {
        return (
          <motion.div
            key={meeting.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all"
          >
            <div className={`h-2 bg-gradient-to-r ${getTypeColor(meeting.type)}`} />
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium mb-3 ${getTypeColor(meeting.type) === 'from-emerald-500 to-teal-500' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                    {getTypeText(meeting.type)}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{meeting.title}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(meeting)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                  >
                    <Edit className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => deleteMeeting(meeting.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">{meeting.eventDate}</span>
                </div>
                {meeting.eventTime && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span className="font-medium">{meeting.eventTime}</span>
                  </div>
                )}
                {meeting.location && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span>{meeting.location}</span>
                  </div>
                )}
                {meeting.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{meeting.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}

        {meetings.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
            <Calendar className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">Нет запланированных встреч</p>
            <p className="text-sm mt-2">Создайте новую встречу</p>
          </div>
        )}
      </div>

      <NewEventForm
        isOpen={isModalOpen}
        onClose={() => {
        setIsModalOpen(false)
        setEditingMeeting(null)
        fetchMeetings()
      }}
        defaultType="meeting"
        editData={editingMeeting}
      />
    </div>
  )
}

export default MeetingsPage
