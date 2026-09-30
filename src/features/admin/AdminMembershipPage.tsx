/**
 * Panel admin: configurar programa de membresía y gestionar clientes.
 */

import {
  IonAlert,
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSearchbar,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AdminPageBackButton } from '../../components/layout/AdminPageBackButton'
import {
  findUserByUid,
  findUsersByPhone,
  listUsersWithPendingRewards,
  recalculateRewardPendingForAll,
  redeemLoyaltyReward,
  resetLoyaltyProgress,
  saveMembershipConfig,
  subscribeMembershipConfig,
} from '../../services/membershipService'
import type { MembershipConfig, UserMembershipLookup } from '../../types/membership'
import { isMembershipConfigComplete } from '../../types/membership'
import { MembershipCard } from '../membership/MembershipCard'

function firestoreErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: string }).code)
    if (code === 'permission-denied') {
      return 'Sin permisos para buscar clientes. En Firebase Console verifica que tu usuario tenga role: "admin" en users/{tu-uid}. Luego despliega reglas y functions: firebase deploy --only firestore:rules,functions'
    }
    if (code === 'functions/not-found' || code === 'not-found') {
      return 'La función de búsqueda no está desplegada. Ejecuta: cd functions && npm run deploy'
    }
  }
  return err instanceof Error ? err.message : fallback
}

function formatCop(value: number): string {
  return value.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

export default function AdminMembershipPage() {
  const location = useLocation()
  const [config, setConfig] = useState<MembershipConfig>({
    enabled: false,
    minOrderValueCop: 30000,
    stampsRequired: 5,
    rewardTitle: '',
    rewardDescription: '',
  })
  const [savingConfig, setSavingConfig] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [phoneSearch, setPhoneSearch] = useState('')
  const [uidSearch, setUidSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<UserMembershipLookup[]>([])
  const [pendingRewards, setPendingRewards] = useState<UserMembershipLookup[]>([])
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'redeem' | 'reset'
    user: UserMembershipLookup
  } | null>(null)

  const queryUid = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('uid')?.trim() ?? ''
  }, [location.search])

  useEffect(() => {
    const unsub = subscribeMembershipConfig((next) => setConfig(next))
    return () => unsub()
  }, [])

  useEffect(() => {
    void listUsersWithPendingRewards()
      .then(setPendingRewards)
      .catch(() => setPendingRewards([]))
  }, [results])

  useEffect(() => {
    if (!queryUid) return
    setUidSearch(queryUid)
    void (async () => {
      setSearching(true)
      try {
        const user = await findUserByUid(queryUid)
        setResults(user ? [user] : [])
        if (!user) setMessage('No se encontró cliente con ese UID.')
      } catch (e) {
        setMessage(firestoreErrorMessage(e, 'Error al buscar por UID.'))
      } finally {
        setSearching(false)
      }
    })()
  }, [queryUid])

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    setMessage(null)
    try {
      const payload = {
        enabled: config.enabled,
        minOrderValueCop: Number(config.minOrderValueCop) || 0,
        stampsRequired: Number(config.stampsRequired) || 1,
        rewardTitle: config.rewardTitle,
        rewardDescription: config.rewardDescription,
      }
      if (payload.enabled && !isMembershipConfigComplete(payload)) {
        setMessage('Para publicar, completa valor mínimo, sellos y título del premio.')
        return
      }
      await saveMembershipConfig(payload)
      await recalculateRewardPendingForAll(payload.stampsRequired)
      setMessage(
        payload.enabled
          ? 'Programa publicado. Solo pedidos entregados a partir de ahora acumulan sellos.'
          : 'Configuración guardada. El programa está desactivado para clientes.',
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo guardar la configuración.')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleSearch = async () => {
    const phone = phoneSearch.trim()
    const uid = uidSearch.trim()
    if (!phone && !uid) {
      setMessage('Ingresa teléfono o UID para buscar.')
      return
    }
    setSearching(true)
    setMessage(null)
    try {
      if (uid) {
        const user = await findUserByUid(uid)
        setResults(user ? [user] : [])
        if (!user) setMessage('No se encontró cliente con ese UID.')
      } else {
        const matches = await findUsersByPhone(phone)
        setResults(matches)
        if (matches.length === 0) setMessage('No hay clientes con ese teléfono.')
      }
    } catch (e) {
      setMessage(firestoreErrorMessage(e, 'Error en la búsqueda.'))
    } finally {
      setSearching(false)
    }
  }

  const runConfirmedAction = async () => {
    if (!confirmAction) return
    const { type, user } = confirmAction
    setBusyUserId(user.uid)
    setMessage(null)
    try {
      if (type === 'redeem') {
        await redeemLoyaltyReward(user.uid)
        setMessage('Premio canjeado y progreso reiniciado.')
      } else {
        await resetLoyaltyProgress(user.uid)
        setMessage('Progreso de membresía restablecido.')
      }
      await handleSearch()
      const pending = await listUsersWithPendingRewards()
      setPendingRewards(pending)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo completar la acción.')
    } finally {
      setBusyUserId(null)
      setConfirmAction(null)
    }
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="krocam-toolbar">
          <AdminPageBackButton />
          <IonTitle className="krocam-font-title text-white">Membresía</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding carta-content">
        <div className="max-w-2xl mx-auto py-4 space-y-6">
          {message && (
            <p className="text-sm rounded-xl px-3 py-2 bg-gray-100 text-gray-800">{message}</p>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="krocam-font-title text-lg font-bold text-gray-900">
              Configuración del programa
            </h2>
            <p className="text-xs text-gray-500">
              Los clientes solo ven la tarjeta cuando el programa está activo y completo.
            </p>

            <IonItem lines="none" className="rounded-xl border border-gray-100">
              <IonLabel>Programa activo</IonLabel>
              <IonToggle
                checked={config.enabled}
                onIonChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.detail.checked }))}
              />
            </IonItem>

            <IonItem lines="none" className="rounded-xl border border-gray-100">
              <IonLabel position="stacked">Valor mínimo por pedido (COP)</IonLabel>
              <IonInput
                type="number"
                inputMode="numeric"
                value={String(config.minOrderValueCop)}
                onIonInput={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    minOrderValueCop: Number(e.detail.value ?? 0),
                  }))
                }
              />
            </IonItem>

            <IonItem lines="none" className="rounded-xl border border-gray-100">
              <IonLabel position="stacked">Sellos requeridos</IonLabel>
              <IonInput
                type="number"
                inputMode="numeric"
                value={String(config.stampsRequired)}
                onIonInput={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    stampsRequired: Number(e.detail.value ?? 1),
                  }))
                }
              />
            </IonItem>

            <IonItem lines="none" className="rounded-xl border border-gray-100">
              <IonLabel position="stacked">Premio gratis</IonLabel>
              <IonInput
                value={config.rewardTitle}
                onIonInput={(e) =>
                  setConfig((prev) => ({ ...prev, rewardTitle: e.detail.value ?? '' }))
                }
                placeholder="Ej: 1 combo gratis"
              />
            </IonItem>

            <IonItem lines="none" className="rounded-xl border border-gray-100">
              <IonLabel position="stacked">Descripción (opcional)</IonLabel>
              <IonTextarea
                value={config.rewardDescription ?? ''}
                onIonInput={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    rewardDescription: e.detail.value ?? '',
                  }))
                }
                rows={2}
              />
            </IonItem>

            <IonButton
              expand="block"
              className="krocam-btn-primary font-semibold"
              disabled={savingConfig}
              onClick={() => void handleSaveConfig()}
            >
              {savingConfig ? 'Guardando…' : 'Guardar configuración'}
            </IonButton>
          </section>

          {pendingRewards.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm space-y-4">
              <h3 className="krocam-font-title text-base font-bold text-amber-900">
                Premios pendientes ({pendingRewards.length})
              </h3>
              {pendingRewards.map((user) => (
                <div key={user.uid} className="space-y-3">
                  <MembershipCard
                    config={config}
                    currentStamps={user.progress?.currentStamps ?? 0}
                    rewardPending={user.progress?.rewardPending ?? false}
                    phone={user.phone}
                  />
                  <IonButton
                    expand="block"
                    color="success"
                    size="small"
                    disabled={busyUserId === user.uid}
                    onClick={() => setConfirmAction({ type: 'redeem', user })}
                  >
                    Canjear premio
                  </IonButton>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <h2 className="krocam-font-title text-lg font-bold text-gray-900">
              Gestionar clientes
            </h2>

            <IonSearchbar
              value={phoneSearch}
              onIonInput={(e) => setPhoneSearch(e.detail.value ?? '')}
              placeholder="Buscar por teléfono"
              debounce={0}
            />

            <IonItem lines="none" className="rounded-xl border border-gray-100">
              <IonLabel position="stacked">O buscar por UID</IonLabel>
              <IonInput
                value={uidSearch}
                onIonInput={(e) => setUidSearch(e.detail.value ?? '')}
                placeholder="UID del cliente"
              />
            </IonItem>

            <IonButton expand="block" fill="outline" onClick={() => void handleSearch()}>
              {searching ? 'Buscando…' : 'Buscar cliente'}
            </IonButton>

            {searching && (
              <div className="flex justify-center py-4">
                <IonSpinner />
              </div>
            )}

            {!searching && results.length > 0 && (
              <div className="space-y-6">
                {results.map((user) => (
                  <div key={user.uid} className="space-y-3">
                    <MembershipCard
                      config={config}
                      currentStamps={user.progress?.currentStamps ?? 0}
                      rewardPending={user.progress?.rewardPending ?? false}
                      phone={user.phone}
                    />
                    <div className="flex flex-wrap gap-2">
                      <IonButton
                        expand="block"
                        className="flex-1 min-w-[140px]"
                        color="success"
                        disabled={!user.progress?.rewardPending || busyUserId === user.uid}
                        onClick={() => setConfirmAction({ type: 'redeem', user })}
                      >
                        Canjear premio
                      </IonButton>
                      <IonButton
                        expand="block"
                        className="flex-1 min-w-[140px]"
                        color="warning"
                        fill="outline"
                        disabled={busyUserId === user.uid}
                        onClick={() => setConfirmAction({ type: 'reset', user })}
                      >
                        Restablecer
                      </IonButton>
                    </div>
                    {user.barrio ? (
                      <p className="text-xs text-gray-500 text-center px-2">
                        {user.barrio} — {user.address}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <p className="text-xs text-gray-500 text-center">
            Mínimo actual: {formatCop(config.minOrderValueCop)} · Premio: {config.rewardTitle || '—'}
          </p>
        </div>

        <IonAlert
          isOpen={!!confirmAction}
          onDidDismiss={() => setConfirmAction(null)}
          header={confirmAction?.type === 'redeem' ? '¿Canjear premio?' : '¿Restablecer progreso?'}
          message={
            confirmAction?.type === 'redeem'
              ? 'El progreso volverá a 0 y se registrará el canje.'
              : 'Se pondrán los sellos en 0 sin registrar canje.'
          }
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Confirmar',
              handler: () => {
                void runConfirmedAction()
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  )
}
