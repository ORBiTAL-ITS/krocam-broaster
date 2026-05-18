import { LegalPageShell } from './LegalPageShell'

export default function AboutPage() {
  return (
    <LegalPageShell title="Nosotros">
      <h1 className="text-xl font-bold text-gray-900 krocam-font-title">KROCAM Broaster Samir</h1>
      <p className="text-sm text-gray-600 leading-relaxed">
        Somos una cocina especializada en pollo broaster y combos pensados para compartir en casa.
        Trabajamos con pedidos a domicilio para que disfrutes el sabor sin complicaciones.
      </p>
      <p className="text-sm text-gray-600 leading-relaxed">
        No contamos con salón: nos enfocamos en preparar bien cada orden y entregarla en el mejor
        tiempo posible.
      </p>
    </LegalPageShell>
  )
}
