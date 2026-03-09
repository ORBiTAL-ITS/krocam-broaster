import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonLoading,
  IonPage,
  IonText,
} from '@ionic/react'
import { type CSSProperties, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/Logo.png'

export default function ProfileSetupPage() {
  const { user, profile, profileLoading, saveProfile, logout } = useAuth()

  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [barrio, setBarrio] = useState(profile?.barrio ?? '')
  const [address, setAddress] = useState(profile?.address ?? '')
  const [notes, setNotes] = useState(profile?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!phone || !barrio || !address) {
      setError('Por favor completa al menos teléfono, barrio y dirección.')
      return
    }

    setError(null)
    setSaving(true)
    try {
      await saveProfile({ phone, barrio, address, notes })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string; message?: string }).code === 'permission-denied'
            ? 'Firestore: permiso denegado. Activa Firestore y configura las reglas (ver firestore.rules o consola).'
            : (err as { message?: string }).message ?? 'Error desconocido'
          : err instanceof Error
            ? err.message
            : 'Hubo un problema guardando tus datos. Intenta de nuevo.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const isBusy = profileLoading || saving

  return (
    <IonPage>
      <IonContent
        fullscreen
        className="bg-(--krocam-black)"
        style={{ '--background': 'var(--krocam-black)' } as CSSProperties}
      >
        <IonLoading isOpen={isBusy} message="Guardando tus datos..." />

        <div className="relative z-10 min-h-full flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-xl">
            <div className="rounded-3xl bg-white shadow-2xl overflow-hidden border border-white/10">
              <header className="bg-(--krocam-black) text-white px-6 pt-6 pb-4">
                <img
                  src={logo}
                  alt="KROCAM Broaster Samir"
                  className="mx-auto w-12 h-12 object-contain mb-2"
                />
                <p className="text-[10px] font-semibold tracking-[0.28em] uppercase text-(--krocam-gold) mb-1">
                  Datos de entrega
                </p>
                <h1 className="krocam-font-title text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Antes de tu primer pedido
                </h1>
                <p className="text-sm text-gray-300 mt-2 max-w-md leading-snug">
                  Guardaremos tu teléfono y dirección para que podamos llamarte y llevarte el pedido sin pedir
                  estos datos cada vez.
                </p>
                {user?.email && (
                  <p className="mt-2 text-xs text-gray-400">
                    Sesión iniciada como <span className="font-medium text-(--krocam-gold)">{user.email}</span>
                  </p>
                )}
              </header>

              <section className="px-6 py-6 sm:py-7 space-y-5">
                <form onSubmit={handleSave} className="space-y-4">
                  <IonItem lines="none" className="rounded-2xl overflow-hidden ion-no-margin">
                    <IonLabel position="stacked">Teléfono de contacto</IonLabel>
                    <IonInput
                      type="tel"
                      value={phone}
                      onIonChange={(e) => setPhone(e.detail.value ?? '')}
                      placeholder="Ej: 300 123 4567"
                      required
                    />
                  </IonItem>

                  <IonItem lines="none" className="rounded-2xl overflow-hidden ion-no-margin">
                    <IonLabel position="stacked">Barrio</IonLabel>
                    <IonInput
                      value={barrio}
                      onIonChange={(e) => setBarrio(e.detail.value ?? '')}
                      placeholder="Ej: La Floresta, El Poblado..."
                      required
                    />
                  </IonItem>

                  <IonItem lines="none" className="rounded-2xl overflow-hidden ion-no-margin">
                    <IonLabel position="stacked">Dirección exacta</IonLabel>
                    <IonInput
                      value={address}
                      onIonChange={(e) => setAddress(e.detail.value ?? '')}
                      placeholder="Ej: Calle 10 # 12-34, apto 301"
                      required
                    />
                  </IonItem>

                  <IonItem lines="none" className="rounded-2xl overflow-hidden ion-no-margin">
                    <IonLabel position="stacked">Referencias (opcional)</IonLabel>
                    <IonInput
                      value={notes}
                      onIonChange={(e) => setNotes(e.detail.value ?? '')}
                      placeholder="Color de la casa, puntos de referencia, etc."
                    />
                  </IonItem>

                  {error && (
                    <div className="rounded-xl bg-red-50 px-3 py-2">
                      <IonText color="danger" className="text-xs">
                        {error}
                      </IonText>
                    </div>
                  )}

                  <IonButton
                    expand="block"
                    type="submit"
                    disabled={isBusy}
                    className="krocam-btn-primary font-semibold rounded-2xl h-12 mt-2"
                  >
                    Guardar y ver la carta
                  </IonButton>
                </form>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="mx-auto mt-3 block text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cerrar sesión y cambiar de cuenta
                </button>
              </section>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}

