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
import {
  registerPushNotifications,
  subscribeWebForegroundPush,
  webPushRequiresUserGesture,
} from '../services/pushNotifications'

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
const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as
  | string
  | undefined

const ADMIN_UID_STORAGE_KEY = 'krocam:adminUid'

function getStoredAdminUid(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(ADMIN_UID_STORAGE_KEY)
    return value && value.trim() ? value.trim() : null
  } catch {
    return null
  }
}

function setStoredAdminUid(uid: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (!uid) {
      window.localStorage.removeItem(ADMIN_UID_STORAGE_KEY)
    } else {
      window.localStorage.setItem(ADMIN_UID_STORAGE_KEY, uid)
    }
  } catch {
    // Ignorar errores de acceso a storage (modo incógnito, etc.)
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const mountedRef = useRef(true)

  // Inicialización SocialLogin (Google) en entornos nativos.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const platform = Capacitor.getPlatform()
    const iosClientId = GOOGLE_IOS_CLIENT_ID?.trim()
    const webClientId = GOOGLE_WEB_CLIENT_ID?.trim()

    const googleConfig: {
      iOSClientId?: string
      webClientId?: string
      mode: 'online'
    } = {
      mode: 'online',
    }

    if (platform === 'ios' && iosClientId) {
      googleConfig.iOSClientId = iosClientId
    }

    if (platform === 'android' && webClientId) {
      googleConfig.webClientId = webClientId
    }

    // Si no tenemos ningún ID válido para esta plataforma, no inicializamos.
    if (
      (platform === 'ios' && !googleConfig.iOSClientId) ||
      (platform === 'android' && !googleConfig.webClientId)
    ) {
      return
    }

    SocialLogin.initialize({
      google: googleConfig,
    }).catch(() => {
      // Ignorar errores de inicialización; se manejarán al intentar loguear.
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true

    const applyUser = async (firebaseUser: User | null) => {
      setUser(firebaseUser)
      if (!firebaseUser) {
        setStoredAdminUid(null)
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
          const rawRole =
            typeof data.role === 'string' ? data.role.trim().toLowerCase() : ''
          const storedAdminUid = getStoredAdminUid()
          const isAdminByStorage = storedAdminUid === firebaseUser.uid
          const effectiveRole =
            rawRole === 'admin' || isAdminByStorage ? 'admin' : undefined

          if (effectiveRole === 'admin' && storedAdminUid !== firebaseUser.uid) {
            setStoredAdminUid(firebaseUser.uid)
          }

          setProfile({
            phone: data.phone ?? '',
            barrio: data.barrio ?? '',
            address: data.address ?? '',
            notes: data.notes ?? '',
            role: effectiveRole,
            createdAt: data.createdAt?.toDate?.() ?? undefined,
            updatedAt: data.updatedAt?.toDate?.() ?? undefined,
          })
        } else {
          const storedAdminUid = getStoredAdminUid()
          if (storedAdminUid === firebaseUser.uid) {
            setProfile({
              phone: '',
              barrio: '',
              address: '',
              notes: '',
              role: 'admin',
              createdAt: undefined,
              updatedAt: undefined,
            })
          } else {
            setProfile(null)
          }
        }
      } catch {
        const storedAdminUid = getStoredAdminUid()
        if (storedAdminUid === firebaseUser.uid) {
          setProfile({
            phone: '',
            barrio: '',
            address: '',
            notes: '',
            role: 'admin',
            createdAt: undefined,
            updatedAt: undefined,
          })
        } else {
          setProfile(null)
        }
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
    // iOS Safari/PWA: el permiso push debe pedirse con un gesto del usuario (banner en MenuPage).
    if (webPushRequiresUserGesture()) return
    registerPushNotifications(user.uid).catch(() => {})
  }, [user?.uid])

  // Web / PWA: al volver desde segundo plano o restaurar desde caché, revalidar token FCM.
  // No ejecutar en Capacitor — el plugin nativo no debe competir con este flujo.
  useEffect(() => {
    if (!user?.uid) return
    if (Capacitor.isNativePlatform()) return
    if (webPushRequiresUserGesture()) return

    const uid = user.uid
    let lastRegisterAt = 0
    const throttleMs = 45_000

    const scheduleRegister = () => {
      const now = Date.now()
      if (now - lastRegisterAt < throttleMs) return
      lastRegisterAt = now
      registerPushNotifications(uid).catch(() => {})
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRegister()
    }

    const onPageShow = (ev: Event) => {
      if ((ev as PageTransitionEvent).persisted) scheduleRegister()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [user?.uid])

  // Web / PWA: notificaciones con la app abierta (el SW no recibe el mensaje en primer plano).
  useEffect(() => {
    if (!user?.uid) return
    if (Capacitor.isNativePlatform()) return
    return subscribeWebForegroundPush()
  }, [user?.uid])

  const loginWithGoogle = async () => {
    const isNative = Capacitor.isNativePlatform()

    // En apps nativas (Android/iOS) usamos SocialLogin con Google.
    if (isNative) {
      try {
        console.log('[Native Google] empezando login con SocialLogin')
        const res = await SocialLogin.login({
          provider: 'google',
          options: {},
        })
        console.log('[Native Google] respuesta de SocialLogin', res)

        const idToken =
          // @ts-expect-error plugin devuelve result.idToken en tiempo de ejecución
          (res?.result?.idToken as string | undefined) ??
          // @ts-expect-error plugin devuelve result.id_token en tiempo de ejecución
          (res?.result?.id_token as string | undefined)

        console.log('[Native Google] idToken', !!idToken)

        if (!idToken) {
          throw new Error(
            'No se obtuvo el token de Google en el dispositivo. Revisa la configuración de la cuenta o intenta nuevamente.'
          )
        }

        const credential = GoogleAuthProvider.credential(idToken)
        console.log('[Native Google] antes de signInWithCredential')
        await signInWithCredential(auth, credential)
        console.log('[Native Google] signInWithCredential OK')
        return
      } catch (err) {
        console.error('[Native Google] error en SocialLogin.login', err)
        const rawMessage =
          typeof err === 'string'
            ? err
            : err && typeof err === 'object' && 'message' in err
              ? String((err as { message: string }).message)
              : ''

        let friendlyMessage =
          'No pudimos completar el inicio con Google en el dispositivo. Intenta nuevamente.'

        if (rawMessage.includes('Account reauth failed')) {
          friendlyMessage =
            'Google indicó que esta cuenta necesita reautenticarse. Prueba a seleccionar otra cuenta de Google o vuelve a añadirla en tu dispositivo.'
        }

        throw new Error(friendlyMessage)
      }
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
    setStoredAdminUid(null)
    await signOut(auth)
  }

  const saveProfile = async (data: UserProfileInput) => {
    if (!user) {
      throw new Error('No hay usuario autenticado.')
    }

    const ref = doc(db, 'users', user.uid)
    const existing = await getDoc(ref)
    const payload: Record<string, unknown> = {
      phone: String(data.phone).trim(),
      barrio: String(data.barrio).trim(),
      address: String(data.address).trim(),
      notes: data.notes ? String(data.notes).trim() : '',
      updatedAt: serverTimestamp(),
    }
    if (!existing.exists()) {
      payload.createdAt = serverTimestamp()
    }
    await setDoc(ref, payload, { merge: true })

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          `krocam_profile_form_${user.uid}`,
          JSON.stringify({
            phone: payload.phone,
            barrio: payload.barrio,
            address: payload.address,
            notes: payload.notes,
          }),
        )
      }
    } catch {
      // Storage no disponible (p. ej. modo privado)
    }

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
