import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { isExistingEmailSignUp } from '../lib/authGuards'
import type { ThemeId } from './ThemeContext'

export type IconSize = 'compact' | 'comfortable' | 'large'
export type InterfaceDensity = 'compact' | 'comfortable' | 'spacious'
export type NavigationPosition = 'left' | 'right'

export interface UiPreferences {
  theme: ThemeId
  iconSize: IconSize
  density: InterfaceDensity
  navigationPosition: NavigationPosition
}

export interface NotificationPreferences {
  enabled: boolean
  newRequests: boolean
  taskReminders: boolean
  callReminders: boolean
  meetingReminders: boolean
  reminderMinutes: number
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  middleName?: string
  phone?: string
  position?: string
  onboardingCompleted: boolean
  preferences: UiPreferences
  notificationPreferences: NotificationPreferences
}

interface SignUpResult {
  success: boolean
  requiresEmailConfirmation: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<SignUpResult>
  resendConfirmation: (email: string) => Promise<boolean>
  updateUser: (data: Partial<User>) => Promise<void>
  updatePreferences: (data: Partial<UiPreferences>) => Promise<boolean>
  updateNotificationPreferences: (data: Partial<NotificationPreferences>) => Promise<boolean>
  completeOnboarding: () => Promise<boolean>
  logout: () => Promise<void>
  isAuthenticated: boolean
  error: string | null
  clearError: () => void
}

const defaultPreferences: UiPreferences = {
  theme: 'midnight',
  iconSize: 'comfortable',
  density: 'comfortable',
  navigationPosition: 'left',
}

const defaultNotificationPreferences: NotificationPreferences = {
  enabled: true,
  newRequests: true,
  taskReminders: true,
  callReminders: true,
  meetingReminders: true,
  reminderMinutes: 60,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const onboardingStorageKey = (userId: string) => `lumicrm-onboarding-completed:${userId}`

const hasLocalOnboardingCompletion = (userId: string) => {
  try {
    return window.localStorage.getItem(onboardingStorageKey(userId)) === 'true'
  } catch {
    return false
  }
}

const saveLocalOnboardingCompletion = (userId: string) => {
  try {
    window.localStorage.setItem(onboardingStorageKey(userId), 'true')
  } catch {
    // The cloud value remains authoritative when browser storage is unavailable.
  }
}

const normalizePreferences = (value: unknown): UiPreferences => {
  const source = value && typeof value === 'object' ? value as Partial<UiPreferences> : {}
  return { ...defaultPreferences, ...source }
}

const normalizeNotificationPreferences = (value: unknown): NotificationPreferences => {
  const source = value && typeof value === 'object' ? value as Partial<NotificationPreferences> : {}
  return { ...defaultNotificationPreferences, ...source }
}

function mapSupabaseUser(source: SupabaseUser, profile?: Record<string, unknown> | null): User {
  const metadata = source.user_metadata ?? {}
  const firstName = String(profile?.first_name ?? metadata.first_name ?? '')
  const lastName = String(profile?.last_name ?? metadata.last_name ?? '')
  return {
    id: source.id,
    email: source.email || '',
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`.trim(),
    middleName: String(profile?.middle_name ?? metadata.middle_name ?? '') || undefined,
    phone: String(profile?.phone ?? metadata.phone ?? '') || undefined,
    position: String(profile?.position ?? metadata.position ?? 'Риелтор'),
    onboardingCompleted: Boolean(profile?.onboarding_completed),
    preferences: normalizePreferences(profile?.preferences),
    notificationPreferences: normalizeNotificationPreferences(profile?.notification_preferences),
  }
}

const authErrorMessage = (message?: string) => {
  const normalized = (message ?? '').toLowerCase()
  if (normalized.includes('already registered') || normalized.includes('already been registered')) {
    return 'Аккаунт с такой почтой уже существует.'
  }
  if (normalized.includes('password')) return 'Пароль не соответствует требованиям безопасности.'
  if (normalized.includes('rate limit')) return 'Слишком много попыток. Подождите немного и повторите.'
  return 'Не удалось выполнить запрос. Проверьте данные и подключение.'
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUser = async (source: SupabaseUser | null) => {
    if (!source) {
      setUser(null)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', source.id)
      .maybeSingle()

    if (profileError) console.error('Failed to load LumiCRM profile:', profileError)
    const mappedUser = mapSupabaseUser(source, profile as Record<string, unknown> | null)
    if (hasLocalOnboardingCompletion(source.id)) mappedUser.onboardingCompleted = true
    setUser(mappedUser)
  }

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!mounted) return
      if (sessionError) setError('Не удалось проверить сессию Supabase')
      await loadUser(data.session?.user ?? null)
      if (mounted) setIsLoading(false)
    }

    void loadSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      window.setTimeout(() => {
        if (!mounted) return
        void loadUser(session?.user ?? null).finally(() => {
          if (mounted) setIsLoading(false)
        })
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const root = document.documentElement
    root.dataset.density = user.preferences.density
    root.style.setProperty('--lumi-nav-icon-size', {
      compact: '1rem',
      comfortable: '1.25rem',
      large: '1.5rem',
    }[user.preferences.iconSize])
  }, [user])

  const login = async (email: string, password: string) => {
    setError(null)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        setError(loginError.message.toLowerCase().includes('email not confirmed')
          ? 'Сначала подтвердите почту по ссылке из письма.'
          : 'Неверный логин или пароль')
        return false
      }
      return true
    } catch (loginError) {
      console.error('Supabase login failed:', loginError)
      setError('Не удалось подключиться к Supabase')
      return false
    }
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string): Promise<SignUpResult> => {
    setError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { first_name: firstName, last_name: lastName, position: 'Риелтор' },
      },
    })

    if (signUpError) {
      setError(authErrorMessage(signUpError.message))
      return { success: false, requiresEmailConfirmation: false }
    }

    // Supabase intentionally returns a successful-looking response for an
    // already registered email. An empty identities array is the supported
    // signal that no new account (and therefore no confirmation email) was made.
    if (isExistingEmailSignUp(data.user)) {
      setError('Аккаунт с такой почтой уже существует. Войдите или восстановите пароль.')
      return { success: false, requiresEmailConfirmation: false }
    }

    return { success: true, requiresEmailConfirmation: !data.session }
  }

  const resendConfirmation = async (email: string) => {
    setError(null)
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (resendError) {
      setError(authErrorMessage(resendError.message))
      return false
    }
    return true
  }

  const updateUser = async (data: Partial<User>) => {
    if (!user) return
    const metadata: Record<string, unknown> = {}
    const profileData: Record<string, unknown> = {}
    if (data.firstName !== undefined) metadata.first_name = profileData.first_name = data.firstName
    if (data.lastName !== undefined) metadata.last_name = profileData.last_name = data.lastName
    if (data.middleName !== undefined) metadata.middle_name = profileData.middle_name = data.middleName
    if (data.phone !== undefined) metadata.phone = profileData.phone = data.phone
    if (data.position !== undefined) metadata.position = profileData.position = data.position

    const [{ error: authUpdateError }, { error: profileUpdateError }] = await Promise.all([
      supabase.auth.updateUser({ data: metadata }),
      supabase.from('profiles').update(profileData).eq('id', user.id),
    ])
    if (authUpdateError || profileUpdateError) {
      setError('Не удалось обновить данные пользователя')
      return
    }

    setUser(previous => previous ? {
      ...previous,
      ...data,
      displayName: `${data.firstName ?? previous.firstName} ${data.lastName ?? previous.lastName}`.trim(),
    } : null)
  }

  const updatePreferences = async (data: Partial<UiPreferences>) => {
    if (!user) return false
    const preferences = { ...user.preferences, ...data }
    const { error: updateError } = await supabase.from('profiles').update({ preferences }).eq('id', user.id)
    if (updateError) {
      console.error('Failed to update preferences:', updateError)
      setError('Не удалось сохранить настройки интерфейса')
      return false
    }
    setUser(previous => previous ? { ...previous, preferences } : null)
    return true
  }

  const updateNotificationPreferences = async (data: Partial<NotificationPreferences>) => {
    if (!user) return false
    const notificationPreferences = { ...user.notificationPreferences, ...data }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ notification_preferences: notificationPreferences })
      .eq('id', user.id)
    if (updateError) {
      console.error('Failed to update notification preferences:', updateError)
      setError('Не удалось сохранить настройки уведомлений')
      return false
    }
    setUser(previous => previous ? { ...previous, notificationPreferences } : null)
    return true
  }

  const completeOnboarding = async () => {
    if (!user) return false
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)
    if (updateError) {
      console.error('Failed to complete onboarding:', updateError)
      // Onboarding must never lock a user out of the CRM. Keep a local marker
      // and retry the cloud state naturally on the next successful completion.
      saveLocalOnboardingCompletion(user.id)
      setUser(previous => previous ? { ...previous, onboardingCompleted: true } : null)
      return true
    }
    saveLocalOnboardingCompletion(user.id)
    setUser(previous => previous ? { ...previous, onboardingCompleted: true } : null)
    return true
  }

  const logout = async () => {
    const { error: logoutError } = await supabase.auth.signOut()
    if (logoutError) setError('Не удалось завершить сессию')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
        Подключаем облачный офис…
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signUp,
      resendConfirmation,
      updateUser,
      updatePreferences,
      updateNotificationPreferences,
      completeOnboarding,
      logout,
      isAuthenticated: Boolean(user),
      error,
      clearError: () => setError(null),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
