export interface Sistema {
  id: string
  name: string
  price: number
  time?: string
  pricePerNail: number
  category: 'extension' | 'reforzamiento' | 'hibridas' | 'esmaltado'
}

export const SISTEMAS: Sistema[] = [
  // Extensiones
  { id: 'gel-x', name: 'Extensión Gel X', price: 0, pricePerNail: 0, category: 'extension' },
  { id: 'gel-x-manicura', name: 'Uñas Gel X + manicura rusa', price: 175, pricePerNail: 17.5, time: '2:00', category: 'extension' },
  { id: 'acrilicas-manicura', name: 'Uñas Acrílicas + manicura rusa', price: 160, pricePerNail: 16, time: '3:45', category: 'extension' },
  { id: 'polygel-manicura', name: 'Uñas de Polygel + manicura rusa', price: 175, pricePerNail: 17.5, category: 'extension' },
  { id: 'esculpidas-num3', name: 'Uñas Esculpidas núm 3', price: 40, pricePerNail: 4, time: '4:30', category: 'extension' },
  { id: 'esculpidas-num1-2', name: 'Uñas Esculpidas núm 1-2', price: 20, pricePerNail: 2, category: 'extension' },
  // Reforzamientos
  { id: 'kap-rubber', name: 'Kap Rubber + Color Gel', price: 90, pricePerNail: 9, category: 'reforzamiento' },
  { id: 'kap-polygel-1-2', name: 'Kap Polygel / Rubber + Color Gel + manicura rusa (num. 1-2)', price: 130, pricePerNail: 13, time: '3:00', category: 'reforzamiento' },
  { id: 'kap-polygel-3-4', name: 'Kap Polygel / Rubber + Color Gel + manicura rusa (num. 3-4)', price: 150, pricePerNail: 15, time: '3:00', category: 'reforzamiento' },
  { id: 'kap-polygel-5-6', name: 'Kap Polygel / Rubber + Color Gel + manicura rusa (num. 5-6)', price: 170, pricePerNail: 17, category: 'reforzamiento' },
  { id: 'hibrido-kap-1-2', name: 'Híbrido Kap Polygel / Rubber + Color Gel + manicura rusa (num. 1-2)', price: 150, pricePerNail: 15, category: 'reforzamiento' },
  { id: 'hibrido-kap-3-4', name: 'Híbrido Kap Polygel / Rubber + Color Gel + manicura rusa (num. 3-4)', price: 160, pricePerNail: 16, category: 'reforzamiento' },
  // Híbridas
  { id: 'hibridas-acrilico-polygel', name: 'Híbridas Acrílico y Polygel', price: 190, pricePerNail: 19, category: 'hibridas' },
  { id: 'hibridas-acrilico-gel', name: 'Híbridas Acrílico y gel', price: 210, pricePerNail: 21, category: 'hibridas' },
  { id: 'hibridas-polygel-gel', name: 'Híbridas Polygel y gel', price: 200, pricePerNail: 20, category: 'hibridas' },
  // Esmaltado
  { id: 'esmaltado-gel', name: 'Esmaltado en Gel + manicura rusa', price: 110, pricePerNail: 11, category: 'esmaltado' },
]

export interface Retoque {
  id: string
  name: string
  price: number
  pricePerNail: number
  time?: string
}

export const RETOQUES: Retoque[] = [
  { id: 'acrilicas', name: 'Retoque Uñas Acrílicas', price: 125, pricePerNail: 12.5 },
  { id: 'polygel', name: 'Retoque Uñas de Polygel', price: 140, pricePerNail: 14 },
  { id: 'kap-rubber', name: 'Retoque Kap Rubber + Color Gel', price: 100, pricePerNail: 10 },
  { id: 'kap-polygel', name: 'Retoque Kap Polygel + Color Gel', price: 110, pricePerNail: 11 },
  { id: 'hibridas-acrilico-polygel', name: 'Retoque Híbridas Acrílico y Polygel', price: 150, pricePerNail: 15 },
  { id: 'hibridas-acrilico-gel', name: 'Retoque Híbridas Acrílico y gel', price: 170, pricePerNail: 17 },
  { id: 'hibridas-polygel-gel', name: 'Retoque Híbridas Polygel y gel', price: 160, pricePerNail: 16 },
  { id: 'retoque-4-semanas', name: 'Retoque 4 semanas', price: 20, pricePerNail: 2 },
  { id: 'retoque-5-6-semanas', name: 'Retoque 5 a 6 semanas', price: 35, pricePerNail: 3.5 },
  { id: 'reconstruccion-acrilica', name: 'Reconstrucción x Acrílica', price: 8, pricePerNail: 0 },
  { id: 'reconstruccion-polygel', name: 'Reconstrucción x Polygel', price: 10, pricePerNail: 0 },
  { id: 'reconstruccion-polygel-n6', name: 'Reconstrucción x Polygel N°6', price: 20, pricePerNail: 0 },
]

// Extra charge for late retouches
export const RETOQUE_SEMANAS = [
  { label: 'Hasta 3.5 semanas (sin cargo extra)', extra: 0 },
  { label: 'Semana 4 (+S/ 20)', extra: 20 },
  { label: 'Semana 5 o más (+S/ 30)', extra: 30 },
]
