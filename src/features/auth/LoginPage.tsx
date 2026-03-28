import {
  IonButton,
  IonContent,
  IonIcon,
  IonLoading,
  IonPage,
  IonText,
  IonModal,
} from '@ionic/react'
import {
  restaurantOutline,
  pizzaOutline,
  flameOutline,
  fastFoodOutline,
  nutritionOutline,
  wineOutline,
} from 'ionicons/icons'
import { type CSSProperties, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/Logo.png'
import { Capacitor } from '@capacitor/core'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

const BG_ICONS = [
  { icon: restaurantOutline, size: 'text-6xl', x: 'left-[8%]', y: 'top-[12%]', opacity: 'opacity-[0.14]' },
  { icon: pizzaOutline, size: 'text-5xl', x: 'right-[10%]', y: 'top-[8%]', opacity: 'opacity-[0.1]' },
  { icon: flameOutline, size: 'text-7xl', x: 'right-[15%]', y: 'bottom-[20%]', opacity: 'opacity-[0.12]' },
  { icon: fastFoodOutline, size: 'text-5xl', x: 'left-[12%]', y: 'bottom-[15%]', opacity: 'opacity-[0.11]' },
  { icon: nutritionOutline, size: 'text-6xl', x: 'left-[5%]', y: 'top-[45%]', opacity: 'opacity-[0.08]' },
  { icon: wineOutline, size: 'text-4xl', x: 'right-[8%]', y: 'top-[38%]', opacity: 'opacity-[0.09]' },
  { icon: restaurantOutline, size: 'text-4xl', x: 'right-[25%]', y: 'bottom-[35%]', opacity: 'opacity-[0.07]' },
  { icon: pizzaOutline, size: 'text-5xl', x: 'left-[20%]', y: 'top-[28%]', opacity: 'opacity-[0.06]' },
  { icon: flameOutline, size: 'text-5xl', x: 'right-[6%]', y: 'bottom-[8%]', opacity: 'opacity-[0.1]' },
  { icon: fastFoodOutline, size: 'text-4xl', x: 'left-[35%]', y: 'bottom-[8%]', opacity: 'opacity-[0.08]' },
]

export default function LoginPage() {
  const { loginWithGoogle, loading } = useAuth()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hasDismissedInstall, setHasDismissedInstall] = useState(false)
  const [isInstallHelpOpen, setIsInstallHelpOpen] = useState(false)

  const handleGoogleLogin = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos conectar con Google. Intenta nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const isBusy = loading || submitting

  useEffect(() => {
    if (Capacitor.isNativePlatform() || typeof window === 'undefined') return

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPromptEvent(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallPwaClick = async () => {
    if (Capacitor.isNativePlatform() || typeof window === 'undefined') {
      return
    }

    if (!installPromptEvent) {
      setIsInstallHelpOpen(true)
      return
    }

    try {
      await installPromptEvent.prompt()
      const choice = await installPromptEvent.userChoice
      setInstallPromptEvent(null)

      if (choice.outcome === 'dismissed') {
        setHasDismissedInstall(true)
      }
    } catch {
      setIsInstallHelpOpen(true)
    }
  }

  return (
    <IonPage>
      <IonContent
        fullscreen
        className="bg-(--krocam-black)"
        style={{ '--background': 'var(--krocam-black)' } as CSSProperties}
      >
        <IonLoading isOpen={isBusy} message="Cargando..." />

        {/* Fondo negro + iconos de comida en amarillo */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none bg-(--krocam-black)"
          aria-hidden
        >
          {BG_ICONS.map(({ icon, size, x, y, opacity }, i) => (
            <span
              key={i}
              className={`absolute ${x} ${y} ${size} ${opacity} text-(--krocam-yellow) transition-opacity duration-300`}
            >
              <IonIcon icon={icon} />
            </span>
          ))}
        </div>

        <div className="relative z-10 min-h-full flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="rounded-3xl bg-white shadow-2xl overflow-hidden border border-white/10">
              {/* Cabecera de marca */}
              <header className="bg-(--krocam-black) text-white px-6 pt-6 pb-5 text-center">
                <img
                  src={logo}
                  alt="KROCAM Broaster Samir"
                  className="mx-auto w-16 h-16 object-contain mb-3"
                />
                <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-(--krocam-gold) mb-1">
                  KROCAM BROASTER SAMIR
                </p>
                <h1 className="krocam-font-title text-2xl sm:text-3xl font-extrabold tracking-tight text-(--krocam-white)">
                  Inicia sesión
                </h1>
                <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto leading-snug">
                  Guarda tu teléfono y dirección una vez. Repite pedidos en segundos.
                </p>
              </header>

              {/* Botón Google */}
              <section className="px-6 py-6 sm:py-7 space-y-5">
                {error && (
                  <div className="rounded-xl bg-red-50 px-3 py-2">
                    <IonText color="danger" className="text-xs">
                      {error}
                    </IonText>
                  </div>
                )}

                <IonButton
                  expand="block"
                  fill="outline"
                  disabled={isBusy}
                  onClick={handleGoogleLogin}
                  className="font-semibold rounded-2xl h-12 border-2 border-gray-300 text-gray-50 bg-(--krocam-black)"
                >
                  Continuar con Google
                </IonButton>

                <p className="text-[11px] text-gray-500 leading-snug text-center">
                  Solo usamos tu teléfono y dirección para coordinar la entrega.{' '}
                  <button
                    type="button"
                    className="underline text-(--krocam-black) font-semibold"
                    onClick={() => setIsPrivacyOpen(true)}
                  >
                    Política de privacidad
                  </button>
                </p>

                <IonModal
                  isOpen={isPrivacyOpen}
                  onDidDismiss={() => setIsPrivacyOpen(false)}
                >
                  <div className="h-full w-full overflow-y-auto bg-black text-gray-100 px-4 py-6">
                    <div className="max-w-2xl mx-auto space-y-4">
                      <h1 className="text-xl font-bold text-yellow-400">
                        Política de privacidad — KROCAM BROASTER SAMIR
                      </h1>
                      <p className="text-sm text-gray-300">
                        Esta carta digital está pensada exclusivamente para que puedas
                        ver el menú y realizar tus pedidos de forma rápida y cómoda.
                      </p>
                      <p className="text-sm text-gray-300">
                        Recopilamos algunos datos básicos que tú mismo proporcionas al
                        hacer un pedido (nombre de usuario de Google, teléfono, barrio,
                        dirección y notas de entrega). Esta información se usa
                        únicamente para:
                      </p>
                      <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                        <li>Identificar tu pedido y poder contactarte.</li>
                        <li>Entregar correctamente tu domicilio.</li>
                        <li>Registrar el historial de pedidos en nuestro sistema.</li>
                      </ul>
                      <p className="text-sm text-gray-300">
                        Los datos se almacenan en servicios de Google Firebase (Auth,
                        Firestore y mensajería push) y, cuando confirmas tu pedido, se
                        utiliza WhatsApp para que puedas enviar tu orden directamente
                        al negocio. No vendemos ni compartimos tu información personal
                        con terceros ajenos al servicio, más allá de los proveedores
                        tecnológicos necesarios para operar la aplicación.
                      </p>
                      <p className="text-sm text-gray-300">
                        Puedes solicitar la eliminación de tus datos de contacto y de
                        tus pedidos escribiendo directamente al número de WhatsApp que
                        aparece en la carta. Ten en cuenta que, por requisitos
                        legales, ciertos registros pueden conservarse por un tiempo
                        limitado.
                      </p>
                      <p className="text-sm text-gray-400">
                        Esta política aplica únicamente al uso de la carta web y puede
                        actualizarse ocasionalmente para reflejar mejoras en el
                        servicio.
                      </p>
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-md bg-yellow-500 text-black text-sm font-semibold"
                          onClick={() => setIsPrivacyOpen(false)}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                </IonModal>
              </section>
            </div>
            {!Capacitor.isNativePlatform() && !hasDismissedInstall && (
              <div className="mt-4">
                <div className="rounded-2xl bg-yellow-50/90 px-3 py-3 text-[11px] text-gray-900 shadow-sm border border-yellow-100">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-black text-xs font-bold shrink-0">
                      +
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-[11px] leading-snug">
                        Instala la carta como app en tu celular
                      </p>
                      <p className="text-[11px] leading-snug text-gray-700">
                        Así entras directo desde el ícono, sin buscar el enlace cada vez.
                      </p>
                      <div className="pt-1.5">
                        <button
                          type="button"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-yellow-400 to-yellow-500 text-black text-[11px] font-semibold px-3 py-1.5 shadow-md hover:from-yellow-300 hover:to-yellow-500 active:scale-[0.99] transition-all"
                          onClick={handleInstallPwaClick}
                        >
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-black/10 text-[9px] font-bold">
                            ⬆
                          </span>
                          <span>Instalar app en mi teléfono</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <IonModal
          isOpen={isInstallHelpOpen}
          onDidDismiss={() => setIsInstallHelpOpen(false)}
        >
          <div className="h-full w-full overflow-y-auto bg-black text-gray-100 px-4 py-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <h1 className="text-xl font-bold text-yellow-400">
                Instalar la carta como app en tu celular
              </h1>
              <p className="text-sm text-gray-300">
                Para que puedas abrir KROCAM como si fuera una aplicación más en tu
                teléfono, sigue estos pasos sencillos según tu dispositivo.
              </p>

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-yellow-300">
                  En celulares Android (Chrome u otro navegador moderno)
                </h2>
                <ol className="list-decimal pl-5 text-sm text-gray-300 space-y-1">
                  <li>Abre esta carta en el navegador de tu celular.</li>
                  <li>
                    Si ves un mensaje o botón de &quot;Instalar app&quot; del navegador, tócala y luego confirma en
                    &quot;Instalar&quot;.
                  </li>
                  <li>
                    Si no ves el mensaje, toca el botón de menú del navegador (tres puntos ⋮ arriba a la derecha).
                  </li>
                  <li>Elige la opción &quot;Agregar a pantalla principal&quot; o &quot;Instalar app&quot;.</li>
                  <li>Confirma tocando &quot;Agregar&quot; o &quot;Instalar&quot;.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-yellow-300">
                  En iPhone o iPad (Safari)
                </h2>
                <ol className="list-decimal pl-5 text-sm text-gray-300 space-y-1">
                  <li>Asegúrate de abrir la carta en Safari (el navegador de Apple).</li>
                  <li>
                    Toca el botón de compartir: un cuadro con una flecha hacia arriba en la parte inferior de la pantalla.
                  </li>
                  <li>
                    Desliza hacia arriba o hacia abajo en el menú que aparece y busca la opción &quot;Agregar a pantalla de inicio&quot;.
                  </li>
                  <li>Tócala, revisa el nombre que tendrá el ícono y luego toca &quot;Agregar&quot; en la esquina superior derecha.</li>
                </ol>
              </div>

              <p className="text-sm text-gray-300">
                Después de esto, verás el ícono de KROCAM en la pantalla de tu celular y podrás entrar directo como si fuera
                una app instalada.
              </p>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md bg-yellow-500 text-black text-sm font-semibold"
                  onClick={() => setIsInstallHelpOpen(false)}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
