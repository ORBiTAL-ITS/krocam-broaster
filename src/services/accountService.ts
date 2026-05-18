import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

/** Marca la cuenta como inactiva (soft delete). Conserva el documento en Firestore. */
export async function deactivateUserAccount(uid: string): Promise<void> {
  const ref = doc(db, 'users', uid)
  await setDoc(
    ref,
    {
      active: false,
      deactivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

/** Reactiva una cuenta previamente desactivada (mismo uid al volver a iniciar sesión). */
export async function reactivateUserAccount(uid: string): Promise<void> {
  const ref = doc(db, 'users', uid)
  await setDoc(
    ref,
    {
      active: true,
      reactivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
