import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  type User,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { auth, db, googleProvider, redirectResultPromise } from '../firebase'
import { registerPushNotifications } from '../services/pushNotifications'

interface AuthContextValue {
  user: User | null
  loading: boolean
  profile: UserProfile | null
  profileLoading: boolean
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  saveProfile: (data: UserProfileInput) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export interface UserProfile {
  phone: string
  barrio: string
  address: string
  notes?: string
  /** Solo se asigna desde Firebase (consola); la app nunca escribe este campo. */
  role?: 'admin' | 'customer'
  createdAt?: Date
  updatedAt?: Date
}

export interface UserProfileInput {
  phone: string
  barrio: string
  address: string
  notes?: string
}

const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as
  | string
  | undefined

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const mountedRef = useRef(true)

  // Inicialización SocialLogin (Google) en entornos nativos.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const iosClientId = GOOGLE_IOS_CLIENT_ID?.trim()
    if (Capacitor.getPlatform() === 'ios' && !iosClientId) {
      // Si falta el Client ID de iOS, no rompemos la app: solo fallará el login cuando se pulse el botón.
      return
    }

    SocialLogin.initialize({
      google: {
        iOSClientId: iosClientId,
        // Opcional: si quieres usar offline/server auth, puedes añadir iOSServerClientId/webClientId.
        mode: 'online',
      },
    }).catch(() => {
      // Ignorar errores de inicialización; se manejarán al intentar loguear.
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true

    const applyUser = async (firebaseUser: User | null) => {
      setUser(firebaseUser)
      if (!firebaseUser) {
        setProfile(null)
        setProfileLoading(false)
        setLoading(false)
        return
      }
      setProfileLoading(true)
      try {
        const ref = doc(db, 'users', firebaseUser.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const data = snap.data()
          setProfile({
            phone: data.phone ?? '',
            barrio: data.barrio ?? '',
            address: data.address ?? '',
            notes: data.notes ?? '',
            role: data.role === 'admin' ? 'admin' : undefined,
            createdAt: data.createdAt?.toDate?.() ?? undefined,
            updatedAt: data.updatedAt?.toDate?.() ?? undefined,
          })
        } else {
          setProfile(null)
        }
      } catch {
        setProfile(null)
      } finally {
        setProfileLoading(false)
        setLoading(false)
      }
    }

    let unsubscribe: (() => void) | undefined
    const timeoutMs = 3000
    const withTimeout = Promise.race([
      redirectResultPromise,
      new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
    ])
    withTimeout
      .then(result => {
        if (result?.user) return applyUser(result.user)
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : ''
        if (!msg.includes('missing initial state') && !msg.includes('sessionStorage')) {
          console.warn('Redirect result error:', err)
        }
      })
      .finally(() => {
        if (!mountedRef.current) return
        unsubscribe = onAuthStateChanged(auth, applyUser)
      })

    return () => {
      mountedRef.current = false
      unsubscribe?.()
    }
  }, [])

  // Salvavidas: si por algún motivo Firebase/Auth nunca responde (por ejemplo,
  // entorno nativo con WebView limitada), no queremos dejar la app en "cargando"
  // para siempre. Pasados unos segundos mostramos la pantalla de login igual.
  useEffect(() => {
    if (!loading && !profileLoading) return
    const timeoutMs = 8000
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setProfileLoading(false)
    }, timeoutMs)
    return () => clearTimeout(timeoutId)
  }, [loading, profileLoading])

  useEffect(() => {
    if (!user?.uid) return
    registerPushNotifications(user.uid).catch(() => {})
  }, [user?.uid])

  const loginWithGoogle = async () => {
    const isNative = Capacitor.isNativePlatform()

    // En apps nativas (Android/iOS) usamos SocialLogin con Google.
    if (isNative) {
      console.log('[Native Google] empezando login con SocialLogin')
      const res = await SocialLogin.login({
        provider: 'google',
        options: {},
      })
      console.log('[Native Google] respuesta de SocialLogin', res)

      const idToken =
        // @ts-expect-error
        (res?.result?.idToken as string | undefined) ??
        // @ts-expect-error
        (res?.result?.id_token as string | undefined)

      console.log('[Native Google] idToken', !!idToken)

      if (!idToken) {
        throw new Error(
          'No se obtuvo el token de Google en el dispositivo. Revisa la configuración de SocialLogin.'
        )
      }

      const credential = GoogleAuthProvider.credential(idToken)
      console.log('[Native Google] antes de signInWithCredential')
      await signInWithCredential(auth, credential)
      console.log('[Native Google] signInWithCredential OK')
      return
    }

    // En web (navegador): popup y, si falla, redirect.
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : ''
      const useRedirect =
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user'
      if (useRedirect) {
        await signInWithRedirect(auth, googleProvider)
      } else {
        throw err
      }
    }
  }

  const logout = async () => {
    await signOut(auth)
  }

  const saveProfile = async (data: UserProfileInput) => {
    if (!user) {
      throw new Error('No hay usuario autenticado.')
    }

    const ref = doc(db, 'users', user.uid)
    await setDoc(
      ref,
      {
        phone: String(data.phone).trim(),
        barrio: String(data.barrio).trim(),
        address: String(data.address).trim(),
        notes: data.notes ? String(data.notes).trim() : '',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    )

    setProfile(prev => ({
      phone: data.phone,
      barrio: data.barrio,
      address: data.address,
      notes: data.notes ?? '',
      role: prev?.role,
      createdAt: prev?.createdAt,
      updatedAt: new Date(),
    }))
  }

  const value: AuthContextValue = {
    user,
    loading,
    profile,
    profileLoading,
    loginWithGoogle,
    logout,
    saveProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return context
}
