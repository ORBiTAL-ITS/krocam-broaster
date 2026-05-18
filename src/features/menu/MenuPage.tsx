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
  IonTabBar,
  IonTabButton,
  IonToast,
} from '@ionic/react'
import { useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { CartaMenu, type ComboItem } from '../../components/CartaMenu'
import { LandingSections } from '../marketing/LandingSections'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { MENU_SECTIONS } from '../../data/menuSections'
import { useCart, type CartItem } from '../../context/CartContext'
import {
  cartOutline,
  fastFoodOutline,
  flameOutline,
  listOutline,
  logInOutline,
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
import { WebPushActivationBanner } from '../../components/WebPushActivationBanner'

/** false = tras confirmar el pedido no se abre WhatsApp (solo notificaciones en la app). */
const OPEN_WHATSAPP_AFTER_ORDER = false

const SECCIONES = MENU_SECTIONS

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
  const history = useHistory()
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

    if (!user) {
      history.push('/login?redirect=/')
      setIsCartOpen(false)
      setToastMessage('Inicia sesión para confirmar tu pedido.')
      setIsToastOpen(true)
      return
    }

    setIsCheckoutOpen(true)
  }

  const scrollToMenu = () => {
    document
      .getElementById('krocam-menu-anchor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleFeaturedAdd = (sectionIndex: number, combo: ComboItem) => {
    setSeccionActual(sectionIndex)
    const sectionTitle = SECCIONES[sectionIndex].title
    const name = `${combo.title} (${sectionTitle})`
    const id = `${sectionIndex}-${combo.id}`
    const numericPrice =
      Number(combo.price.replace(/\./g, '').replace(',', '.')) || 0

    addItem({
      id,
      name,
      section: sectionTitle,
      unitPrice: numericPrice,
    })

    setToastMessage(`${name} se añadió al carrito`)
    setIsToastOpen(true)
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
        onLogout={user ? logout : undefined}
        onOpenLogin={!user ? () => history.push('/login?redirect=/') : undefined}
        onOpenAdmin={onOpenAdmin}
        onOpenMyOrders={onOpenMyOrders}
        onOpenNotifications={onOpenNotifications}
        inboxUnreadCount={inboxUnread}
      />
      <IonContent className="ion-padding carta-content">
        <div id="krocam-menu-anchor" className="max-w-5xl mx-auto py-6 scroll-mt-4">
          {user && <WebPushActivationBanner />}
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
            <LandingSections
              sections={SECCIONES}
              onExploreMenu={scrollToMenu}
              onAddFeaturedCombo={handleFeaturedAdd}
            />
            <div className="max-w-5xl mx-auto mt-4 text-center text-xs text-gray-400 px-2">
              Al continuar, aceptas nuestra{' '}
              <Link
                to="/privacy-policy"
                className="underline text-gray-600 hover:text-gray-900 transition-colors"
              >
                política de privacidad
              </Link>{' '}
              y los{' '}
              <Link
                to="/terms"
                className="underline text-gray-600 hover:text-gray-900 transition-colors"
              >
                términos de uso
              </Link>
              .
            </div>
            <SiteFooter />
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
          {user ? (
            <>
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
              <IonTabButton tab="logout" onClick={() => logout()}>
                <IonIcon icon={logOutOutline} />
                <span className="krocam-bottom-tab-label">Cerrar sesión</span>
              </IonTabButton>
            </>
          ) : (
            <IonTabButton
              tab="login"
              onClick={() => history.push('/login?redirect=/')}
            >
              <IonIcon icon={logInOutline} />
              <span className="krocam-bottom-tab-label">Iniciar sesión</span>
            </IonTabButton>
          )}
        </IonTabBar>
      )}
    </IonPage>
  )
}

