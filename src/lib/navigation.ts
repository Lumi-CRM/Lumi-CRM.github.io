export type NavigationItem = {
  id: string
  label: string
  aliases?: string[]
}

export type NavigationGroup = {
  id: string
  label: string
  items: NavigationItem[]
}

export const desktopNavigationGroups: NavigationGroup[] = [
  {
    id: 'work',
    label: 'Работа',
    items: [
      { id: '/', label: 'Главная' },
      { id: '/work', label: 'Дела', aliases: ['/calendar', '/calls', '/plan', '/tasks'] },
      { id: '/deals', label: 'Сделки' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    items: [
      { id: '/contacts', label: 'Контакты', aliases: ['/owners', '/landlords', '/buyers', '/tenants'] },
      { id: '/properties', label: 'Объекты' },
    ],
  },
  {
    id: 'library',
    label: 'Материалы',
    items: [
      { id: '/documents', label: 'Документы' },
      { id: '/gallery', label: 'Галерея' },
      { id: '/favorites', label: 'Избранное' },
      { id: '/archive', label: 'Архив' },
      { id: '/trash', label: 'Корзина' },
    ],
  },
  {
    id: 'system',
    label: 'Система',
    items: [{ id: '/settings', label: 'Настройки' }],
  },
]

export const isNavigationItemActive = (pathname: string, item: NavigationItem) => {
  const paths = [item.id, ...(item.aliases ?? [])]
  return paths.some(path => path === '/'
    ? pathname === '/'
    : pathname === path || pathname.startsWith(`${path}/`))
}
