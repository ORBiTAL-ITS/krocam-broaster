import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function parseServiceAccount(raw: string): ServiceAccount {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(
      'El JSON de la cuenta de servicio no es válido. Debe ser el archivo descargado en Firebase → Project settings → Service accounts → Generate new private key (tiene "type":"service_account" y "private_key"). No uses la config de la app web (apiKey, appId, measurementId).',
    )
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as { type?: string }).type !== 'service_account' ||
    typeof (parsed as { private_key?: string }).private_key !== 'string'
  ) {
    throw new Error(
      'Ese JSON no es una cuenta de servicio. En Firebase abre Service accounts (no "Your apps") y descarga Generate new private key. Las variables VITE_* de .env son solo para el cliente; el servidor necesita el .json con private_key.',
    )
  }
  return parsed as ServiceAccount
}

function resolveCredentialPath(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)
}

function loadServiceAccountJson(): string {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (inline) return inline

  const fromFile =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim()
  if (fromFile) {
    const full = resolveCredentialPath(fromFile)
    if (!existsSync(full)) {
      throw new Error(
        `No existe el archivo de cuenta de servicio: ${full}. Descárgalo en Firebase → Service accounts → Generate new private key y guárdalo ahí, o corrige la ruta en .env.local.`,
      )
    }
    return readFileSync(full, 'utf8')
  }

  throw new Error(
    'Faltan credenciales de Admin: define FIREBASE_SERVICE_ACCOUNT_JSON (p. ej. en Vercel) o en local GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json apuntando al .json de Service accounts.',
  )
}

/**
 * Inicialización única para rutas serverless Vercel (misma cuenta que notify-orders).
 */
export function getDb() {
  if (getApps().length === 0) {
    initializeApp({ credential: cert(parseServiceAccount(loadServiceAccountJson())) })
  }
  return getFirestore()
}
