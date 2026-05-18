import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { MENU_SECTIONS } from '../data/menuSections'
import { db } from '../firebase'
import { urlToBase64 } from './imageUtils'
import { isMenuSeeded, markMenuSeeded } from './menuService'
import { parsePriceCop } from '../types/menu'

/**
 * Sube el menú estático actual a Firestore (una vez).
 * Requiere usuario admin y reglas desplegadas.
 */
export async function migrateMenuSeed(): Promise<{ ok: boolean; message: string }> {
  if (await isMenuSeeded()) {
    return { ok: true, message: 'El menú ya fue migrado anteriormente.' }
  }

  let sortCat = 0
  for (const section of MENU_SECTIONS) {
    let heroBase64: string | null = null
    try {
      heroBase64 = await urlToBase64(section.heroImageSrc)
    } catch {
      heroBase64 = null
    }

    await setDoc(
      doc(db, 'menuCategories', section.id),
      {
        title: section.title,
        sortOrder: sortCat++,
        heroImageBase64: heroBase64,
        heroImageAlt: section.heroImageAlt,
        active: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    let sortCombo = 0
    for (const combo of section.combos) {
      await setDoc(
        doc(db, 'menuCategories', section.id, 'combos', String(combo.id)),
        {
          title: combo.title,
          description: combo.description,
          price: parsePriceCop(combo.price),
          sortOrder: sortCombo++,
          active: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }
  }

  await markMenuSeeded()
  return { ok: true, message: 'Menú migrado correctamente a Firebase.' }
}
