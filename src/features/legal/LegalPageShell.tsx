import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { arrowBackOutline } from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import type { ReactNode } from 'react'

export function LegalPageShell({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const history = useHistory()
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="krocam-toolbar">
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()} aria-label="Volver">
              <IonIcon slot="start" icon={arrowBackOutline} />
              Volver
            </IonButton>
          </IonButtons>
          <IonTitle className="krocam-font-title text-lg">{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding carta-content">
        <div className="max-w-2xl mx-auto space-y-4 text-gray-800 pb-8">{children}</div>
      </IonContent>
    </IonPage>
  )
}
