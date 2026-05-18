import { IonApp } from '@ionic/react'
import { useState } from 'react'
import {
  BrowserRouter,
  Redirect,
  Route,
  Switch,
  useLocation,
} from 'react-router-dom'
import MenuPage from './features/menu/MenuPage'
import { CartProvider } from './context/CartContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './features/auth/LoginPage'
import AdminPage from './features/admin/AdminPage'
import MyOrdersPage from './features/menu/MyOrdersPage'
import NotificationsPage from './features/notifications/NotificationsPage'
import PrivacyPolicyPage from './features/legal/PrivacyPolicyPage'
import TermsPage from './features/legal/TermsPage'
import ContactPage from './features/legal/ContactPage'
import AboutPage from './features/legal/AboutPage'
import logo from './assets/Logo.png'

type NotifSource = 'menu' | 'admin' | null

function LoadingScreen() {
  return (
    <div className="krocam-loading-screen flex min-h-screen items-center justify-center bg-(--krocam-black)">
      <div className="flex flex-col items-center gap-4">
        <img src={logo} alt="KROCAM" className="w-20 h-20 object-contain" />
        <div className="krocam-font-title text-xl font-bold text-(--krocam-yellow)">
          KROCAM
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--krocam-yellow) border-t-transparent" />
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    </div>
  )
}

function LoginRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const rawRedirect = params.get('redirect')
  const redirectTo =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/'

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Redirect to={redirectTo} />
  }

  return <LoginPage />
}

function MainShell() {
  const { user, loading, profile, profileLoading } = useAuth()
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showMyOrders, setShowMyOrders] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifSource, setNotifSource] = useState<NotifSource>(null)

  if (loading || (user != null && profileLoading)) {
    return <LoadingScreen />
  }

  if (showNotifications && user) {
    return (
      <NotificationsPage
        onClose={() => {
          setShowNotifications(false)
          if (notifSource === 'admin') {
            setShowAdminPanel(true)
          }
          setNotifSource(null)
        }}
      />
    )
  }

  if (user && showAdminPanel && profile?.role === 'admin') {
    return (
      <AdminPage
        onClose={() => setShowAdminPanel(false)}
        onOpenNotifications={() => {
          setNotifSource('admin')
          setShowAdminPanel(false)
          setShowNotifications(true)
        }}
      />
    )
  }

  if (user && showMyOrders) {
    return <MyOrdersPage onClose={() => setShowMyOrders(false)} />
  }

  return (
    <MenuPage
      onOpenAdmin={
        user && profile?.role === 'admin' ? () => setShowAdminPanel(true) : undefined
      }
      onOpenMyOrders={user ? () => setShowMyOrders(true) : undefined}
      onOpenNotifications={
        user
          ? () => {
              setNotifSource('menu')
              setShowNotifications(true)
            }
          : undefined
      }
    />
  )
}

function AppRoutes() {
  return (
    <Switch>
      <Route exact path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route exact path="/terms" component={TermsPage} />
      <Route exact path="/contact" component={ContactPage} />
      <Route exact path="/about" component={AboutPage} />
      <Route exact path="/login" component={LoginRoute} />
      <Route exact path="/" component={MainShell} />
      <Redirect to="/" />
    </Switch>
  )
}

function App() {
  return (
    <IonApp>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </IonApp>
  )
}

export default App
