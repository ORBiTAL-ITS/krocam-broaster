import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const WHATSAPP_DOC_REF = doc(db, 'config', 'whatsapp')

let cachedWhatsappNumber: string | null | undefined

export async function getWhatsappNumber(): Promise<string | null> {
  if (cachedWhatsappNumber !== undefined) return cachedWhatsappNumber ?? null

  try {
    const snap = await getDoc(WHATSAPP_DOC_REF)
    const data = snap.exists() ? snap.data() : null
    const number = data && typeof data.number === 'string' ? data.number.trim() : ''
    cachedWhatsappNumber = number || null
    return cachedWhatsappNumber
  } catch {
    cachedWhatsappNumber = null
    return null
  }
}

export async function setWhatsappNumber(number: string): Promise<void> {
  const clean = number.trim()
  await setDoc(
    WHATSAPP_DOC_REF,
    { number: clean },
    { merge: true },
  )
  cachedWhatsappNumber = clean || null
}

