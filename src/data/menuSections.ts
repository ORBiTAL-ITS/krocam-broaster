/**
 * Catálogo estático de la carta (combos por categoría).
 * Compartido entre menú, landing y destacados.
 */

import alasImg from '../assets/WhatsApp Image 2026-03-05 at 11.23.32.png'
import pernilContramusloImg from '../assets/WhatsApp Image 2026-03-05 at 11.23.32 (1).png'
import hamburguesaImg from '../assets/WhatsApp Image 2026-03-05 at 11.23.31.png'
import chicharronImg from '../assets/WhatsApp Image 2026-03-05 at 11.23.31 (1).png'

/** Combo del catálogo estático (fallback local). */
export interface StaticComboItem {
  id: number
  title: string
  price: string
  description: string
  featured?: boolean
}

export interface MenuSection {
  id: string
  title: string
  heroImageSrc: string
  heroImageAlt: string
  combos: StaticComboItem[]
}

export const MENU_SECTIONS: MenuSection[] = [
  {
    id: 'alas',
    title: 'Alas',
    heroImageSrc: alasImg,
    heroImageAlt: 'Alitas broaster KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '14.000',
        description:
          '2 Presas + papas a la francesa + gaseosa personal + salsa de la casa',
        featured: true,
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '26.000',
        description:
          '4 Presas + papas a la francesa + 2 gaseosas personales + salsa de la casa',
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '38.000',
        description:
          '6 Presas + papas a la francesa + 3 gaseosas personales + salsa de la casa',
      },
      {
        id: 4,
        title: 'Combo #4',
        price: '48.000',
        description:
          '8 Presas + papas a la francesa + 4 gaseosas personales + salsa de la casa',
      },
    ],
  },
  {
    id: 'pernil',
    title: 'Pernil',
    heroImageSrc: pernilContramusloImg,
    heroImageAlt: 'Perniles de pollo broaster KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '14.000',
        description:
          '2 Presas + papas a la francesa + gaseosa personal + salsa de la casa',
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '26.000',
        description:
          '4 Presas + papas a la francesa + 2 gaseosas personales + salsa de la casa',
        featured: true,
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '38.000',
        description:
          '6 Presas + papas a la francesa + 3 gaseosas personales + salsa de la casa',
      },
      {
        id: 4,
        title: 'Combo #4',
        price: '48.000',
        description:
          '8 Presas + papas a la francesa + 4 gaseosas personales + salsa de la casa',
      },
    ],
  },
  {
    id: 'contramuslo',
    title: 'Contra muslo',
    heroImageSrc: pernilContramusloImg,
    heroImageAlt: 'Piezas contra muslo KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '14.000',
        description:
          '2 Presas + papas a la francesa + gaseosa personal + salsa de la casa',
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '26.000',
        description:
          '4 Presas + papas a la francesa + 2 gaseosas personales + salsa de la casa',
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '38.000',
        description:
          '6 Presas + papas a la francesa + 3 gaseosas personales + salsa de la casa',
        featured: true,
      },
      {
        id: 4,
        title: 'Combo #4',
        price: '48.000',
        description:
          '8 Presas + papas a la francesa + 4 gaseosas personales + salsa de la casa',
      },
    ],
  },
  {
    id: 'hamburguesa',
    title: 'Hamburguesa',
    heroImageSrc: hamburguesaImg,
    heroImageAlt: 'Hamburguesa de pollo crocante KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '26.000',
        description:
          '1 Hamburguesa + papas a la francesa + 1 gaseosa personal + salsa de la casa',
        featured: true,
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '33.000',
        description:
          '1 Hamburguesa + 1 presa + papas a la francesa + 2 gaseosas personales + salsa de la casa',
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '48.000',
        description:
          '1 Hamburguesa + 2 presas y chicharrón de pollo + papas a la francesa + 2 gaseosas personales + salsa de la casa',
      },
    ],
  },
  {
    id: 'chicharron',
    title: 'Chicharrón de pollo',
    heroImageSrc: chicharronImg,
    heroImageAlt: 'Chicharrón de pollo KROCAM',
    combos: [
      {
        id: 1,
        title: 'Combo #1',
        price: '15.000',
        description:
          'Trozos de pechuga + papas + gaseosa + salsa',
        featured: true,
      },
      {
        id: 2,
        title: 'Combo #2',
        price: '28.000',
        description:
          'Trozos de pechuga + papas + 2 gaseosas + salsa',
      },
      {
        id: 3,
        title: 'Combo #3',
        price: '40.000',
        description:
          'Trozos de pechuga + papas + 3 gaseosas + salsa',
      },
      {
        id: 4,
        title: 'Combo #4',
        price: '50.000',
        description:
          'Trozos de pechuga + papas + 4 gaseosas + salsa',
      },
    ],
  },
]
