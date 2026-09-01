import { useEffect, useMemo, useState } from 'react'
import { Plus, Edit, Trash2, Phone, Mail, Search, Star, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Client } from '../types'
import BuyerForm from '../components/BuyerForm'
import ActivityTimeline from '../components/ActivityTimeline'
import EntityFilesPanel from '../components/EntityFilesPanel'
import { useClientRecords } from '../hooks/useClientRecords'
import { getErrorMessage } from '../lib/errors'

interface BuyersPageProps {
  mode?: 'sale' | 'rent'
}

const BuyersPage = ({ mode = 'sale' }: BuyersPageProps) => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const clientQuery = useClientRecords(user?.id)
  const buyers = useMemo(() => (clientQuery.data || []).filter(client => mode === 'rent'
    ? client.roles?.includes('tenant')
    : client.roles?.includes('buyer')), [clientQuery.data, mode])
  const [selectedBuyer, setSelectedBuyer] = useState<Client | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBuyer, setEditingBuyer] = useState<Client | null>(null)
  const [actionError, setActionError] = useState('')
  const loading = clientQuery.isPending
  const loadError = clientQuery.error instanceof Error ? clientQuery.error.message : clientQuery.error ? 'Не удалось загрузить контакты.' : ''
  const error = actionError || loadError

  useEffect(() => {
    const requestedClientId = searchParams.get('client')
    setSelectedBuyer(current => buyers.find(client => client.id === (requestedClientId || current?.id)) || null)
  }, [buyers, searchParams])

  const filteredBuyers = buyers.filter(buyer =>
    (buyer.firstName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (buyer.lastName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (buyer.phone || '').includes(searchQuery || '')
  )

  const closeDetails = () => {
    setSelectedBuyer(null)
    if (searchParams.has('client')) {
      const next = new URLSearchParams(searchParams)
      next.delete('client')
      setSearchParams(next, { replace: true })
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 lg:flex-row">
      <div className="lumi-panel flex min-h-[24rem] w-full flex-col rounded-2xl border lg:min-h-0 lg:w-96">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{mode === 'rent' ? 'Арендаторы' : 'Покупатели'}</h2>
            <button
              onClick={() => { setEditingBuyer(null); setIsModalOpen(true); }}
              aria-label={mode === 'rent' ? 'Добавить арендатора' : 'Добавить покупателя'}
              className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:opacity-90 transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && <div className="lumi-muted py-10 text-center">Загрузка…</div>}
          {filteredBuyers.map((buyer) => (
            <button
              type="button"
              key={buyer.id}
              onClick={() => setSelectedBuyer(buyer)}
              className={`lumi-content-auto w-full rounded-xl border-2 p-4 text-left transition-all ${
                selectedBuyer?.id === buyer.id
                  ? 'lumi-accent-soft border-[var(--lumi-accent)]'
                  : 'lumi-panel-muted border-transparent hover:border-[var(--lumi-border)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-lg">
                  {(buyer.firstName || '')[0] || '?'}{(buyer.lastName || '')[0] || ''}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {(buyer.lastName || '')} {(buyer.firstName || '')}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{buyer.phone || ''}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm font-semibold text-gray-900">
                  Бюджет: {buyer.budget ? `${buyer.budget.toLocaleString('ru-RU')} ₽` : 'Не указан'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedBuyer ? (
        <div className="lumi-panel fixed inset-0 z-[120] flex max-h-[100dvh] w-full flex-col overflow-hidden border lg:static lg:min-h-0 lg:flex-1 lg:rounded-2xl">
          <div className="lumi-border flex justify-end border-b p-3 lg:hidden">
            <button type="button" onClick={closeDetails} className="lumi-control rounded-xl p-2.5" aria-label="Закрыть карточку"><X className="h-6 w-6" /></button>
          </div>
          <div className="border-b border-gray-100 p-4 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4 sm:gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold text-4xl">
                  {(selectedBuyer.firstName || '')[0] || '?'}{(selectedBuyer.lastName || '')[0] || ''}
                </div>
                <div>
                  <h2 className="lumi-text break-words text-2xl font-bold sm:text-3xl">
                    {(selectedBuyer.lastName || '')} {(selectedBuyer.firstName || '')} {(selectedBuyer.middleName || '')}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-300 mt-1">ID: {selectedBuyer.id}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(selectedBuyer.tags || []).map((tag, i) => (
                      <span key={i} className="px-3 py-1 text-sm rounded-full bg-pink-100 text-pink-700 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setActionError('')
                    try { await clientQuery.toggleFavorite(selectedBuyer) }
                    catch (updateError) { setActionError(getErrorMessage(updateError, 'Не удалось обновить избранное.')) }
                  }}
                  className={`p-3 rounded-xl hover:bg-gray-100 ${selectedBuyer.isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}
                >
                  <Star className="w-5 h-5" fill={selectedBuyer.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => { setEditingBuyer(selectedBuyer); setIsModalOpen(true); }}
                  className="p-3 rounded-xl hover:bg-gray-100"
                >
                  <Edit className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={async () => {
                    try {
                      await clientQuery.removeClient(selectedBuyer.id)
                      setSelectedBuyer(null)
                    } catch (deleteError) { setActionError(getErrorMessage(deleteError, 'Не удалось переместить клиента в корзину.')) }
                  }}
                  className="p-3 rounded-xl hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:p-8">
            <div className="mb-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Контакты</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                    <Phone className="w-5 h-5 text-pink-600" />
                    <div>
                      <p className="text-sm text-gray-500">Телефон</p>
                      <p className="font-semibold text-gray-900">{selectedBuyer.phone}</p>
                    </div>
                  </div>
                  {selectedBuyer.email && (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                      <Mail className="w-5 h-5 text-pink-600" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-semibold text-gray-900">{selectedBuyer.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Пожелания</h3>
                <div className="space-y-4">
                  {selectedBuyer.propertyType && (
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-sm text-gray-500">Тип недвижимости</p>
                      <p className="font-semibold text-gray-900">{selectedBuyer.propertyType}</p>
                    </div>
                  )}
                  {selectedBuyer.budget && (
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-sm text-gray-500">Бюджет</p>
                      <p className="font-semibold text-gray-900">{selectedBuyer.budget.toLocaleString('ru-RU')} ₽</p>
                    </div>
                  )}
                  {selectedBuyer.rooms && (
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-sm text-gray-500">Комнат</p>
                      <p className="font-semibold text-gray-900">{selectedBuyer.rooms}</p>
                    </div>
                  )}
                  {selectedBuyer.preferredDistricts && selectedBuyer.preferredDistricts.length > 0 && (
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-sm text-gray-500">Районы</p>
                      <p className="font-semibold text-gray-900">{selectedBuyer.preferredDistricts.join(', ')}</p>
                    </div>
                  )}
                  {selectedBuyer.paymentMethod && (
                    <div className="p-4 rounded-xl bg-gray-50">
                      <p className="text-sm text-gray-500">Способ оплаты</p>
                      <p className="font-semibold text-gray-900">{selectedBuyer.paymentMethod}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ActivityTimeline clientId={selectedBuyer.id} />
            <EntityFilesPanel clientId={selectedBuyer.id} title={mode === 'rent' ? 'Документы арендатора' : 'Документы покупателя'} />
          </div>
        </div>
      ) : !loading && (
        <div className="lumi-panel lumi-muted flex min-h-[24rem] w-full items-center justify-center rounded-2xl border p-8 text-center lg:flex-1">
          {mode === 'rent' ? 'Создайте первую заявку арендатора' : 'Создайте первую заявку покупателя'}
        </div>
      )}

      <BuyerForm
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingBuyer(null) }}
        buyer={editingBuyer}
        defaultPurpose={mode}
      />
    </div>
  )
}

export default BuyersPage
