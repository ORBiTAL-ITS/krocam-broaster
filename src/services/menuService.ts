import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { MenuCategory, MenuCombo } from '../types/menu'

const CATEGORIES = 'menuCategories'

function mapCombo(id: string, data: Record<string, unknown>): MenuCombo {
  return {
    id,
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    priceCop: typeof data.price === 'number' ? data.price : Number(data.price) || 0,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    active: data.active !== false,
  }
}

function mapCategory(
  id: string,
  data: Record<string, unknown>,
  combos: MenuCombo[],
  includeInactive: boolean,
): MenuCategory {
  return {
    id,
    title: String(data.title ?? ''),
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    heroImageBase64:
      typeof data.heroImageBase64 === 'string' && data.heroImageBase64.length > 0
        ? data.heroImageBase64
        : null,
    heroImageAlt: String(data.heroImageAlt ?? ''),
    active: data.active !== false,
    combos: combos
      .filter((c) => includeInactive || c.active)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }
}

export function slugifyMenuId(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `item-${Date.now()}`
}

export type MenuLoadState =
  | { status: 'loading' }
  | { status: 'ready'; sections: MenuCategory[]; source: 'firestore' | 'fallback' }
  | { status: 'error'; message: string; sections: MenuCategory[] }

/**
 * Escucha categorías activas y sus combos en tiempo real.
 */
export function subscribeMenu(
  onChange: (state: MenuLoadState) => void,
  options?: { includeInactive?: boolean },
): Unsubscribe {
  const includeInactive = options?.includeInactive ?? false
  onChange({ status: 'loading' })

  const comboUnsubs = new Map<string, Unsubscribe>()
  const combosByCategory = new Map<string, MenuCombo[]>()
  const categoryDocs = new Map<string, Record<string, unknown>>()

  const emit = () => {
    const sections: MenuCategory[] = []
    for (const [catId, data] of categoryDocs) {
      const cat = mapCategory(
        catId,
        data,
        combosByCategory.get(catId) ?? [],
        includeInactive,
      )
      if (includeInactive || cat.active) {
        sections.push(cat)
      }
    }
    sections.sort((a, b) => a.sortOrder - b.sortOrder)
    if (sections.length === 0) {
      onChange({
        status: 'error',
        message: 'empty',
        sections: [],
      })
      return
    }
    onChange({ status: 'ready', sections, source: 'firestore' })
  }

  const q = query(collection(db, CATEGORIES), orderBy('sortOrder', 'asc'))

  const unsubCategories = onSnapshot(
    q,
    (snap) => {
      const seen = new Set<string>()
      for (const d of snap.docs) {
        seen.add(d.id)
        categoryDocs.set(d.id, d.data() as Record<string, unknown>)
        if (!comboUnsubs.has(d.id)) {
          const cq = query(
            collection(db, CATEGORIES, d.id, 'combos'),
            orderBy('sortOrder', 'asc'),
          )
          comboUnsubs.set(
            d.id,
            onSnapshot(cq, (comboSnap) => {
              const list = comboSnap.docs.map((cd) =>
                mapCombo(cd.id, cd.data() as Record<string, unknown>),
              )
              combosByCategory.set(d.id, list)
              emit()
            }),
          )
        }
      }
      for (const id of [...comboUnsubs.keys()]) {
        if (!seen.has(id)) {
          comboUnsubs.get(id)?.()
          comboUnsubs.delete(id)
          categoryDocs.delete(id)
          combosByCategory.delete(id)
        }
      }
      emit()
    },
    (err) => {
      onChange({
        status: 'error',
        message: err.message,
        sections: [],
      })
    },
  )

  return () => {
    unsubCategories()
    for (const u of comboUnsubs.values()) u()
  }
}

export async function isMenuSeeded(): Promise<boolean> {
  const ref = doc(db, 'meta', 'menu')
  const snap = await getDoc(ref)
  return snap.exists() && snap.data()?.seeded === true
}

export async function markMenuSeeded(): Promise<void> {
  await setDoc(
    doc(db, 'meta', 'menu'),
    { seeded: true, seededAt: serverTimestamp() },
    { merge: true },
  )
}

export async function upsertCategory(
  categoryId: string,
  data: Omit<MenuCategory, 'id' | 'combos'>,
): Promise<void> {
  await setDoc(
    doc(db, CATEGORIES, categoryId),
    {
      title: data.title,
      sortOrder: data.sortOrder,
      heroImageBase64: data.heroImageBase64,
      heroImageAlt: data.heroImageAlt,
      active: data.active,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function upsertCombo(
  categoryId: string,
  comboId: string,
  data: Omit<MenuCombo, 'id'>,
): Promise<void> {
  await setDoc(
    doc(db, CATEGORIES, categoryId, 'combos', comboId),
    {
      title: data.title,
      description: data.description,
      price: data.priceCop,
      sortOrder: data.sortOrder,
      active: data.active,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      setDoc(
        doc(db, CATEGORIES, id),
        { sortOrder: index, updatedAt: serverTimestamp() },
        { merge: true },
      ),
    ),
  )
}

export async function reorderCombos(categoryId: string, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      setDoc(
        doc(db, CATEGORIES, categoryId, 'combos', id),
        { sortOrder: index, updatedAt: serverTimestamp() },
        { merge: true },
      ),
    ),
  )
}

export function nextSortOrder(items: { sortOrder: number }[]): number {
  if (items.length === 0) return 0
  return Math.max(...items.map((i) => i.sortOrder)) + 1
}
