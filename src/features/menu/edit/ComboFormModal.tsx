import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react'
import { useEffect, useState } from 'react'
import type { MenuCombo } from '../../../types/menu'
import { formatPriceCop, parsePriceCop } from '../../../types/menu'

export interface ComboFormValues {
  title: string
  description: string
  priceCop: number
  active: boolean
}

interface ComboFormModalProps {
  isOpen: boolean
  combo: MenuCombo | null
  isNew: boolean
  onClose: () => void
  onSave: (values: ComboFormValues) => Promise<void>
}

export function ComboFormModal({
  isOpen,
  combo,
  isNew,
  onClose,
  onSave,
}: ComboFormModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceText, setPriceText] = useState('')
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle(combo?.title ?? '')
    setDescription(combo?.description ?? '')
    setPriceText(combo ? formatPriceCop(combo.priceCop) : '')
    setActive(combo?.active ?? true)
    setError(null)
  }, [isOpen, combo])

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('El nombre del combo es obligatorio.')
      return
    }
    const priceCop = parsePriceCop(priceText)
    if (priceCop <= 0) {
      setError('Ingresa un precio válido.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        priceCop,
        active,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{isNew ? 'Nuevo combo' : 'Editar combo'}</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            Cerrar
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem className="rounded-xl mb-2">
          <IonLabel position="stacked">Nombre</IonLabel>
          <IonInput value={title} onIonInput={(e) => setTitle(e.detail.value ?? '')} />
        </IonItem>
        <IonItem className="rounded-xl mb-2">
          <IonLabel position="stacked">Descripción</IonLabel>
          <IonTextarea
            value={description}
            rows={4}
            onIonInput={(e) => setDescription(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem className="rounded-xl mb-2">
          <IonLabel position="stacked">Precio (COP)</IonLabel>
          <IonInput
            type="text"
            inputMode="numeric"
            placeholder="14000"
            value={priceText}
            onIonInput={(e) => setPriceText(e.detail.value ?? '')}
          />
        </IonItem>
        <IonItem className="rounded-xl mb-4">
          <IonLabel>Visible en la carta</IonLabel>
          <IonToggle checked={active} onIonChange={(e) => setActive(e.detail.checked)} />
        </IonItem>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <IonButton expand="block" disabled={saving} onClick={() => void handleSubmit()}>
          {saving ? 'Guardando…' : 'Guardar combo'}
        </IonButton>
      </IonContent>
    </IonModal>
  )
}
