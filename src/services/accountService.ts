import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Elimina la cuenta del usuario en la app: borra datos personales del perfil
 * y marca el documento como inactivo (historial de pedidos puede conservarse por ley).
 */
export async function deleteUserAccount(uid: string): Promise<void> {
  const ref = doc(db, 'users', uid)
  await setDoc(
    ref,
    {
      phone: '',
      barrio: '',
      address: '',
      notes: '',
      active: false,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
