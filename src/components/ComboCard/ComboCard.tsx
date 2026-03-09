/**
 * ComboCard: tarjeta de un combo para la carta KROCAM.
 * Sólo muestra nombre, descripción y precio (sin imagen).
 */

import { IonButton, IonCard, IonCardContent } from '@ionic/react'

export interface ComboCardProps {
  title: string
  description: string
  price: string
  onAdd: () => void
  isFeatured?: boolean
}

export function ComboCard({
  title,
  description,
  price,
  onAdd,
  isFeatured,
}: ComboCardProps) {
  return (
    <IonCard className="m-0 overflow-hidden rounded-2xl shadow-md border border-gray-100 bg-white relative">
      {isFeatured ? (
        <div className="absolute top-3 right-3 bg-[var(--krocam-gold)] text-[var(--krocam-black)] text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full shadow-sm">
          Mejor venta
        </div>
      ) : null}
      <IonCardContent className="pt-4 pb-4 px-4">
        <h3 className="krocam-font-title font-bold text-gray-900 text-lg uppercase tracking-tight mb-1">
          {title}
        </h3>
        <p className="text-gray-600 text-sm leading-snug">
          {description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Precio
            </span>
            <p className="text-[var(--krocam-red)] font-bold text-xl krocam-font-title">
              $ {price}
            </p>
          </div>
          <IonButton
            size="small"
            className="krocam-font-title krocam-btn-primary text-xs font-semibold px-4 py-2 h-9"
            onClick={onAdd}
          >
            Agregar
          </IonButton>
        </div>
      </IonCardContent>
    </IonCard>
  )
}
