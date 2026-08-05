import { useState, useEffect } from 'react'
import { User, Phone, Mail, Briefcase, Building2, TrendingUp, Target, Edit2, Plus, Trash2, CheckCircle2, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

const ProfilePage = () => {
  const storeUser = useAppStore((state) => state.user)
  const updateStoreUser = useAppStore((state) => state.updateUser)
  const meetings = useAppStore((state) => state.meetings)
  const deals = useAppStore((state) => state.deals)
  const properties = useAppStore((state) => state.properties)
  const goals = useAppStore((state) => state.goals)
  const addGoal = useAppStore((state) => state.addGoal)
  const updateGoal = useAppStore((state) => state.updateGoal)
  const deleteGoal = useAppStore((state) => state.deleteGoal)
  const { user: authUser, logout, updateUser: updateAuthUser } = useAuth()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any>(null)
  const [formData, setFormData] = useState({
    firstName: storeUser.firstName || authUser?.firstName || '',
    lastName: storeUser.lastName || authUser?.lastName || '',
    middleName: storeUser.middleName || '',
    phone: storeUser.phone || authUser?.phone || '',
    email: storeUser.email || authUser?.email || '',
    position: storeUser.position || authUser?.position || ''
  })
  const [goalFormData, setGoalFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: 'custom' as const,
    target: 10,
    current: 0
  })

  useEffect(() => {
    if (authUser) {
      setFormData({
        firstName: storeUser.firstName || authUser.firstName || '',
        lastName: storeUser.lastName || authUser.lastName || '',
        middleName: storeUser.middleName || '',
        phone: storeUser.phone || authUser.phone || '',
        email: storeUser.email || authUser.email || '',
        position: storeUser.position || authUser.position || ''
      })
    }
  }, [authUser, storeUser])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateStoreUser(formData)
    updateAuthUser(formData)
    setIsModalOpen(false)
  }

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingGoal) {
      updateGoal(editingGoal.id, goalFormData)
    } else {
      addGoal(goalFormData)
    }
    setIsGoalModalOpen(false)
    setEditingGoal(null)
    setGoalFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      type: 'custom',
      target: 10,
      current: 0
    })
  }

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal)
    setGoalFormData({
      title: goal.title,
      description: goal.description || '',
      priority: goal.priority,
      dueDate: goal.dueDate,
      type: goal.type,
      target: goal.target,
      current: goal.current
    })
    setIsGoalModalOpen(true)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const userStats = [
    { label: 'Объектов в работе', value: properties.filter(p => p.status === 'available').length.toString(), icon: Building2, color: 'from-blue-500 to-cyan-500' },
    { label: 'Закрытых сделок', value: deals.filter(d => d.status === 'closed').length.toString(), icon: TrendingUp, color: 'from-emerald-500 to-teal-500' }
  ]

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white dark:text-white">Личный кабинет</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Редактировать
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-6">
              <User className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{authUser?.displayName || `${formData.firstName} ${formData.lastName}`}</h2>
            <div className="flex items-center gap-2 text-gray-600 dark:text-blue-100">
              <Briefcase className="w-5 h-5" />
              <span className="font-medium">{formData.position}</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Phone className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Телефон</p>
                <p className="text-gray-900 font-medium">{formData.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Mail className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900 font-medium">{formData.email}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Статистика агента</h3>
            <div className="grid grid-cols-2 gap-6">
              {userStats.map((stat, i) => {
                const Icon = stat.icon
                return (
                  <div key={i} className="text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</p>
                    <p className="text-gray-500 dark:text-blue-100">{stat.label}</p>
                  </div>
                )
              })}
            </div>
          </motion.div>

          <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 flex-1"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Цели</h3>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </div>
        <div className="space-y-4">
          {goals.length === 0 ? (
            <p className="text-gray-500 dark:text-blue-100 text-center py-8">Нет целей</p>
          ) : (
            goals.map((goal) => (
              <div key={goal.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      {goal.title}
                      <span className={`w-2 h-2 rounded-full ${getPriorityColor(goal.priority)}`} />
                    </h4>
                    <p className="text-sm text-gray-500">{goal.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditGoal(goal)} className="p-1 hover:bg-gray-200 rounded">
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button onClick={() => deleteGoal(goal.id)} className="p-1 hover:bg-red-100 rounded">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Прогресс</span>
                    <span className="text-sm font-bold text-gray-900">{goal.current} / {goal.target}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                      style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>До: {new Date(goal.dueDate).toLocaleDateString('ru-RU')}</span>
                  {goal.isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => updateGoal(goal.id, { current: Math.max(0, goal.current - 1) })}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >-</button>
                  <button
                    onClick={() => updateGoal(goal.id, { current: Math.min(goal.target, goal.current + 1) })}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >+</button>
                  <button
                    onClick={() => updateGoal(goal.id, { isCompleted: !goal.isCompleted })}
                    className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    {goal.isCompleted ? 'Отменить' : 'Завершить'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  </div>

  {/* Goal Modal */}
  <Modal isOpen={isGoalModalOpen} onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null) }} title={editingGoal ? 'Редактировать цель' : 'Новая цель'}>
    <form onSubmit={handleGoalSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Название</label>
        <input
          type="text"
          required
          value={goalFormData.title}
          onChange={(e) => setGoalFormData({ ...goalFormData, title: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Описание</label>
        <textarea
          value={goalFormData.description}
          onChange={(e) => setGoalFormData({ ...goalFormData, description: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Приоритет</label>
          <select
            value={goalFormData.priority}
            onChange={(e) => setGoalFormData({ ...goalFormData, priority: e.target.value as any })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          >
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Тип</label>
          <select
            value={goalFormData.type}
            onChange={(e) => setGoalFormData({ ...goalFormData, type: e.target.value as any })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          >
            <option value="showings">Показы</option>
            <option value="deals">Сделки</option>
            <option value="calls">Звонки</option>
            <option value="custom">Другая</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Цель</label>
          <input
            type="number"
            min={1}
            required
            value={goalFormData.target}
            onChange={(e) => setGoalFormData({ ...goalFormData, target: Number(e.target.value) })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Текущий результат</label>
          <input
            type="number"
            min={0}
            required
            value={goalFormData.current}
            onChange={(e) => setGoalFormData({ ...goalFormData, current: Number(e.target.value) })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Срок</label>
        <input
          type="date"
          required
          value={goalFormData.dueDate}
          onChange={(e) => setGoalFormData({ ...goalFormData, dueDate: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
        />
      </div>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => { setIsGoalModalOpen(false); setEditingGoal(null) }}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
        >
          Отмена
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all"
        >
          Сохранить
        </button>
      </div>
    </form>
  </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Редактировать профиль">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Фамилия</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Отчество</label>
            <input
              type="text"
              value={formData.middleName}
              onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Должность</label>
            <input
              type="text"
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all"
            >
              Сохранить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ProfilePage
