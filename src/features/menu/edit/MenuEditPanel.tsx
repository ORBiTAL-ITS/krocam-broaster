/**
 * Panel de edición del menú (solo /menu/editar): CRUD, imagen categoría, reordenar.
 */

import { IonButton, IonIcon } from '@ionic/react'
import { createOutline, reorderThreeOutline, trashOutline } from 'ionicons/icons'
import { useState } from 'react'
import {
  nextSortOrder,
  reorderCategories,
  reorderCombos,
  slugifyMenuId,
  upsertCategory,
  upsertCombo,
} from '../../../services/menuService'
import { fileToCompressedBase64 } from '../../../services/imageUtils'
import type { MenuCategory, MenuCombo } from '../../../types/menu'
import { formatPriceCop } from '../../../types/menu'
import { CategoryFormModal, type CategoryFormValues } from './CategoryFormModal'
import { ComboFormModal, type ComboFormValues } from './ComboFormModal'

interface MenuEditPanelProps {
  sections: MenuCategory[]
  seccionActual: number
  onChangeSeccion: (index: number) => void
  onToast: (message: string) => void
}

export function MenuEditPanel({
  sections,
  seccionActual,
  onChangeSeccion,
  onToast,
}: MenuEditPanelProps) {
  const current = sections[seccionActual]
  const [dragCatId, setDragCatId] = useState<string | null>(null)
  const [dragComboId, setDragComboId] = useState<string | null>(null)
  const [categoryModal, setCategoryModal] = useState<'new' | 'edit' | null>(null)
  const [comboModal, setComboModal] = useState<'new' | 'edit' | null>(null)
  const [editingCombo, setEditingCombo] = useState<MenuCombo | null>(null)
  const [busy, setBusy] = useState(false)

  const allCombosForCategory = current?.combos ?? []

  const handleCategoryDrop = async (targetId: string) => {
    if (!dragCatId || dragCatId === targetId) return
    const from = sections.findIndex((s) => s.id === dragCatId)
    const to = sections.findIndex((s) => s.id === targetId)
    if (from < 0 || to < 0) return
    const next = [...sections]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDragCatId(null)
    setBusy(true)
    try {
      await reorderCategories(next.map((s) => s.id))
      onToast('Orden de categorías actualizado.')
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'No se pudo reordenar.')
    } finally {
      setBusy(false)
    }
  }

  const handleComboDrop = async (targetId: string) => {
    if (!current || !dragComboId || dragComboId === targetId) return
    const list = [...allCombosForCategory]
    const from = list.findIndex((c) => c.id === dragComboId)
    const to = list.findIndex((c) => c.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    setDragComboId(null)
    setBusy(true)
    try {
      await reorderCombos(current.id, list.map((c) => c.id))
      onToast('Orden de combos actualizado.')
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'No se pudo reordenar combos.')
    } finally {
      setBusy(false)
    }
  }

  const saveCategory = async (values: CategoryFormValues, existingId?: string) => {
    let id = slugifyMenuId(values.title)
    if (!existingId && sections.some((s) => s.id === id)) {
      id = `${id}-${Date.now()}`
    }
    const finalId = existingId ?? id
    await upsertCategory(finalId, {
      title: values.title,
      heroImageAlt: values.heroImageAlt,
      heroImageBase64: values.heroImageBase64,
      active: values.active,
      sortOrder: existingId
        ? (sections.find((s) => s.id === existingId)?.sortOrder ?? nextSortOrder(sections))
        : nextSortOrder(sections),
    })
    onToast(existingId ? 'Categoría actualizada.' : 'Categoría creada.')
  }

  const saveCombo = async (values: ComboFormValues, comboId?: string) => {
    if (!current) return
    const id = comboId ?? slugifyMenuId(values.title) + `-${Date.now()}`
    await upsertCombo(current.id, id, {
      title: values.title,
      description: values.description,
      priceCop: values.priceCop,
      active: values.active,
      sortOrder: comboId
        ? (allCombosForCategory.find((c) => c.id === comboId)?.sortOrder ??
          nextSortOrder(allCombosForCategory))
        : nextSortOrder(allCombosForCategory),
    })
    onToast(comboId ? 'Combo actualizado.' : 'Combo creado.')
  }

  const deactivateCombo = async (combo: MenuCombo) => {
    if (!current) return
    if (!window.confirm(`¿Ocultar "${combo.title}" de la carta?`)) return
    setBusy(true)
    try {
      await upsertCombo(current.id, combo.id, { ...combo, active: false })
      onToast('Combo oculto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-6 space-y-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
      <p className="text-sm font-semibold text-amber-900">Edición del menú</p>
      <p className="text-xs text-amber-800">
        Arrastra las pestañas o los combos para cambiar el orden. {busy ? 'Guardando…' : ''}
      </p>

      <div className="flex flex-wrap gap-2">
        {sections.map((sec, i) => (
          <button
            key={sec.id}
            type="button"
            draggable
            onDragStart={() => setDragCatId(sec.id)}
            onDragEnd={() => setDragCatId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void handleCategoryDrop(sec.id)}
            onClick={() => onChangeSeccion(i)}
            className={`krocam-category-chip shrink-0 text-sm font-semibold border flex items-center gap-1 ${
              i === seccionActual
                ? 'bg-(--krocam-yellow) text-gray-900 border-transparent'
                : 'bg-white text-gray-800 border-amber-200'
            } ${!sec.active ? 'opacity-50 line-through' : ''}`}
          >
            <IonIcon icon={reorderThreeOutline} className="text-base opacity-60" />
            {sec.title}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <IonButton size="small" onClick={() => setCategoryModal('new')}>
          Nueva categoría
        </IonButton>
        {current && (
          <IonButton size="small" fill="outline" onClick={() => setCategoryModal('edit')}>
            Editar categoría
          </IonButton>
        )}
        {current && (
          <IonButton size="small" onClick={() => setComboModal('new')}>
            Nuevo combo
          </IonButton>
        )}
      </div>

      {current && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
            Combos — {current.title} (arrastra para ordenar)
          </p>
          <ul className="space-y-2">
            {allCombosForCategory.map((combo) => (
              <li
                key={combo.id}
                draggable
                onDragStart={() => setDragComboId(combo.id)}
                onDragEnd={() => setDragComboId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void handleComboDrop(combo.id)}
                className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm ${
                  combo.active ? 'border-gray-200' : 'border-red-200 opacity-60'
                }`}
              >
                <IonIcon icon={reorderThreeOutline} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block truncate">{combo.title}</span>
                  <span className="text-gray-500 text-xs">
                    $ {formatPriceCop(combo.priceCop)}
                    {!combo.active ? ' · oculto' : ''}
                  </span>
                </div>
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => {
                    setEditingCombo(combo)
                    setComboModal('edit')
                  }}
                >
                  <IonIcon icon={createOutline} />
                </IonButton>
                <IonButton
                  fill="clear"
                  size="small"
                  color="danger"
                  disabled={busy}
                  onClick={() => void deactivateCombo(combo)}
                >
                  <IonIcon icon={trashOutline} />
                </IonButton>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CategoryFormModal
        isOpen={categoryModal === 'new'}
        isNew
        category={null}
        onClose={() => setCategoryModal(null)}
        onPickImage={(file) => fileToCompressedBase64(file)}
        onSave={(v) => saveCategory(v)}
      />
      <CategoryFormModal
        isOpen={categoryModal === 'edit'}
        isNew={false}
        category={current ?? null}
        onClose={() => setCategoryModal(null)}
        onPickImage={(file) => fileToCompressedBase64(file)}
        onSave={(v) => (current ? saveCategory(v, current.id) : Promise.resolve())}
      />
      <ComboFormModal
        isOpen={comboModal === 'new'}
        isNew
        combo={null}
        onClose={() => setComboModal(null)}
        onSave={(v) => saveCombo(v)}
      />
      <ComboFormModal
        isOpen={comboModal === 'edit'}
        isNew={false}
        combo={editingCombo}
        onClose={() => {
          setComboModal(null)
          setEditingCombo(null)
        }}
        onSave={(v) => (editingCombo ? saveCombo(v, editingCombo.id) : Promise.resolve())}
      />
    </div>
  )
}
