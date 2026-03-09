import { IonApp } from '@ionic/react'
import { useState } from 'react'
import Home from './features/menu/MenuPage'
import { CartProvider } from './context/CartContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './features/auth/LoginPage'
import ProfileSetupPage from './features/auth/ProfileSetupPage'
import AdminPage from './features/admin/AdminPage'
import MyOrdersPage from './features/menu/MyOrdersPage'

/** Considera que el perfil tiene datos de entrega si existen teléfono, barrio y dirección (tras trim). */
function hasDeliveryData(profile: { phone?: string; barrio?: string; address?: string } | null): boolean {
  if (!profile) return false
  const phone = (profile.phone ?? '').trim()
  const barrio = (profile.barrio ?? '').trim()
  const address = (profile.address ?? '').trim()
  return phone.length > 0 && barrio.length > 0 && address.length > 0
}

function AppContent() {
  const { user, loading, profile, profileLoading } = useAuth()
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showMyOrders, setShowMyOrders] = useState(false)

  if (loading || profileLoading) {
    return null
  }

  if (!user) {
    return <LoginPage />
  }

  if (!hasDeliveryData(profile)) {
    return <ProfileSetupPage />
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
