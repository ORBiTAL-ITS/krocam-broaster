/**
 * Bloques de landing para web (hero, beneficios, destacados, reseñas, FAQ).
 */

import { IonButton, IonIcon } from '@ionic/react'
import {
  checkmarkCircleOutline,
  rocketOutline,
  shieldCheckmarkOutline,
  star,
  timeOutline,
} from 'ionicons/icons'
import type { ComboItem } from '../../components/CartaMenu/types'
import { ComboCard } from '../../components/ComboCard'
import type { MenuSection } from '../../data/menuSections'

function StarRating({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IonIcon
          key={i}
          icon={star}
          className={
            i <= value ? 'text-(--krocam-yellow) text-lg' : 'text-gray-300 text-lg'
          }
        />
      ))}
    </div>
  )
}

const REVIEWS = [
  {
    id: '1',
    author: 'Laura M.',
    rating: 5,
    text: 'Llegó caliente y el pollo súper crocante. Repito seguro.',
  },
  {
    id: '2',
    author: 'Diego R.',
    rating: 5,
    text: 'Pedí desde la carta en segundos. El domicilio fue puntual.',
  },
  {
    id: '3',
    author: 'Paola V.',
    rating: 4,
    text: 'Buenas porciones y buen sabor. Ideal para compartir en casa.',
  },
]

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
]

export interface LandingSectionsProps {
  sections: MenuSection[]
  onExploreMenu: () => void
  onAddFeaturedCombo: (sectionIndex: number, combo: ComboItem) => void
}

export function LandingSections({
  sections,
  onExploreMenu,
  onAddFeaturedCombo,
}: LandingSectionsProps) {
  const featured = sections
    .flatMap((sec, sectionIndex) =>
      sec.combos
        .filter((c) => c.featured)
        .map((combo) => ({ sectionIndex, sec, combo })),
    )
    .slice(0, 6)

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
          Arriba eliges la categoría y los combos; aquí te mostramos lo más pedido y más info del
          servicio. Sin salón — solo sabor y servicio ágil.
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

      <section className="relative px-5 pb-12 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h3 className="krocam-font-title text-xl font-bold text-white">
                Combos destacados
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Los más pedidos — también disponibles en la carta completa.
              </p>
            </div>
            <IonButton
              fill="clear"
              size="small"
              className="text-(--krocam-yellow) font-semibold self-start md:self-auto"
              onClick={onExploreMenu}
            >
              Ir al menú completo
            </IonButton>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map(({ sectionIndex, sec, combo }) => (
              <div key={`${sec.id}-${combo.id}`}>
                <ComboCard
                  title={`${combo.title} · ${sec.title}`}
                  description={combo.description}
                  price={combo.price}
                  isFeatured
                  onAdd={() => onAddFeaturedCombo(sectionIndex, combo)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/10 bg-black/40 px-5 py-12 md:px-10">
        <div className="max-w-5xl mx-auto">
          <h3 className="krocam-font-title text-xl font-bold text-white text-center mb-8">
            Lo que dicen nuestros clientes
          </h3>
          <div className="grid md:grid-cols-3 gap-5">
            {REVIEWS.map((r) => (
              <blockquote
                key={r.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-transform duration-200 hover:-translate-y-0.5"
              >
                <StarRating value={r.rating} label={`${r.rating} estrellas`} />
                <p className="text-sm text-gray-200 mt-3 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                <footer className="mt-4 text-xs font-semibold text-(--krocam-yellow)">
                  — {r.author}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-5 py-12 md:px-10 pb-16">
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
