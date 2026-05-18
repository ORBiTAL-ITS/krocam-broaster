import { IonButton, IonIcon } from '@ionic/react'
import { logoWhatsapp } from 'ionicons/icons'
import { useEffect, useState } from 'react'
import { getWhatsappNumber } from '../../services/appConfig'
import { LegalPageShell } from './LegalPageShell'

export default function ContactPage() {
  const [wa, setWa] = useState<string | null>(null)

  useEffect(() => {
    void getWhatsappNumber().then(setWa)
  }, [])

  const href =
    wa && wa.replace(/\D/g, '').length > 0
      ? `https://wa.me/${wa.replace(/\D/g, '')}`
      : undefined

  return (
    <LegalPageShell title="Contacto">
      <h1 className="text-xl font-bold text-gray-900 krocam-font-title">Hablemos</h1>
      <p className="text-sm text-gray-600 leading-relaxed">
        Para pedidos, cambios o consultas, escríbenos por WhatsApp. Si el número no está configurado
        en la app, revisa el cartel en la carta o redes del negocio.
      </p>
      {href ? (
        <IonButton
          expand="block"
          className="krocam-btn-primary font-semibold max-w-md"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IonIcon slot="start" icon={logoWhatsapp} className="text-xl" />
          Abrir WhatsApp
        </IonButton>
      ) : (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          El número de WhatsApp se configura desde el panel de administración.
        </p>
      )}
    </LegalPageShell>
  )
}
