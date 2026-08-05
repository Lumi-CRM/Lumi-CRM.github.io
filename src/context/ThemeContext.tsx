import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeId = 'lumi-light' | 'midnight' | 'aurora' | 'graphite' | 'warm-sand'

export interface ThemeOption {
  id: ThemeId
  name: string
  description: string
  dark: boolean
  swatches: [string, string, string]
}

export const themeOptions: ThemeOption[] = [
  {
    id: 'lumi-light',
    name: 'Lumi Light',
    description: 'Чистая светлая тема для работы днём',
    dark: false,
    swatches: ['#f7f9fc', '#2563eb', '#8b5cf6'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Глубокий синий офис и яркие графики',
    dark: true,
    swatches: ['#070b14', '#3b82f6', '#8b5cf6'],
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Бирюзово-фиолетовое северное сияние',
    dark: true,
    swatches: ['#071311', '#14b8a6', '#a855f7'],
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Строгая нейтральная тема без лишнего цвета',
    dark: true,
    swatches: ['#101113', '#d4d4d8', '#71717a'],
  },
  {
    id: 'warm-sand',
    name: 'Warm Sand',
    description: 'Тёплый премиальный офис с винным акцентом',
    dark: false,
    swatches: ['#f6f0e7', '#9f3f5f', '#c47b4c'],
  },
]

interface ThemeContextValue {
  theme: ThemeOption
  setTheme: (theme: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const storageKey = 'lumicrm-theme'

const getInitialTheme = (): ThemeId => {
  const stored = localStorage.getItem(storageKey) as ThemeId | null
  return themeOptions.some(theme => theme.id === stored) ? stored! : 'midnight'
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeId] = useState<ThemeId>(getInitialTheme)
  const theme = useMemo(
    () => themeOptions.find(option => option.id === themeId) ?? themeOptions[1],
    [themeId],
  )

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme.id
    root.classList.toggle('dark', theme.dark)
    root.style.colorScheme = theme.dark ? 'dark' : 'light'
    localStorage.setItem(storageKey, theme.id)
  }, [theme])

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme: setThemeId }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
