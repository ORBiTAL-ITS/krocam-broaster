/**
 * CheckoutModal: modal de datos de entrega y mapa de ubicación.
 * Precarga datos guardados (local + Firebase) y sincroniza con Mi cuenta al escribir.
 * Incluye teléfono, dirección y coords del mapa en el payload al confirmar.
 */

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonToolbar,
} from '@ionic/react'
import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'
import { closeOutline } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { useDeliveryProfileForm } from '../../../hooks/useDeliveryProfileForm'

export interface CheckoutDeliveryData {
  phone: string
  barrio: string
  address: string
  notes: string
  coords: { lat: number; lng: number } | null
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  totalPrice: number
  formatCurrency: (value: number) => string
  onFinishOrder: (deliveryData: CheckoutDeliveryData) => Promise<void> | void
}

export function CheckoutModal({
  isOpen,
  onClose,
  totalPrice,
  formatCurrency,
  onFinishOrder,
}: CheckoutModalProps) {
  const {
    phone: deliveryPhone,
    barrio: deliveryBarrio,
    address: deliveryAddress,
    notes: deliveryNotes,
    setPhone: setDeliveryPhone,
    setBarrio: setDeliveryBarrio,
    setAddress: setDeliveryAddress,
    setNotes: setDeliveryNotes,
  } = useDeliveryProfileForm({ active: isOpen })

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) return
    setCoords(null)
    setLocationError(null)
  }, [isOpen])

  const handleUseCurrentLocation = async () => {
    const isNative = Capacitor.isNativePlatform()

    if (isNative) {
      // Android/iOS: usar plugin de Capacitor (permisos nativos y API estable)
      setIsLocating(true)
      setLocationError(null)
      try {
        const status = await Geolocation.checkPermissions()
        if (status.location !== 'granted') {
          const request = await Geolocation.requestPermissions()
          if (request.location !== 'granted') {
            setLocationError(
              'Se necesita permiso de ubicación para usar esta función. Puedes escribir tu barrio y dirección manualmente.',
            )
            setIsLocating(false)
            return
          }
        }
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        })
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      } catch (err: unknown) {
        const rawMessage =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : err instanceof Error
              ? err.message
              : String(err)
        const message = rawMessage.trim().toLowerCase()
        let userMessage: string
        if (message.includes('denied') || message.includes('permission')) {
          userMessage = 'Permiso de ubicación denegado. Escribe tu barrio y dirección manualmente.'
        } else if (message.includes('disabled') || message.includes('not enabled')) {
          userMessage = 'Activa el GPS o la ubicación en la configuración del dispositivo e inténtalo de nuevo.'
        } else if (message.includes('timeout') || message.includes('time')) {
          userMessage = 'Tardó demasiado en obtener la ubicación. Comprueba que el GPS esté activo o ingresa la dirección manualmente.'
        } else {
          userMessage = 'No pudimos obtener tu ubicación. Verifica los permisos o ingrésala manualmente.'
        }
        setLocationError(`${userMessage}${rawMessage ? ` (Error: ${rawMessage})` : ''}`)
      } finally {
        setIsLocating(false)
      }
      return
    }

    // Web: API del navegador
    if (!navigator.geolocation) {
      setLocationError(
        'Tu navegador no permite acceder a la ubicación. Puedes escribir tu barrio y dirección manualmente.',
      )
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false)
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        setIsLocating(false)
        setLocationError(
          'No pudimos obtener tu ubicación. Verifica los permisos o ingrésala manualmente.',
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    )
  }

  const handleConfirm = async () => {
    if (isSubmitting) return
    if (!deliveryPhone.trim() || !deliveryBarrio.trim() || !deliveryAddress.trim()) {
      return
    }
    setIsSubmitting(true)
    try {
      await onFinishOrder({
        phone: deliveryPhone.trim(),
        barrio: deliveryBarrio.trim(),
        address: deliveryAddress.trim(),
        notes: deliveryNotes.trim(),
        coords,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClassName =
    'mt-1 w-full bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400'

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} keepContentsMounted>
      <IonHeader className="ion-no-border">
        <IonToolbar className="krocam-toolbar flex items-center justify-between px-4">
          <div className="py-2">
            <p className="text-xs text-gray-300 uppercase tracking-wider">
              Paso final
            </p>
            <p className="krocam-font-title text-lg font-bold text-white">
              Datos de entrega
            </p>
          </div>
          <IonButton fill="clear" color="light" onClick={onClose}>
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding carta-content">
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden divide-y divide-gray-100">
            <label className="block px-4 py-3">
              <span className="text-xs font-medium text-gray-500">
                Teléfono de contacto
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={deliveryPhone}
                placeholder="Ej: 300 123 4567"
                onChange={(e) => setDeliveryPhone(e.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="block px-4 py-3">
              <span className="text-xs font-medium text-gray-500">Barrio</span>
              <input
                type="text"
                autoComplete="address-level3"
                value={deliveryBarrio}
                placeholder="Ej: La Floresta, El Poblado..."
                onChange={(e) => setDeliveryBarrio(e.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="block px-4 py-3">
              <span className="text-xs font-medium text-gray-500">
                Dirección exacta
              </span>
              <input
                type="text"
                autoComplete="street-address"
                value={deliveryAddress}
                placeholder="Ej: Calle 10 # 12-34, apto 301"
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className={inputClassName}
              />
            </label>
            <label className="block px-4 py-3">
              <span className="text-xs font-medium text-gray-500">
                Referencias para llegar (opcional)
              </span>
              <input
                type="text"
                value={deliveryNotes}
                placeholder="Color de la casa, puntos de referencia, etc."
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className={inputClassName}
              />
            </label>
          </div>

          <div className="mt-2 space-y-3">
            <p className="text-xs text-gray-500">
              Opcional: comparte tu ubicación aproximada para que el
              domiciliario te encuentre más fácil.
            </p>
            <IonButton
              expand="block"
              size="small"
              fill="outline"
              color="medium"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
            >
              {isLocating
                ? 'Obteniendo tu ubicación...'
                : 'Usar mi ubicación actual'}
            </IonButton>
            {locationError ? (
              <p className="text-xs text-red-500">
                {locationError}
              </p>
            ) : null}
            {coords ? (
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm mt-1">
                <iframe
                  title="Mapa de tu ubicación"
                  src={`https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=17&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-56"
                />
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Cuando actives tu ubicación, aquí verás un mapa de referencia
                para la entrega.
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Resumen pedido
              </p>
              <p className="krocam-font-title text-xl font-bold text-gray-900">
                {formatCurrency(totalPrice)}
              </p>
            </div>
            <IonButton
              className="krocam-font-title krocam-btn-danger font-semibold px-6"
              onClick={handleConfirm}
              disabled={
                isSubmitting ||
                !deliveryPhone.trim() ||
                !deliveryBarrio.trim() ||
                !deliveryAddress.trim()
              }
            >
              {isSubmitting ? 'Enviando pedido...' : 'Confirmar pedido'}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  )
}

