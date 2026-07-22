// Adicionales de servicio
export interface Adicional {
  id: string
  name: string
  price: number
  pricePerNail?: number
  time?: string
}

export const ADICIONALES: Adicional[] = [
  { id: 'manicure-rusa', name: 'Manicure Rusa', price: 50, pricePerNail: 5, time: '0:40' },
  { id: 'manicure-spa', name: 'Manicure Spa', price: 20, pricePerNail: 2 },
  { id: 'retiro-acrilico', name: 'Retirado de acrílico', price: 35, pricePerNail: 3.5 },
  { id: 'retiro-polygel', name: 'Retirado de Polygel / Gel X', price: 35, pricePerNail: 3.5 },
  { id: 'retiro-rubber-polygel', name: 'Retirado de Rubber/Polygel n1-2', price: 25, pricePerNail: 2.5 },
  { id: 'retiro-color-gel', name: 'Retirado de Color Gel', price: 25, pricePerNail: 2.5 },
  { id: 'retiro-acrilico-otro-salon', name: 'Retiro Acrílico otro salón', price: 40, pricePerNail: 4, time: '1:00' },
  { id: 'retiro-rubber-otro-salon', name: 'Retiro Rubber otro salón', price: 30, pricePerNail: 3 },
  { id: 'retiro-esculpido-otro-salon', name: 'Retiro Esculpido otro salón', price: 50, pricePerNail: 5 },
  { id: 'retiro-kapping-otro-salon', name: 'Retiro Kapping otro salón', price: 35, pricePerNail: 3.5, time: '0:30' },
  { id: 'retiro-kapping-polygel-n4', name: 'Retiro kapping polygel/Rubber n4', price: 30, pricePerNail: 3, time: '0:40' },
  { id: 'retiro-kapping-polygel-n4-otro', name: 'Retiro kapping polygel/Rubber n4 otro salón', price: 35, pricePerNail: 3.5, time: '0:40' },
  { id: 'cambio-top-mate', name: 'Cambio top mate a brilloso', price: 13, pricePerNail: 1.3, time: '0:05' },
  { id: 'kapping-convexo', name: 'Kapping convexo', price: 20, pricePerNail: 2 },
]

// Cambio de tamaño de uña
export const CAMBIO_TAMANIO = [
  { id: 'sin-cambio-0', label: 'Sin Cambio tamaño uña', number: 0, price: 0 },
  { id: 'sin-cambio-1', label: 'Sin Cambio tamaño uña (num 1)', number: 1, price: 0 },
  { id: 'cambio-2', label: 'Cambio tamaño uña (2 tamaños)', number: 2, price: 10 },
  { id: 'cambio-3', label: 'Cambio tamaño uña (3 tamaños)', number: 3, price: 15 },
  { id: 'cambio-4', label: 'Cambio tamaño uña (4 tamaños)', number: 4, price: 20 },
  { id: 'cambio-5', label: 'Cambio tamaño uña (5 tamaños)', number: 5, price: 25 },
]

// Cambio de punta
export const CAMBIO_PUNTA = [
  { id: 'sin-cambio', label: 'Sin Cambio de punta', price: 0 },
  { id: 'cuadrada-almendra', label: 'Cuadrada a Almendra', price: 15 },
  { id: 'koffin-almendra', label: 'Koffin a Almendra', price: 10 },
  { id: 'stiletto-almendra', label: 'Stiletto a Almendra', price: 10 },
  { id: 'stiletto-koffin', label: 'Stiletto a Koffin', price: 15 },
  { id: 'koffin-cuadrada', label: 'Koffin a cuadrada', price: 10 },
  { id: 'almendra-koffin', label: 'Almendra a Koffin', price: 15 },
]

// Formas de punta
export const PUNTAS = ['Sin cambio', 'Almendra', 'Coffin', 'Stiletto', 'Cuadrada']

// Pedrería
export interface Pedreria {
  id: string
  name: string
  price: number
  pricePerUnit: number
  category: string
}

export const PEDRERIA: Pedreria[] = [
  // Por uña
  { id: 'pedreria-ab', name: 'Pedrería A/B', price: 1, pricePerUnit: 1, category: 'Por uña' },
  { id: 'balines', name: 'Balines', price: 0.8, pricePerUnit: 0.8, category: 'Por uña' },
  { id: 'perlas-talla-l', name: 'Perlas talla L', price: 0.8, pricePerUnit: 0.8, category: 'Por uña' },
  { id: 'perlas-xs-s-m', name: 'Perlas talla xs/s/m', price: 0.6, pricePerUnit: 0.6, category: 'Por uña' },
  { id: 'rocas-pequenas', name: 'Rocas pequeñas', price: 1, pricePerUnit: 1, category: 'Por uña' },
  { id: 'rocas-medianas', name: 'Rocas medianas', price: 1.5, pricePerUnit: 1.5, category: 'Por uña' },
  // Dijes
  { id: 'dijes-pequenos', name: 'Dijes pequeños', price: 6, pricePerUnit: 6, category: 'Dijes' },
  { id: 'dijes-medianos', name: 'Dijes medianos', price: 9, pricePerUnit: 9, category: 'Dijes' },
  { id: 'dijes-grandes-resina', name: 'Dijes grandes resina', price: 13, pricePerUnit: 13, category: 'Dijes' },
  { id: 'dijes-grandes-joyeria', name: 'Dijes grandes joyería', price: 18, pricePerUnit: 18, category: 'Dijes' },
  // Sets completos
  { id: 'full-bling-1-4', name: 'Full bling (1-4 uñas)', price: 10, pricePerUnit: 10, category: 'Full Bling' },
  { id: 'full-bling-5-10', name: 'Full bling (5-10 uñas)', price: 15, pricePerUnit: 15, category: 'Full Bling' },
  { id: 'perlas-todas-unas', name: 'Perlas en todas las uñas', price: 300, pricePerUnit: 300, category: 'Full Bling' },
]

// Tamaño adicional por número de uña
export const TAMANIO_EXTRA = [
  { range: '1-4', extra: 0, label: 'Uña 1-4 (sin cargo)' },
  { range: '5', extra: 5, label: 'Uña 5 (+S/ 5)' },
  { range: '6', extra: 10, label: 'Uña 6 (+S/ 10)' },
  { range: '7', extra: 15, label: 'Uña 7 (+S/ 15)' },
  { range: '8', extra: 20, label: 'Uña 8 (+S/ 20)' },
  { range: '9', extra: 25, label: 'Uña 9 (+S/ 25)' },
  { range: '10', extra: 30, label: 'Uña 10 (+S/ 30)' },
  { range: '11', extra: 35, label: 'Uña 11 (+S/ 35)' },
]

// Preparación de uña
export const PREP_TIPOS = [
  { id: 'estandar', label: 'Estándar', price: 0 },
  { id: 'drastica', label: 'Drástica', price: 15 },
  { id: 'basico', label: 'Básico', price: 10 },
]

// Kapping size extras
export const KAPPING_EXTRA = [
  { label: 'Uña natural num 1-3 (sin cargo)', extra: 0 },
  { label: 'Uña natural num 4-5 (+S/ 10)', extra: 10 },
  { label: 'Uña natural num 6-8 (+S/ 15)', extra: 15 },
]
