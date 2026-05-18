import { IonApp } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import { AppRoutes } from './routes/AppRoutes'

function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </IonReactRouter>
    </IonApp>
  )
}

export default App
