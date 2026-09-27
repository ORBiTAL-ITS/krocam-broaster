import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const WHATSAPP_DOC_REF = doc(db, 'config', 'whatsapp')
const MENU_TEXTS_DOC_REF = doc(db, 'config', 'menuTexts')

/** Texto bajo el título de cada categoría mientras el admin no guarde uno propio. */
export const DEFAULT_MENU_SECTION_SUBTITLE =
  'Elige el combo que más se te antoje. Todos incluyen papas a la francesa, gaseosa personal y salsa de la casa.'

/** Lee `config/whatsapp` en cada llamada (sin caché local). */
export async function getWhatsappNumber(): Promise<string | null> {
  try {
    const snap = await getDoc(WHATSAPP_DOC_REF)
    const data = snap.exists() ? snap.data() : null
    const number = data && typeof data.number === 'string' ? data.number.trim() : ''
    return number || null
  } catch {
    return null
  }
}

export async function setWhatsappNumber(number: string): Promise<void> {
  await setDoc(WHATSAPP_DOC_REF, { number: number.trim() }, { merge: true })
}

/**
 * Escucha `config/menuTexts` y emite el texto común de las categorías de la carta.
 * @returns función para cancelar la suscripción.
 */
export function subscribeMenuSectionSubtitle(onChange: (text: string) => void): () => void {
  return onSnapshot(
    MENU_TEXTS_DOC_REF,
    (snap) => {
      const value = snap.exists() ? snap.data().sectionSubtitle : null
      const text = typeof value === 'string' ? value.trim() : ''
      onChange(text || DEFAULT_MENU_SECTION_SUBTITLE)
    },
    () => onChange(DEFAULT_MENU_SECTION_SUBTITLE),
  )
}

/** Guarda en `config/menuTexts` el texto común de las categorías (solo admin). */
export async function saveMenuSectionSubtitle(text: string): Promise<void> {
  await setDoc(
    MENU_TEXTS_DOC_REF,
    { sectionSubtitle: text.trim(), updatedAt: serverTimestamp() },
    { merge: true },
  )
}
