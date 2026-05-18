import { useHistory } from 'react-router-dom'
import logo from '../../assets/Logo.png'
import { ROUTES } from '../../routes/paths'

/** Logo KROCAM: vuelve a la carta cuando no hay tab «Inicio». */
export function TabHomeButton() {
  const history = useHistory()

  return (
    <button
      type="button"
      onClick={() => history.push(ROUTES.HOME)}
      className="flex items-center gap-2 shrink-0 touch-manipulation"
      aria-label="Volver a la carta"
    >
      <img
        src={logo}
        alt=""
        className="w-9 h-9 rounded-lg object-contain border-2 border-white/30"
      />
    </button>
  )
}
