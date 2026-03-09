/**
 * CheckoutModal: modal de datos de entrega y mapa de ubicación.
 * Precarga datos del perfil en Firebase; el usuario puede cambiarlos solo para este pedido (no se actualiza el perfil).
 * Incluye teléfono, dirección y coords del mapa en el payload al confirmar.
 */

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonToolbar,
} from '@ionic/react'
import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'
import { closeOutline } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'

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
  onFinishOrder: (deliveryData: CheckoutDeliveryData) => void
}

export function CheckoutModal({
  isOpen,
  onClose,
  totalPrice,
  formatCurrency,
  onFinishOrder,
}: CheckoutModalProps) {
  const { profile } = useAuth()

  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliveryBarrio, setDeliveryBarrio] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && profile) {
      setDeliveryPhone(profile.phone ?? '')
      setDeliveryBarrio(profile.barrio ?? '')
      setDeliveryAddress(profile.address ?? '')
      setDeliveryNotes(profile.notes ?? '')
    }
    if (!isOpen) {
      setCoords(null)
      setLocationError(null)
    }
  }, [isOpen, profile])

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

  const handleConfirm = () => {
    if (!deliveryPhone.trim() || !deliveryBarrio.trim() || !deliveryAddress.trim()) {
      return
    }
    onFinishOrder({
      phone: deliveryPhone.trim(),
      barrio: deliveryBarrio.trim(),
      address: deliveryAddress.trim(),
      notes: deliveryNotes.trim(),
      coords,
    })
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
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
          <IonList lines="full">
            <IonItem>
              <IonLabel position="stacked">
                Teléfono de contacto
              </IonLabel>
              <IonInput
                type="tel"
                value={deliveryPhone}
                placeholder="Ej: 300 123 4567"
                onIonChange={(e) => setDeliveryPhone(e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">
                Barrio
              </IonLabel>
              <IonInput
                value={deliveryBarrio}
                placeholder="Ej: La Floresta, El Poblado..."
                onIonChange={(e) => setDeliveryBarrio(e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">
                Dirección exacta
              </IonLabel>
              <IonInput
                value={deliveryAddress}
                placeholder="Ej: Calle 10 # 12-34, apto 301"
                onIonChange={(e) => setDeliveryAddress(e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem>
              <IonLabel position="stacked">
                Referencias para llegar (opcional)
              </IonLabel>
              <IonInput
                value={deliveryNotes}
                placeholder="Color de la casa, puntos de referencia, etc."
                onIonChange={(e) => setDeliveryNotes(e.detail.value ?? '')}
              />
            </IonItem>
          </IonList>

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
              disabled={!deliveryPhone.trim() || !deliveryBarrio.trim() || !deliveryAddress.trim()}
            >
              Confirmar pedido
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonModal>
  )
}

