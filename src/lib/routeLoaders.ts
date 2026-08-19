export const routeLoaders = {
  login: () => import('../pages/LoginPage'),
  authCallback: () => import('../pages/AuthCallbackPage'),
  setPassword: () => import('../pages/SetPasswordPage'),
  dashboard: () => import('../pages/Dashboard'),
  properties: () => import('../pages/PropertiesPage'),
  propertyDetail: () => import('../pages/PropertyDetailPage'),
  owners: () => import('../pages/OwnersPage'),
  buyers: () => import('../pages/BuyersPage'),
  calendar: () => import('../pages/CalendarPage'),
  calls: () => import('../pages/CallsPage'),
  plan: () => import('../pages/MonthlyPlanPage'),
  tasks: () => import('../pages/TasksPage'),
  deals: () => import('../pages/DealsPage'),
  documents: () => import('../pages/DocumentsPage'),
  gallery: () => import('../pages/GalleryPage'),
  archive: () => import('../pages/ArchivePage'),
  trash: () => import('../pages/TrashPage'),
  favorites: () => import('../pages/FavoritesPage'),
  settings: () => import('../pages/SettingsPage'),
  publicProperty: () => import('../pages/PublicPropertyPage'),
} as const

const routeByPath: Record<string, () => Promise<unknown>> = {
  '/properties': routeLoaders.properties,
  '/owners': routeLoaders.owners,
  '/landlords': routeLoaders.owners,
  '/buyers': routeLoaders.buyers,
  '/tenants': routeLoaders.buyers,
  '/calendar': routeLoaders.calendar,
  '/calls': routeLoaders.calls,
  '/plan': routeLoaders.plan,
  '/tasks': routeLoaders.tasks,
  '/deals': routeLoaders.deals,
  '/documents': routeLoaders.documents,
  '/gallery': routeLoaders.gallery,
  '/archive': routeLoaders.archive,
  '/trash': routeLoaders.trash,
  '/favorites': routeLoaders.favorites,
  '/settings': routeLoaders.settings,
}

const warmedRoutes = new Set<string>()

export const preloadRoute = (path: string) => {
  if (warmedRoutes.has(path)) return
  const loader = routeByPath[path]
  if (!loader) return
  warmedRoutes.add(path)
  void loader().catch(() => warmedRoutes.delete(path))
}

export const preloadCoreRoutes = () => {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (connection?.saveData) return
  ;['/properties', '/owners', '/buyers', '/calendar', '/tasks', '/calls'].forEach(preloadRoute)
}
