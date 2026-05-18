/**
 * Bloques de landing para web (hero, beneficios, FAQ).
 * Las reseñas reales están en ReviewsSection (debajo del menú).
 */

import { IonButton, IonIcon } from '@ionic/react'
import {
  checkmarkCircleOutline,
  rocketOutline,
  shieldCheckmarkOutline,
  timeOutline,
} from 'ionicons/icons'

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: '¿Necesito cuenta para ver el menú?',
    a: 'No. Puedes explorar combos y precios sin iniciar sesión. Solo te pedimos iniciar sesión al confirmar tu pedido.',
  },
  {
    q: '¿Tienen local físico?',
    a: 'Operamos como cocina virtual; los pedidos son para entrega a domicilio según cobertura.',
  },
  {
    q: '¿Cómo se confirma el pedido?',
    a: 'Agrega productos al carrito y, al confirmar, completa tus datos de entrega. El equipo coordinará contigo.',
  },
  {
    q: '¿Puedo dejar una reseña?',
    a: 'Sí. Inicia sesión y usa el botón «Deja tu reseña» en la carta. Publicamos tu comentario tras revisarlo.',
  },
]

export interface LandingSectionsProps {
  onExploreMenu: () => void
}

export function LandingSections({ onExploreMenu }: LandingSectionsProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-linear-to-b from-(--krocam-black) via-gray-900 to-gray-950 text-white mb-10 shadow-xl">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] krocam-landing-mesh"
        aria-hidden
      />

      <section className="relative px-5 pt-12 pb-10 md:px-10 md:pt-16 md:pb-14 max-w-5xl mx-auto text-center">
        <p className="text-[11px] font-semibold tracking-[0.28em] uppercase text-(--krocam-gold) mb-3">
          KROCAM BROASTER SAMIR
        </p>
        <h2 className="krocam-font-title text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          Pollo broaster y combos,
          <span className="block text-(--krocam-yellow) mt-1">
            directo a tu puerta
          </span>
        </h2>
        <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto leading-relaxed mb-8">
          Elige la categoría y los combos en la carta. Sin salón — solo sabor y servicio ágil.
        </p>
        <div className="flex justify-center">
          <IonButton
            className="krocam-font-title krocam-btn-primary font-semibold px-8 min-h-[48px] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
            onClick={onExploreMenu}
          >
            Ver carta y precios
          </IonButton>
        </div>
      </section>

      <section className="relative border-y border-white/10 bg-black/30 px-5 py-10 md:px-10">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: shieldCheckmarkOutline,
              title: 'Preparación al momento',
              desc: 'Pedidos organizados para salir en óptimo tiempo.',
            },
            {
              icon: timeOutline,
              title: 'Seguimiento',
              desc: 'Avisos cuando tu pedido avanza (con cuenta y notificaciones).',
            },
            {
              icon: rocketOutline,
              title: 'Pedido claro',
              desc: 'Carrito visual y confirmación con tus datos de entrega.',
            },
          ].map((b) => (
            <div
              key={b.title}
              className="rounded-2xl bg-white/5 border border-white/10 p-5 text-left transition-colors duration-200 hover:bg-white/[0.07]"
            >
              <IonIcon icon={b.icon} className="text-3xl text-(--krocam-yellow) mb-3" />
              <h3 className="krocam-font-title font-bold text-white text-lg mb-1">{b.title}</h3>
              <p className="text-sm text-gray-400 leading-snug">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative border-t border-white/10 px-5 py-12 md:px-10 pb-16">
        <div className="max-w-3xl mx-auto">
          <h3 className="krocam-font-title text-xl font-bold text-white text-center mb-6">
            Preguntas frecuentes
          </h3>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-white/10 bg-white/5 open:bg-white/[0.07] transition-colors duration-200"
              >
                <summary className="cursor-pointer list-none px-5 py-4 krocam-font-title font-semibold text-white flex items-center justify-between gap-3">
                  <span className="text-left">{item.q}</span>
                  <IonIcon
                    icon={checkmarkCircleOutline}
                    className="text-(--krocam-yellow) shrink-0 text-xl opacity-70 group-open:opacity-100"
                  />
                </summary>
                <p className="px-5 pb-4 text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-3">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
