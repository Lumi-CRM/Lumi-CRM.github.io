import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import WelcomeModal from './components/WelcomeModal'
import PortraitGuard from './components/PortraitGuard'
import { routeLoaders } from './lib/routeLoaders'

const LoginPage = lazy(routeLoaders.login)
const AuthCallbackPage = lazy(routeLoaders.authCallback)
const SetPasswordPage = lazy(routeLoaders.setPassword)
const Dashboard = lazy(routeLoaders.dashboard)
const PropertiesPage = lazy(routeLoaders.properties)
const PropertyDetailPage = lazy(routeLoaders.propertyDetail)
const OwnersPage = lazy(routeLoaders.owners)
const BuyersPage = lazy(routeLoaders.buyers)
const CalendarPage = lazy(routeLoaders.calendar)
const TasksPage = lazy(routeLoaders.tasks)
const DealsPage = lazy(routeLoaders.deals)
const DocumentsPage = lazy(routeLoaders.documents)
const GalleryPage = lazy(routeLoaders.gallery)
const ArchivePage = lazy(routeLoaders.archive)
const FavoritesPage = lazy(routeLoaders.favorites)
const SettingsPage = lazy(routeLoaders.settings)
const CallsPage = lazy(routeLoaders.calls)
const MonthlyPlanPage = lazy(routeLoaders.plan)
const PublicPropertyPage = lazy(routeLoaders.publicProperty)

const LoadingScreen = () => (
  <div className="lumi-shell lumi-muted flex min-h-screen items-center justify-center">
    Загружаем LumiCRM…
  </div>
)

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <PortraitGuard>
        <Router>
          <ThemeProvider>
            <AuthProvider>
              <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/set-password" element={<SetPasswordPage />} />
              <Route path="/p/:slug" element={<PublicPropertyPage />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <WelcomeModal />
                  <Dashboard>
                    <Routes>
                      <Route path="/" element={null} />
                      <Route path="/properties" element={<PropertiesPage />} />
                      <Route path="/properties/:id" element={<PropertyDetailPage />} />
                      <Route path="/owners" element={<OwnersPage />} />
                      <Route path="/landlords" element={<OwnersPage mode="rent" />} />
                      <Route path="/buyers" element={<BuyersPage />} />
                      <Route path="/tenants" element={<BuyersPage mode="rent" />} />
                      <Route path="/calendar" element={<CalendarPage />} />
                      <Route path="/calls" element={<CallsPage />} />
                      <Route path="/plan" element={<MonthlyPlanPage />} />
                      <Route path="/tasks" element={<TasksPage />} />
                      <Route path="/deals" element={<DealsPage />} />
                      <Route path="/documents" element={<DocumentsPage />} />
                      <Route path="/gallery" element={<GalleryPage />} />
                      <Route path="/archive" element={<ArchivePage />} />
                      <Route path="/favorites" element={<FavoritesPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Dashboard>
                </ProtectedRoute>
              } />
            </Routes>
              </Suspense>
            </AuthProvider>
          </ThemeProvider>
        </Router>
      </PortraitGuard>
    </ErrorBoundary>
  )
}

export default App
