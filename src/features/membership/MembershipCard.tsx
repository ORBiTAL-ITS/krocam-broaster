import { IonIcon } from '@ionic/react'
import { checkmarkCircle } from 'ionicons/icons'
import logo from '../../assets/Logo.png'
import type { MembershipConfig } from '../../types/membership'

interface MembershipCardProps {
  config: MembershipConfig
  currentStamps: number
  rewardPending: boolean
  /** Teléfono del cliente (admin) o del usuario (mi cuenta). */
  phone?: string
}

function formatCop(value: number): string {
  return value.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return phone.trim()
}

/** Distribuye sellos en filas de hasta 5 (como la carta física). */
function chunkStamps<T>(items: T[], perRow = 5): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow))
  }
  return rows
}

export function MembershipCard({
  config,
  currentStamps,
  rewardPending,
  phone,
}: MembershipCardProps) {
  const stampsRequired = Math.max(1, config.stampsRequired)
  const numberedCount = Math.max(0, stampsRequired - 1)

  type Slot =
    | { kind: 'stamp'; number: number; filled: boolean }
    | { kind: 'reward'; filled: boolean }

  const slots: Slot[] = []
  for (let n = 1; n <= numberedCount; n++) {
    slots.push({ kind: 'stamp', number: n, filled: currentStamps >= n })
  }
  slots.push({
    kind: 'reward',
    filled: rewardPending || currentStamps >= stampsRequired,
  })

  const rows = chunkStamps(slots, 5)

  return (
    <div className="loyalty-card select-none" aria-label="Carta de fidelidad KROCAM">
      <div className="loyalty-card-inner">
        <header className="loyalty-card-header">
          <img src={logo} alt="" className="loyalty-card-logo" aria-hidden />
          <div className="loyalty-card-brand">
            <p className="loyalty-card-brand-title">KROCAM</p>
            <p className="loyalty-card-brand-sub">BROASTER SAMIR</p>
          </div>
        </header>

        <div className="loyalty-card-banner">
          <span>CARTA DE FIDELIDAD</span>
        </div>

        {phone?.trim() ? (
          <p className="loyalty-card-phone">
            Cliente: <strong>{formatPhoneDisplay(phone)}</strong>
          </p>
        ) : null}

        <p className="loyalty-card-rules">
          Válido por compras desde {formatCop(config.minOrderValueCop)} y acumula{' '}
          {stampsRequired} visitas para un <strong>{config.rewardTitle}</strong>
          {rewardPending ? ' — ¡premio listo!' : '!'}
        </p>

        <div className="loyalty-card-grid">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="loyalty-card-row">
              {row.map((slot) => {
                const key = slot.kind === 'stamp' ? `s-${slot.number}` : 'reward'
                if (slot.kind === 'reward') {
                  return (
                    <div
                      key={key}
                      className={`loyalty-stamp loyalty-stamp-reward ${slot.filled ? 'loyalty-stamp-filled' : ''}`}
                    >
                      <span className="loyalty-stamp-reward-icon" aria-hidden>
                        🍗
                      </span>
                      <span className="loyalty-stamp-reward-label">¡GRATIS!</span>
                    </div>
                  )
                }
                return (
                  <div
                    key={key}
                    className={`loyalty-stamp ${slot.filled ? 'loyalty-stamp-filled' : ''}`}
                  >
                    {slot.filled ? (
                      <IonIcon icon={checkmarkCircle} className="loyalty-stamp-check" />
                    ) : (
                      <span className="loyalty-stamp-number">{slot.number}</span>
                    )}
                  </div>
                )
              })}
              {row.length < 5 &&
                Array.from({ length: 5 - row.length }).map((_, i) => (
                  <div key={`pad-${rowIndex}-${i}`} className="loyalty-stamp loyalty-stamp-spacer" aria-hidden />
                ))}
            </div>
          ))}
        </div>

        <p className="loyalty-card-footer">
          {rewardPending
            ? `Presenta esta carta para canjear: ${config.rewardTitle}`
            : `Llevas ${currentStamps} de ${stampsRequired} visitas`}
        </p>

        {config.rewardDescription ? (
          <p className="loyalty-card-note">{config.rewardDescription}</p>
        ) : null}
      </div>
    </div>
  )
}
