/**
 * Modal para editar el texto común que aparece bajo el título de cada categoría de la carta.
 */

import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useState } from 'react'
import { DEFAULT_MENU_SECTION_SUBTITLE } from '../../../services/appConfig'

interface MenuTextFormModalProps {
  isOpen: boolean
  currentText: string
  onClose: () => void
  onSave: (text: string) => Promise<void>
}

export function MenuTextFormModal({ isOpen, currentText, onClose, onSave }: MenuTextFormModalProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(text)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <IonModal
      isOpen={isOpen}
      onWillPresent={() => {
        setText(currentText)
        setError(null)
      }}
      onDidDismiss={onClose}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Texto de la carta</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            Cerrar
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p className="text-sm text-gray-600 mb-3">
          Se muestra debajo del nombre de todas las categorías, en la web y en la app.
        </p>
        <IonItem className="rounded-xl mb-2">
          <IonLabel position="stacked">Descripción</IonLabel>
          <IonTextarea
            value={text}
            autoGrow
            rows={4}
            maxlength={300}
            counter
            onIonInput={(e) => setText(e.detail.value ?? '')}
          />
        </IonItem>
        <IonButton
          fill="clear"
          size="small"
          className="mb-3"
          onClick={() => setText(DEFAULT_MENU_SECTION_SUBTITLE)}
        >
          Restaurar texto original
        </IonButton>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <IonButton expand="block" disabled={saving} onClick={() => void handleSubmit()}>
          {saving ? 'Guardando…' : 'Guardar texto'}
        </IonButton>
      </IonContent>
    </IonModal>
  )
}
