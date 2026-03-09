/**
 * MenuPage: flujo principal de carta, carrito y checkout (datos de entrega).
 * Implementa la lógica del feature de pedido (selección, carrito y confirmación).
 */

import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonPage,
  IonToast,
} from '@ionic/react'
import { useState } from 'react'
import { CartaMenu, type ComboItem } from '../../components/CartaMenu'

import alasImg from '../../assets/WhatsApp Image 2026-03-05 at 11.23.32.png'
import pernilContramusloImg from '../../assets/WhatsApp Image 2026-03-05 at 11.23.32 (1).png'
import hamburguesaImg from '../../assets/WhatsApp Image 2026-03-05 at 11.23.31.png'
import chicharronImg from '../../assets/WhatsApp Image 2026-03-05 at 11.23.31 (1).png'
import { useCart, type CartItem } from '../../context/CartContext'
import {
  cartOutline,
  restaurantOutline,
  flameOutline,
  fastFoodOutline,
  pizzaOutline,
} from 'ionicons/icons'
import { MenuHeader } from './components/MenuHeader'
import { CartModal } from './components/CartModal'
import { CheckoutModal, type CheckoutDeliveryData } from './components/CheckoutModal'
import { useAuth } from '../../context/AuthContext'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { openWhatsAppWithMessage } from '../../services/whatsappDeepLink'

const SECCIONES: Array<{
  id: string
  title: string
  heroImageSrc: string
  heroImageAlt: string
  combos: ComboItem[]
}> = [
  {
    id: 'alas',
    title: 'Alas',
    heroImageSrc: alasImg,
    heroImageAlt: 'Alitas broaster KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '14.000',
        description:
          '2 Presas + papas a la francesa + gaseosa personal + salsa de la casa',
        featured: true,
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '26.000',
        description:
          '4 Presas + papas a la francesa + 2 gaseosas personales + salsa de la casa',
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '38.000',
        description:
          '6 Presas + papas a la francesa + 3 gaseosas personales + salsa de la casa',
      },
      {
        id: 4,
        title: 'Combo #4',
        price: '48.000',
        description:
          '8 Presas + papas a la francesa + 4 gaseosas personales + salsa de la casa',
      },
    ] as ComboItem[],
  },
  {
    id: 'pernil',
    title: 'Pernil',
    heroImageSrc: pernilContramusloImg,
    heroImageAlt: 'Perniles de pollo broaster KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '14.000',
        description:
          '2 Presas + papas a la francesa + gaseosa personal + salsa de la casa',
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '26.000',
        description:
          '4 Presas + papas a la francesa + 2 gaseosas personales + salsa de la casa',
        featured: true,
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '38.000',
        description:
          '6 Presas + papas a la francesa + 3 gaseosas personales + salsa de la casa',
      },
      {
        id: 4,
        title: 'Combo #4',
        price: '48.000',
        description:
          '8 Presas + papas a la francesa + 4 gaseosas personales + salsa de la casa',
      },
    ] as ComboItem[],
  },
  {
    id: 'contramuslo',
    title: 'Contra muslo',
    heroImageSrc: pernilContramusloImg,
    heroImageAlt: 'Piezas contra muslo KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '14.000',
        description:
          '2 Presas + papas a la francesa + gaseosa personal + salsa de la casa',
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '26.000',
        description:
          '4 Presas + papas a la francesa + 2 gaseosas personales + salsa de la casa',
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '38.000',
        description:
          '6 Presas + papas a la francesa + 3 gaseosas personales + salsa de la casa',
        featured: true,
      },
      {
        id: 4,
        title: 'Combo #4',
        price: '48.000',
        description:
          '8 Presas + papas a la francesa + 4 gaseosas personales + salsa de la casa',
      },
    ] as ComboItem[],
  },
  {
    id: 'hamburguesa',
    title: 'Hamburguesa',
    heroImageSrc: hamburguesaImg,
    heroImageAlt: 'Hamburguesa de pollo crocante KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '26.000',
        description: 'Hamburguesa + papas + gaseosa',
        featured: true,
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '33.000',
        description: 'Hamburguesa doble + papas + 2 gaseosas',
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '48.000',
        description: 'Hamburguesa familiar + papas + 4 gaseosas',
      },
    ] as ComboItem[],
  },
  {
    id: 'chicharron',
    title: 'Chicharrón de pollo',
    heroImageSrc: chicharronImg,
    heroImageAlt: 'Chicharrón de pollo KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '15.000',
        description:
          'Trozos de pechuga + papas + gaseosa + salsa',
        featured: true,
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '28.000',
        description:
          'Trozos de pechuga + papas + 2 gaseosas + salsa',
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '40.000',
        description:
          'Trozos de pechuga + papas + 3 gaseosas + salsa',
      },
      {
        id: 4,
        title: 'Combo #4',
        price: '50.000',
        description:
          'Trozos de pechuga + papas + 4 gaseosas + salsa',
      },
    ] as ComboItem[],
  },
]

export interface MenuPageProps {
  onOpenAdmin?: () => void
  onOpenMyOrders?: () => void
}

export default function MenuPage({ onOpenAdmin, onOpenMyOrders }: MenuPageProps = {}) {
  const [seccionActual, setSeccionActual] = useState(0)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isToastOpen, setIsToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const {
    title,
    combos,
    heroImageSrc,
    heroImageAlt,
  } = SECCIONES[seccionActual]
  const {
    items,
    totalItems,
    totalPrice,
    addItem,
    removeOne,
    removeAllOfItem,
    clear,
  } = useCart()
  const { user, logout } = useAuth()

  const handleAddToCart = (combo: ComboItem) => {
    const section = title
    const name = `${combo.title} (${section})`
    const id = `${seccionActual}-${combo.id}`
    const numericPrice =
      Number(combo.price.replace(/\./g, '').replace(',', '.')) || 0

    addItem({
      id,
      name,
      section,
      unitPrice: numericPrice,
    })

    setToastMessage(`${name} se añadió al carrito`)
    setIsToastOpen(true)
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    })

  const handleConfirmCart = () => {
    if (items.length === 0) {
      setToastMessage(
        'Agrega productos al carrito antes de confirmar tu pedido.',
      )
      setIsToastOpen(true)
      return
    }

    setIsCheckoutOpen(true)
  }

  const handleFinishOrder = async (deliveryData: CheckoutDeliveryData) => {
    if (!user) return

    const orderData = {
      userId: user.uid,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        section: i.section,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      totalPrice: Number(totalPrice),
      delivery: {
        phone: String(deliveryData.phone ?? ''),
        barrio: String(deliveryData.barrio ?? ''),
        address: String(deliveryData.address ?? ''),
        notes: String(deliveryData.notes ?? ''),
      },
      coords: deliveryData.coords
        ? { lat: Number(deliveryData.coords.lat), lng: Number(deliveryData.coords.lng) }
        : null,
      status: 'pendiente',
      createdAt: serverTimestamp(),
    }

    try {
      const docRef = await addDoc(collection(db, 'orders'), orderData)
      const orderIdShort = docRef.id.slice(-6)
      const itemsText = items
        .map((i) => `• ${i.quantity}× ${i.name}`)
        .join('\n')
      const totalFormatted = formatCurrency(totalPrice)
      const whatsappMessage =
        `¡Hola! Quiero realizar mi pedido:\n\n` +
        `${itemsText}\n\n` +
        `Total: ${totalFormatted}\n` +
        `Dirección: ${deliveryData.address}\n` +
        `Barrio: ${deliveryData.barrio}\n` +
        `Tel: ${deliveryData.phone}\n` +
        (deliveryData.notes ? `Referencias: ${deliveryData.notes}\n` : '') +
        `\n(Pedido #${orderIdShort})`
      openWhatsAppWithMessage(whatsappMessage)
      // import('../../services/notifyWhatsApp').then((m) => m.triggerNotifyOrders())
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : ''
      console.error('Error al guardar pedido:', err)
      if (code === 'permission-denied') {
        setToastMessage(
          'Permiso denegado. Publica las reglas de Firestore (colección orders) en la consola de Firebase.',
        )
      } else {
        setToastMessage(`No se pudo registrar el pedido. ${msg || 'Intenta de nuevo.'}`)
      }
      setIsToastOpen(true)
      return
    }

    setIsCheckoutOpen(false)
    setIsCartOpen(false)
    clear()
    setToastMessage(
      'Tu pedido fue registrado. Revisa "Mis pedidos" para ver el estado.',
    )
    setIsToastOpen(true)
    setTimeout(() => onOpenMyOrders?.(), 1200)
  }

  const handleAddExistingItem = (item: CartItem) => {
    addItem({
      id: item.id,
      name: item.name,
      section: item.section,
      unitPrice: item.unitPrice,
    })
  }

  const getSectionIcon = (id: string) => {
    switch (id) {
      case 'alas':
        return restaurantOutline
      case 'pernil':
      case 'contramuslo':
        return flameOutline
      case 'hamburguesa':
        return fastFoodOutline
      case 'chicharron':
        return pizzaOutline
      default:
        return restaurantOutline
    }
  }

  return (
    <IonPage>
      <MenuHeader
        seccionActual={seccionActual}
        onChangeSeccion={setSeccionActual}
        secciones={SECCIONES.map(({ id, title: seccionTitle }) => ({
          id,
          title: seccionTitle,
        }))}
        getSectionIcon={getSectionIcon}
        onLogout={logout}
        onOpenAdmin={onOpenAdmin}
        onOpenMyOrders={onOpenMyOrders}
      />
      <IonContent className="ion-padding carta-content">
        <div className="max-w-5xl mx-auto py-6">
          <CartaMenu
            sectionTitle={title}
            combos={combos}
            heroImageSrc={heroImageSrc}
            heroImageAlt={heroImageAlt}
            onAddCombo={handleAddToCart}
          />
        </div>

        <CartModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={items}
          totalItems={totalItems}
          totalPrice={totalPrice}
          formatCurrency={formatCurrency}
          onRemoveOne={removeOne}
          onAddOne={handleAddExistingItem}
          onRemoveItem={removeAllOfItem}
          onClear={clear}
          onConfirmOrder={handleConfirmCart}
        />

        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          totalPrice={totalPrice}
          formatCurrency={formatCurrency}
          onFinishOrder={handleFinishOrder}
        />

        {/* FAB carrito flotante */}
        <IonFab
          vertical="bottom"
          horizontal="end"
          slot="fixed"
          className="mr-2 mb-4"
        >
          <div className="cart-fab-wrapper">
            <IonFabButton onClick={() => setIsCartOpen(true)}>
              <IonIcon icon={cartOutline} />
            </IonFabButton>
            {totalItems > 0 && (
              <span className="cart-badge">
                {totalItems}
              </span>
            )}
          </div>
        </IonFab>

        <IonToast
          isOpen={isToastOpen}
          message={toastMessage}
          duration={1600}
          position="top"
          color="dark"
          onDidDismiss={() => setIsToastOpen(false)}
        />
      </IonContent>
    </IonPage>
  )
}

