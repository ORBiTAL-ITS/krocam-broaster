import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const WHATSAPP_DOC_REF = doc(db, 'config', 'whatsapp')

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
