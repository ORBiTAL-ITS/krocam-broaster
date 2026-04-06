import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'

/** Cuenta notificaciones no leídas (últimas 50 en bandeja). */
export function useInboxUnreadCount(uid: string | undefined): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!uid) {
      setN(0)
      return
    }
    const q = query(
      collection(db, 'users', uid, 'inbox'),
      orderBy('createdAt', 'desc'),
      limit(50),
    )
    return onSnapshot(q, (snap) => {
      setN(snap.docs.filter((d) => d.data()?.read !== true).length)
    })
  }, [uid])
  return n
}
