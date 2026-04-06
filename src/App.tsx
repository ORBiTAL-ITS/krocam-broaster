import { IonApp } from '@ionic/react'
import { useState } from 'react'
import Home from './features/menu/MenuPage'
import { CartProvider } from './context/CartContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './features/auth/LoginPage'
import AdminPage from './features/admin/AdminPage'
import MyOrdersPage from './features/menu/MyOrdersPage'
import NotificationsPage from './features/notifications/NotificationsPage'
import logo from './assets/Logo.png'

type NotifSource = 'menu' | 'admin' | null

function AppContent() {
  const { user, loading, profile, profileLoading } = useAuth()
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showMyOrders, setShowMyOrders] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifSource, setNotifSource] = useState<NotifSource>(null)

  if (loading || profileLoading) {
    return (
      <div className="krocam-loading-screen flex min-h-screen items-center justify-center bg-(--krocam-black)">
        <div className="flex flex-col items-center gap-4">
          <img
            src={logo}
            alt="KROCAM"
            className="w-20 h-20 object-contain"
          />
          <div className="krocam-font-title text-xl font-bold text-(--krocam-yellow)">
            KROCAM
          </div>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--krocam-yellow) border-t-transparent" />
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (showNotifications) {
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

  if (showAdminPanel && profile?.role === 'admin') {
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

  if (showMyOrders) {
    return (
      <MyOrdersPage onClose={() => setShowMyOrders(false)} />
    )
  }

  return (
    <Home
      onOpenAdmin={profile?.role === 'admin' ? () => setShowAdminPanel(true) : undefined}
      onOpenMyOrders={() => setShowMyOrders(true)}
      onOpenNotifications={() => {
        setNotifSource('menu')
        setShowNotifications(true)
      }}
    />
  )
}

function App() {
  return (
    <IonApp>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </IonApp>
  )
}

export default App
