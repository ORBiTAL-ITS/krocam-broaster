import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonModal,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useEffect, useMemo, useState } from 'react'
import type { MenuCategory } from '../../types/menu'
import { formatPriceCop } from '../../types/menu'
import type { ReviewTargetType } from '../../types/review'
import { StarRating } from './StarRating'

export interface LeaveReviewModalProps {
  isOpen: boolean
  onClose: () => void
  /** Todas las categorías del menú (para elegir categoría/combo). */
  sections: MenuCategory[]
  /** Categoría visible en la carta al abrir el modal (preselección). */
  defaultCategoryId?: string | null
  onSubmit: (data: {
    targetType: ReviewTargetType
    categoryId: string | null
    comboId: string | null
    rating: number
    text: string
  }) => Promise<void>
}

function activeCategories(sections: MenuCategory[]): MenuCategory[] {
  return sections.filter((s) => s.active)
}

export function LeaveReviewModal({
  isOpen,
  onClose,
  sections,
  defaultCategoryId,
  onSubmit,
}: LeaveReviewModalProps) {
  const categories = useMemo(() => activeCategories(sections), [sections])

  const [targetType, setTargetType] = useState<ReviewTargetType>('business')
  const [categoryId, setCategoryId] = useState('')
  const [comboId, setComboId] = useState('')
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  )

  const activeCombos = useMemo(
    () => selectedCategory?.combos.filter((c) => c.active) ?? [],
    [selectedCategory],
  )

  const selectedCombo = useMemo(
    () => activeCombos.find((c) => c.id === comboId) ?? null,
    [activeCombos, comboId],
  )

  useEffect(() => {
    if (!isOpen) return
    const initialCat =
      (defaultCategoryId && categories.some((c) => c.id === defaultCategoryId)
        ? defaultCategoryId
        : categories[0]?.id) ?? ''
    const cat = categories.find((c) => c.id === initialCat)
    const firstCombo = cat?.combos.find((c) => c.active)?.id ?? ''

    setTargetType('business')
    setCategoryId(initialCat)
    setComboId(firstCombo)
    setRating(5)
    setText('')
    setError(null)
  }, [isOpen, defaultCategoryId, categories])

  useEffect(() => {
    if (!selectedCategory) return
    if (!activeCombos.some((c) => c.id === comboId)) {
      setComboId(activeCombos[0]?.id ?? '')
    }
  }, [selectedCategory, activeCombos, comboId])

  const handleSubmit = async () => {
    if (targetType === 'category' && !categoryId) {
      setError('Elige una categoría.')
      return
    }
    if (targetType === 'combo') {
      if (!categoryId) {
        setError('Elige una categoría.')
        return
      }
      if (!comboId) {
        setError('Elige un combo.')
        return
      }
    }
    if (text.trim().length < 10) {
      setError('El comentario debe tener al menos 10 caracteres.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        targetType,
        categoryId: targetType === 'business' ? null : categoryId,
        comboId: targetType === 'combo' ? comboId : null,
        rating,
        text: text.trim(),
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la reseña.')
    } finally {
      setSaving(false)
    }
  }

  const categoryPicker = (label: string) =>
    categories.length === 0 ? (
      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
        No hay categorías disponibles en el menú.
      </p>
    ) : (
      <div className="mt-3">
        <p className="text-sm font-medium text-gray-800 mb-2">{label}</p>
        <IonItem className="rounded-xl border border-gray-200">
          <IonLabel position="stacked">Categoría</IonLabel>
          <IonSelect
            value={categoryId}
            interface="action-sheet"
            placeholder="Selecciona una categoría"
            onIonChange={(e) => setCategoryId(String(e.detail.value))}
          >
            {categories.map((cat) => (
              <IonSelectOption key={cat.id} value={cat.id}>
                {cat.title}
              </IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>
      </div>
    )

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Deja tu reseña</IonTitle>
          <IonButton slot="end" fill="clear" onClick={onClose}>
            Cerrar
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p className="text-sm text-gray-600 mb-4">
          Tu reseña se publicará cuando el equipo la apruebe.
        </p>

        <IonRadioGroup
          value={targetType}
          onIonChange={(e) => setTargetType(e.detail.value as ReviewTargetType)}
        >
          <IonItem lines="full">
            <IonRadio value="business" labelPlacement="end" justify="start">
              Sobre KROCAM (en general)
            </IonRadio>
          </IonItem>
          {categories.length > 0 && (
            <IonItem lines="full">
              <IonRadio value="category" labelPlacement="end" justify="start">
                Sobre una categoría del menú
              </IonRadio>
            </IonItem>
          )}
          {categories.some((c) => c.combos.some((combo) => combo.active)) && (
            <IonItem lines="full">
              <IonRadio value="combo" labelPlacement="end" justify="start">
                Sobre un combo específico
              </IonRadio>
            </IonItem>
          )}
        </IonRadioGroup>

        {targetType === 'category' && categoryPicker('¿Qué categoría quieres reseñar?')}

        {targetType === 'combo' && (
          <>
            {categoryPicker('Primero elige la categoría')}
            {selectedCategory && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-800 mb-2">
                  Elige el combo ({selectedCategory.title})
                </p>
                {activeCombos.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay combos activos en esta categoría.</p>
                ) : (
                  <IonRadioGroup
                    value={comboId}
                    onIonChange={(e) => setComboId(String(e.detail.value))}
                    className="space-y-2"
                  >
                    {activeCombos.map((combo) => (
                      <label
                        key={combo.id}
                        className={`block rounded-xl border p-3 cursor-pointer transition-colors ${
                          comboId === combo.id
                            ? 'border-(--krocam-yellow) bg-amber-50/80'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <IonItem lines="none" className="--padding-start:0 --inner-padding-end:0">
                          <IonRadio slot="start" value={combo.id} />
                          <div className="min-w-0 flex-1 pl-1">
                            <p className="font-semibold text-gray-900 text-sm">{combo.title}</p>
                            {combo.description ? (
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-4">
                                {combo.description}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400 mt-1 italic">Sin descripción</p>
                            )}
                            <p className="text-xs font-semibold text-(--krocam-red) mt-2">
                              ${formatPriceCop(combo.priceCop)}
                            </p>
                          </div>
                        </IonItem>
                      </label>
                    ))}
                  </IonRadioGroup>
                )}
                {selectedCombo && (
                  <div className="mt-3 rounded-xl bg-gray-50 border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                      Reseñarás
                    </p>
                    <p className="font-semibold text-gray-900">{selectedCombo.title}</p>
                    {selectedCombo.description && (
                      <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                        {selectedCombo.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-4 mb-2">
          <p className="text-sm font-medium text-gray-800 mb-2">Calificación</p>
          <StarRating value={rating} interactive onChange={setRating} />
        </div>

        <IonItem className="rounded-xl mb-4">
          <IonLabel position="stacked">Comentario</IonLabel>
          <IonTextarea
            rows={4}
            maxlength={500}
            value={text}
            placeholder="Cuéntanos tu experiencia (mín. 10 caracteres)"
            onIonInput={(e) => setText(e.detail.value ?? '')}
          />
        </IonItem>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <IonButton expand="block" disabled={saving} onClick={() => void handleSubmit()}>
          {saving ? 'Enviando…' : 'Enviar reseña'}
        </IonButton>
      </IonContent>
    </IonModal>
  )
}
