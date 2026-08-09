'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CatalogEntry, TenantCatalog } from '@/lib/data/catalogo-shared'
import type { QuoteServiceItem, Tenant } from '@/lib/types'
import { calculateQuote, formatSoles, getNailSizeExtra, priceForNails, FULL_SET_NAILS } from '@/lib/data/calcular'
import {
  User, Layers, Ruler, Palette, Gem, ClipboardList,
  AlertTriangle, Info, Clock, Minus, Plus, ChevronLeft, ChevronRight,
  Save, Sparkles, Loader2, Stethoscope, X,
} from 'lucide-react'
import {
  TIPO_UNA, ESTADO_LAMINA, TIPO_PIEL, HUMEDAD_UNA, PRODUCTO_PREVIO, ESTADO_PRODUCTO,
} from '@/lib/data/diagnostico'
import VkSelect from '@/components/ui/VkSelect'

const STEPS = [
  { id: 1, label: 'Cliente', Icon: User },
  { id: 2, label: 'Sistema', Icon: Layers },
  { id: 3, label: 'Diagnóstico', Icon: Stethoscope },
  { id: 5, label: 'Tamaño', Icon: Ruler },
  { id: 6, label: 'Diseños', Icon: Palette },
  { id: 7, label: 'Adicionales', Icon: Gem },
  { id: 8, label: 'Resumen', Icon: ClipboardList },
] as const

const HIDDEN_STEPS = new Set([4])
const MAX_STEP = 8

function adjacentStep(current: number, direction: 1 | -1): number {
  let next = current + direction
  while (next >= 1 && next <= MAX_STEP && HIDDEN_STEPS.has(next)) {
    next += direction
  }
  return Math.max(1, Math.min(MAX_STEP, next))
}

/**
 * Un sistema (o un retoque) elegido para esta cotización. Se puede tener más de
 * uno: soft gel en una mano y acrílico en la otra, por ejemplo.
 *
 * Copia el precio del catálogo al momento de elegirlo, en vez de guardar solo
 * el id: así un borrador se sigue abriendo con sus montos aunque la alumna
 * después borre ese servicio de su catálogo.
 */
interface ServiceItem {
  id: string
  name: string
  /** Precio de la mano completa. */
  price: number
  pricePerNail: number
  duration: string | null
  nails: number
  comment: string
}

/**
 * Un diseño en la cotización. El mismo diseño del catálogo puede aparecer
 * varias veces —el mismo encapsulado en rojo sobre 3 uñas y en naranja sobre
 * 2—, así que la fila se identifica por `lineId` y no por `id`, que es el del
 * catálogo y se repite entre líneas.
 */
interface DesignItem { lineId: string; id: string; name: string; nails: number; unitPrice: number; comment: string }

let lineCounter = 0
/** Id de fila, único dentro de la sesión. Nunca se guarda en la base. */
function newLineId(): string {
  lineCounter += 1
  return `line-${lineCounter}`
}
interface JewelryItem { id: string; name: string; qty: number; unitPrice: number }
interface AdditionalItem {
  id: string
  name: string
  unitPrice: number
  quantity: number
  perNail: boolean
  comment: string
}

export interface QuoteFormProps {
  /** Catálogo de la alumna, leído de la base. Puede venir vacío. */
  catalog: TenantCatalog
  /** Su estudio: marca y reglas de cálculo (IGV, extra por largo). */
  tenant: Tenant
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--vk-black)', border: '1px solid var(--vk-border)',
  color: 'var(--vk-text)', borderRadius: '10px', padding: '11px 14px',
  fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600,
  color: 'var(--vk-text-muted)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.08em',
}

const commentInputStyle: React.CSSProperties = {
  background: 'var(--vk-black)', border: '1px solid var(--vk-border)',
  color: 'var(--vk-text-muted)', borderRadius: '6px', padding: '5px 10px',
  fontSize: '12px', fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700,
  color: 'var(--vk-text)', marginBottom: '22px', letterSpacing: '-0.02em',
}

const groupHeaderStyle: React.CSSProperties = {
  padding: '5px 16px 3px', fontSize: '10px', fontWeight: 700,
  color: 'var(--vk-pink-soft)', textTransform: 'uppercase', letterSpacing: '0.12em',
  background: 'rgba(243,50,131,0.05)',
}

/**
 * Selector de cuántas uñas se cobran de un sistema o retoque. Arranca en la
 * mano completa; bajarlo cobra proporcional al precio por uña.
 */
function NailCountRow({
  entry, nails, onChange, amount,
}: {
  entry: { price: number; pricePerNail: number; duration: string | null }
  nails: number
  onChange: (n: number) => void
  amount: number
}) {
  const isFullSet = nails >= FULL_SET_NAILS
  const perNail = entry.pricePerNail > 0 ? entry.pricePerNail : entry.price / FULL_SET_NAILS
  const stepBtn = (disabled: boolean): React.CSSProperties => ({
    width: '28px', height: '28px', borderRadius: '7px',
    border: '1px solid var(--vk-border)', background: 'var(--vk-surface)',
    color: disabled ? 'var(--vk-text-subtle)' : 'var(--vk-text)',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div style={{ marginTop: '8px', padding: '11px 14px', background: 'var(--vk-surface)', border: '1px solid var(--vk-border)', borderRadius: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>Uñas a cobrar</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <button type="button" onClick={() => onChange(nails - 1)} disabled={nails <= 1} style={stepBtn(nails <= 1)}>
            <Minus size={13} strokeWidth={2} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--vk-text)', minWidth: '22px', textAlign: 'center' }}>{nails}</span>
          <button type="button" onClick={() => onChange(nails + 1)} disabled={isFullSet} style={stepBtn(isFullSet)}>
            <Plus size={13} strokeWidth={2} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vk-pink-soft)', minWidth: '72px', textAlign: 'right' }}>
            {formatSoles(amount)}
          </span>
        </div>
      </div>
      <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--vk-text-subtle)' }}>
        {isFullSet
          ? `Mano completa — precio del servicio${entry.duration ? ` · ${entry.duration}` : ''}`
          : `${formatSoles(perNail)} por uña × ${nails}${entry.pricePerNail > 0 ? '' : ' (derivado del precio completo entre 10)'}`}
      </div>
    </div>
  )
}

/** " (3 uñas)" cuando no es la mano completa; vacío cuando sí lo es. */
function nailsSuffix(nails: number): string {
  if (nails >= FULL_SET_NAILS) return ''
  return ` (${nails} uña${nails === 1 ? '' : 's'})`
}

/** Del catálogo a la cotización: entra cobrando la mano completa. */
function toServiceItem(entry: CatalogEntry): ServiceItem {
  return {
    id: entry.id,
    name: entry.name,
    price: entry.price,
    pricePerNail: entry.pricePerNail,
    duration: entry.duration,
    nails: FULL_SET_NAILS,
    comment: '',
  }
}

/**
 * De la cotización guardada al formulario, al reabrir un borrador.
 *
 * `legacy` es el sistema/retoque único de las cotizaciones anteriores a poder
 * cargar varios: si la lista viene vacía pero hay nombre en la columna plana,
 * se lee de ahí. Los precios se refrescan contra el catálogo actual (es un
 * borrador que se está reeditando); si el servicio ya no existe en el catálogo,
 * queda el snapshot que guardó la cotización.
 */
function loadServiceItems(
  stored: QuoteServiceItem[] | null | undefined,
  legacy: { name: string | null; nails: number | null; price: number },
  entries: CatalogEntry[],
): ServiceItem[] {
  const rows: QuoteServiceItem[] = stored?.length
    ? stored
    : legacy.name
      ? [{
          id: 'legacy', name: legacy.name, nails_count: legacy.nails ?? FULL_SET_NAILS,
          unit_price: 0, full_price: legacy.price, total: legacy.price, comment: null,
        }]
      : []

  return rows.map(row => {
    const entry = entries.find(e => e.id === row.id) ?? entries.find(e => e.name === row.name)
    return {
      id: entry?.id ?? row.id,
      name: entry?.name ?? row.name,
      price: entry?.price ?? row.full_price ?? row.total,
      pricePerNail: entry?.pricePerNail ?? row.unit_price ?? 0,
      duration: entry?.duration ?? null,
      nails: Math.min(Math.max(row.nails_count ?? FULL_SET_NAILS, 1), FULL_SET_NAILS),
      comment: row.comment ?? '',
    }
  })
}

/** Al guardar: del formulario a la fila de la cotización. */
function toStoredItem(item: ServiceItem): QuoteServiceItem {
  return {
    id: item.id,
    name: item.name,
    nails_count: item.nails,
    unit_price: item.pricePerNail > 0 ? item.pricePerNail : item.price / FULL_SET_NAILS,
    full_price: item.price,
    total: serviceTotal(item),
    comment: item.comment || null,
  }
}

/** Lo que se cobra por un servicio según cuántas uñas lleva. */
function serviceTotal(item: ServiceItem): number {
  return priceForNails(item, item.nails)
}

function sumNails(items: ServiceItem[]): number {
  return items.reduce((s, i) => s + i.nails, 0)
}

function sumTotals(items: ServiceItem[]): number {
  return items.reduce((s, i) => s + serviceTotal(i), 0)
}

/**
 * Lista de sistemas (o de retoques) de la cotización: un selector que agrega y
 * una tarjeta por servicio elegido, cada una con sus uñas y su comentario.
 *
 * Un mismo servicio no se puede agregar dos veces —serían las mismas uñas
 * cobradas dos veces—, así que los ya elegidos salen del selector.
 */
function ServiceList({
  label, placeholder, emptyHint, entries, groupByCategory, items, onChange,
}: {
  label: string
  placeholder: string
  emptyHint: string
  entries: CatalogEntry[]
  groupByCategory: boolean
  items: ServiceItem[]
  onChange: (items: ServiceItem[]) => void
}) {
  const available = entries.filter(e => !items.some(i => i.id === e.id))
  const optionFor = (e: CatalogEntry) => ({
    value: e.id,
    label: e.pricePerNail > 0
      ? `${e.name} — ${formatSoles(e.price)} · ${formatSoles(e.pricePerNail)}/uña`
      : `${e.name} — ${formatSoles(e.price)}`,
  })
  const categories = [...new Set(available.map(e => e.category || 'Sin categoría'))]

  function add(id: string) {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    onChange([...items, toServiceItem(entry)])
  }

  function patch(id: string, changes: Partial<ServiceItem>) {
    onChange(items.map(i => i.id === id ? { ...i, ...changes } : i))
  }

  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {items.length > 0 && (
        <div style={{ display: 'grid', gap: '12px', marginBottom: '12px' }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                padding: '13px 14px', background: 'var(--vk-pink-muted)',
                border: '1px solid rgba(243,50,131,0.2)', borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--vk-text)' }}>{item.name}</div>
                  <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--vk-text-muted)' }}>
                    <span style={{ color: 'var(--vk-pink-soft)' }}>Total: {formatSoles(item.price)}</span>
                    {item.pricePerNail > 0 && <span>{formatSoles(item.pricePerNail)} / uña</span>}
                    {item.duration && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} strokeWidth={2} />
                        {item.duration}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(items.filter(i => i.id !== item.id))}
                  aria-label={`Quitar ${item.name}`}
                  style={{
                    flexShrink: 0, width: '28px', height: '28px', borderRadius: '7px',
                    border: '1px solid var(--vk-border)', background: 'var(--vk-surface)',
                    color: 'var(--vk-text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
              <NailCountRow
                entry={item}
                nails={item.nails}
                onChange={n => patch(item.id, { nails: Math.min(Math.max(n, 1), FULL_SET_NAILS) })}
                amount={serviceTotal(item)}
              />
              <input
                style={{ ...inputStyle, marginTop: '8px', fontSize: '13px' }}
                value={item.comment}
                onChange={e => patch(item.id, { comment: e.target.value })}
                placeholder="Comentario (ej: tono único, solo mano derecha...)"
              />
            </div>
          ))}
        </div>
      )}
      {available.length > 0 ? (
        <VkSelect
          value=""
          onChange={add}
          allowEmpty
          placeholder={items.length > 0 ? '+ Agregar otro' : placeholder}
          options={groupByCategory ? undefined : available.map(optionFor)}
          groups={groupByCategory
            ? categories.map(cat => ({
                label: cat,
                options: available.filter(e => (e.category || 'Sin categoría') === cat).map(optionFor),
              }))
            : undefined}
        />
      ) : (
        <div style={{ fontSize: '12px', color: 'var(--vk-text-subtle)' }}>{emptyHint}</div>
      )}
    </div>
  )
}

function daysBetween(dateStr: string): number | null {
  if (!dateStr) return null
  const last = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : null
}

function NuevaCotizacionForm({ catalog, tenant }: QuoteFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')

  // Regla de extra por largo, según la configuró la alumna en su estudio.
  const nailSizeFreeUpTo = tenant.nail_size_free_up_to
  const nailSizeStepPrice = Number(tenant.nail_size_step_price) || 0
  const nailSizeExtraFor = (n: number) =>
    getNailSizeExtra(n, nailSizeFreeUpTo, nailSizeStepPrice)

  // Las categorías salen de lo que la alumna cargó, no de una lista fija.
  const disenoCategories = useMemo(
    () => [...new Set(catalog.diseno.map(d => d.category).filter((c): c is string => !!c))],
    [catalog.diseno],
  )
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(!!editId)

  // Step 1: Client
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientAge, setClientAge] = useState('')
  const [clientType, setClientType] = useState<'nueva' | 'frecuente'>('nueva')
  const [lastVisit, setLastVisit] = useState('')
  const [responsible, setResponsible] = useState('')
  const [sharePolicies, setSharePolicies] = useState(false)
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0])
  const [nextMaintenance, setNextMaintenance] = useState('')

  // Step 2: Sistema. Son listas: una cotización puede llevar varios sistemas y
  // varios retoques. Cada uno con sus uñas (10 = mano completa, el caso normal;
  // se baja cuando la clienta solo se hace algunas).
  const [systemItems, setSystemItems] = useState<ServiceItem[]>([])
  const [retoqueItems, setRetoqueItems] = useState<ServiceItem[]>([])
  const [retoqueWeeks, setRetoqueWeeks] = useState(0)
  const [nailNumber, setNailNumber] = useState(1)
  const [kappingExtra, setKappingExtra] = useState(0)
  // Arranca con el IGV que la alumna configuró en su estudio (0 por defecto).
  const [igvRate, setIgvRate] = useState(Number(tenant.igv_rate) || 0)

  // Step 3: Diagnóstico
  const [nailCurvature, setNailCurvature] = useState('')
  const [nailPlateStatus, setNailPlateStatus] = useState('')
  const [skinType, setSkinType] = useState('')
  const [nailMoisture, setNailMoisture] = useState('')
  const [previousProduct, setPreviousProduct] = useState('')
  const [productCondition, setProductCondition] = useState('')

  // Step 4: Servicio técnico
  const [primerType, setPrimerType] = useState('')
  const [baseType, setBaseType] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [systemMaterial, setSystemMaterial] = useState('')
  const [techniqueType, setTechniqueType] = useState('')
  const [nailShape, setNailShape] = useState('')
  const [nailLength, setNailLength] = useState('')
  const [technicalNotes, setTechnicalNotes] = useState('')

  // Step 5: Size/Tip — '' = sin cambio. La alumna puede no haber cargado
  // ninguna opción, así que no se puede asumir que exista un [0].
  const [sizeChange, setSizeChange] = useState('')
  const [tipChange, setTipChange] = useState('')

  // Step 6: Designs
  const [designItems, setDesignItems] = useState<DesignItem[]>([])
  const [designSearch, setDesignSearch] = useState('')
  const [designCategory, setDesignCategory] = useState('Todos')

  // Step 7: Adicionales & Jewelry
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([])
  const [jewelryItems, setJewelryItems] = useState<JewelryItem[]>([])

  // Step 8: Notes
  const [notes, setNotes] = useState('')

  // Cargar cotización existente (edición de borrador)
  useEffect(() => {
    if (!editId) return
    let cancelled = false
    supabase.from('quotes').select('*').eq('id', editId).single().then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) {
        setLoadingEdit(false)
        return
      }
      setClientName(data.client_name ?? '')
      setClientPhone(data.client_phone ?? '')
      setClientType(data.client_type ?? 'nueva')
      setResponsible(data.responsible ?? '')
      setSharePolicies(data.share_policies ?? false)
      setQuoteDate(data.date ?? new Date().toISOString().split('T')[0])
      setNextMaintenance(data.next_maintenance_date ?? '')

      setSystemItems(loadServiceItems(
        data.system_items,
        { name: data.system_name, nails: data.system_nails, price: data.system_price ?? 0 },
        catalog.sistema,
      ))
      setRetoqueItems(loadServiceItems(
        data.retoque_items,
        { name: data.retoque_name, nails: data.retoque_nails, price: data.retoque_price ?? 0 },
        catalog.retoque,
      ))
      const weeksIdx = catalog.retoque_semana.findIndex(w => w.price === data.retoque_weeks_extra)
      setRetoqueWeeks(weeksIdx >= 0 ? weeksIdx : 0)
      setNailNumber(data.nail_number ?? 1)
      setKappingExtra(data.kapping_extra ?? 0)
      setIgvRate(data.igv_rate ?? Number(tenant.igv_rate) ?? 0)

      setNailCurvature(data.nail_curvature ?? '')
      setNailPlateStatus(data.nail_plate_status ?? '')
      setSkinType(data.skin_type ?? '')
      setNailMoisture(data.nail_moisture ?? '')
      setPreviousProduct(data.previous_product ?? '')
      setProductCondition(data.product_condition ?? '')

      setPrimerType(data.primer_type ?? '')
      setBaseType(data.base_type ?? '')
      setServiceType(data.service_type ?? '')
      setSystemMaterial(data.nail_system_material ?? '')
      setTechniqueType(data.technique_type ?? '')
      setNailShape(data.nail_shape ?? '')
      setNailLength(data.nail_length ?? '')
      setTechnicalNotes(data.technical_notes ?? '')

      setSizeChange(catalog.cambio_tamanio.find(s => s.name === data.size_change_label)?.id ?? '')
      setTipChange(catalog.cambio_punta.find(t => t.name === data.tip_change_label)?.id ?? '')

      setDesignItems((data.design_items ?? []).map((d: { id: string; name: string; nails_count: number; unit_price: number; comment?: string | null }) => {
        const entry = catalog.diseno.find(x => x.id === d.id)
        // Preferir precio por uña del catálogo (por si el borrador guardó el precio del set de 10)
        const unitPrice = entry
          ? (entry.pricePerNail > 0 ? entry.pricePerNail : entry.price)
          : d.unit_price
        return { lineId: newLineId(), id: d.id, name: d.name, nails: Math.min(d.nails_count, 10), unitPrice, comment: d.comment ?? '' }
      }))
      setAdditionalItems((data.additional_items ?? []).map((a: { id: string; name: string; quantity?: number; unit_price: number; comment?: string | null }) => {
        const entry = catalog.adicional.find(x => x.id === a.id)
        const perNail = entry?.perNail === true
        const unitPrice = perNail
          ? (entry!.pricePerNail || entry!.price / 10)
          : (entry?.price ?? a.unit_price)
        return {
          id: a.id,
          name: a.name,
          unitPrice,
          quantity: perNail ? Math.min(Math.max(a.quantity ?? 1, 1), 10) : 1,
          perNail,
          comment: a.comment ?? '',
        }
      }))
      setJewelryItems((data.jewelry_items ?? []).map((j: { id: string; name: string; quantity: number; unit_price: number }) => ({
        id: j.id, name: j.name, qty: j.quantity, unitPrice: j.unit_price,
      })))

      setNotes(data.notes ?? '')
      setLoadingEdit(false)
    })
    return () => { cancelled = true }
  }, [editId])

  // Computed values
  const sizeChangeData = catalog.cambio_tamanio.find(s => s.id === sizeChange)
  const tipChangeData = catalog.cambio_punta.find(t => t.id === tipChange)

  /**
   * Uñas trabajadas entre todos los sistemas y retoques. Pasarse de 10 no está
   * prohibido —hay servicios de manos + pies— pero casi siempre es un error de
   * carga, así que la sección avisa sin bloquear.
   */
  const nailsWorked = sumNails(systemItems) + sumNails(retoqueItems)

  const calc = calculateQuote({
    systemPrice: sumTotals(systemItems),
    retoquePrice: sumTotals(retoqueItems),
    retoqueExtra: catalog.retoque_semana[retoqueWeeks]?.price ?? 0,
    nailNumber,
    nailSizeFreeUpTo: tenant.nail_size_free_up_to,
    nailSizeStepPrice: Number(tenant.nail_size_step_price) || 0,
    kappingExtra,
    sizeChangePrice: sizeChangeData?.price ?? 0,
    tipChangePrice: tipChangeData?.price ?? 0,
    prepPrice: 0,
    designsTotal: designItems.reduce((s, d) => s + d.unitPrice * d.nails, 0),
    additionalsTotal: additionalItems.reduce((s, a) => s + a.unitPrice * a.quantity, 0),
    jewelryTotal: jewelryItems.reduce((s, j) => s + j.unitPrice * j.qty, 0),
    igvRate,
  })

  /** Costos visibles en la barra una vez que el usuario avanza de sección */
  const visibleCostLines = useMemo(() => {
    const lines: { id: string; label: string; amount: number; unlockAfterStep: number }[] = []

    systemItems.forEach(s => {
      const amount = serviceTotal(s)
      if (amount > 0) {
        lines.push({ id: `system-${s.id}`, label: s.name + nailsSuffix(s.nails), amount, unlockAfterStep: 2 })
      }
    })
    retoqueItems.forEach(r => {
      const amount = serviceTotal(r)
      if (amount > 0) {
        lines.push({ id: `retoque-${r.id}`, label: r.name + nailsSuffix(r.nails), amount, unlockAfterStep: 2 })
      }
    })
    if (calc.retoqueExtra > 0) {
      lines.push({
        id: 'retoque-extra',
        label: catalog.retoque_semana[retoqueWeeks]?.name ?? 'Extra retoque',
        amount: calc.retoqueExtra,
        unlockAfterStep: 2,
      })
    }
    if (calc.nailSizeExtra > 0) {
      lines.push({ id: 'nail-size', label: `Extra uña #${nailNumber}`, amount: calc.nailSizeExtra, unlockAfterStep: 2 })
    }
    if (calc.kappingExtra > 0) {
      lines.push({ id: 'kapping', label: 'Extra kapping', amount: calc.kappingExtra, unlockAfterStep: 2 })
    }
    if (sizeChangeData && calc.sizeChangePrice > 0) {
      lines.push({ id: 'size', label: sizeChangeData.name, amount: calc.sizeChangePrice, unlockAfterStep: 5 })
    }
    if (tipChangeData && calc.tipChangePrice > 0) {
      lines.push({ id: 'tip', label: tipChangeData.name, amount: calc.tipChangePrice, unlockAfterStep: 5 })
    }
    designItems.forEach((d) => {
      const amount = d.unitPrice * d.nails
      if (amount > 0) {
        lines.push({ id: `design-${d.lineId}`, label: d.name, amount, unlockAfterStep: 6 })
      }
    })
    additionalItems.forEach((a) => {
      const amount = a.unitPrice * a.quantity
      if (amount > 0) {
        lines.push({ id: `add-${a.id}`, label: a.name, amount, unlockAfterStep: 7 })
      }
    })
    jewelryItems.forEach((j) => {
      const amount = j.unitPrice * j.qty
      if (amount > 0) {
        lines.push({ id: `jewelry-${j.id}`, label: j.name, amount, unlockAfterStep: 7 })
      }
    })

    return lines.filter((l) => step > l.unlockAfterStep)
  }, [
    step,
    calc,
    systemItems,
    retoqueItems,
    sizeChangeData,
    tipChangeData,
    designItems,
    additionalItems,
    jewelryItems,
    retoqueWeeks,
    nailNumber,
  ])

  const filteredDesigns = catalog.diseno.filter(d => {
    const matchCat = designCategory === 'Todos' || d.category === designCategory
    const matchSearch = d.name.toLowerCase().includes(designSearch.toLowerCase())
    return matchCat && matchSearch
  })

  const diasDesdeUltimaVisita = daysBetween(lastVisit)

  /**
   * Clic en el diseño del catálogo: suma una uña a su última línea, o la crea
   * si todavía no está. Para el mismo diseño en otro color está "Otro color",
   * que abre una línea aparte.
   */
  function addDesign(design: CatalogEntry) {
    // price = set de 10 uñas; unitPrice = por uña (pricePerNail). Stickers usan price por unidad.
    const unitPrice = design.pricePerNail > 0 ? design.pricePerNail : design.price
    setDesignItems(prev => {
      const lastIndex = prev.reduce((found, d, i) => d.id === design.id ? i : found, -1)
      if (lastIndex >= 0) {
        const last = prev[lastIndex]
        if (last.nails >= 10) return prev
        return prev.map((d, i) => i === lastIndex ? { ...d, nails: d.nails + 1 } : d)
      }
      return [...prev, { lineId: newLineId(), id: design.id, name: design.name, nails: 1, unitPrice, comment: '' }]
    })
  }

  /** Otra línea del mismo diseño, para cobrarlo en otro color sobre otras uñas. */
  function duplicateDesign(lineId: string) {
    setDesignItems(prev => {
      const index = prev.findIndex(d => d.lineId === lineId)
      if (index < 0) return prev
      const copy = { ...prev[index], lineId: newLineId(), nails: 1, comment: '' }
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]
    })
  }

  function updateDesignNails(lineId: string, nails: number) {
    if (nails <= 0) {
      setDesignItems(prev => prev.filter(d => d.lineId !== lineId))
    } else {
      setDesignItems(prev => prev.map(d => d.lineId === lineId ? { ...d, nails: Math.min(nails, 10) } : d))
    }
  }

  function updateDesignComment(lineId: string, comment: string) {
    setDesignItems(prev => prev.map(d => d.lineId === lineId ? { ...d, comment } : d))
  }

  function toggleAdditional(adicional: CatalogEntry) {
    setAdditionalItems(prev => {
      if (prev.find(a => a.id === adicional.id)) {
        return prev.filter(a => a.id !== adicional.id)
      }
      const perNail = adicional.perNail === true
      // Si marcó "por uña" pero no llenó ese precio, se deriva del set de 10
      // en vez de cobrar 0.
      const unitPrice = perNail
        ? (adicional.pricePerNail || adicional.price / 10)
        : adicional.price
      return [...prev, {
        id: adicional.id,
        name: adicional.name,
        unitPrice,
        quantity: 1,
        perNail,
        comment: '',
      }]
    })
  }

  function updateAdditionalQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      setAdditionalItems(prev => prev.filter(a => a.id !== id))
      return
    }
    setAdditionalItems(prev => prev.map(a =>
      a.id === id ? { ...a, quantity: Math.min(quantity, 10) } : a
    ))
  }

  function updateAdditionalComment(id: string, comment: string) {
    setAdditionalItems(prev => prev.map(a => a.id === id ? { ...a, comment } : a))
  }

  function addJewelry(j: CatalogEntry) {
    setJewelryItems(prev => {
      const existing = prev.find(x => x.id === j.id)
      if (existing) {
        return prev.map(x => x.id === j.id ? { ...x, qty: x.qty + 1 } : x)
      }
      return [...prev, { id: j.id, name: j.name, qty: 1, unitPrice: j.price }]
    })
  }

  function updateJewelryQty(id: string, qty: number) {
    if (qty <= 0) setJewelryItems(prev => prev.filter(j => j.id !== id))
    else setJewelryItems(prev => prev.map(j => j.id === id ? { ...j, qty } : j))
  }

  async function saveQuote(status: 'borrador' | 'confirmada') {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      user_id: user.id,
      client_name: clientName,
      client_phone: clientPhone || null,
      date: quoteDate,
      responsible: responsible || null,
      client_type: clientType,
      share_policies: sharePolicies,
      next_maintenance_date: nextMaintenance || null,
      system_items: systemItems.map(toStoredItem),
      retoque_items: retoqueItems.map(toStoredItem),
      // Espejo plano de las dos listas de arriba. Lo consumen el buscador de
      // cotizaciones, la columna "Sistema" de los listados y el RPC de sistema
      // favorito de la clienta, que trabajan por columna y no por JSON.
      system_name: systemItems.map(s => s.name).join(' + ') || null,
      system_price: calc.systemPrice,
      system_nails: sumNails(systemItems) || FULL_SET_NAILS,
      retoque_name: retoqueItems.map(r => r.name).join(' + ') || null,
      retoque_price: calc.retoquePrice,
      retoque_nails: sumNails(retoqueItems) || FULL_SET_NAILS,
      retoque_weeks_extra: calc.retoqueExtra,
      nail_number: nailNumber,
      nail_size_extra: calc.nailSizeExtra,
      kapping_extra: kappingExtra,
      size_change_label: sizeChangeData?.name ?? null,
      size_change_price: calc.sizeChangePrice,
      tip_change_label: tipChangeData?.name ?? null,
      tip_change_price: calc.tipChangePrice,
      prep_type: null,
      prep_price: 0,
      nail_curvature: nailCurvature || null,
      nail_plate_status: nailPlateStatus || null,
      skin_type: skinType || null,
      nail_moisture: nailMoisture || null,
      previous_product: previousProduct || null,
      product_condition: productCondition || null,
      primer_type: primerType || null,
      base_type: baseType || null,
      service_type: serviceType || null,
      nail_system_material: systemMaterial || null,
      technique_type: techniqueType || null,
      nail_shape: nailShape || null,
      nail_length: nailLength || null,
      technical_notes: technicalNotes || null,
      additional_items: additionalItems.map(a => ({
        id: a.id,
        name: a.name,
        quantity: a.quantity,
        unit_price: a.unitPrice,
        total: a.unitPrice * a.quantity,
        comment: a.comment || null,
      })),
      design_items: designItems.map(d => ({
        id: d.id, name: d.name, nails_count: d.nails, unit_price: d.unitPrice, total: d.unitPrice * d.nails, comment: d.comment || null
      })),
      jewelry_items: jewelryItems.map(j => ({
        id: j.id, name: j.name, quantity: j.qty, unit_price: j.unitPrice, total: j.unitPrice * j.qty
      })),
      subtotal: calc.subtotal,
      igv_rate: calc.igvRate,
      igv_amount: calc.igvAmount,
      total_with_igv: calc.totalWithIgv,
      notes: notes || null,
      status,
    }

    if (editId) {
      const { error } = await supabase.from('quotes').update(payload).eq('id', editId)
      setSaving(false)
      if (!error) {
        router.push(`/cotizacion/${editId}`)
      } else {
        alert('Error al guardar: ' + error.message)
      }
      return
    }

    const { data, error } = await supabase.from('quotes').insert(payload).select().single()
    setSaving(false)

    if (!error && data) {
      router.push(`/cotizacion/${data.id}`)
    } else {
      alert('Error al guardar: ' + error?.message)
    }
  }

  if (loadingEdit) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--vk-text-muted)', padding: '40px 0' }}>
        <Loader2 size={18} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
        Cargando cotización...
      </div>
    )
  }

  return (
    <div className="fade-in cotizacion-form-page">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: '32px', fontWeight: 700,
          color: 'var(--vk-text)', marginBottom: '6px', letterSpacing: '-0.03em',
        }}>
          {editId ? 'Editar Cotización' : 'Nueva Cotización'}
        </h1>
        <p style={{ color: 'var(--vk-text-muted)', fontSize: '14px' }}>
          {editId ? 'Modifica los datos y guarda los cambios' : 'Completa los pasos para calcular el precio total'}
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '4px' }}>
        {STEPS.map(({ id, label, Icon }) => {
          const active = step === id
          const done = step > id
          return (
            <button
              key={id}
              onClick={() => setStep(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 15px', borderRadius: '10px', border: 'none',
                background: active ? 'linear-gradient(135deg, rgba(243,50,131,0.18), rgba(243,50,131,0.06))' : 'transparent',
                color: active ? 'var(--vk-white)' : done ? 'var(--vk-pink-soft)' : 'var(--vk-text-muted)',
                fontSize: '13px', fontWeight: active ? 600 : 500,
                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)',
                boxShadow: active ? '0 0 0 1px rgba(243,50,131,0.3) inset' : 'none',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} color={active || done ? 'var(--vk-pink-soft)' : 'currentColor'} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Price badge floating */}
      <div className="price-float" style={{ marginBottom: '16px' }}>
        <div className="price-float-breakdown">
          {visibleCostLines.length === 0 ? (
            <span className="price-float-empty">
              {step <= 2 ? 'Los costos aparecerán al avanzar de sección' : 'Sin cargos en secciones anteriores'}
            </span>
          ) : (
            visibleCostLines.map((line) => (
              <div key={line.id} className="price-float-line">
                <span className="price-float-line-label" title={line.label}>{line.label}</span>
                <span className="price-float-line-amount">{formatSoles(line.amount)}</span>
              </div>
            ))
          )}
        </div>
        <div className="price-float-totals">
          <div className="price-float-main">
            <div style={{ fontSize: '10px', color: 'var(--vk-text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Subtotal</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: 'var(--vk-pink-soft)', letterSpacing: '-0.02em' }}>{formatSoles(calc.subtotal)}</div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--vk-text-subtle)' }}>+IGV: {formatSoles(calc.totalWithIgv)}</div>
        </div>
      </div>

      {/* =========== STEP 1: Cliente =========== */}
      {step === 1 && (
        <div className="glass-card fade-in step-card">
          <h2 style={sectionTitleStyle}>Datos de la clienta</h2>
          <div className="form-grid-2">
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input style={inputStyle} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input style={inputStyle} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="999 000 000" />
            </div>
            <div>
              <label style={labelStyle}>Edad</label>
              <input type="number" style={inputStyle} value={clientAge} onChange={e => setClientAge(e.target.value)} placeholder="Edad" />
            </div>
            <div>
              <label style={labelStyle}>Fecha de servicio</label>
              <input type="date" style={inputStyle} value={quoteDate} onChange={e => setQuoteDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Frecuencia</label>
              <VkSelect
                value={clientType}
                onChange={v => setClientType(v as 'nueva' | 'frecuente')}
                options={[
                  { value: 'nueva', label: 'Clienta Nueva' },
                  { value: 'frecuente', label: 'Clienta Frecuente' },
                ]}
              />
            </div>
            <div>
              <label style={labelStyle}>Última visita</label>
              <input type="date" style={inputStyle} value={lastVisit} onChange={e => setLastVisit(e.target.value)} />
              {diasDesdeUltimaVisita !== null && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: diasDesdeUltimaVisita > 35 ? 'var(--vk-warning)' : 'var(--vk-success)' }}>
                  {diasDesdeUltimaVisita} días desde última visita
                  {diasDesdeUltimaVisita > 35 && ' — más de 5 semanas'}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Próximo mantenimiento</label>
              <input type="date" style={inputStyle} value={nextMaintenance} onChange={e => setNextMaintenance(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Responsable</label>
              <input style={inputStyle} value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nombre de la técnica" />
            </div>
          </div>
          {parseInt(clientAge) < 18 && clientAge !== '' && (
            <div style={{
              marginTop: '18px', padding: '13px 16px',
              background: 'rgba(245,169,75,0.08)', border: '1px solid rgba(245,169,75,0.3)',
              borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
            }}>
              <AlertTriangle size={17} strokeWidth={2} color="var(--vk-warning)" />
              <span style={{ fontSize: '13px', color: 'var(--vk-warning)', flex: '1 1 200px', minWidth: 0 }}>
                Menor de 18 años — Compartir políticas de servicio obligatoriamente
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '13px', color: 'var(--vk-warning)' }}>
                <input
                  type="checkbox"
                  checked={sharePolicies}
                  onChange={e => setSharePolicies(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--vk-warning)' }}
                />
                Confirmado
              </label>
            </div>
          )}
        </div>
      )}

      {/* =========== STEP 2: Sistema =========== */}
      {step === 2 && (
        <div className="glass-card fade-in step-card">
          <h2 style={sectionTitleStyle}>Sistema de uñas</h2>
          <div style={{ display: 'grid', gap: '18px' }}>
            <ServiceList
              label="Sistemas base"
              placeholder="— Sin sistema / Solo diseño —"
              emptyHint={catalog.sistema.length === 0
                ? 'Todavía no cargaste sistemas en "Mis precios".'
                : 'Ya agregaste todos los sistemas de tu catálogo.'}
              entries={catalog.sistema}
              groupByCategory
              items={systemItems}
              onChange={setSystemItems}
            />

            <ServiceList
              label="Retoques (si aplica)"
              placeholder="— Sin retoque —"
              emptyHint={catalog.retoque.length === 0
                ? 'Todavía no cargaste retoques en "Mis precios".'
                : 'Ya agregaste todos los retoques de tu catálogo.'}
              entries={catalog.retoque}
              groupByCategory={false}
              items={retoqueItems}
              onChange={setRetoqueItems}
            />

            {nailsWorked > FULL_SET_NAILS && (
              <div style={{
                padding: '12px 15px', background: 'rgba(245,169,75,0.08)',
                border: '1px solid rgba(245,169,75,0.3)', borderRadius: '10px',
                fontSize: '12px', color: 'var(--vk-warning)',
                display: 'flex', gap: '9px', alignItems: 'flex-start',
              }}>
                <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Estás cobrando {nailsWorked} uñas entre sistemas y retoques, y una mano tiene {FULL_SET_NAILS}.
                  Si el servicio incluye pies o dos manos está bien; si no, revisa las cantidades.
                </span>
              </div>
            )}

            {retoqueItems.length > 0 && (
              <div>
                <label style={labelStyle}>Semanas desde último retoque</label>
                <VkSelect
                  value={String(retoqueWeeks)}
                  onChange={v => setRetoqueWeeks(Number(v))}
                  options={catalog.retoque_semana.map((s, i) => ({
                    value: String(i),
                    label: s.name,
                  }))}
                />
                {catalog.retoque_semana[retoqueWeeks]?.price > 0 && (
                  <div style={{ marginTop: '7px', fontSize: '12px', padding: '9px 12px', background: 'rgba(245,169,75,0.08)', border: '1px solid rgba(245,169,75,0.25)', borderRadius: '8px', color: 'var(--vk-warning)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <AlertTriangle size={14} strokeWidth={2} />
                    Cargo adicional: +{formatSoles(catalog.retoque_semana[retoqueWeeks].price)} por semanas de retoque
                  </div>
                )}
              </div>
            )}

            <div className="form-grid-2">
              <div>
                <label style={labelStyle}>Número de uña actual</label>
                <VkSelect
                  value={String(nailNumber)}
                  onChange={v => setNailNumber(Number(v))}
                  options={Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
                    const extra = nailSizeExtraFor(n)
                    return {
                      value: String(n),
                      label: `N.º ${n}${extra > 0 ? ` (+${formatSoles(extra)})` : n <= nailSizeFreeUpTo ? ' (incluido)' : ''}`,
                    }
                  })}
                />
                {nailSizeExtraFor(nailNumber) > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--vk-warning)' }}>
                    +{formatSoles(nailSizeExtraFor(nailNumber))} por largo N.º {nailNumber} ({formatSoles(nailSizeStepPrice)} por nivel desde el {nailSizeFreeUpTo + 1})
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Kapping extra (si aplica)</label>
                <VkSelect
                  value={String(kappingExtra)}
                  onChange={v => setKappingExtra(Number(v))}
                  options={catalog.kapping.map(k => ({
                    value: String(k.price),
                    label: k.name,
                  }))}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Tasa IGV</label>
              <VkSelect
                value={String(igvRate)}
                onChange={v => setIgvRate(Number(v))}
                options={[
                  { value: '0', label: 'Sin IGV (0%)' },
                  { value: '0.18', label: 'Con IGV (18%)' },
                ]}
              />
            </div>

            {/* Info box */}
            <div style={{ padding: '13px 16px', background: 'var(--vk-surface)', border: '1px solid var(--vk-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--vk-text-subtle)', lineHeight: 1.6, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Info size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Sistema incluye un solo tono · Largo incluido hasta N.º 3 · Desde N.º 4 se suman S/5 por cada nivel · Para kapping con uña natural mayor a 3 se suma cargo extra</span>
            </div>
          </div>
        </div>
      )}

      {/* =========== STEP 3: Diagnóstico =========== */}
      {step === 3 && (
        <div className="glass-card fade-in step-card">
          <h2 style={sectionTitleStyle}>Diagnóstico</h2>
          <div className="form-grid-2">
            <div>
              <label style={labelStyle}>Tipo de uña</label>
              <VkSelect
                value={nailCurvature}
                onChange={setNailCurvature}
                allowEmpty
                options={TIPO_UNA.map(t => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Estado de la lámina</label>
              <VkSelect
                value={nailPlateStatus}
                onChange={setNailPlateStatus}
                allowEmpty
                options={ESTADO_LAMINA.map(c => ({ value: c, label: c }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo de piel</label>
              <VkSelect
                value={skinType}
                onChange={setSkinType}
                allowEmpty
                options={TIPO_PIEL.map(t => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Humedad de la uña</label>
              <VkSelect
                value={nailMoisture}
                onChange={setNailMoisture}
                allowEmpty
                options={HUMEDAD_UNA.map(t => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Producto previo</label>
              <VkSelect
                value={previousProduct}
                onChange={setPreviousProduct}
                allowEmpty
                options={PRODUCTO_PREVIO.map(t => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Estado del producto</label>
              <VkSelect
                value={productCondition}
                onChange={setProductCondition}
                allowEmpty
                options={ESTADO_PRODUCTO.map(t => ({ value: t, label: t }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* =========== STEP 5: Tamaño y Punta =========== */}
      {step === 5 && (
        <div className="glass-card fade-in step-card">
          <h2 style={sectionTitleStyle}>Cambio de tamaño y punta</h2>
          <div className="form-grid-2">
            <div>
              <label style={labelStyle}>Cambio de tamaño</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {catalog.cambio_tamanio.map(c => (
                  <label key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '11px',
                    padding: '11px 14px', borderRadius: '12px', cursor: 'pointer',
                    background: sizeChange === c.id ? 'var(--vk-pink-muted)' : 'var(--vk-surface)',
                    border: sizeChange === c.id ? '1px solid rgba(243,50,131,0.3)' : '1px solid var(--vk-border)',
                    transition: 'all 0.15s',
                  }}>
                    <input
                      type="radio" name="size-change" value={c.id}
                      checked={sizeChange === c.id} onChange={() => setSizeChange(c.id)}
                      style={{ accentColor: 'var(--vk-pink)' }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--vk-text)', flex: 1 }}>{c.name}</span>
                    {c.price > 0 && <span style={{ fontSize: '13px', color: 'var(--vk-pink-soft)', fontWeight: 600 }}>{formatSoles(c.price)}</span>}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Cambio de punta</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {catalog.cambio_punta.map(c => (
                  <label key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '11px',
                    padding: '11px 14px', borderRadius: '12px', cursor: 'pointer',
                    background: tipChange === c.id ? 'var(--vk-pink-muted)' : 'var(--vk-surface)',
                    border: tipChange === c.id ? '1px solid rgba(243,50,131,0.3)' : '1px solid var(--vk-border)',
                    transition: 'all 0.15s',
                  }}>
                    <input
                      type="radio" name="tip-change" value={c.id}
                      checked={tipChange === c.id} onChange={() => setTipChange(c.id)}
                      style={{ accentColor: 'var(--vk-pink)' }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--vk-text)', flex: 1 }}>{c.name}</span>
                    {c.price > 0 && <span style={{ fontSize: '13px', color: 'var(--vk-pink-soft)', fontWeight: 600 }}>{formatSoles(c.price)}</span>}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========== STEP 6: Diseños =========== */}
      {step === 6 && (
        <div className="fade-in">
          <div className="glass-card step-card" style={{ marginBottom: '16px' }}>
            <h2 style={sectionTitleStyle}>Diseños</h2>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                placeholder="Buscar diseño..."
                value={designSearch}
                onChange={e => setDesignSearch(e.target.value)}
                style={{ ...inputStyle, maxWidth: '280px' }}
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Todos', ...disenoCategories].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setDesignCategory(cat)}
                    style={{
                      padding: '7px 14px', borderRadius: '20px',
                      background: designCategory === cat ? 'var(--vk-pink-muted)' : 'var(--vk-surface)',
                      color: designCategory === cat ? 'var(--vk-pink-soft)' : 'var(--vk-text-muted)',
                      fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      border: designCategory === cat ? '1px solid rgba(243,50,131,0.3)' : '1px solid var(--vk-border)',
                      fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="scrollable-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
              {filteredDesigns.map(d => {
                // Un diseño puede estar en varias líneas (mismo diseño, otro
                // color): el contador de la tarjeta suma todas.
                const nailsInCart = designItems
                  .filter(x => x.id === d.id)
                  .reduce((s, x) => s + x.nails, 0)
                const inCart = nailsInCart > 0
                return (
                  <button
                    key={d.id}
                    onClick={() => addDesign(d)}
                    style={{
                      padding: '11px 14px', borderRadius: '12px',
                      background: inCart ? 'var(--vk-pink-muted)' : 'var(--vk-surface)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                      border: inCart ? '1px solid rgba(243,50,131,0.3)' : '1px solid var(--vk-border)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 500, color: inCart ? 'var(--vk-pink-soft)' : 'var(--vk-text)', marginBottom: '4px' }}>
                      {d.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>
                      {formatSoles(d.pricePerNail > 0 ? d.pricePerNail : d.price)} / uña{inCart && <span style={{ color: 'var(--vk-pink)', fontWeight: 600 }}> × {nailsInCart}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {designItems.length > 0 && (
            <div className="glass-card step-card">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700, color: 'var(--vk-text)', marginBottom: '12px' }}>
                Diseños seleccionados
              </h3>
              {designItems.map(d => (
                <div key={d.lineId} style={{ padding: '11px 0', borderBottom: '1px solid var(--vk-border)' }}>
                  <div className="line-item-row" style={{ marginBottom: '7px' }}>
                    <span className="line-item-name" style={{ fontSize: '14px', color: 'var(--vk-text)' }}>{d.name}</span>
                    <span style={{ fontSize: '13px', color: 'var(--vk-text-muted)' }}>{formatSoles(d.unitPrice)} ×</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => updateDesignNails(d.lineId, d.nails - 1)} style={{ width: '26px', height: '26px', borderRadius: '7px', border: '1px solid var(--vk-border)', background: 'var(--vk-surface)', color: 'var(--vk-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={13} strokeWidth={2} />
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--vk-text)', minWidth: '20px', textAlign: 'center' }}>{d.nails}</span>
                      <button
                        onClick={() => updateDesignNails(d.lineId, d.nails + 1)}
                        disabled={d.nails >= 10}
                        style={{
                          width: '26px', height: '26px', borderRadius: '7px',
                          border: '1px solid var(--vk-border)', background: 'var(--vk-surface)',
                          color: d.nails >= 10 ? 'var(--vk-text-subtle)' : 'var(--vk-text)',
                          cursor: d.nails >= 10 ? 'default' : 'pointer',
                          opacity: d.nails >= 10 ? 0.45 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Plus size={13} strokeWidth={2} />
                      </button>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--vk-pink-soft)', minWidth: '70px', textAlign: 'right' }}>{formatSoles(d.unitPrice * d.nails)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      placeholder="Color o detalle (ej: rojo)..."
                      value={d.comment}
                      onChange={e => updateDesignComment(d.lineId, e.target.value)}
                      style={commentInputStyle}
                    />
                    <button
                      type="button"
                      onClick={() => duplicateDesign(d.lineId)}
                      title={`Agregar otra línea de ${d.name}, para cobrarlo en otro color`}
                      style={{
                        flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '5px',
                        padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                        border: '1px solid var(--vk-border)', background: 'var(--vk-surface)',
                        color: 'var(--vk-text-muted)', fontSize: '12px', fontFamily: 'var(--font-body)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Plus size={12} strokeWidth={2} />
                      Otro color
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', fontSize: '15px', fontWeight: 600, color: 'var(--vk-pink)' }}>
                Total diseños: {formatSoles(designItems.reduce((s, d) => s + d.unitPrice * d.nails, 0))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========== STEP 7: Adicionales =========== */}
      {step === 7 && (
        <div className="fade-in form-grid-2" style={{ gap: '16px' }}>
          <div className="glass-card step-card">
            <h2 style={{ ...sectionTitleStyle, fontSize: '18px', marginBottom: '16px' }}>Adicionales de servicio</h2>
            <div className="scrollable-list-lg" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {catalog.adicional.map(a => {
                const selected = additionalItems.find(x => x.id === a.id)
                const unitLabel = a.perNail
                  ? `${formatSoles(a.pricePerNail ?? a.price / 10)} / uña`
                  : formatSoles(a.price)
                return (
                  <div key={a.id} style={{ borderRadius: '10px', border: selected ? '1px solid rgba(243,50,131,0.25)' : '1px solid transparent', background: selected ? 'var(--vk-pink-muted)' : 'transparent', transition: 'all 0.15s' }}>
                    <label className="line-item-row" style={{ padding: '10px 12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox" checked={!!selected}
                        onChange={() => toggleAdditional(a)}
                        style={{ accentColor: 'var(--vk-pink)', cursor: 'pointer' }}
                      />
                      <span className="line-item-name" style={{ fontSize: '13px', color: 'var(--vk-text)' }}>{a.name}</span>
                      {a.duration && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--vk-text-subtle)' }}>
                          <Clock size={11} strokeWidth={2} />
                          {a.duration}
                        </span>
                      )}
                      <span style={{ fontSize: '13px', color: selected ? 'var(--vk-pink-soft)' : 'var(--vk-text-muted)', fontWeight: 600 }}>
                        {unitLabel}
                        {selected?.perNail && (
                          <span style={{ color: 'var(--vk-pink)', fontWeight: 600 }}> × {selected.quantity}</span>
                        )}
                      </span>
                    </label>
                    {selected && (
                      <div style={{ padding: '0 12px 9px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selected.perNail && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>Cantidad de uñas</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => updateAdditionalQuantity(a.id, selected.quantity - 1)}
                                style={{ width: '26px', height: '26px', borderRadius: '7px', border: '1px solid var(--vk-border)', background: 'var(--vk-surface)', color: 'var(--vk-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Minus size={13} strokeWidth={2} />
                              </button>
                              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--vk-text)', minWidth: '20px', textAlign: 'center' }}>{selected.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateAdditionalQuantity(a.id, selected.quantity + 1)}
                                disabled={selected.quantity >= 10}
                                style={{
                                  width: '26px', height: '26px', borderRadius: '7px',
                                  border: '1px solid var(--vk-border)', background: 'var(--vk-surface)',
                                  color: selected.quantity >= 10 ? 'var(--vk-text-subtle)' : 'var(--vk-text)',
                                  cursor: selected.quantity >= 10 ? 'default' : 'pointer',
                                  opacity: selected.quantity >= 10 ? 0.45 : 1,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                <Plus size={13} strokeWidth={2} />
                              </button>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vk-pink-soft)', minWidth: '64px', textAlign: 'right' }}>
                                {formatSoles(selected.unitPrice * selected.quantity)}
                              </span>
                            </div>
                          </div>
                        )}
                        <input
                          placeholder="Comentario..."
                          value={selected.comment}
                          onChange={e => updateAdditionalComment(a.id, e.target.value)}
                          style={commentInputStyle}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="glass-card step-card">
            <h2 style={{ ...sectionTitleStyle, fontSize: '18px', marginBottom: '16px' }}>Pedrería</h2>
            <div className="scrollable-list-lg" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[...new Set(catalog.pedreria.map(p => p.category))].map(cat => (
                <div key={cat}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--vk-pink-soft)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '10px 4px 5px' }}>{cat}</div>
                  {catalog.pedreria.filter(p => p.category === cat).map(j => {
                    const item = jewelryItems.find(x => x.id === j.id)
                    return (
                      <div key={j.id} className="line-item-row" style={{ padding: '8px 12px', borderRadius: '10px', background: item ? 'var(--vk-pink-muted)' : 'transparent', border: item ? '1px solid rgba(243,50,131,0.25)' : '1px solid transparent', transition: 'all 0.15s' }}>
                        <span className="line-item-name" style={{ fontSize: '13px', color: 'var(--vk-text)' }}>{j.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>{formatSoles(j.price)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button onClick={() => item && updateJewelryQty(j.id, item.qty - 1)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid var(--vk-border)', background: 'var(--vk-surface)', color: 'var(--vk-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Minus size={11} strokeWidth={2} />
                          </button>
                          <span style={{ fontSize: '13px', color: 'var(--vk-text)', minWidth: '16px', textAlign: 'center' }}>{item?.qty ?? 0}</span>
                          <button onClick={() => addJewelry(j)} style={{ width: '22px', height: '22px', borderRadius: '6px', border: '1px solid var(--vk-border)', background: 'var(--vk-surface)', color: 'var(--vk-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={11} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========== STEP 8: Resumen =========== */}
      {step === 8 && (
        <div className="fade-in">
          <div className="glass-card step-card" style={{ marginBottom: '16px' }}>
            <h2 style={sectionTitleStyle}>Resumen de cotización</h2>

            {/* Client info row */}
            <div className="form-grid-3" style={{ marginBottom: '24px', padding: '16px', background: 'var(--vk-surface)', borderRadius: '14px', border: '1px solid var(--vk-border)' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--vk-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>Clienta</div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--vk-text)' }}>{clientName || 'Sin nombre'}</div>
                {clientPhone && <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>{clientPhone}</div>}
                <div style={{ fontSize: '12px', color: 'var(--vk-pink-soft)', marginTop: '2px' }}>
                  {clientType === 'nueva' ? 'Clienta Nueva' : 'Clienta Frecuente'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--vk-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>Servicio</div>
                <div style={{ fontSize: '13px', color: 'var(--vk-text)', marginBottom: '2px' }}>{quoteDate}</div>
                {responsible && <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>Responsable: {responsible}</div>}
                {diasDesdeUltimaVisita !== null && (
                  <div style={{ fontSize: '12px', color: 'var(--vk-text-subtle)' }}>{diasDesdeUltimaVisita} días desde última visita</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--vk-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>Uña</div>
                {nailCurvature && <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>{nailCurvature}{nailPlateStatus ? ` · ${nailPlateStatus}` : ''}</div>}
                {productCondition && <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>Producto: {productCondition}</div>}
                {(nailShape || nailLength) && <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>{[nailShape, nailLength].filter(Boolean).join(' · ')}</div>}
                <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>Núm {nailNumber}</div>
              </div>
            </div>

            {/* Servicios table */}
            <div style={{ border: '1px solid var(--vk-border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '22px' }}>
            <div className="table-scroll">
              {/* Header */}
              <div className="quote-summary-row quote-summary-header" style={{ background: 'rgba(0,0,0,0.25)', padding: '11px 16px', fontSize: '10px', fontWeight: 600, color: 'var(--vk-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--vk-border)' }}>
                <span>Concepto</span>
                <span style={{ textAlign: 'center' }}>Uñas</span>
                <span style={{ textAlign: 'right' }}>Precio</span>
                <span style={{ textAlign: 'right' }}>Resumen</span>
              </div>

              {/* Sistema */}
              {(systemItems.length > 0 || retoqueItems.length > 0) && (
                <div style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <div style={groupHeaderStyle}>Sistema</div>
                  {[
                    ...systemItems.map(item => ({ key: `sistema-${item.id}`, item })),
                    ...retoqueItems.map(item => ({ key: `retoque-${item.id}`, item })),
                  ].map(({ key, item }) => (
                    <div key={key} className="quote-summary-row" style={{ padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>
                        {item.name}
                        {item.comment && <span style={{ color: 'var(--vk-text-muted)', fontSize: '12px' }}> — {item.comment}</span>}
                      </span>
                      <span data-label="Uñas" style={{ textAlign: 'center', color: 'var(--vk-text-muted)' }}>{item.nails}</span>
                      <span data-label="Precio" style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>
                        {item.nails >= FULL_SET_NAILS
                          ? formatSoles(item.price)
                          : `${formatSoles(item.pricePerNail > 0 ? item.pricePerNail : item.price / FULL_SET_NAILS)} / uña`}
                      </span>
                      <span data-label="Total" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(serviceTotal(item))}</span>
                    </div>
                  ))}
                  {calc.retoqueExtra > 0 && (
                    <div className="quote-summary-row" style={{ padding: '7px 16px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--vk-warning)', paddingLeft: '14px' }}>Cargo semanas de retoque</span>
                      <span />
                      <span data-label="Monto" style={{ textAlign: 'right', color: 'var(--vk-warning)' }}>+{formatSoles(calc.retoqueExtra)}</span>
                      <span />
                    </div>
                  )}
                  {calc.nailSizeExtra > 0 && (
                    <div className="quote-summary-row" style={{ padding: '7px 16px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--vk-warning)', paddingLeft: '14px' }}>Extra uña núm {nailNumber}</span>
                      <span />
                      <span data-label="Monto" style={{ textAlign: 'right', color: 'var(--vk-warning)' }}>+{formatSoles(calc.nailSizeExtra)}</span>
                      <span />
                    </div>
                  )}
                  {kappingExtra > 0 && (
                    <div className="quote-summary-row" style={{ padding: '7px 16px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--vk-warning)', paddingLeft: '14px' }}>Extra kapping</span>
                      <span />
                      <span data-label="Monto" style={{ textAlign: 'right', color: 'var(--vk-warning)' }}>+{formatSoles(kappingExtra)}</span>
                      <span />
                    </div>
                  )}
                </div>
              )}

              {/* Cambios */}
              {(calc.sizeChangePrice > 0 || calc.tipChangePrice > 0) && (
                <div style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <div style={groupHeaderStyle}>Cambios</div>
                  {calc.sizeChangePrice > 0 && (
                    <div className="quote-summary-row" style={{ padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>{sizeChangeData?.name}</span>
                      <span />
                      <span data-label="Precio" style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(calc.sizeChangePrice)}</span>
                      <span data-label="Total" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(calc.sizeChangePrice)}</span>
                    </div>
                  )}
                  {calc.tipChangePrice > 0 && (
                    <div className="quote-summary-row" style={{ padding: '9px 16px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>{tipChangeData?.name}</span>
                      <span />
                      <span data-label="Precio" style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(calc.tipChangePrice)}</span>
                      <span data-label="Total" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(calc.tipChangePrice)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Adicionales */}
              {additionalItems.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <div style={groupHeaderStyle}>Adicionales</div>
                  {additionalItems.map(a => (
                    <div key={a.id} className="quote-summary-row" style={{ padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>
                        {a.name}
                        {a.comment && <span style={{ color: 'var(--vk-text-muted)', fontSize: '12px' }}> — {a.comment}</span>}
                      </span>
                      <span data-label="Uñas" style={{ textAlign: 'center', color: 'var(--vk-text-muted)' }}>
                        {a.perNail ? `${a.quantity} uña${a.quantity !== 1 ? 's' : ''}` : '—'}
                      </span>
                      <span data-label="Precio" style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(a.unitPrice)}</span>
                      <span data-label="Total" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(a.unitPrice * a.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pedrería */}
              {jewelryItems.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <div style={groupHeaderStyle}>Pedrería</div>
                  {jewelryItems.map(j => (
                    <div key={j.id} className="quote-summary-row" style={{ padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>{j.name}</span>
                      <span data-label="Uñas" style={{ textAlign: 'center', color: 'var(--vk-text-muted)' }}>×{j.qty}</span>
                      <span data-label="Precio" style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(j.unitPrice)}</span>
                      <span data-label="Total" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(j.unitPrice * j.qty)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Diseños */}
              {designItems.length > 0 && (
                <div>
                  <div style={groupHeaderStyle}>Diseño</div>
                  {designItems.map(d => (
                    <div key={d.lineId} className="quote-summary-row" style={{ padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>
                        {d.name}
                        {d.comment && <span style={{ color: 'var(--vk-text-muted)', fontSize: '12px' }}> — {d.comment}</span>}
                      </span>
                      <span data-label="Uñas" style={{ textAlign: 'center', color: 'var(--vk-text-muted)' }}>{d.nails} uña{d.nails !== 1 ? 's' : ''}</span>
                      <span data-label="Precio" style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(d.unitPrice)}</span>
                      <span data-label="Total" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(d.unitPrice * d.nails)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '22px' }}>
              <div style={{ width: '100%', maxWidth: '320px', background: 'var(--vk-surface)', borderRadius: '14px', padding: '20px', border: '1px solid rgba(243,50,131,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--vk-text)' }}>Subtotal</span>
                  <span style={{ fontSize: '14px', color: 'var(--vk-text)', fontWeight: 600 }}>{formatSoles(calc.subtotal)}</span>
                </div>
                {igvRate > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--vk-text-muted)' }}>IGV proyectado ({(igvRate * 100).toFixed(0)}%)</span>
                    <span style={{ fontSize: '13px', color: 'var(--vk-text-muted)' }}>{formatSoles(calc.igvAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '12px', marginTop: '8px', borderTop: '1px solid rgba(243,50,131,0.2)' }}>
                  <span style={{ fontSize: '16px', color: 'var(--vk-text)', fontWeight: 700 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700, color: 'var(--vk-pink-soft)', letterSpacing: '-0.02em' }}>
                    {formatSoles(igvRate > 0 ? calc.totalWithIgv : calc.subtotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen de servicio VK STUDIO */}
            <div style={{ background: 'rgba(243,50,131,0.04)', border: '1px solid rgba(243,50,131,0.15)', borderRadius: '14px', padding: '18px', marginBottom: '22px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--vk-pink)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '12px' }}>
                Resumen de servicio Vk Studio
              </div>
              <div className="service-summary-row quote-summary-header" style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--vk-text-subtle)', fontWeight: 600 }}>Clienta</span>
                <span style={{ color: 'var(--vk-text-subtle)', fontWeight: 600, textAlign: 'center' }}>Diseño / Detalle</span>
                <span style={{ color: 'var(--vk-text-subtle)', fontWeight: 600, textAlign: 'center' }}>Tiempo</span>
                <span style={{ color: 'var(--vk-text-subtle)', fontWeight: 600, textAlign: 'right' }}>Precio + IGV</span>
              </div>
              <div className="service-summary-row" style={{ fontSize: '13px' }}>
                <span style={{ color: 'var(--vk-text)', fontWeight: 500, paddingTop: '8px', borderTop: '1px solid var(--vk-border)' }}>{clientName || '—'}</span>
                <span data-label="Diseño / Detalle" style={{ paddingTop: '8px', borderTop: '1px solid var(--vk-border)', textAlign: 'center', fontSize: '12px', color: 'var(--vk-text-muted)' }}>
                  {[...systemItems, ...retoqueItems].map(i => i.name).join(' + ') || '—'}
                </span>
                <span data-label="Tiempo" style={{ color: 'var(--vk-text-muted)', paddingTop: '8px', borderTop: '1px solid var(--vk-border)', textAlign: 'center' }}>
                  {systemItems.map(i => i.duration).filter(Boolean).join(' · ') || '—'}
                </span>
                <span data-label="Precio + IGV" style={{ color: 'var(--vk-pink-soft)', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid var(--vk-border)', textAlign: 'right' }}>
                  {formatSoles(igvRate > 0 ? calc.totalWithIgv : calc.subtotal)}
                </span>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Notas adicionales</label>
              <textarea
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones, comentarios..."
              />
            </div>
          </div>

          {/* Save buttons */}
          <div className="save-actions" style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn-ghost"
              onClick={() => saveQuote('borrador')}
              disabled={saving || !clientName}
            >
              {saving ? <Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={16} strokeWidth={1.8} />}
              Guardar borrador
            </button>
            <button
              className="btn-primary"
              onClick={() => saveQuote('confirmada')}
              disabled={saving || !clientName}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {saving ? <Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={16} strokeWidth={2} />}
              {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Confirmar cotización'}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingBottom: '30px', gap: '12px', flexWrap: 'wrap' }}>
        <button
          className="btn-ghost"
          onClick={() => setStep(s => adjacentStep(s, -1))}
          disabled={step === 1}
          style={{ opacity: step === 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Anterior
        </button>
        {step < MAX_STEP && (
          <button
            className="btn-primary"
            onClick={() => setStep(s => adjacentStep(s, 1))}
          >
            Siguiente
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function QuoteForm({ catalog, tenant }: QuoteFormProps) {
  return (
    <Suspense fallback={<div style={{ color: 'var(--vk-text-muted)' }}>Cargando...</div>}>
      <NuevaCotizacionForm catalog={catalog} tenant={tenant} />
    </Suspense>
  )
}
