export interface Sistema {
  id: string
  name: string
  price: number
  time?: string
  pricePerNail: number
  category: 'recubrimiento' | 'extension-gelx' | 'extension-dual' | 'extension-esculpido'
}

export const SISTEMA_CATEGORIES: { id: Sistema['category']; label: string }[] = [
  { id: 'recubrimiento', label: 'Recubrimientos' },
  { id: 'extension-gelx', label: 'Extensiones — Gel X' },
  { id: 'extension-dual', label: 'Extensiones — Dual System' },
  { id: 'extension-esculpido', label: 'Extensiones — Esculpido' },
]

export const SISTEMAS: Sistema[] = [
  // Recubrimientos
  { id: 'esmaltado-gel', name: 'Esmaltado en Gel + Manicure Rusa', price: 90, pricePerNail: 9, category: 'recubrimiento' },
  { id: 'nivelacion-1-2', name: 'Nivelación Builder/Rubber + Color Gel + Manicure Rusa (1–2)', price: 130, pricePerNail: 13, category: 'recubrimiento' },
  { id: 'nivelacion-3-4', name: 'Nivelación Builder/Rubber + Color Gel + Manicure Rusa (3–4)', price: 150, pricePerNail: 15, category: 'recubrimiento' },
  { id: 'nivelacion-5-6', name: 'Nivelación Builder/Rubber + Color Gel + Manicure Rusa (5–6)', price: 170, pricePerNail: 17, category: 'recubrimiento' },
  { id: 'hilo-refuerzo', name: 'Técnica de hilo – Refuerzo', price: 150, pricePerNail: 15, category: 'recubrimiento' },
  { id: 'hilo-reconstructiva', name: 'Técnica de hilo – Reconstructiva', price: 170, pricePerNail: 17, category: 'recubrimiento' },

  // Extensiones — Gel X
  { id: 'gel-x-sm', name: 'Gel X (S–M)', price: 150, pricePerNail: 15, category: 'extension-gelx' },
  { id: 'gel-x-lxl', name: 'Gel X (L–XL)', price: 175, pricePerNail: 17.5, category: 'extension-gelx' },

  // Extensiones — Dual System
  { id: 'dual-polygel', name: 'Dual System (Polygel)', price: 190, pricePerNail: 19, category: 'extension-dual' },
  { id: 'dual-builder', name: 'Dual System (Builder Gel)', price: 200, pricePerNail: 20, category: 'extension-dual' },

  // Extensiones — Esculpido
  { id: 'esculpido-acrilico', name: 'Esculpido (Acrílico)', price: 180, pricePerNail: 18, category: 'extension-esculpido' },
  { id: 'esculpido-polygel', name: 'Esculpido (Polygel)', price: 185, pricePerNail: 18.5, category: 'extension-esculpido' },
  { id: 'esculpido-builder', name: 'Esculpido (Builder Gel)', price: 190, pricePerNail: 19, category: 'extension-esculpido' },
]

export interface Retoque {
  id: string
  name: string
  price: number
  pricePerNail: number
  time?: string
}

export const RETOQUES: Retoque[] = [
  { id: 'retoque-nivelacion-1-2', name: 'Retoque Nivelación (1–2)', price: 100, pricePerNail: 10 },
  { id: 'retoque-nivelacion-3-4', name: 'Retoque Nivelación (3–4)', price: 110, pricePerNail: 11 },
  { id: 'retoque-reconstructivo-1-2', name: 'Retoque Reconstructivo (1–2)', price: 120, pricePerNail: 12 },
  { id: 'retoque-reconstructivo-3-4', name: 'Retoque Reconstructivo (3–4)', price: 130, pricePerNail: 13 },
  { id: 'retoque-acrilico', name: 'Retoque Acrílico', price: 125, pricePerNail: 12.5 },
  { id: 'retoque-polygel', name: 'Retoque Polygel', price: 140, pricePerNail: 14 },
  { id: 'retoque-builder-gel', name: 'Retoque Builder Gel', price: 145, pricePerNail: 14.5 },
]

// Extra charge for late retouches
export const RETOQUE_SEMANAS = [
  { label: 'Hasta 3.5 semanas (sin cargo extra)', extra: 0 },
  { label: 'Semana 4 (+S/ 20)', extra: 20 },
  { label: 'Semana 5 o más (+S/ 30)', extra: 30 },
]
