/**
 * MenuHeader: cabecera fija con logo KROCAM y tabs de secciones.
 * Se limita a la presentación y cambio de sección.
 */

import { IonButton, IonHeader, IonIcon, IonToolbar } from '@ionic/react'
import { listOutline } from 'ionicons/icons'
import logo from '../../../assets/Logo.png'

interface MenuHeaderProps {
  seccionActual: number
  onChangeSeccion: (index: number) => void
  secciones: Array<{ id: string; title: string }>
  getSectionIcon: (id: string) => string
  onLogout?: () => void
  onOpenAdmin?: () => void
  onOpenMyOrders?: () => void
}

export function MenuHeader({
  seccionActual,
  onChangeSeccion,
  secciones,
  getSectionIcon,
  onLogout,
  onOpenAdmin,
  onOpenMyOrders,
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
          <div className="flex items-center gap-2">
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
                Cerrar sesión
              </IonButton>
            )}
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

