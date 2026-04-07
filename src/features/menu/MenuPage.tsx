/**
 * MenuPage: flujo principal de carta, carrito y checkout (datos de entrega).
 * Implementa la lógica del feature de pedido (selección, carrito y confirmación).
 */

import {
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonModal,
  IonPage,
  IonTabBar,
  IonTabButton,
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
  fastFoodOutline,
  flameOutline,
  listOutline,
  logOutOutline,
  pizzaOutline,
  restaurantOutline,
  settingsOutline,
} from 'ionicons/icons'
import { MenuHeader } from './components/MenuHeader'
import { CartModal } from './components/CartModal'
import { CheckoutModal, type CheckoutDeliveryData } from './components/CheckoutModal'
import { useAuth } from '../../context/AuthContext'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { openWhatsAppWithMessage } from '../../services/whatsappDeepLink'
import { getWhatsappNumber } from '../../services/appConfig'
import { notifyAdminsNewOrder } from '../../services/notifyNewOrderPush'
import { useInboxUnreadCount } from '../../hooks/useInboxUnreadCount'
import { Capacitor } from '@capacitor/core'

/** false = tras confirmar el pedido no se abre WhatsApp (solo notificaciones en la app). */
const OPEN_WHATSAPP_AFTER_ORDER = false

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
        description:
          '1 Hamburguesa + papas a la francesa + 1 gaseosa personal + salsa de la casa',
        featured: true,
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '33.000',
        description:
          '1 Hamburguesa + 1 presa + papas a la francesa + 2 gaseosas personales + salsa de la casa',
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '48.000',
        description:
          '1 Hamburguesa + 2 presas y chicharrón de pollo + papas a la francesa + 2 gaseosas personales + salsa de la casa',
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
  onOpenNotifications?: () => void
}

export default function MenuPage({
  onOpenAdmin,
  onOpenMyOrders,
  onOpenNotifications,
}: MenuPageProps = {}) {
  const [seccionActual, setSeccionActual] = useState(0)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isToastOpen, setIsToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)

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
  const { user, logout, saveProfile } = useAuth()
  const inboxUnread = useInboxUnreadCount(user?.uid)

  const isNative = Capacitor.isNativePlatform()
  const isSmallWeb =
    !isNative && typeof window !== 'undefined' && window.innerWidth < 768
  const showBottomTabs = isNative || isSmallWeb
  const bottomTabsClassName = isNative
    ? 'krocam-bottom-tabs md:hidden'
    : 'krocam-bottom-tabs krocam-bottom-tabs-web md:hidden'

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

    // Guardar datos de entrega en el perfil para próximos pedidos
    try {
      await saveProfile({
        phone: deliveryData.phone,
        barrio: deliveryData.barrio,
        address: deliveryData.address,
        notes: deliveryData.notes,
      })
    } catch {
      // Si falla guardar perfil, igual se continúa con el pedido
    }

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

      // Pequeño retraso: el cliente llama a la API en Vercel; dar tiempo a que el pedido exista en Firestore.
      void (async () => {
        await new Promise((r) => setTimeout(r, 120))
        try {
          await notifyAdminsNewOrder(docRef.id)
        } catch (e) {
          console.warn('[notifyAdminsNewOrder]', e)
        }
      })()

      if (OPEN_WHATSAPP_AFTER_ORDER) {
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
        const whatsappNumber = await getWhatsappNumber()
        const opened = openWhatsAppWithMessage(whatsappMessage, whatsappNumber ?? undefined)
        if (!opened) {
          setToastMessage(
            'Configura el número de WhatsApp en el panel de administración para abrir WhatsApp.',
          )
          setIsToastOpen(true)
        }
      }
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
      OPEN_WHATSAPP_AFTER_ORDER
        ? 'Tu pedido fue registrado. Ahora te vamos a llevar a WhatsApp para que envíes el mensaje de confirmación y podamos empezar a preparar tu pedido. Solo revisa y dale ENVIAR.'
        : 'Tu pedido fue registrado. Te avisaremos por la app cuando haya novedades.',
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
        onOpenNotifications={onOpenNotifications}
        inboxUnreadCount={inboxUnread}
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

        {!Capacitor.isNativePlatform() && (
          <>
            <div className="mt-4 text-center text-xs text-gray-400">
              Al continuar, aceptas nuestra{' '}
              <button
                type="button"
                className="underline text-gray-300 hover:text-gray-100"
                onClick={() => setIsPrivacyOpen(true)}
              >
                política de privacidad
              </button>
              .
            </div>

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
          </>
        )}

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

        {/* Espacio extra inferior para que el FAB no tape las cards */}
        <div className="h-24" />

        {/* FAB carrito flotante */}
        <IonFab
          vertical="bottom"
          horizontal="start"
          slot="fixed"
          className={`ml-2 mb-4 ${!Capacitor.isNativePlatform() ? 'cart-fab-web' : ''}`}
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
      {showBottomTabs && (
        <IonTabBar slot="bottom" className={bottomTabsClassName}>
          <IonTabButton tab="orders" onClick={onOpenMyOrders}>
            <IonIcon icon={listOutline} />
            <span className="krocam-bottom-tab-label">Mis pedidos</span>
          </IonTabButton>
          {onOpenAdmin && (
            <IonTabButton tab="admin" onClick={onOpenAdmin}>
              <IonIcon icon={settingsOutline} />
              <span className="krocam-bottom-tab-label">Panel admin</span>
            </IonTabButton>
          )}
          <IonTabButton tab="logout" onClick={logout}>
            <IonIcon icon={logOutOutline} />
            <span className="krocam-bottom-tab-label">Cerrar sesión</span>
          </IonTabButton>
        </IonTabBar>
      )}
    </IonPage>
  )
}

