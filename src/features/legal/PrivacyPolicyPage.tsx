import { LegalPageShell } from './LegalPageShell'

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Política de privacidad">
      <h1 className="text-xl font-bold text-gray-900 krocam-font-title">
        Política de privacidad — KROCAM BROASTER SAMIR
      </h1>
      <p className="text-sm text-gray-600 leading-relaxed">
        Esta carta digital está pensada exclusivamente para que puedas ver el menú y realizar tus
        pedidos de forma rápida y cómoda.
      </p>
      <p className="text-sm text-gray-600 leading-relaxed">
        Recopilamos algunos datos básicos que tú mismo proporcionas al hacer un pedido (nombre de
        usuario de Google, teléfono, barrio, dirección y notas de entrega). Esta información se usa
        únicamente para:
      </p>
      <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
        <li>Identificar tu pedido y poder contactarte.</li>
        <li>Entregar correctamente tu domicilio.</li>
        <li>Registrar el historial de pedidos en nuestro sistema.</li>
      </ul>
      <p className="text-sm text-gray-600 leading-relaxed">
        Los datos se almacenan en servicios de Google Firebase (Auth, Firestore y mensajería push)
        y, cuando confirmas tu pedido, se utiliza WhatsApp para que puedas enviar tu orden
        directamente al negocio. No vendemos ni compartimos tu información personal con terceros
        ajenos al servicio, más allá de los proveedores tecnológicos necesarios para operar la
        aplicación.
      </p>
      <p className="text-sm text-gray-600 leading-relaxed">
        Puedes <strong>eliminar tu cuenta</strong> en cualquier momento desde «Mi cuenta».
        También puedes escribir al WhatsApp del negocio. Por requisitos legales, el historial
        de pedidos puede conservarse un tiempo limitado.
      </p>
      <p className="text-sm text-gray-500">
        Esta política aplica únicamente al uso de la carta web y puede actualizarse ocasionalmente
        para reflejar mejoras en el servicio.
      </p>
    </LegalPageShell>
  )
}
