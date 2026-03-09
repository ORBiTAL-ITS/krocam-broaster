/**
 * CartModal: modal del carrito con listado de items y acciones básicas.
 * Se encarga sólo de presentación y callbacks de interacción.
 */

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonText,
  IonToolbar,
} from '@ionic/react'
import {
  addOutline,
  closeOutline,
  removeOutline,
  trashOutline,
} from 'ionicons/icons'
import type { CartItem } from '../../../context/CartContext'

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  totalItems: number
  totalPrice: number
  formatCurrency: (value: number) => string
  onRemoveOne: (id: string) => void
  onAddOne: (item: CartItem) => void
  onRemoveItem: (id: string) => void
  onClear: () => void
  onConfirmOrder: () => void
}

export function CartModal({
  isOpen,
  onClose,
  items,
  totalItems,
  totalPrice,
  formatCurrency,
  onRemoveOne,
  onAddOne,
  onRemoveItem,
  onClear,
  onConfirmOrder,
}: CartModalProps) {
  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader className="ion-no-border">
        <IonToolbar className="krocam-toolbar flex items-center justify-between px-4">
          <div className="py-2">
            <p className="text-xs text-gray-300 uppercase tracking-wider">
              Tu pedido
            </p>
            <p className="krocam-font-title text-lg font-bold text-white">
              Carrito ({totalItems})
            </p>
          </div>
          <IonButton fill="clear" color="light" onClick={onClose}>
            <IonIcon icon={closeOutline} slot="icon-only" />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding carta-content">
        {items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-gray-500">
            <p className="text-sm">
              Aún no has agregado productos.
              <br />
              Elige un combo y toca{' '}
              <span className="font-semibold">
                Agregar
              </span>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            <IonList lines="none" className="bg-transparent">
              {items.map((item) => (
                <IonItem
                  key={item.id}
                  className="rounded-2xl mb-2 bg-white shadow-sm"
                >
                  <IonLabel className="py-2">
                    <p className="krocam-font-title font-semibold text-sm text-gray-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.section} · {formatCurrency(item.unitPrice)}
                    </p>
                  </IonLabel>
                  <div className="flex items-center gap-1 mr-2">
                    <IonButton
                      size="small"
                      fill="clear"
                      onClick={() => onRemoveOne(item.id)}
                    >
                      <IonIcon icon={removeOutline} slot="icon-only" />
                    </IonButton>
                    <IonText className="w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </IonText>
                    <IonButton
                      size="small"
                      fill="clear"
                      onClick={() => onAddOne(item)}
                    >
                      <IonIcon icon={addOutline} slot="icon-only" />
                    </IonButton>
                  </div>
                  <IonText className="mr-3 text-sm font-semibold text-[var(--krocam-red)]">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </IonText>
                  <IonButton
                    fill="clear"
                    color="danger"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <IonIcon icon={trashOutline} slot="icon-only" />
                  </IonButton>
                </IonItem>
              ))}
            </IonList>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Total a pagar
                </p>
                <p className="krocam-font-title text-2xl font-bold text-gray-900">
                  {formatCurrency(totalPrice)}
                </p>
              </div>
              <div className="flex gap-2">
                <IonButton
                  fill="outline"
                  color="medium"
                  onClick={onClear}
                >
                  Vaciar
                </IonButton>
                <IonButton
                  className="krocam-font-title krocam-btn-danger font-semibold px-6"
                  onClick={onConfirmOrder}
                >
                  Confirmar pedido
                </IonButton>
              </div>
            </div>
          </div>
        )}
      </IonContent>
    </IonModal>
  )
}

