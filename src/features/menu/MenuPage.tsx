/**
 * MenuPage: flujo principal de carta, carrito y checkout (datos de entrega).
 * Implementa la lógica del feature de pedido (selección, carrito y confirmación).
 */

import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonPage,
  IonSpinner,
  IonToast,
} from '@ionic/react'
import { useEffect, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { ROUTES, loginPath } from '../../routes/paths'
import { usePermissions } from '../../hooks/usePermissions'
import { CartaMenu, type ComboItem } from '../../components/CartaMenu'
import { LandingSections } from '../marketing/LandingSections'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { useMenu, formatPriceCop } from '../../hooks/useMenu'
import { migrateMenuSeed } from '../../services/migrateMenuSeed'
import { useCart, type CartItem } from '../../context/CartContext'
import {
  cartOutline,
  fastFoodOutline,
  flameOutline,
  pizzaOutline,
  restaurantOutline,
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
import { useShowBottomTabs } from '../../hooks/useShowBottomTabs'
import { WebPushActivationBanner } from '../../components/WebPushActivationBanner'
import { MenuEditPanel } from './edit/MenuEditPanel'
import { ReviewsSection } from '../../components/reviews/ReviewsSection'

/** false = tras confirmar el pedido no se abre WhatsApp (solo notificaciones en la app). */
const OPEN_WHATSAPP_AFTER_ORDER = false

export interface MenuPageProps {
  editMode?: boolean
}

export default function MenuPage({ editMode = false }: MenuPageProps = {}) {
  const history = useHistory()
  const { isAdmin, canAccessOrdersAdmin } = usePermissions()
  const { sections, getHeroSrc, loading: menuLoading, source: menuSource } = useMenu(editMode)
  const [seccionActual, setSeccionActual] = useState(0)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isToastOpen, setIsToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    if (seccionActual >= sections.length && sections.length > 0) {
      setSeccionActual(0)
    }
  }, [sections.length, seccionActual])

  const currentSection = sections[seccionActual]
  const title = currentSection?.title ?? ''
  const heroImageAlt = currentSection?.heroImageAlt ?? ''
  const heroImageSrc = currentSection ? getHeroSrc(currentSection) : ''
  const combos: ComboItem[] =
    currentSection?.combos
      .filter((c) => c.active)
      .map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        price: formatPriceCop(c.priceCop),
      })) ?? []
  const {
    items,
    totalItems,
    totalPrice,
    addItem,
    removeOne,
    removeAllOfItem,
    clear,
    pruneInvalidItems,
  } = useCart()

  useEffect(() => {
    const validIds = new Set<string>()
    for (const sec of sections) {
      for (const c of sec.combos) {
        if (c.active) validIds.add(`${sec.id}-${c.id}`)
      }
    }
    pruneInvalidItems(validIds, (removed) => {
      if (removed.length > 0) {
        setToastMessage(
          `Algunos productos ya no están disponibles y se quitaron del carrito: ${removed.join(', ')}`,
        )
        setIsToastOpen(true)
      }
    })
  }, [sections, pruneInvalidItems])

  const { user, logout, saveProfile } = useAuth()
  const inboxUnread = useInboxUnreadCount(user?.uid)

  const isNative = Capacitor.isNativePlatform()
  const showBottomTabs = useShowBottomTabs()

  const handleAddToCart = (combo: ComboItem) => {
    if (!currentSection) return
    const section = title
    const name = `${combo.title} (${section})`
    const id = `${currentSection.id}-${combo.id}`
    const menuCombo = currentSection.combos.find((c) => c.id === combo.id)
    const numericPrice = menuCombo?.priceCop ?? 0

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
      history.push(loginPath(ROUTES.HOME))
      setIsCartOpen(false)
      setToastMessage('Inicia sesión para confirmar tu pedido.')
      setIsToastOpen(true)
      return
    }

    setIsCartOpen(false)
    setIsCheckoutOpen(true)
  }

  const scrollToMenu = () => {
    document
      .getElementById('krocam-menu-anchor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    setTimeout(() => history.push(ROUTES.ORDERS), 1200)
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
        secciones={sections.map(({ id, title: seccionTitle }) => ({
          id,
          title: seccionTitle,
        }))}
        getSectionIcon={getSectionIcon}
        onLogout={user ? logout : undefined}
        onOpenLogin={!user ? () => history.push(loginPath(ROUTES.HOME)) : undefined}
        onOpenAdmin={
          canAccessOrdersAdmin ? () => history.push(ROUTES.ADMIN_ORDERS) : undefined
        }
        onOpenMenuEdit={isAdmin ? () => history.push(ROUTES.MENU_EDIT) : undefined}
        editMode={editMode}
        hideCategoryTabs={editMode}
        onExitEdit={editMode ? () => history.push(ROUTES.HOME) : undefined}
        onOpenMyOrders={user ? () => history.push(ROUTES.ORDERS) : undefined}
        onOpenAccount={user ? () => history.push(ROUTES.ACCOUNT) : undefined}
        onOpenNotifications={
          user ? () => history.push(ROUTES.NOTIFICATIONS) : undefined
        }
        inboxUnreadCount={inboxUnread}
      />
      <IonContent className="ion-padding carta-content">
        <div id="krocam-menu-anchor" className="max-w-5xl mx-auto py-6 scroll-mt-4">
          {editMode && menuSource !== 'firestore' && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="mb-2">Primera vez: sube el menú actual a Firebase.</p>
              <IonButton
                size="small"
                disabled={seeding}
                onClick={async () => {
                  setSeeding(true)
                  setSeedMessage(null)
                  try {
                    const res = await migrateMenuSeed()
                    setSeedMessage(res.message)
                  } catch (e) {
                    setSeedMessage(
                      e instanceof Error ? e.message : 'Error al migrar el menú.',
                    )
                  } finally {
                    setSeeding(false)
                  }
                }}
              >
                {seeding ? 'Migrando…' : 'Migrar menú inicial a Firebase'}
              </IonButton>
              {seedMessage && <p className="text-xs mt-2">{seedMessage}</p>}
            </div>
          )}
          {editMode && !menuLoading && (
            <MenuEditPanel
              sections={sections}
              seccionActual={seccionActual}
              onChangeSeccion={setSeccionActual}
              onToast={(msg) => {
                setToastMessage(msg)
                setIsToastOpen(true)
              }}
            />
          )}
          {menuLoading && (
            <div className="flex justify-center py-12">
              <IonSpinner name="crescent" />
            </div>
          )}
          {!menuLoading && sections.length === 0 && (
            <p className="text-center text-gray-500 py-8">No hay categorías en el menú.</p>
          )}
          {user && <WebPushActivationBanner />}
          {!menuLoading && currentSection && (
          <CartaMenu
            sectionTitle={title}
            combos={combos}
            heroImageSrc={heroImageSrc}
            heroImageAlt={heroImageAlt}
            onAddCombo={handleAddToCart}
          />
          )}
        </div>

        {!editMode && !menuLoading && (
          <ReviewsSection
            sections={sections}
            currentSection={currentSection ?? null}
            className="mt-2"
          />
        )}

        {!Capacitor.isNativePlatform() && (
          <>
            <LandingSections onExploreMenu={scrollToMenu} />
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
          onClose={() => {
            setIsCheckoutOpen(false)
            if (items.length > 0) setIsCartOpen(true)
          }}
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
          className={[
            'ml-2 mb-4',
            showBottomTabs && isNative && 'cart-fab-native-tabs',
            showBottomTabs && !isNative && 'cart-fab-web',
          ]
            .filter(Boolean)
            .join(' ')}
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

