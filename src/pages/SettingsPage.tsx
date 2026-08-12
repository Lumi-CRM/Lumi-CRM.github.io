import { useState } from 'react'
import { Bell, BellRing, LayoutPanelLeft, Maximize2, Palette, Save, Settings, Smartphone } from 'lucide-react'
import { useAuth, type IconSize, type InterfaceDensity, type NavigationPosition } from '../context/AuthContext'
import { themeOptions, useTheme } from '../context/ThemeContext'
import { registerPushSubscription } from '../lib/pushNotifications'
import AppDownloadPanel from '../components/AppDownloadPanel'

const SettingsPage = () => {
  const { user, updatePreferences, updateNotificationPreferences, updateUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: user?.phone ?? '', position: user?.position ?? 'Риелтор' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported')
  const [notificationMessage, setNotificationMessage] = useState('')

  if (!user) return null

  const savePreference = async <K extends keyof typeof user.preferences>(key: K, value: typeof user.preferences[K]) => {
    const saved = await updatePreferences({ [key]: value })
    setSavedMessage(saved ? 'Настройки сохранены' : '')
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    await updateUser(profile)
    setSavingProfile(false)
    setSavedMessage('Профиль сохранён')
  }

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') {
      await updateNotificationPreferences({ enabled: true })
      try {
        await registerPushSubscription(user.id)
        setNotificationMessage('Push-уведомления на этом устройстве включены.')
      } catch (notificationError) {
        setNotificationMessage(notificationError instanceof Error ? notificationError.message : 'Не удалось создать push-подписку.')
      }
    }
  }

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) => (
    <button type="button" role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} className={`relative inline-flex h-8 w-14 shrink-0 rounded-full border-2 border-transparent transition ${value ? 'lumi-accent-bg' : 'lumi-control'}`}>
      <span className={`pointer-events-none inline-block h-7 w-7 rounded-full bg-white shadow transition ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  )

  const SelectSetting = <T extends string,>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) => (
    <div>
      <label className="lumi-muted-strong mb-2 block text-sm font-medium">{label}</label>
      <select value={value} onChange={event => onChange(event.target.value as T)} className="lumi-control w-full rounded-xl px-4 py-3 outline-none">
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  )

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lumi-text text-3xl font-bold">Настройки</h1>
          <p className="lumi-muted mt-2">Параметры сохраняются в вашем облачном профиле.</p>
        </div>
        <Settings className="lumi-muted h-8 w-8" />
      </div>

      {savedMessage && <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">{savedMessage}</div>}

      <AppDownloadPanel />

      <section className="lumi-panel rounded-2xl border p-6">
        <div className="mb-5 flex items-center gap-3">
          <Palette className="lumi-accent-text h-6 w-6" />
          <div><h2 className="lumi-text text-xl font-semibold">Оформление</h2><p className="lumi-muted text-sm">Тема применяется ко всем блокам и сохраняется отдельно на каждом устройстве.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {themeOptions.map(option => (
            <button key={option.id} type="button" onClick={() => { setTheme(option.id); setSavedMessage('Тема сохранена на этом устройстве') }} className={`rounded-2xl border p-4 text-left transition ${theme.id === option.id ? 'border-[var(--lumi-accent)] ring-2 ring-[rgb(var(--lumi-accent-rgb)/0.18)]' : 'lumi-border lumi-panel-muted'}`}>
              <div className="mb-3 flex gap-1.5">{option.swatches.map(color => <span key={color} className="h-5 flex-1 rounded-md" style={{ backgroundColor: color }} />)}</div>
              <p className="lumi-text font-semibold">{option.name}</p>
              <p className="lumi-muted mt-1 text-xs leading-5">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="lumi-panel rounded-2xl border p-6">
        <div className="mb-5 flex items-center gap-3"><LayoutPanelLeft className="lumi-accent-text h-6 w-6" /><div><h2 className="lumi-text text-xl font-semibold">Интерфейс</h2><p className="lumi-muted text-sm">Размер и расположение рабочих элементов.</p></div></div>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectSetting<IconSize> label="Размер значков" value={user.preferences.iconSize} options={[{ value: 'compact', label: 'Компактные' }, { value: 'comfortable', label: 'Обычные' }, { value: 'large', label: 'Крупные' }]} onChange={value => void savePreference('iconSize', value)} />
          <SelectSetting<InterfaceDensity> label="Плотность интерфейса" value={user.preferences.density} options={[{ value: 'compact', label: 'Компактная' }, { value: 'comfortable', label: 'Обычная' }, { value: 'spacious', label: 'Просторная' }]} onChange={value => void savePreference('density', value)} />
          <SelectSetting<NavigationPosition> label="Положение меню" value={user.preferences.navigationPosition} options={[{ value: 'left', label: 'Слева' }, { value: 'right', label: 'Справа' }]} onChange={value => void savePreference('navigationPosition', value)} />
        </div>
      </section>

      <section className="lumi-panel rounded-2xl border p-6">
        <div className="mb-5 flex items-center gap-3"><BellRing className="lumi-accent-text h-6 w-6" /><div><h2 className="lumi-text text-xl font-semibold">Уведомления</h2><p className="lumi-muted text-sm">Настройки применяются к вашему аккаунту; разрешение выдаётся отдельно на каждом устройстве.</p></div></div>
        <div className="space-y-1">
          {[
            { key: 'newRequests' as const, label: 'Новые заявки', icon: Bell },
            { key: 'taskReminders' as const, label: 'Напоминания о задачах', icon: Maximize2 },
            { key: 'callReminders' as const, label: 'Напоминания о звонках', icon: Bell },
            { key: 'meetingReminders' as const, label: 'Напоминания о встречах', icon: BellRing },
          ].map(item => {
            const Icon = item.icon
            return <div key={item.key} className="lumi-border flex items-center justify-between border-b py-4 last:border-0"><div className="flex items-center gap-3"><div className="lumi-control rounded-xl p-3"><Icon className="h-5 w-5" /></div><span className="lumi-text font-medium">{item.label}</span></div><Toggle label={item.label} value={user.notificationPreferences[item.key]} onChange={value => void updateNotificationPreferences({ [item.key]: value })} /></div>
          })}
        </div>
        <p className="lumi-muted mt-4 text-sm">Для задач, звонков и встреч со временем LumiCRM напоминает за день, за час, за 5 минут и точно в назначенный момент.</p>
        <div className="lumi-panel-muted mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3"><Smartphone className="lumi-accent-text mt-0.5 h-5 w-5" /><div><p className="lumi-text font-medium">Разрешение на этом устройстве</p><p className="lumi-muted mt-1 text-sm">{permission === 'granted' ? 'Разрешено' : permission === 'denied' ? 'Заблокировано в браузере' : permission === 'unsupported' ? 'Не поддерживается' : 'Ещё не запрошено'}</p></div></div>
          {permission === 'default' && <button type="button" onClick={() => void requestNotifications()} className="lumi-gradient-button rounded-xl px-4 py-2.5 text-sm font-semibold">Включить</button>}
        </div>
        {notificationMessage && <p className="lumi-muted mt-3 text-sm">{notificationMessage}</p>}
      </section>

      <section className="lumi-panel rounded-2xl border p-6">
        <h2 className="lumi-text text-xl font-semibold">Профиль</h2>
        <p className="lumi-muted mt-1 text-sm">Эти данные отображаются в вашем офисе.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {([{ key: 'firstName', label: 'Имя' }, { key: 'lastName', label: 'Фамилия' }, { key: 'phone', label: 'Телефон' }, { key: 'position', label: 'Должность' }] as const).map(field => <div key={field.key}><label className="lumi-muted-strong mb-2 block text-sm font-medium">{field.label}</label><input value={profile[field.key]} onChange={event => setProfile(current => ({ ...current, [field.key]: event.target.value }))} className="lumi-control w-full rounded-xl px-4 py-3 outline-none" /></div>)}
        </div>
        <button type="button" disabled={savingProfile} onClick={() => void saveProfile()} className="lumi-gradient-button mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold disabled:opacity-60"><Save className="h-4 w-4" />{savingProfile ? 'Сохраняем…' : 'Сохранить профиль'}</button>
      </section>
    </div>
  )
}

export default SettingsPage
