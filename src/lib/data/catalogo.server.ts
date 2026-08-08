import { createClient } from '@/lib/supabase/server'
import type { Tenant } from '@/lib/types'
import { emptyCatalog, toEntry, type CatalogRow, type TenantCatalog } from './catalogo'

/**
 * Consultas del catálogo. Solo Server Components / Route Handlers / Server
 * Actions: usa `next/headers` a través del cliente de Supabase de servidor.
 * Si un Client Component necesita tipos o labels, los importa de `./catalogo`.
 */

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
