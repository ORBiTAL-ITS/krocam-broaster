import { IonIcon, IonLabel, IonTabBar, IonTabButton } from '@ionic/react'
import { Capacitor } from '@capacitor/core'
import {
  createOutline,
  listOutline,
  personOutline,
  restaurantOutline,
  settingsOutline,
} from 'ionicons/icons'
import { useAuth } from '../../context/AuthContext'
import { usePermissions } from '../../hooks/usePermissions'
import { ROUTES } from '../../routes/paths'

/**
 * Tabs inferiores. Cada IonTabButton debe ser hijo directo de IonTabBar
 * (los Fragment <> rompen Ionic y solo se ve el primer botón).
 *
 * Orden: Carta (izq) · …centro… · Mi cuenta (der, todos).
 * Cerrar sesión vive en Mi cuenta.
 */
export function AppBottomTabBar() {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, canAccessOrdersAdmin } = usePermissions()
  const isNative = Capacitor.isNativePlatform()
  const className = isNative
    ? 'krocam-bottom-tabs'
    : 'krocam-bottom-tabs krocam-bottom-tabs-web'

  if (authLoading) {
    return null
  }

  const accountHref = user ? ROUTES.ACCOUNT : ROUTES.LOGIN

  return (
    <IonTabBar slot="bottom" className={className}>
      <IonTabButton tab="carta" href={ROUTES.HOME}>
        <IonIcon icon={restaurantOutline} />
        <IonLabel>Carta</IonLabel>
      </IonTabButton>
      {user && (
        <IonTabButton tab="orders" href={ROUTES.ORDERS}>
          <IonIcon icon={listOutline} />
          <IonLabel>Mis pedidos</IonLabel>
        </IonTabButton>
      )}
      {user && isAdmin && (
        <IonTabButton tab="menu-edit" href={ROUTES.MENU_EDIT}>
          <IonIcon icon={createOutline} />
          <IonLabel>Editar</IonLabel>
        </IonTabButton>
      )}
      {user && canAccessOrdersAdmin && (
        <IonTabButton tab="admin" href={ROUTES.ADMIN_ORDERS}>
          <IonIcon icon={settingsOutline} />
          <IonLabel>Admin</IonLabel>
        </IonTabButton>
      )}
      <IonTabButton tab="account" href={accountHref}>
        <IonIcon icon={personOutline} />
        <IonLabel>Mi cuenta</IonLabel>
      </IonTabButton>
    </IonTabBar>
  )
}
