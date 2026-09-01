import { useRef, useState } from 'react'
import { Archive, FileText, Image, LogOut, Settings, Star, Trash2, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AnchoredPopover from './AnchoredPopover'

const ProfileMenu = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  if (!user) return null

  const openAccount = () => {
    setOpen(false)
    navigate('/settings#account')
    window.setTimeout(() => document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  const openSection = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = `${user.firstName?.[0] || 'L'}${user.lastName?.[0] || ''}`

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Управление аккаунтом"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="flex min-w-0 items-center gap-3 rounded-xl text-left"
      >
        <span className="hidden min-w-0 text-right sm:block">
          <span className="lumi-text block truncate text-sm font-semibold">{user.displayName || 'Владелец офиса'}</span>
          <span className="lumi-muted block max-w-44 truncate text-xs">{user.email}</span>
        </span>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="Аватар профиля" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[rgb(var(--lumi-accent-rgb)/0.35)]" />
        ) : (
          <span className="lumi-gradient-button flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold">{initials}</span>
        )}
      </button>

      <AnchoredPopover open={open} anchorRef={triggerRef} onClose={() => setOpen(false)} width={320} ariaLabel="Меню аккаунта" className="p-2">
        <div className="lumi-border border-b px-3 pb-3 pt-2">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="lumi-accent-soft flex h-12 w-12 items-center justify-center rounded-full"><UserRound className="h-6 w-6" /></div>}
            <div className="min-w-0"><p className="lumi-text truncate font-semibold">{user.displayName || 'Владелец офиса'}</p><p className="lumi-muted truncate text-xs">{user.email}</p></div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 sm:block">
          {[
            { path: '/documents', label: 'Документы', icon: FileText },
            { path: '/gallery', label: 'Галерея', icon: Image },
            { path: '/favorites', label: 'Избранное', icon: Star },
            { path: '/archive', label: 'Архив', icon: Archive },
            { path: '/trash', label: 'Корзина', icon: Trash2 },
          ].map(item => {
            const Icon = item.icon
            return <button key={item.path} type="button" onClick={() => openSection(item.path)} className="lumi-nav-item flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium sm:gap-3"><Icon className="h-5 w-5 shrink-0" />{item.label}</button>
          })}
        </div>
        <button type="button" onClick={openAccount} className="lumi-nav-item mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium"><Settings className="h-5 w-5" />Профиль и настройки</button>
        <button type="button" disabled={loggingOut} onClick={() => void handleLogout()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"><LogOut className="h-5 w-5" />{loggingOut ? 'Выходим…' : 'Выйти из аккаунта'}</button>
      </AnchoredPopover>
    </div>
  )
}

export default ProfileMenu
