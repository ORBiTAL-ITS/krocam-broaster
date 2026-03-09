import { IonApp } from '@ionic/react'
import { useState } from 'react'
import Home from './features/menu/MenuPage'
import { CartProvider } from './context/CartContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './features/auth/LoginPage'
import AdminPage from './features/admin/AdminPage'
import MyOrdersPage from './features/menu/MyOrdersPage'

function AppContent() {
  const { user, loading, profile, profileLoading } = useAuth()
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showMyOrders, setShowMyOrders] = useState(false)

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--krocam-black)">
        <div className="flex flex-col items-center gap-4">
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

  if (showAdminPanel && profile?.role === 'admin') {
    return (
      <AdminPage onClose={() => setShowAdminPanel(false)} />
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
