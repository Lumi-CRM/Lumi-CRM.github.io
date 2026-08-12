import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'
import WelcomeModal from './components/WelcomeModal'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'))
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'))
const OwnersPage = lazy(() => import('./pages/OwnersPage'))
const BuyersPage = lazy(() => import('./pages/BuyersPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const DealsPage = lazy(() => import('./pages/DealsPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const GalleryPage = lazy(() => import('./pages/GalleryPage'))
const ArchivePage = lazy(() => import('./pages/ArchivePage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const CallsPage = lazy(() => import('./pages/CallsPage'))
const MonthlyPlanPage = lazy(() => import('./pages/MonthlyPlanPage'))
const PublicPropertyPage = lazy(() => import('./pages/PublicPropertyPage'))

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
    </ErrorBoundary>
  )
}

export default App
