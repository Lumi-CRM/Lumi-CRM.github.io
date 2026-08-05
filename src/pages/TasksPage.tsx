import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, CheckSquare, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import type { Task } from '../types'

const TasksPage = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'todo' | 'inprogress' | 'done'>('todo')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')

  const fetchTasks = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('due_date', { ascending: true, nullsFirst: false })
    if (data) {
      const mapped = data.map(t => ({
        ...t,
        userId: t.user_id,
        dueDate: t.due_date,
        isFavorite: t.is_favorite,
        isCompleted: t.is_completed
      }))
      setTasks(mapped)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (editingTask) {
      await supabase.from('tasks').update({
        title,
        description,
        status,
        priority,
        due_date: dueDate || null
      }).eq('id', editingTask.id).eq('user_id', user.id)
    } else {
      await supabase.from('tasks').insert({
        user_id: user.id,
        title,
        description,
        status,
        priority,
        due_date: dueDate || null
      })
    }

    setIsModalOpen(false)
    fetchTasks()
  }

  const updateTaskStatus = async (taskId: string, newStatus: 'todo' | 'inprogress' | 'done') => {
    if (!user) return
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId).eq('user_id', user.id)
    fetchTasks()
  }

  const deleteTask = async (taskId: string) => {
    if (!user) return
    await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', user.id)
    fetchTasks()
  }

  const openModal = (task: Task | null = null) => {
    if (task) {
      setEditingTask(task)
      setTitle(task.title)
      setDescription(task.description || '')
      setStatus(task.status)
      setPriority(task.priority)
      setDueDate(task.dueDate || '')
    } else {
      setEditingTask(null)
      setTitle('')
      setDescription('')
      setStatus('todo')
      setPriority('medium')
      setDueDate('')
    }
    setIsModalOpen(true)
  }

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'todo': return 'from-yellow-500 to-orange-500'
      case 'inprogress': return 'from-blue-500 to-purple-500'
      case 'done': return 'from-emerald-500 to-teal-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getStatusText = (st: string) => {
    switch (st) {
      case 'todo': return 'К выполнению'
      case 'inprogress': return 'В работе'
      case 'done': return 'Завершено'
      default: return 'Статус'
    }
  }

  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case 'low': return 'bg-blue-100 text-blue-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'high': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityText = (p: string) => {
    switch (p) {
      case 'low': return 'Низкий'
      case 'medium': return 'Средний'
      case 'high': return 'Высокий'
      default: return 'Приоритет'
    }
  }

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    inprogress: tasks.filter((t) => t.status === 'inprogress'),
    done: tasks.filter((t) => t.status === 'done')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh] text-gray-500 dark:text-gray-400">Загрузка...</div>
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Задачи</h1>
        <button
          onClick={() => openModal()}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Новая задача
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
        {(['todo', 'inprogress', 'done'] as const).map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${getStatusColor(s)}`} />
              {getStatusText(s)}
              <span className="text-gray-500 dark:text-gray-400 font-normal">({tasksByStatus[s].length})</span>
            </h2>
            <div className="space-y-4">
              {tasksByStatus[s].map((task, j) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 + j * 0.05 }}
                  className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getPriorityBadgeColor(task.priority)}`}>
                          {getPriorityText(task.priority)}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{task.title}</h3>
                      {task.description && (
                        <p className="text-gray-500 dark:text-gray-300 text-sm mt-2">{task.description}</p>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center gap-2 mt-3 text-gray-600 dark:text-gray-300 text-sm">
                          <Calendar className="w-4 h-4" />
                          {task.dueDate}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => openModal(task)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                      >
                        <Edit className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  {s !== 'done' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, s === 'todo' ? 'inprogress' : 'done')}
                      className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-all"
                    >
                      {s === 'todo' ? 'Начать' : 'Завершить'}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? 'Редактировать задачу' : 'Новая задача'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Название</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Название задачи"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-none"
              placeholder="Описание задачи"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Статус</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'todo' | 'inprogress' | 'done')}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="todo">К выполнению</option>
                <option value="inprogress">В работе</option>
                <option value="done">Завершено</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Приоритет</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Срок выполнения</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
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
              {editingTask ? 'Сохранить изменения' : 'Создать'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TasksPage
