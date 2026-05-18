const MAX_WIDTH = 800
const JPEG_QUALITY = 0.75
const MAX_BYTES = 200 * 1024

/** Comprime un File/Blob a JPEG base64 (data URL). */
export async function fileToCompressedBase64(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_WIDTH / bitmap.width)
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  const approxBytes = Math.ceil((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75)
  if (approxBytes > MAX_BYTES) {
    throw new Error(
      `La imagen sigue siendo muy grande (${Math.round(approxBytes / 1024)} KB). Usa una foto más pequeña.`,
    )
  }
  return dataUrl
}

/** Convierte URL (asset local o remota) a base64 para migración. */
export async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo cargar la imagen: ${url}`)
  const blob = await res.blob()
  return fileToCompressedBase64(blob)
}
