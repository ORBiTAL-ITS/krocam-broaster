import { IonIcon } from '@ionic/react'
import { star, starOutline } from 'ionicons/icons'

interface StarRatingProps {
  value: number
  max?: number
  size?: 'sm' | 'md'
  label?: string
  interactive?: boolean
  onChange?: (value: number) => void
}

export function StarRating({
  value,
  max = 5,
  size = 'md',
  label,
  interactive,
  onChange,
}: StarRatingProps) {
  const iconClass = size === 'sm' ? 'text-base' : 'text-xl'

  return (
    <div
      className="flex items-center gap-0.5"
      role={interactive ? 'group' : 'img'}
      aria-label={label ?? `${value} de ${max} estrellas`}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1
        const filled = starValue <= value
        return (
          <button
            key={starValue}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(starValue)}
            className={
              interactive
                ? 'p-0.5 touch-manipulation disabled:opacity-50'
                : 'p-0 pointer-events-none'
            }
            aria-label={`${starValue} estrellas`}
          >
            <IonIcon
              icon={filled ? star : starOutline}
              className={`${iconClass} ${filled ? 'text-(--krocam-yellow)' : 'text-gray-300'}`}
            />
          </button>
        )
      })}
    </div>
  )
}
