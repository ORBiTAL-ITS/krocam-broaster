/**
 * MenuHeader: cabecera fija con logo KROCAM y tabs de secciones.
 * Se limita a la presentación y cambio de sección.
 */

import { IonButton, IonHeader, IonIcon, IonToolbar } from '@ionic/react'
import { listOutline, logOutOutline, notificationsOutline, settingsOutline } from 'ionicons/icons'
import logo from '../../../assets/Logo.png'

interface MenuHeaderProps {
  seccionActual: number
  onChangeSeccion: (index: number) => void
  secciones: Array<{ id: string; title: string }>
  getSectionIcon: (id: string) => string
  onLogout?: () => void
  onOpenAdmin?: () => void
  onOpenMyOrders?: () => void
  onOpenNotifications?: () => void
  inboxUnreadCount?: number
}

export function MenuHeader({
  seccionActual,
  onChangeSeccion,
  secciones,
  getSectionIcon,
  onLogout,
  onOpenAdmin,
  onOpenMyOrders,
  onOpenNotifications,
  inboxUnreadCount = 0,
}: MenuHeaderProps) {
  return (
    <IonHeader className="ion-no-border">
      <IonToolbar className="krocam-toolbar">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="KROCAM"
              className="w-10 h-10 rounded-xl object-contain shrink-0 border-2 border-(--krocam-black)"
            />
            <div>
              <span className="krocam-font-title font-bold text-white text-lg block leading-tight">
                KROCAM
              </span>
              <span className="krocam-font-script text-(--krocam-red) text-sm font-bold block -mt-0.5">
                Broaster Samir
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            {onOpenNotifications && (
              <IonButton
                fill="clear"
                color="light"
                className="relative min-w-[44px] min-h-[44px] [--padding-start:8px] [--padding-end:8px] touch-manipulation"
                onClick={onOpenNotifications}
                aria-label="Notificaciones"
              >
                <IonIcon
                  icon={notificationsOutline}
                  className="text-[1.65rem] text-white/95 drop-shadow-sm"
                />
                {inboxUnreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[1rem] h-[1rem] px-0.5 rounded-full bg-(--krocam-red) text-white text-[9px] font-bold flex items-center justify-center border-2 border-(--krocam-black) shadow-sm">
                    {inboxUnreadCount > 9 ? '9+' : inboxUnreadCount}
                  </span>
                )}
              </IonButton>
            )}
            <div className="hidden md:flex items-center gap-2">
              {onOpenMyOrders && (
                <IonButton
                  size="small"
                  fill="outline"
                  color="light"
                  className="text-xs rounded-full border-white/30"
                  onClick={onOpenMyOrders}
                >
                  <IonIcon icon={listOutline} className="mr-1" />
                  Mis pedidos
                </IonButton>
              )}
              {onOpenAdmin && (
                <IonButton
                  size="small"
                  fill="outline"
                  color="light"
                  className="text-xs rounded-full border-white/30"
                  onClick={onOpenAdmin}
                >
                  <IonIcon icon={settingsOutline} className="mr-1" />
                  Panel admin
                </IonButton>
              )}
              {onLogout && (
                <IonButton
                  size="small"
                  fill="outline"
                  color="light"
                  className="text-xs rounded-full border-white/30"
                  onClick={onLogout}
                >
                  <IonIcon icon={logOutOutline} className="mr-1" />
                  Cerrar sesión
                </IonButton>
              )}
            </div>
          </div>
        </div>
      </IonToolbar>
      <div className="px-4 pb-3 pt-1 bg-(--krocam-black)">
        <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">
          Categorías
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {secciones.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChangeSeccion(i)}
              className={`krocam-font-title krocam-category-chip shrink-0 text-sm font-semibold border transition-all ${
                i === seccionActual
                  ? 'bg-(--krocam-yellow) text-gray-900 border-transparent shadow-md'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <IonIcon icon={getSectionIcon(s.id)} className="text-base" />
              <span>{s.title}</span>
            </button>
          ))}
        </div>
      </div>
    </IonHeader>
  )
}

