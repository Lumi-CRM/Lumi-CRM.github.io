import { useMemo, useRef, useState } from 'react'
import { CalendarClock, ChevronRight, Mail, Plus, RefreshCw, Search, Star, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useContacts } from '../hooks/useContacts'
import type { ContactRole, ContactSummary } from '../lib/contacts'
import AnchoredPopover from '../components/AnchoredPopover'
import BuyerForm from '../components/BuyerForm'
import OwnerForm from '../components/OwnerForm'

type ContactFilter = 'all' | ContactRole

const roleOptions: Array<{ id: ContactRole; label: string; shortLabel: string }> = [
  { id: 'seller', label: 'Собственник', shortLabel: 'Собственники' },
  { id: 'buyer', label: 'Покупатель', shortLabel: 'Покупатели' },
  { id: 'landlord', label: 'Арендодатель', shortLabel: 'Арендодатели' },
  { id: 'tenant', label: 'Арендатор', shortLabel: 'Арендаторы' },
]

const roleRoute: Record<ContactRole, string> = {
  seller: '/owners',
  buyer: '/buyers',
  landlord: '/landlords',
  tenant: '/tenants',
}

const roleLabel = new Map(roleOptions.map(item => [item.id, item.label]))

const fullName = (contact: ContactSummary) => [contact.lastName, contact.firstName, contact.middleName].filter(Boolean).join(' ') || 'Без имени'

const formatContactDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

const ContactsHubPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const { data: contacts = [], isPending: loading, error: loadError, refetch, invalidate } = useContacts(user?.id)
  const [filter, setFilter] = useState<ContactFilter>('all')
  const [query, setQuery] = useState('')
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [newRole, setNewRole] = useState<ContactRole | null>(null)
  const error = loadError instanceof Error ? loadError.message : loadError ? 'Не удалось загрузить контакты.' : ''

  const counts = useMemo(() => Object.fromEntries(roleOptions.map(role => [role.id, contacts.filter(contact => contact.roles.includes(role.id)).length])) as Record<ContactRole, number>, [contacts])

  const visibleContacts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return contacts.filter(contact => {
      if (filter !== 'all' && !contact.roles.includes(filter)) return false
      if (!normalizedQuery) return true
      return `${fullName(contact)} ${contact.phone} ${contact.email} ${contact.source || ''}`.toLowerCase().includes(normalizedQuery)
    })
  }, [contacts, filter, query])

  const openContact = (contact: ContactSummary) => {
    const preferredRole = filter === 'all' ? contact.roles[0] : filter
    navigate(`${roleRoute[preferredRole || 'seller']}?client=${encodeURIComponent(contact.id)}`)
  }

  const openCreateForm = (role: ContactRole) => {
    setAddMenuOpen(false)
    setNewRole(role)
  }

  const closeCreateForm = () => {
    setNewRole(null)
    void invalidate()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="lumi-accent-text text-sm font-semibold">Единая клиентская база</p>
          <h1 className="lumi-text mt-1 text-3xl font-bold">Контакты</h1>
          <p className="lumi-muted mt-2">Все роли клиента, история и связанные действия в одном разделе.</p>
        </div>
        <div className="relative">
          <button ref={addButtonRef} type="button" onClick={() => setAddMenuOpen(value => !value)} className="lumi-gradient-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold sm:w-auto"><Plus className="h-5 w-5" />Добавить контакт</button>
          <AnchoredPopover open={addMenuOpen} anchorRef={addButtonRef} onClose={() => setAddMenuOpen(false)} width={300} ariaLabel="Выбор роли нового контакта" className="p-2">
            <p className="lumi-muted px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide">Кого добавить</p>
            {roleOptions.map(role => <button key={role.id} type="button" onClick={() => openCreateForm(role.id)} className="lumi-nav-item flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium"><span>{role.label}</span><ChevronRight className="h-4 w-4" /></button>)}
          </AnchoredPopover>
        </div>
      </div>

      <section className="lumi-panel rounded-2xl border p-4 sm:p-5">
        <div className="relative">
          <Search className="lumi-muted absolute left-3 top-3.5 h-5 w-5" />
          <input value={query} onChange={event => setQuery(event.target.value)} className="lumi-control w-full rounded-xl py-3 pl-10 pr-4 outline-none" placeholder="Имя, телефон, email или источник" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Фильтр контактов">
          <button type="button" role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${filter === 'all' ? 'lumi-nav-item-active' : 'lumi-control'}`}>Все · {contacts.length}</button>
          {roleOptions.map(role => <button key={role.id} type="button" role="tab" aria-selected={filter === role.id} onClick={() => setFilter(role.id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${filter === role.id ? 'lumi-nav-item-active' : 'lumi-control'}`}>{role.shortLabel} · {counts[role.id]}</button>)}
        </div>
      </section>

      {error && <div className="flex flex-col gap-3 rounded-xl border border-red-800/50 bg-red-950/25 px-4 py-3 text-sm text-red-300 sm:flex-row sm:items-center sm:justify-between"><span>Не удалось загрузить контакты: {error}</span><button type="button" onClick={() => void refetch()} className="lumi-control inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold"><RefreshCw className="h-4 w-4" />Повторить</button></div>}

      {loading && contacts.length === 0 ? (
        <div className="lumi-muted py-20 text-center">Загружаем контакты…</div>
      ) : visibleContacts.length === 0 ? (
        <div className="lumi-panel lumi-muted flex flex-col items-center rounded-2xl border border-dashed py-20 text-center"><Users className="mb-4 h-14 w-14" /><p className="lumi-text text-lg font-semibold">Контакты не найдены</p><p className="mt-2 text-sm">Измените фильтр или добавьте нового клиента.</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleContacts.map(contact => (
            <button key={contact.id} type="button" onClick={() => openContact(contact)} className="lumi-panel lumi-content-auto rounded-2xl border p-5 text-left transition hover:-translate-y-0.5">
              <div className="flex items-start gap-3">
                <div className="lumi-accent-bg flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold">{contact.firstName[0] || '?'}{contact.lastName[0] || ''}</div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="lumi-text truncate font-semibold">{fullName(contact)}</h2>{contact.isFavorite && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />}</div><div className="mt-2 flex flex-wrap gap-1.5">{contact.roles.map(role => <span key={role} className="lumi-accent-soft rounded-full px-2.5 py-1 text-xs font-medium">{roleLabel.get(role)}</span>)}</div></div>
                <ChevronRight className="lumi-muted h-5 w-5 shrink-0" />
              </div>
              <div className="lumi-muted mt-5 space-y-2 text-sm">
                <p className="truncate">{contact.phone || 'Телефон не указан'}</p>
                {contact.email && <p className="flex items-center gap-2 truncate"><Mail className="h-4 w-4 shrink-0" />{contact.email}</p>}
                {contact.nextContactDate && <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 shrink-0" />Следующий контакт: {formatContactDate(contact.nextContactDate)}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {newRole === 'seller' && <OwnerForm isOpen mode="sale" onClose={closeCreateForm} />}
      {newRole === 'landlord' && <OwnerForm isOpen mode="rent" onClose={closeCreateForm} />}
      {newRole === 'buyer' && <BuyerForm isOpen defaultPurpose="sale" onClose={closeCreateForm} />}
      {newRole === 'tenant' && <BuyerForm isOpen defaultPurpose="rent" onClose={closeCreateForm} />}
    </div>
  )
}

export default ContactsHubPage
