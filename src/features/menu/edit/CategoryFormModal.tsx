import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react'
import { useEffect, useState } from 'react'
import type { MenuCategory } from '../../../types/menu'

export interface CategoryFormValues {
  title: string
  heroImageAlt: string
  heroImageBase64: string | null
  active: boolean
}

interface CategoryFormModalProps {
  isOpen: boolean
  category: MenuCategory | null
  isNew: boolean
  onClose: () => void
  onSave: (values: CategoryFormValues) => Promise<void>
  onPickImage: (file: File) => Promise<string>
}

export function CategoryFormModal({
  isOpen,
  category,
  isNew,
  onClose,
  onSave,
  onPickImage,
}: CategoryFormModalProps) {
  const [title, setTitle] = useState('')
  const [heroImageAlt, setHeroImageAlt] = useState('')
  const [heroImageBase64, setHeroImageBase64] = useState<string | null>(null)
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle(category?.title ?? '')
    setHeroImageAlt(category?.heroImageAlt ?? category?.title ?? '')
    setHeroImageBase64(category?.heroImageBase64 ?? null)
    setActive(category?.active ?? true)
    setError(null)
  }, [isOpen, category])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setError(null)
      const b64 = await onPickImage(file)
      setHeroImageBase64(b64)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen')
    }
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('El nombre de la categoría es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        heroImageAlt: heroImageAlt.trim() || title.trim(),
        heroImageBase64,
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
          <IonTitle>{isNew ? 'Nueva categoría' : 'Editar categoría'}</IonTitle>
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
          <IonLabel position="stacked">Texto alternativo de imagen</IonLabel>
          <IonInput
            value={heroImageAlt}
            onIonInput={(e) => setHeroImageAlt(e.detail.value ?? '')}
          />
        </IonItem>
        <div className="mb-3">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Imagen de la categoría
          </label>
          <input type="file" accept="image/*" onChange={(e) => void handleImageChange(e)} />
          {heroImageBase64 && (
            <img
              src={heroImageBase64}
              alt=""
              className="mt-3 max-h-40 rounded-lg object-contain border"
            />
          )}
        </div>
        <IonItem className="rounded-xl mb-4">
          <IonLabel>Visible en la carta</IonLabel>
          <IonToggle checked={active} onIonChange={(e) => setActive(e.detail.checked)} />
        </IonItem>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <IonButton expand="block" disabled={saving} onClick={() => void handleSubmit()}>
          {saving ? 'Guardando…' : 'Guardar categoría'}
        </IonButton>
      </IonContent>
    </IonModal>
  )
}
