/**
 * PWA / Safari: en iOS el permiso de push debe solicitarse con un gesto (botón).
 * Sin esto, el registro automático tras el login no guarda token FCM.
 */

import { IonButton } from '@ionic/react'
import { useCallback, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../context/AuthContext'
import {
  registerPushNotifications,
  shouldShowWebPushActivationBanner,
  webPushRequiresUserGesture,
} from '../services/pushNotifications'

export function WebPushActivationBanner() {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(false)

  const visible =
    !!user?.uid &&
    !Capacitor.isNativePlatform() &&
    !hidden &&
    shouldShowWebPushActivationBanner()

  const onActivate = useCallback(async () => {
    if (!user?.uid) return
    setBusy(true)
    try {
      await registerPushNotifications(user.uid)
    } finally {
      setBusy(false)
    }
  }, [user?.uid])

  if (!visible) return null

  const hintIos = webPushRequiresUserGesture()
    ? ' En iPhone, la app debe estar añadida a la pantalla de inicio desde Safari (iOS 16.4 o superior).'
    : ''

  return (
    <div
      className="mb-4 rounded-xl border border-(--krocam-red)/50 bg-(--krocam-red)/10 px-3 py-3 text-sm text-gray-100 shadow-sm"
      role="status"
    >
      <p className="mb-2 leading-snug">
        <span className="font-semibold text-white">Avisos de pedido.</span> Activa las
        notificaciones para recibir alertas cuando tu pedido cambie de estado, incluso si
        instalaste la app desde el navegador.
        {hintIos}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <IonButton
          size="small"
          className="font-semibold"
          onClick={onActivate}
          disabled={busy}
        >
          {busy ? 'Activando…' : 'Activar notificaciones'}
        </IonButton>
        <IonButton
          size="small"
          fill="clear"
          color="medium"
          onClick={() => setHidden(true)}
        >
          Ahora no
        </IonButton>
      </div>
    </div>
  )
}
