import { LegalPageShell } from './LegalPageShell'

export default function TermsPage() {
  return (
    <LegalPageShell title="Términos de uso">
      <h1 className="text-xl font-bold text-gray-900 krocam-font-title">
        Términos de uso — KROCAM BROASTER SAMIR
      </h1>
      <p className="text-sm text-gray-600 leading-relaxed">
        Al usar esta aplicación o la carta web, aceptas que los pedidos se gestionan como cocina
        virtual con entrega a domicilio según disponibilidad y cobertura.
      </p>
      <p className="text-sm text-gray-600 leading-relaxed">
        Los precios publicados pueden actualizarse; el total confirmado en el momento del pedido es
        el que prevalece. Los tiempos de entrega son estimados y pueden variar por demanda o
        condiciones externas.
      </p>
      <p className="text-sm text-gray-600 leading-relaxed">
        El usuario es responsable de la veracidad de los datos de entrega y contacto. El negocio
        podrá rechazar o cancelar pedidos en casos de fraude, abuso o imposibilidad de entrega.
      </p>
      <p className="text-sm text-gray-500">
        Para cualquier reclamo o aclaración, contáctanos por los canales indicados en la sección de
        contacto.
      </p>
    </LegalPageShell>
  )
}
