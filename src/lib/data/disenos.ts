export interface Diseno {
  id: string
  name: string
  price: number
  pricePerNail: number
  time?: string
  category: string
}

export const DISENOS: Diseno[] = [
  // Efectos de color
  { id: 'ombre-aura', name: 'Ombré o Aura x Color', price: 20, pricePerNail: 2, category: 'Color' },
  { id: 'pigmento-aurora-espejo', name: 'Pigmento Aurora o espejo', price: 15, pricePerNail: 1.5, category: 'Color' },
  { id: 'esmaltes-reflectivos', name: 'Esmaltes reflectivos o aurora', price: 20, pricePerNail: 2, category: 'Color' },
  { id: 'esmaltes-jelly', name: 'Esmaltes jelly', price: 10, pricePerNail: 1, category: 'Color' },
  { id: 'cat-eye', name: 'Cat Eye', price: 35, pricePerNail: 3.5, category: 'Color' },
  { id: 'foil', name: 'Foil', price: 20, pricePerNail: 2, category: 'Color' },
  { id: 'flakes', name: 'Flakes', price: 15, pricePerNail: 1.5, category: 'Color' },
  { id: 'ombre-2tonos', name: 'Ombré 2 tonos parecidos', price: 35, pricePerNail: 3.5, category: 'Color' },
  { id: 'difuminado-pincel', name: 'Difuminado pincel ombré', price: 10, pricePerNail: 1, category: 'Color' },
  { id: 'pitahaya-ombre', name: 'Pitahaya ombré', price: 80, pricePerNail: 8, category: 'Color' },
  { id: 'blooming', name: 'Blooming', price: 20, pricePerNail: 2, category: 'Color' },

  // Efectos 3D
  { id: 'efecto-3d-clear', name: 'Efecto 3D gel clear', price: 15, pricePerNail: 1.5, category: '3D' },
  { id: 'efecto-3d-reflectivo', name: 'Efecto 3D gel reflectivo/aurora/jelly', price: 25, pricePerNail: 2, category: '3D' },
  { id: 'efecto-3d-clear-liner', name: 'Efecto 3D gel clear con liner 1x1', price: 25, pricePerNail: 2.5, category: '3D' },
  { id: 'efecto-burbuja', name: 'Efecto burbuja (espuma)', price: 20, pricePerNail: 2, category: '3D' },
  { id: 'efecto-velvet', name: 'Efecto velvet completo', price: 15, pricePerNail: 1.5, category: '3D' },
  { id: 'efecto-almohadilla', name: 'Efecto almohadilla', price: 70, pricePerNail: 7, category: '3D' },
  { id: 'efecto-fruta-naranja', name: 'Efecto 3D gel fruta (naranja)', price: 250, pricePerNail: 25, category: '3D' },
  { id: 'efecto-fruta-fresa', name: 'Efecto 3D gel fruta (fresa) con ojito verde', price: 100, pricePerNail: 10, category: '3D' },
  { id: 'relieve-3d-encapsulado', name: 'Relieve 3D encapsulado/pigmento', price: 35, pricePerNail: 3.5, category: '3D' },
  { id: 'relieve-plastigel', name: 'Relieve plastigel cromado', price: 40, pricePerNail: 4, category: '3D' },
  { id: 'plastigel-kawai', name: 'Plastigel dije kawai', price: 300, pricePerNail: 30, category: '3D' },
  { id: 'conchita-3d', name: 'Conchita 3D', price: 40, pricePerNail: 4, category: '3D' },
  { id: 'media-mariposa-cromada', name: 'Media mariposa cromada pigmento', price: 30, pricePerNail: 3, category: '3D' },
  { id: 'media-flor-3d', name: 'Media flor 3D plana', price: 25, pricePerNail: 2, category: '3D' },

  // Líneas
  { id: 'lineas-basicas', name: 'Líneas básicas', price: 10, pricePerNail: 1, category: 'Líneas' },
  { id: 'lineas-neotribales', name: 'Líneas Neotribales', price: 15, pricePerNail: 1.5, category: 'Líneas' },
  { id: 'lineas-cromadas', name: 'Líneas cromadas', price: 20, pricePerNail: 2, category: 'Líneas' },
  { id: 'lineas-neotribales-cromadas', name: 'Líneas Neotribales cromadas', price: 25, pricePerNail: 2.5, category: 'Líneas' },
  { id: 'lineas-neotribales-cromadas-3d', name: 'Líneas Neotribales cromadas 3D', price: 35, pricePerNail: 3.5, category: 'Líneas' },
  { id: 'lineas-neotribales-cromadas-3d-v2', name: 'Líneas Neotribales cromadas 3D (v2)', price: 25, pricePerNail: 2.5, category: 'Líneas' },
  { id: 'lineas-neotribales-velvet', name: 'Líneas Neotribales velvet', price: 20, pricePerNail: 2, category: 'Líneas' },
  { id: 'lineas-contorneadas', name: 'Líneas contorneadas', price: 30, pricePerNail: 3, category: 'Líneas' },

  // Cromados
  { id: 'molten-metal', name: 'Molten Metal Chrome', price: 20, pricePerNail: 2, category: 'Cromados' },
  { id: 'ojo-gema', name: 'Ojo o Gema', price: 20, pricePerNail: 2, category: 'Cromados' },
  { id: 'ojo-gema-molten', name: 'Ojo o Gema con Molten Metal', price: 40, pricePerNail: 4, category: 'Cromados' },

  // Francesa
  { id: 'francesa-1', name: 'Francesa 1 línea', price: 10, pricePerNail: 1, time: '0:30', category: 'Francesa' },
  { id: 'francesa-2', name: 'Francesa 2 líneas', price: 20, pricePerNail: 2, category: 'Francesa' },
  { id: 'francesa-pigmento', name: 'Francesa con pigmento espejo o aurora', price: 15, pricePerNail: 1.5, category: 'Francesa' },

  // Mármol y Texturas
  { id: 'marmol-carey', name: 'Mármol o carey', price: 30, pricePerNail: 3, time: '0:30', category: 'Texturas' },
  { id: 'prints', name: 'Prints (cow, cocodrile, snake, etc)', price: 15, pricePerNail: 1.5, category: 'Texturas' },

  // Silk Cover
  { id: 'silk-entero', name: 'Silk cover entero', price: 40, pricePerNail: 4, category: 'Silk Cover' },
  { id: 'silk-detalles', name: 'Silk cover en detalles o marmols', price: 20, pricePerNail: 2, category: 'Silk Cover' },
  { id: 'silk-ombre', name: 'Silk cover ombré', price: 30, pricePerNail: 3, category: 'Silk Cover' },
  { id: 'silk-relieve-3d', name: 'Relieve 3D encapsulado Silk cover', price: 55, pricePerNail: 5.5, category: 'Silk Cover' },
  { id: 'silk-molten', name: 'Molten metal chrome silk cover', price: 40, pricePerNail: 4, category: 'Silk Cover' },
  { id: 'silk-gema-molten', name: 'Gema con Molten metal chrome silk cover', price: 60, pricePerNail: 6, category: 'Silk Cover' },

  // Stickers y Dibujos
  { id: 'sticker-2d', name: 'Stickers 2D x unidad', price: 3, pricePerNail: 0, category: 'Stickers' },
  { id: 'sticker-3d', name: 'Stickers 3D x unidad', price: 6, pricePerNail: 0, category: 'Stickers' },
  { id: 'dibujos-basicos', name: 'Dibujos básicos', price: 20, pricePerNail: 2, category: 'Dibujos' },
  { id: 'dibujos-intermedio', name: 'Dibujos nivel intermedio', price: 40, pricePerNail: 4, category: 'Dibujos' },
  { id: 'freestyle', name: 'Freestyle', price: 50, pricePerNail: 5, category: 'Dibujos' },
  { id: 'dibujos-oleo', name: 'Dibujos óleo (mano alzada)', price: 120, pricePerNail: 12, category: 'Dibujos' },
  { id: 'diseño-abc', name: 'Diseño ABC', price: 40, pricePerNail: 4, category: 'Dibujos' },
  { id: 'relieve-oleo-acrilico', name: 'Relieve óleo con acrílico', price: 100, pricePerNail: 10, category: 'Dibujos' },

  // Encapsulados
  { id: 'encapsulado-basico', name: 'Encapsulado básico', price: 20, pricePerNail: 2, category: 'Encapsulado' },
  { id: 'encapsulado-2-mas', name: 'Encapsulado de 2 a más decoraciones', price: 40, pricePerNail: 4, category: 'Encapsulado' },

  // Figuras 3D
  { id: 'plastilina-3d', name: 'Figura de plastilina 3D mediana (lazo, hongo, flor)', price: 60, pricePerNail: 6, time: '0:30', category: 'Figuras' },
  { id: 'plastilina-4d', name: 'Figura de plastilina 4D (lazo, hongo, flor)', price: 120, pricePerNail: 12, category: 'Figuras' },

  // Otros
  { id: 'perforacion-piercing', name: 'Perforación piercing argolla', price: 15, pricePerNail: 1.5, category: 'Otros' },
  { id: 'cadenas', name: 'Cadenas', price: 40, pricePerNail: 4, category: 'Otros' },
]

export const DISENO_CATEGORIES = [...new Set(DISENOS.map(d => d.category))]
