import { IonButton, IonButtons } from '@ionic/react'
import { useHistory } from 'react-router-dom'
import { ROUTES } from '../../routes/paths'

interface AdminPageBackButtonProps {
  href?: string
}

/**
 * Botón volver para pantallas admin fuera de tabs.
 * Área táctil amplia (44px+) para iOS; usa replace para navegación fiable.
 */
export function AdminPageBackButton({ href = ROUTES.ADMIN_ORDERS }: AdminPageBackButtonProps) {
  const history = useHistory()

  return (
    <IonButtons slot="start" className="admin-page-back-buttons">
      <IonButton
        fill="clear"
        color="light"
        className="admin-page-back-btn"
        onClick={() => history.replace(href)}
      >
        Volver
      </IonButton>
    </IonButtons>
  )
}
