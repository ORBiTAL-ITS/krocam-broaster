/**
 * Mi cuenta: datos de entrega, cerrar sesión y eliminar cuenta.
 */

import {
  IonAlert,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonLoading,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { TabHomeButton } from '../../components/layout/TabHomeButton'
import { useShowBottomTabs } from '../../hooks/useShowBottomTabs'
import { ROUTES } from '../../routes/paths'

export default function AccountPage() {
  const history = useHistory()
  const showBottomTabs = useShowBottomTabs()
  const { user, profile, profileLoading, saveProfile, logout, deleteAccount } = useAuth()

  const [phone, setPhone] = useState('')
  const [barrio, setBarrio] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showDeletedAlert, setShowDeletedAlert] = useState(false)

  useEffect(() => {
    if (profileLoading || !profile) return
    setPhone(profile.phone ?? '')
    setBarrio(profile.barrio ?? '')
    setAddress(profile.address ?? '')
    setNotes(profile.notes ?? '')
  }, [profileLoading, profile])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!phone.trim() || !barrio.trim() || !address.trim()) {
      setError('Completa teléfono, barrio y dirección.')
      return
    }
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await saveProfile({ phone, barrio, address, notes })
      setSuccess('Datos guardados correctamente.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los datos.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setError(null)
    setDeleting(true)
    try {
      await deleteAccount({ signOut: false })
      setShowDeletedAlert(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta.')
    } finally {
      setDeleting(false)
    }
  }

  const isBusy = profileLoading || saving || deleting
  const isAdmin = profile?.role === 'admin'

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="krocam-toolbar">
          {showBottomTabs ? (
            <IonButtons slot="start">
              <TabHomeButton />
            </IonButtons>
          ) : (
            <IonButtons slot="start">
              <IonBackButton defaultHref={ROUTES.HOME} text="Volver" color="light" />
            </IonButtons>
          )}
          <IonTitle className="krocam-font-title text-white">Mi cuenta</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding bg-gray-50">
        <IonLoading isOpen={isBusy} message={deleting ? 'Eliminando cuenta…' : 'Guardando…'} />

        <div className="max-w-lg mx-auto py-4 space-y-6">
          {user?.email && (
            <p className="text-sm text-gray-600">
              Sesión: <span className="font-medium text-gray-900">{user.email}</span>
            </p>
          )}

          <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
            <h2 className="krocam-font-title text-lg font-bold text-gray-900 mb-1">
              Datos de entrega
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Los usamos para tus pedidos y para contactarte.
            </p>

            <form onSubmit={handleSave} className="space-y-3">
              <IonItem lines="none" className="rounded-xl border border-gray-100">
                <IonLabel position="stacked">Teléfono</IonLabel>
                <IonInput
                  type="tel"
                  value={phone}
                  onIonInput={(e) => setPhone(e.detail.value ?? '')}
                  required
                />
              </IonItem>
              <IonItem lines="none" className="rounded-xl border border-gray-100">
                <IonLabel position="stacked">Barrio</IonLabel>
                <IonInput
                  value={barrio}
                  onIonInput={(e) => setBarrio(e.detail.value ?? '')}
                  required
                />
              </IonItem>
              <IonItem lines="none" className="rounded-xl border border-gray-100">
                <IonLabel position="stacked">Dirección</IonLabel>
                <IonInput
                  value={address}
                  onIonInput={(e) => setAddress(e.detail.value ?? '')}
                  required
                />
              </IonItem>
              <IonItem lines="none" className="rounded-xl border border-gray-100">
                <IonLabel position="stacked">Referencias (opcional)</IonLabel>
                <IonInput
                  value={notes}
                  onIonInput={(e) => setNotes(e.detail.value ?? '')}
                />
              </IonItem>

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2">
                  <IonText color="danger" className="text-xs">
                    {error}
                  </IonText>
                </div>
              )}
              {success && (
                <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</p>
              )}

              <IonButton
                expand="block"
                type="submit"
                disabled={isBusy}
                className="krocam-btn-primary font-semibold mt-2"
              >
                Guardar cambios
              </IonButton>
            </form>
          </section>

          <section className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm space-y-3">
            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              disabled={isBusy}
              onClick={() => logout().then(() => history.replace(ROUTES.HOME))}
            >
              Cerrar sesión
            </IonButton>
          </section>

          {!isAdmin && (
            <section className="rounded-2xl border border-red-200 bg-red-50/80 p-5">
              <IonButton
                expand="block"
                color="danger"
                fill="outline"
                disabled={isBusy}
                onClick={() => setConfirmDelete(true)}
              >
                Eliminar cuenta
              </IonButton>
            </section>
          )}

          {isAdmin && (
            <p className="text-xs text-gray-500 text-center px-2">
              Las cuentas de administrador no pueden eliminarse desde aquí.
            </p>
          )}
        </div>

        <IonAlert
          isOpen={confirmDelete}
          onDidDismiss={() => setConfirmDelete(false)}
          header="¿Eliminar tu cuenta?"
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: () => {
                void handleDelete()
              },
            },
          ]}
        />

        <IonAlert
          isOpen={showDeletedAlert}
          onDidDismiss={() => {
            setShowDeletedAlert(false)
            void logout().then(() => history.replace(ROUTES.HOME))
          }}
          message="Tu cuenta fue eliminada."
          buttons={['Entendido']}
        />
      </IonContent>
    </IonPage>
  )
}
