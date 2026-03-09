/**
 * CartaMenu: sección de la carta con título y grid de combos en cards.
 * Organización clara y amigable para el usuario.
 */

import { ComboCard } from '../ComboCard'
import type { ComboItem } from './types'

export interface CartaMenuProps {
  sectionTitle: string
  combos: ComboItem[]
  /** Imagen grande superior que representa la sección (alas, pernil, etc.) */
  heroImageSrc: string
  heroImageAlt: string
  onAddCombo: (combo: ComboItem) => void
}

export function CartaMenu({
  sectionTitle,
  combos,
  heroImageSrc,
  heroImageAlt,
  onAddCombo,
}: CartaMenuProps) {
  return (
    <section className="space-y-6" aria-labelledby="section-title">
      {/* Hero de sección */}
      <div className="overflow-hidden rounded-3xl bg-[var(--krocam-yellow)] flex flex-col sm:flex-row items-center gap-4 sm:gap-6 px-5 py-4 sm:px-8 sm:py-6 shadow-md">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-700 mb-1">
            Estás viendo
          </p>
          <h2
            id="section-title"
            className="krocam-font-title text-2xl sm:text-3xl md:text-4xl font-extrabold text-black uppercase tracking-tight"
          >
            {sectionTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-800 max-w-md">
            Elige el combo que más se te antoje. Todos incluyen papas a la francesa, gaseosa personal y salsa de la casa.
          </p>
        </div>
        <div className="flex-1 max-w-xs w-full">
          <div className="w-full aspect-[4/3] bg-[var(--krocam-black)] rounded-2xl flex items-center justify-center overflow-hidden">
            <img
              src={heroImageSrc}
              alt={heroImageAlt}
              className="w-full h-full object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>

      {/* Grid de combos sin imagen individual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {combos.map((combo) => (
          <ComboCard
            key={combo.id}
            title={combo.title}
            description={combo.description}
            price={combo.price}
            onAdd={() => onAddCombo(combo)}
            isFeatured={combo.featured}
          />
        ))}
      </div>
    </section>
  )
}
