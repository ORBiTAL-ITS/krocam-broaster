import logo from '../assets/Logo.png'

export function LoadingScreen() {
  return (
    <div className="krocam-loading-screen flex min-h-screen items-center justify-center bg-(--krocam-black)">
      <div className="flex flex-col items-center gap-4">
        <img src={logo} alt="KROCAM" className="w-20 h-20 object-contain" />
        <div className="krocam-font-title text-xl font-bold text-(--krocam-yellow)">
          KROCAM
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--krocam-yellow) border-t-transparent" />
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    </div>
  )
}
