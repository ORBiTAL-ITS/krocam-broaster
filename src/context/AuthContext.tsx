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
  OAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { deleteUserAccount } from '../services/accountService'
import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import {
  auth,
  appleProvider,
  db,
  googleProvider,
  redirectResultPromise,
} from '../firebase'
import {
  registerPushNotifications,
  subscribeWebForegroundPush,
  webPushRequiresUserGesture,
} from '../services/pushNotifications'
import {
  deliveryProfileStorageKey,
  writeStoredDeliveryProfile,
} from '../services/deliveryProfileStorage'

interface AuthContextValue {
  user: User | null
  loading: boolean
  profile: UserProfile | null
  profileLoading: boolean
  loginWithGoogle: () => Promise<void>
  loginWithApple: () => Promise<void>
  logout: () => Promise<void>
  saveProfile: (data: UserProfileInput) => Promise<void>
  deleteAccount: (options?: { signOut?: boolean }) => Promise<void>
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
  /** false = cuenta eliminada por el usuario. */
  active?: boolean
  createdAt?: Date
  updatedAt?: Date
  deactivatedAt?: Date
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
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined
const FIREBASE_AUTH_DOMAIN = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as
  | string
  | undefined

const ADMIN_UID_STORAGE_KEY = 'krocam:adminUid'

interface FirestoreUserDoc {
  active?: boolean
  role?: string
  phone?: string
  barrio?: string
  address?: string
  notes?: string
  createdAt?: { toDate?: () => Date }
  updatedAt?: { toDate?: () => Date }
  deactivatedAt?: { toDate?: () => Date }
}

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

function normalizeFirestoreRole(role: unknown): string {
  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

/** Admin si Firestore, memoria o caché local coinciden con este uid. */
function resolveAdminRole(
  uid: string,
  firestoreRole: unknown,
  memoryRole?: 'admin' | 'customer',
): 'admin' | undefined {
  const storedAdminUid = getStoredAdminUid()
  const isAdmin =
    normalizeFirestoreRole(firestoreRole) === 'admin' ||
    memoryRole === 'admin' ||
    storedAdminUid === uid

  if (isAdmin) {
    setStoredAdminUid(uid)
    return 'admin'
  }
  return undefined
}

async function fetchUserProfileDoc(
  ref: ReturnType<typeof doc>,
  attempts = 3,
): Promise<Awaited<ReturnType<typeof getDoc>>> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt))
    }
    try {
      return await getDoc(ref)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const mountedRef = useRef(true)
  const profileRef = useRef<UserProfile | null>(null)

  // Inicialización SocialLogin (Google y Apple) en entornos nativos.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const platform = Capacitor.getPlatform()
    const iosClientId = GOOGLE_IOS_CLIENT_ID?.trim()
    const webClientId = GOOGLE_WEB_CLIENT_ID?.trim()
    const appleClientId = APPLE_CLIENT_ID?.trim()
    const authDomain = FIREBASE_AUTH_DOMAIN?.trim()

    const initPayload: Parameters<typeof SocialLogin.initialize>[0] = {}

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

    const canInitGoogle =
      (platform === 'ios' && !!googleConfig.iOSClientId) ||
      (platform === 'android' && !!googleConfig.webClientId)

    if (canInitGoogle) {
      initPayload.google = googleConfig
    }

    if (platform === 'ios') {
      initPayload.apple = { redirectUrl: '' }
    } else if (platform === 'android' && appleClientId && authDomain) {
      initPayload.apple = {
        clientId: appleClientId,
        redirectUrl: `https://${authDomain}/__/auth/handler`,
        useBroadcastChannel: true,
      }
    }

    if (!initPayload.google && !initPayload.apple) return

    SocialLogin.initialize(initPayload).catch(() => {
      // Ignorar errores de inicialización; se manejarán al intentar loguear.
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true

    const applyUser = async (firebaseUser: User | null) => {
      setUser(firebaseUser)
      if (!firebaseUser) {
        // No borrar krocam:adminUid aquí: Firebase a veces emite null al refrescar el
        // token en iOS/Android y eso hacía perder el rol admin hasta el próximo login.
        profileRef.current = null
        setProfile(null)
        setProfileLoading(false)
        setLoading(false)
        return
      }
      setProfileLoading(true)
      const memoryRole = profileRef.current?.role
      try {
        const ref = doc(db, 'users', firebaseUser.uid)
        const snap = await fetchUserProfileDoc(ref)
        if (snap.exists()) {
          const data = snap.data() as FirestoreUserDoc
          if (data.active === false) {
            profileRef.current = null
            setProfile(null)
            setProfileLoading(false)
            setLoading(false)
            return
          }
          const effectiveRole = resolveAdminRole(
            firebaseUser.uid,
            data.role,
            memoryRole,
          )

          const nextProfile: UserProfile = {
            phone: data.phone ?? '',
            barrio: data.barrio ?? '',
            address: data.address ?? '',
            notes: data.notes ?? '',
            role: effectiveRole,
            active: true,
            createdAt: data.createdAt?.toDate?.() ?? undefined,
            updatedAt: data.updatedAt?.toDate?.() ?? undefined,
            deactivatedAt: data.deactivatedAt?.toDate?.() ?? undefined,
          }
          profileRef.current = nextProfile
          setProfile(nextProfile)
        } else {
          const effectiveRole = resolveAdminRole(
            firebaseUser.uid,
            undefined,
            memoryRole,
          )
          if (effectiveRole === 'admin') {
            const nextProfile: UserProfile = {
              phone: '',
              barrio: '',
              address: '',
              notes: '',
              role: 'admin',
              active: true,
              createdAt: undefined,
              updatedAt: undefined,
            }
            profileRef.current = nextProfile
            setProfile(nextProfile)
          } else {
            profileRef.current = null
            setProfile(null)
          }
        }
      } catch {
        const effectiveRole = resolveAdminRole(
          firebaseUser.uid,
          undefined,
          memoryRole,
        )
        if (effectiveRole === 'admin') {
          const nextProfile: UserProfile = {
            phone: profileRef.current?.phone ?? '',
            barrio: profileRef.current?.barrio ?? '',
            address: profileRef.current?.address ?? '',
            notes: profileRef.current?.notes ?? '',
            role: 'admin',
            active: true,
            createdAt: profileRef.current?.createdAt,
            updatedAt: profileRef.current?.updatedAt,
          }
          profileRef.current = nextProfile
          setProfile(nextProfile)
        } else {
          profileRef.current = null
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

  // Salvavidas: no bloquear la UI si Auth tarda (WebView nativa). El perfil tiene
  // su propio tiempo de espera para no marcar "no admin" antes de leer Firestore.
  useEffect(() => {
    if (!loading) return
    const timeoutId = setTimeout(() => setLoading(false), 8000)
    return () => clearTimeout(timeoutId)
  }, [loading])

  useEffect(() => {
    if (!profileLoading || !user) return
    const timeoutId = setTimeout(() => setProfileLoading(false), 15000)
    return () => clearTimeout(timeoutId)
  }, [profileLoading, user])

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

  const signInWithOAuthPopupOrRedirect = async (
    provider: typeof googleProvider | typeof appleProvider,
  ) => {
    try {
      await signInWithPopup(auth, provider)
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
        await signInWithRedirect(auth, provider)
      } else {
        throw err
      }
    }
  }

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

    await signInWithOAuthPopupOrRedirect(googleProvider)
  }

  const loginWithApple = async () => {
    const isNative = Capacitor.isNativePlatform()

    if (isNative) {
      try {
        const res = await SocialLogin.login({
          provider: 'apple',
          options: { scopes: ['email', 'name'] },
        })

        const idToken =
          res.provider === 'apple' ? res.result.idToken : undefined

        if (!idToken) {
          throw new Error(
            'No se obtuvo el token de Apple en el dispositivo. Intenta nuevamente.',
          )
        }

        const credential = new OAuthProvider('apple.com').credential({
          idToken,
        })
        await signInWithCredential(auth, credential)
        return
      } catch (err) {
        const rawMessage =
          typeof err === 'string'
            ? err
            : err && typeof err === 'object' && 'message' in err
              ? String((err as { message: string }).message)
              : ''

        if (
          rawMessage.includes('canceled') ||
          rawMessage.includes('cancelled') ||
          rawMessage.includes('1001')
        ) {
          return
        }

        throw new Error(
          'No pudimos completar el inicio con Apple en el dispositivo. Intenta nuevamente.',
        )
      }
    }

    await signInWithOAuthPopupOrRedirect(appleProvider)
  }

  const logout = async () => {
    setStoredAdminUid(null)
    profileRef.current = null
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
      active: true,
      updatedAt: serverTimestamp(),
    }
    if (!existing.exists()) {
      payload.createdAt = serverTimestamp()
    }
    await setDoc(ref, payload, { merge: true })

    writeStoredDeliveryProfile(user.uid, {
      phone: String(payload.phone),
      barrio: String(payload.barrio),
      address: String(payload.address),
      notes: String(payload.notes),
    })

    const existingRole = existing.exists() ? existing.data().role : undefined
    const effectiveRole = resolveAdminRole(
      user.uid,
      existingRole,
      profileRef.current?.role ?? profile?.role,
    )

    const nextProfile: UserProfile = {
      phone: data.phone,
      barrio: data.barrio,
      address: data.address,
      notes: data.notes ?? '',
      role: effectiveRole,
      active: true,
      createdAt: profileRef.current?.createdAt ?? profile?.createdAt,
      updatedAt: new Date(),
      deactivatedAt: profileRef.current?.deactivatedAt ?? profile?.deactivatedAt,
    }
    profileRef.current = nextProfile
    setProfile(nextProfile)
  }

  const deleteAccount = async (options?: { signOut?: boolean }) => {
    if (!user) {
      throw new Error('No hay usuario autenticado.')
    }
    if (profile?.role === 'admin') {
      throw new Error(
        'Las cuentas de administrador no se pueden eliminar desde la app. Contacta soporte técnico.',
      )
    }
    await deleteUserAccount(user.uid)
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(deliveryProfileStorageKey(user.uid))
      }
    } catch {
      // ignorar
    }
    setStoredAdminUid(null)
    profileRef.current = null
    setProfile(null)
    if (options?.signOut !== false) {
      await signOut(auth)
    }
  }

  const value: AuthContextValue = {
    user,
    loading,
    profile,
    profileLoading,
    loginWithGoogle,
    loginWithApple,
    logout,
    saveProfile,
    deleteAccount,
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
