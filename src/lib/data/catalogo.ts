import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/lib/types'

/**
 * Secciones del cotizador. Son fijas: lo que cada alumna define es el
 * CONTENIDO de cada sección (sus servicios y sus precios), no qué secciones
 * existen. Coincide con el CHECK de "kind" en catalog_items.
 */
export const CATALOG_KINDS = [
  'sistema', 'retoque', 'retoque_semana', 'adicional', 'cambio_tamanio',
  'cambio_punta', 'pedreria', 'diseno', 'prep', 'kapping',
] as const

export type CatalogKind = (typeof CATALOG_KINDS)[number]

/** Fila cruda de catalog_items. */
export interface CatalogRow {
  id: string
  kind: CatalogKind
  name: string
  category: string | null
  price: number
  price_per_nail: number
  per_nail: boolean
  duration: string | null
  meta: Record<string, unknown>
  sort_order: number
  is_active: boolean
}

/** Ítem ya normalizado para el formulario. */
export interface CatalogEntry {
  id: string
  name: string
  category: string | null
  price: number
  pricePerNail: number
  perNail: boolean
  duration: string | null
  sortOrder: number
}

export interface TenantCatalog {
  sistema: CatalogEntry[]
  retoque: CatalogEntry[]
  retoque_semana: CatalogEntry[]
  adicional: CatalogEntry[]
  cambio_tamanio: CatalogEntry[]
  cambio_punta: CatalogEntry[]
  pedreria: CatalogEntry[]
  diseno: CatalogEntry[]
  prep: CatalogEntry[]
  kapping: CatalogEntry[]
}

export const KIND_LABELS: Record<CatalogKind, { title: string; help: string; hasPerNail: boolean }> = {
  sistema: {
    title: 'Sistemas',
    help: 'El servicio base: recubrimientos y extensiones.',
    hasPerNail: true,
  },
  retoque: {
    title: 'Retoques',
    help: 'Mantenimientos sobre un trabajo anterior.',
    hasPerNail: true,
  },
  retoque_semana: {
    title: 'Recargo por semanas',
    help: 'Cuánto cobras de más si la clienta viene tarde al retoque.',
    hasPerNail: false,
  },
  adicional: {
    title: 'Adicionales',
    help: 'Manicure, retiros y extras del servicio.',
    hasPerNail: true,
  },
  cambio_tamanio: {
    title: 'Cambio de tamaño',
    help: 'Recargo por cambiarle el largo respecto del servicio anterior.',
    hasPerNail: false,
  },
  cambio_punta: {
    title: 'Cambio de punta',
    help: 'Recargo por cambiar la forma de la uña.',
    hasPerNail: false,
  },
  pedreria: {
    title: 'Pedrería',
    help: 'Piedras, perlas, dijes y sets. El precio es por unidad.',
    hasPerNail: false,
  },
  diseno: {
    title: 'Diseños',
    help: 'Tus diseños y efectos. El precio por uña es el que se usa al cotizar.',
    hasPerNail: true,
  },
  prep: {
    title: 'Preparación',
    help: 'Recargo según qué tan drástica sea la preparación de la uña.',
    hasPerNail: false,
  },
  kapping: {
    title: 'Kapping',
    help: 'Recargo por kapping según el largo de la uña natural.',
    hasPerNail: false,
  },
}

function toEntry(row: CatalogRow): CatalogEntry {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price) || 0,
    pricePerNail: Number(row.price_per_nail) || 0,
    perNail: row.per_nail,
    duration: row.duration,
    sortOrder: row.sort_order,
  }
}

function emptyCatalog(): TenantCatalog {
  return {
    sistema: [], retoque: [], retoque_semana: [], adicional: [],
    cambio_tamanio: [], cambio_punta: [], pedreria: [], diseno: [],
    prep: [], kapping: [],
  }
}

/**
 * Catálogo de la alumna de la sesión. RLS ya lo acota a su tenant, así que
 * no hace falta filtrar por tenant_id acá.
 */
export async function getTenantCatalog(includeInactive = false): Promise<TenantCatalog> {
  const supabase = await createClient()
  let query = supabase
    .from('catalog_items')
    .select('id, kind, name, category, price, price_per_nail, per_nail, duration, meta, sort_order, is_active')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (!includeInactive) query = query.eq('is_active', true)

  const { data } = await query
  const catalog = emptyCatalog()
  for (const row of (data ?? []) as CatalogRow[]) {
    catalog[row.kind]?.push(toEntry(row))
  }
  return catalog
}

/** El estudio de la alumna: su marca y su configuración de cálculo. */
export async function getTenant(): Promise<Tenant | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  return data as Tenant | null
}

/** Categorías que la alumna ya usó en una sección, para sugerirlas en la UI. */
export function categoriesOf(entries: CatalogEntry[]): string[] {
  return [...new Set(entries.map(e => e.category).filter((c): c is string => !!c))]
}

/** ¿Ya puede cotizar? Sin sistemas ni retoques no hay nada que cobrar. */
export function catalogIsEmpty(catalog: TenantCatalog): boolean {
  return catalog.sistema.length === 0 && catalog.retoque.length === 0
}
