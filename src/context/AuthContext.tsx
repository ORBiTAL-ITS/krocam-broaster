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
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
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

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as
  | string
  | undefined
const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as
  | string
  | undefined

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const mountedRef = useRef(true)

  // Inicialización GoogleAuth (Android) y SocialLogin (iOS).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const platform = Capacitor.getPlatform()
    const webClientId = GOOGLE_WEB_CLIENT_ID?.trim()

    // Android: plugin original GoogleAuth (lo dejamos intacto para no romper nada).
    if (platform === 'android' && webClientId) {
      try {
        GoogleAuth.initialize({
          clientId: webClientId,
          scopes: ['profile', 'email'],
        })
      } catch {
        // La app debe seguir arrancando aunque falle el plugin.
      }
    }

    // iOS: nuevo plugin SocialLogin con Google.
    if (platform === 'ios') {
      const iosClientId = GOOGLE_IOS_CLIENT_ID?.trim()
      if (!iosClientId) {
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
    }
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
    const platform = Capacitor.getPlatform()
    const isNativeAndroid = platform === 'android'
    const isNativeIOS = platform === 'ios' && Capacitor.isNativePlatform()

    // En Android nativo: uso del plugin para evitar redirect y "missing initial state".
    // En iOS usamos el flujo web (popup/redirect) porque este plugin no está soportado totalmente.
    if (isNativeAndroid) {
      try {
        const result = await GoogleAuth.signIn()
        const idToken = result.authentication?.idToken
        const accessToken = result.authentication?.accessToken
        if (!idToken) {
          throw new Error('No se obtuvo el token de Google. Intenta de nuevo.')
        }
        const credential = GoogleAuthProvider.credential(
          idToken,
          accessToken ?? undefined
        )
        await signInWithCredential(auth, credential)
      } catch (err: unknown) {
        const raw = err && typeof err === 'object' ? (err as Record<string, unknown>) : {}
        const inner =
          raw?.error && typeof raw.error === 'object'
            ? (raw.error as Record<string, unknown>)
            : raw
        const msg = String(inner?.message ?? raw?.message ?? '')
        const code = String(inner?.code ?? raw?.code ?? '')
        if (msg.includes('cancel') || msg.includes('Cancel') || code === '12501') {
          return
        }
        if (
          msg.toLowerCase().includes('something went wrong') ||
          code === '12500' ||
          code === '10'
        ) {
          throw new Error(
            'Error 10: Falta configurar la huella SHA-1. En Firebase Console añade el SHA-1 de tu APK (debug). En Google Cloud crea un cliente OAuth tipo Android con ese SHA-1 y package com.krocam.broaster.samir. Ver docs/GOOGLE_SIGNIN_ANDROID.md'
          )
        }
        const friendlyMessage =
          msg || (err instanceof Error ? err.message : 'Error al conectar con Google.')
        throw new Error(friendlyMessage)
      }
      return
    }

    // En iOS dentro de la app (WKWebView), Firebase no soporta bien signInWithPopup.
    // Forzamos siempre redirect para que abra la pantalla de Google en el mismo WebView.
    if (isNativeIOS) {
      console.log('[iOS Google] empezando login con SocialLogin')
      const res = await SocialLogin.login({
        provider: 'google',
        options: {},
      })
      console.log('[iOS Google] respuesta de SocialLogin', res)

      const idToken =
        // @ts-expect-error
        (res?.result?.idToken as string | undefined) ??
        // @ts-expect-error
        (res?.result?.id_token as string | undefined)

      console.log('[iOS Google] idToken', !!idToken)

      if (!idToken) {
        throw new Error(
          'No se obtuvo el token de Google en iOS. Revisa la configuración de SocialLogin.'
        )
      }

      const credential = GoogleAuthProvider.credential(idToken)
      console.log('[iOS Google] antes de signInWithCredential')
      await signInWithCredential(auth, credential)
      console.log('[iOS Google] signInWithCredential OK')
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
