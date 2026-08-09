/** Rol de PLATAFORMA, no un rol dentro del estudio. */
export type UserRole = 'alumna' | 'superadmin'

export interface Profile {
  id: string
  /** NULL en el superadmin: no tiene estudio propio. */
  tenant_id: string | null
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  created_at: string
}

export type TenantStatus = 'activo' | 'suspendido'

/** El "estudio" de una alumna. */
export interface Tenant {
  id: string
  owner_id: string
  slug: string
  name: string
  logo_url: string | null
  phone: string | null
  instagram: string | null
  policies_text: string | null
  currency: string
  igv_rate: number
  nail_size_free_up_to: number
  nail_size_step_price: number
  status: TenantStatus
  created_at: string
}

export interface Client {
  id: string
  tenant_id: string
  user_id: string | null
  name: string
  phone: string
  age: number | null
  frequency: 'nueva' | 'frecuente'
  last_visit: string | null
  responsible: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  tenant_id: string
  user_id: string | null
  client_id: string | null
  client_name: string
  client_phone: string | null
  date: string
  responsible: string | null
  // Sistemas y retoques cotizados. La lista manda: una cotización puede llevar
  // varios (soft gel en una mano, acrílico en la otra).
  system_items: QuoteServiceItem[]
  retoque_items: QuoteServiceItem[]
  // Espejo plano de las listas de arriba: nombres unidos con " + ", suma de
  // precios y suma de uñas. Existe para el buscador y los listados, que filtran
  // y muestran por columna. En cotizaciones viejas (y solo ahí) es el dato real.
  system_name: string | null
  system_price: number
  system_nails: number | null
  retoque_name: string | null
  retoque_price: number
  retoque_nails: number | null
  retoque_weeks_extra: number
  // Uña actual
  nail_number: number
  nail_size_extra: number
  kapping_extra: number
  // Cambio tamaño y punta
  size_change_label: string | null
  size_change_price: number
  tip_change_label: string | null
  tip_change_price: number
  // Preparación
  prep_type: string | null
  prep_price: number
  nail_type: string | null
  nail_layer: string | null
  nail_condition: string | null
  // Ficha de diagnóstico (informativos, no afectan el precio)
  nail_curvature: string | null
  nail_plate_status: string | null
  skin_type: string | null
  nail_moisture: string | null
  previous_product: string | null
  product_condition: string | null
  // Ficha de servicio técnico (informativos, no afectan el precio)
  primer_type: string | null
  base_type: string | null
  service_type: string | null
  nail_system_material: string | null
  technique_type: string | null
  nail_shape: string | null
  nail_length: string | null
  next_maintenance_date: string | null
  technical_notes: string | null
  // Adicionales
  additional_items: QuoteAdditional[]
  // Diseños
  design_items: QuoteDesign[]
  // Pedrería
  jewelry_items: QuoteJewelry[]
  // Totales
  subtotal: number
  igv_rate: number
  igv_amount: number
  total_with_igv: number
  // Metadatos
  notes: string | null
  client_type: 'nueva' | 'frecuente'
  share_policies: boolean
  status: 'borrador' | 'confirmada' | 'pagada'
  created_at: string
  updated_at: string
}

/**
 * Un sistema o un retoque dentro de la cotización. Los precios son snapshot:
 * si mañana la alumna sube su tarifa, esta cotización no cambia de monto.
 *
 * `total` no siempre es `unit_price × nails_count`: a mano completa manda
 * `full_price`, el precio de lista, que suele traer descuento.
 */
export interface QuoteServiceItem {
  id: string
  name: string
  nails_count: number
  /** Precio por uña. */
  unit_price: number
  /** Precio de la mano completa (10 uñas). */
  full_price: number
  total: number
  comment?: string | null
}

export interface QuoteAdditional {
  id: string
  name: string
  quantity: number
  unit_price: number
  total: number
  comment?: string | null
}

export interface QuoteDesign {
  id: string
  name: string
  nails_count: number
  unit_price: number
  total: number
  comment?: string | null
}

export interface QuoteJewelry {
  id: string
  name: string
  quantity: number
  unit_price: number
  total: number
  comment?: string | null
}

// Catálogo types
export interface CatalogItem {
  id: string
  name: string
  price: number
  time?: string
  price_per_nail?: number
  category?: string
}
