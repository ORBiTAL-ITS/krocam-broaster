/**
 * Pie de página web con enlaces legales.
 */

import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="max-w-5xl mx-auto mt-4 pb-8 px-4 text-center text-xs text-gray-500">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-3">
        <Link to="/about" className="underline text-gray-600 hover:text-gray-900 transition-colors">
          Nosotros
        </Link>
        <span className="text-gray-300" aria-hidden>
          ·
        </span>
        <Link to="/contact" className="underline text-gray-600 hover:text-gray-900 transition-colors">
          Contacto
        </Link>
        <span className="text-gray-300" aria-hidden>
          ·
        </span>
        <Link
          to="/privacy-policy"
          className="underline text-gray-600 hover:text-gray-900 transition-colors"
        >
          Privacidad
        </Link>
        <span className="text-gray-300" aria-hidden>
          ·
        </span>
        <Link to="/terms" className="underline text-gray-600 hover:text-gray-900 transition-colors">
          Términos
        </Link>
      </nav>
      <p className="text-gray-400">
        © {new Date().getFullYear()} KROCAM Broaster Samir. Cocina virtual — domicilios.
      </p>
    </footer>
  )
}
