'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SISTEMAS, RETOQUES, RETOQUE_SEMANAS } from '@/lib/data/sistemas'
import {
  ADICIONALES, CAMBIO_TAMANIO, CAMBIO_PUNTA,
  PEDRERIA, PREP_TIPOS,
  PREP_TIPO_UNA, PREP_CAPA, PREP_CONDICION, KAPPING_EXTRA
} from '@/lib/data/adicionales'
import { DISENOS, DISENO_CATEGORIES } from '@/lib/data/disenos'
import { calculateQuote, formatSoles, getNailSizeExtra } from '@/lib/data/calcular'
import {
  User, Layers, Wand2, Ruler, Palette, Gem, ClipboardList,
  AlertTriangle, Info, Clock, Minus, Plus, ChevronLeft, ChevronRight,
  Save, Sparkles, Loader2,
} from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Cliente', Icon: User },
  { id: 2, label: 'Sistema', Icon: Layers },
  { id: 3, label: 'Preparación', Icon: Wand2 },
  { id: 4, label: 'Tamaño', Icon: Ruler },
  { id: 5, label: 'Diseños', Icon: Palette },
  { id: 6, label: 'Adicionales', Icon: Gem },
  { id: 7, label: 'Resumen', Icon: ClipboardList },
]

interface DesignItem { id: string; name: string; nails: number; unitPrice: number; comment: string }
interface JewelryItem { id: string; name: string; qty: number; unitPrice: number }
interface AdditionalItem { id: string; name: string; unitPrice: number; comment: string }

function daysBetween(dateStr: string): number | null {
  if (!dateStr) return null
  const last = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : null
}

function NuevaCotizacionForm() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
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

  // Step 2: Sistema
  const [selectedSystem, setSelectedSystem] = useState('')
  const [selectedRetoque, setSelectedRetoque] = useState('')
  const [retoqueWeeks, setRetoqueWeeks] = useState(0)
  const [nailNumber, setNailNumber] = useState(1)
  const [kappingExtra, setKappingExtra] = useState(0)
  const [igvRate, setIgvRate] = useState(0.18)
  const [systemComment, setSystemComment] = useState('')

  // Step 3: Prep
  const [prepType, setPrepType] = useState('estandar')
  const [nailType, setNailType] = useState('')
  const [nailLayer, setNailLayer] = useState('')
  const [nailCondition, setNailCondition] = useState('')

  // Step 4: Size/Tip
  const [sizeChange, setSizeChange] = useState(CAMBIO_TAMANIO[0].id)
  const [tipChange, setTipChange] = useState(CAMBIO_PUNTA[0].id)

  // Step 5: Designs
  const [designItems, setDesignItems] = useState<DesignItem[]>([])
  const [designSearch, setDesignSearch] = useState('')
  const [designCategory, setDesignCategory] = useState('Todos')

  // Step 6: Adicionales & Jewelry
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([])
  const [jewelryItems, setJewelryItems] = useState<JewelryItem[]>([])

  // Step 7: Notes
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

      setSelectedSystem(SISTEMAS.find(s => s.name === data.system_name)?.id ?? '')
      setSelectedRetoque(RETOQUES.find(r => r.name === data.retoque_name)?.id ?? '')
      const weeksIdx = RETOQUE_SEMANAS.findIndex(w => w.extra === data.retoque_weeks_extra)
      setRetoqueWeeks(weeksIdx >= 0 ? weeksIdx : 0)
      setNailNumber(data.nail_number ?? 1)
      setKappingExtra(data.kapping_extra ?? 0)
      setIgvRate(data.igv_rate ?? 0.18)

      setPrepType(PREP_TIPOS.find(p => p.label === data.prep_type)?.id ?? 'estandar')
      setNailType(data.nail_type ?? '')
      setNailLayer(data.nail_layer ?? '')
      setNailCondition(data.nail_condition ?? '')

      setSizeChange(CAMBIO_TAMANIO.find(s => s.label === data.size_change_label)?.id ?? CAMBIO_TAMANIO[0].id)
      setTipChange(CAMBIO_PUNTA.find(t => t.label === data.tip_change_label)?.id ?? CAMBIO_PUNTA[0].id)

      setDesignItems((data.design_items ?? []).map((d: { id: string; name: string; nails_count: number; unit_price: number; comment?: string | null }) => ({
        id: d.id, name: d.name, nails: d.nails_count, unitPrice: d.unit_price, comment: d.comment ?? '',
      })))
      setAdditionalItems((data.additional_items ?? []).map((a: { id: string; name: string; unit_price: number; comment?: string | null }) => ({
        id: a.id, name: a.name, unitPrice: a.unit_price, comment: a.comment ?? '',
      })))
      setJewelryItems((data.jewelry_items ?? []).map((j: { id: string; name: string; quantity: number; unit_price: number }) => ({
        id: j.id, name: j.name, qty: j.quantity, unitPrice: j.unit_price,
      })))

      setNotes(data.notes ?? '')
      setLoadingEdit(false)
    })
    return () => { cancelled = true }
  }, [editId])

  // Computed values
  const systemData = SISTEMAS.find(s => s.id === selectedSystem)
  const retoqueData = RETOQUES.find(r => r.id === selectedRetoque)
  const sizeChangeData = CAMBIO_TAMANIO.find(s => s.id === sizeChange)
  const tipChangeData = CAMBIO_PUNTA.find(t => t.id === tipChange)
  const prepData = PREP_TIPOS.find(p => p.id === prepType)

  const calc = calculateQuote({
    systemPrice: systemData?.price ?? 0,
    retoquePrice: retoqueData?.price ?? 0,
    retoqueExtra: RETOQUE_SEMANAS[retoqueWeeks]?.extra ?? 0,
    nailNumber,
    kappingExtra,
    sizeChangePrice: sizeChangeData?.price ?? 0,
    tipChangePrice: tipChangeData?.price ?? 0,
    prepPrice: prepData?.price ?? 0,
    designsTotal: designItems.reduce((s, d) => s + d.unitPrice * d.nails, 0),
    additionalsTotal: additionalItems.reduce((s, a) => s + a.unitPrice, 0),
    jewelryTotal: jewelryItems.reduce((s, j) => s + j.unitPrice * j.qty, 0),
    igvRate,
  })

  const filteredDesigns = DISENOS.filter(d => {
    const matchCat = designCategory === 'Todos' || d.category === designCategory
    const matchSearch = d.name.toLowerCase().includes(designSearch.toLowerCase())
    return matchCat && matchSearch
  })

  const diasDesdeUltimaVisita = daysBetween(lastVisit)

  function addDesign(design: typeof DISENOS[0]) {
    setDesignItems(prev => {
      const existing = prev.find(d => d.id === design.id)
      if (existing) {
        return prev.map(d => d.id === design.id ? { ...d, nails: d.nails + 1 } : d)
      }
      return [...prev, { id: design.id, name: design.name, nails: 1, unitPrice: design.price, comment: '' }]
    })
  }

  function updateDesignNails(id: string, nails: number) {
    if (nails <= 0) {
      setDesignItems(prev => prev.filter(d => d.id !== id))
    } else {
      setDesignItems(prev => prev.map(d => d.id === id ? { ...d, nails } : d))
    }
  }

  function updateDesignComment(id: string, comment: string) {
    setDesignItems(prev => prev.map(d => d.id === id ? { ...d, comment } : d))
  }

  function toggleAdditional(adicional: typeof ADICIONALES[0]) {
    setAdditionalItems(prev => {
      if (prev.find(a => a.id === adicional.id)) {
        return prev.filter(a => a.id !== adicional.id)
      }
      return [...prev, { id: adicional.id, name: adicional.name, unitPrice: adicional.price, comment: '' }]
    })
  }

  function updateAdditionalComment(id: string, comment: string) {
    setAdditionalItems(prev => prev.map(a => a.id === id ? { ...a, comment } : a))
  }

  function addJewelry(j: typeof PEDRERIA[0]) {
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
      system_name: systemData?.name ?? null,
      system_price: calc.systemPrice,
      retoque_name: retoqueData?.name ?? null,
      retoque_price: calc.retoquePrice,
      retoque_weeks_extra: calc.retoqueExtra,
      nail_number: nailNumber,
      nail_size_extra: calc.nailSizeExtra,
      kapping_extra: kappingExtra,
      size_change_label: sizeChangeData?.label ?? null,
      size_change_price: calc.sizeChangePrice,
      tip_change_label: tipChangeData?.label ?? null,
      tip_change_price: calc.tipChangePrice,
      prep_type: prepData?.label ?? null,
      prep_price: calc.prepPrice,
      nail_type: nailType || null,
      nail_layer: nailLayer || null,
      nail_condition: nailCondition || null,
      additional_items: additionalItems.map(a => ({
        id: a.id, name: a.name, quantity: 1, unit_price: a.unitPrice, total: a.unitPrice, comment: a.comment || null
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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--vk-black)', border: '1px solid var(--vk-border)',
    color: 'var(--vk-text)', borderRadius: '10px', padding: '11px 14px',
    fontSize: '14px', fontFamily: 'var(--font-body)', outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 600,
    color: 'var(--vk-text-muted)', marginBottom: '7px', textTransform: 'uppercase', letterSpacing: '0.08em',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
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

  const rowGridStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 90px 100px 90px', gap: '0', alignItems: 'center', minWidth: '460px',
  }

  const groupHeaderStyle: React.CSSProperties = {
    padding: '5px 16px 3px', fontSize: '10px', fontWeight: 700,
    color: 'var(--vk-pink-soft)', textTransform: 'uppercase', letterSpacing: '0.12em',
    background: 'rgba(243,50,131,0.05)',
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
      <div className="price-float">
        <div className="price-float-main">
          <div style={{ fontSize: '10px', color: 'var(--vk-text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Subtotal</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: 'var(--vk-pink-soft)', letterSpacing: '-0.02em' }}>{formatSoles(calc.subtotal)}</div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--vk-text-subtle)' }}>+IGV: {formatSoles(calc.totalWithIgv)}</div>
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
              <select style={selectStyle} value={clientType} onChange={e => setClientType(e.target.value as 'nueva' | 'frecuente')}>
                <option value="nueva">Clienta Nueva</option>
                <option value="frecuente">Clienta Frecuente</option>
              </select>
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
            <div style={{ gridColumn: '1 / -1' }}>
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
            <div>
              <label style={labelStyle}>Sistema base</label>
              <select style={selectStyle} value={selectedSystem} onChange={e => setSelectedSystem(e.target.value)}>
                <option value="">— Sin sistema / Solo diseño —</option>
                {['extension', 'reforzamiento', 'hibridas', 'esmaltado'].map(cat => (
                  <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                    {SISTEMAS.filter(s => s.category === cat).map(s => (
                      <option key={s.id} value={s.id}>{s.name} — {s.price > 0 ? formatSoles(s.price) : 'Variable'}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {systemData && (
                <div style={{ marginTop: '8px', padding: '11px 14px', background: 'var(--vk-pink-muted)', border: '1px solid rgba(243,50,131,0.2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--vk-pink-soft)' }}>
                    Total: {formatSoles(systemData.price)}
                    {systemData.time && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--vk-text-muted)' }}>
                        <Clock size={13} strokeWidth={2} />
                        {systemData.time}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>
                    {systemData.pricePerNail > 0 && `${formatSoles(systemData.pricePerNail)} / uña`}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Retoque (si aplica)</label>
              <select style={selectStyle} value={selectedRetoque} onChange={e => setSelectedRetoque(e.target.value)}>
                <option value="">— Sin retoque —</option>
                {RETOQUES.map(r => (
                  <option key={r.id} value={r.id}>{r.name} — {formatSoles(r.price)}</option>
                ))}
              </select>
            </div>

            {selectedRetoque && (
              <div>
                <label style={labelStyle}>Semanas desde último retoque</label>
                <select style={selectStyle} value={retoqueWeeks} onChange={e => setRetoqueWeeks(Number(e.target.value))}>
                  {RETOQUE_SEMANAS.map((s, i) => (
                    <option key={i} value={i}>{s.label}</option>
                  ))}
                </select>
                {RETOQUE_SEMANAS[retoqueWeeks]?.extra > 0 && (
                  <div style={{ marginTop: '7px', fontSize: '12px', padding: '9px 12px', background: 'rgba(245,169,75,0.08)', border: '1px solid rgba(245,169,75,0.25)', borderRadius: '8px', color: 'var(--vk-warning)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <AlertTriangle size={14} strokeWidth={2} />
                    Cargo adicional: +{formatSoles(RETOQUE_SEMANAS[retoqueWeeks].extra)} por semanas de retoque
                  </div>
                )}
              </div>
            )}

            <div className="form-grid-2">
              <div>
                <label style={labelStyle}>Número de uña actual</label>
                <select style={selectStyle} value={nailNumber} onChange={e => setNailNumber(Number(e.target.value))}>
                  {Array.from({ length: 11 }, (_, i) => i + 1).map(n => {
                    const extra = getNailSizeExtra(n)
                    return (
                      <option key={n} value={n}>
                        Núm {n}{extra > 0 ? ` (+${formatSoles(extra)})` : ''}
                      </option>
                    )
                  })}
                </select>
                {nailNumber > 4 && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--vk-warning)' }}>
                    +{formatSoles(getNailSizeExtra(nailNumber))} por uña núm {nailNumber}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Kapping extra (si aplica)</label>
                <select style={selectStyle} value={kappingExtra} onChange={e => setKappingExtra(Number(e.target.value))}>
                  {KAPPING_EXTRA.map((k, i) => (
                    <option key={i} value={k.extra}>{k.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label style={labelStyle}>Tasa IGV</label>
                <select style={selectStyle} value={igvRate} onChange={e => setIgvRate(Number(e.target.value))}>
                  <option value={0}>Sin IGV (0%)</option>
                  <option value={0.18}>Con IGV (18%)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Comentario de sistema</label>
                <input style={inputStyle} value={systemComment} onChange={e => setSystemComment(e.target.value)} placeholder="Ej: tono único, color especial..." />
              </div>
            </div>

            {/* Info box */}
            <div style={{ padding: '13px 16px', background: 'var(--vk-surface)', border: '1px solid var(--vk-border)', borderRadius: '10px', fontSize: '12px', color: 'var(--vk-text-subtle)', lineHeight: 1.6, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Info size={15} strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Sistema incluye un solo tono · Cobro adicional a partir de uña número 5 · Para kapping con uña natural mayor a 3 se suma cargo extra</span>
            </div>
          </div>
        </div>
      )}

      {/* =========== STEP 3: Preparación =========== */}
      {step === 3 && (
        <div className="glass-card fade-in step-card">
          <h2 style={sectionTitleStyle}>Preparación de uña</h2>
          <div className="form-grid-2">
            <div>
              <label style={labelStyle}>Tipo de preparación</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PREP_TIPOS.map(p => (
                  <label key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: '11px',
                    padding: '11px 14px', borderRadius: '12px', cursor: 'pointer',
                    background: prepType === p.id ? 'var(--vk-pink-muted)' : 'var(--vk-surface)',
                    border: prepType === p.id ? '1px solid rgba(243,50,131,0.3)' : '1px solid var(--vk-border)',
                    transition: 'all 0.15s',
                  }}>
                    <input
                      type="radio" name="prep-type" value={p.id}
                      checked={prepType === p.id} onChange={() => setPrepType(p.id)}
                      style={{ accentColor: 'var(--vk-pink)' }}
                    />
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--vk-text)' }}>{p.label}</span>
                    {p.price > 0 && <span style={{ fontSize: '13px', color: 'var(--vk-warning)', fontWeight: 600 }}>+{formatSoles(p.price)}</span>}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={labelStyle}>Tipo de uña</label>
                <select style={selectStyle} value={nailType} onChange={e => setNailType(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {PREP_TIPO_UNA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Capa</label>
                <select style={selectStyle} value={nailLayer} onChange={e => setNailLayer(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {PREP_CAPA.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Condición</label>
                <select style={selectStyle} value={nailCondition} onChange={e => setNailCondition(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {PREP_CONDICION.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========== STEP 4: Tamaño y Punta =========== */}
      {step === 4 && (
        <div className="glass-card fade-in step-card">
          <h2 style={sectionTitleStyle}>Cambio de tamaño y punta</h2>
          <div className="form-grid-2">
            <div>
              <label style={labelStyle}>Cambio de tamaño</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {CAMBIO_TAMANIO.map(c => (
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
                    <span style={{ fontSize: '13px', color: 'var(--vk-text)', flex: 1 }}>{c.label}</span>
                    {c.price > 0 && <span style={{ fontSize: '13px', color: 'var(--vk-pink-soft)', fontWeight: 600 }}>{formatSoles(c.price)}</span>}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Cambio de punta</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {CAMBIO_PUNTA.map(c => (
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
                    <span style={{ fontSize: '13px', color: 'var(--vk-text)', flex: 1 }}>{c.label}</span>
                    {c.price > 0 && <span style={{ fontSize: '13px', color: 'var(--vk-pink-soft)', fontWeight: 600 }}>{formatSoles(c.price)}</span>}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========== STEP 5: Diseños =========== */}
      {step === 5 && (
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
                {['Todos', ...DISENO_CATEGORIES].map(cat => (
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
                const inCart = designItems.find(x => x.id === d.id)
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
                      {formatSoles(d.price)} / uña {inCart && <span style={{ color: 'var(--vk-pink)', fontWeight: 600 }}>× {inCart.nails}</span>}
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
                <div key={d.id} style={{ padding: '11px 0', borderBottom: '1px solid var(--vk-border)' }}>
                  <div className="line-item-row" style={{ marginBottom: '7px' }}>
                    <span className="line-item-name" style={{ fontSize: '14px', color: 'var(--vk-text)' }}>{d.name}</span>
                    <span style={{ fontSize: '13px', color: 'var(--vk-text-muted)' }}>{formatSoles(d.unitPrice)} ×</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => updateDesignNails(d.id, d.nails - 1)} style={{ width: '26px', height: '26px', borderRadius: '7px', border: '1px solid var(--vk-border)', background: 'var(--vk-surface)', color: 'var(--vk-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={13} strokeWidth={2} />
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--vk-text)', minWidth: '20px', textAlign: 'center' }}>{d.nails}</span>
                      <button onClick={() => updateDesignNails(d.id, d.nails + 1)} style={{ width: '26px', height: '26px', borderRadius: '7px', border: '1px solid var(--vk-border)', background: 'var(--vk-surface)', color: 'var(--vk-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={13} strokeWidth={2} />
                      </button>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--vk-pink-soft)', minWidth: '70px', textAlign: 'right' }}>{formatSoles(d.unitPrice * d.nails)}</span>
                  </div>
                  <input
                    placeholder="Comentario (opcional)..."
                    value={d.comment}
                    onChange={e => updateDesignComment(d.id, e.target.value)}
                    style={commentInputStyle}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', fontSize: '15px', fontWeight: 600, color: 'var(--vk-pink)' }}>
                Total diseños: {formatSoles(designItems.reduce((s, d) => s + d.unitPrice * d.nails, 0))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========== STEP 6: Adicionales =========== */}
      {step === 6 && (
        <div className="fade-in form-grid-2" style={{ gap: '16px' }}>
          <div className="glass-card step-card">
            <h2 style={{ ...sectionTitleStyle, fontSize: '18px', marginBottom: '16px' }}>Adicionales de servicio</h2>
            <div className="scrollable-list-lg" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ADICIONALES.map(a => {
                const selected = additionalItems.find(x => x.id === a.id)
                return (
                  <div key={a.id} style={{ borderRadius: '10px', border: selected ? '1px solid rgba(243,50,131,0.25)' : '1px solid transparent', background: selected ? 'var(--vk-pink-muted)' : 'transparent', transition: 'all 0.15s' }}>
                    <label className="line-item-row" style={{ padding: '10px 12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox" checked={!!selected}
                        onChange={() => toggleAdditional(a)}
                        style={{ accentColor: 'var(--vk-pink)', cursor: 'pointer' }}
                      />
                      <span className="line-item-name" style={{ fontSize: '13px', color: 'var(--vk-text)' }}>{a.name}</span>
                      {a.time && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--vk-text-subtle)' }}>
                          <Clock size={11} strokeWidth={2} />
                          {a.time}
                        </span>
                      )}
                      <span style={{ fontSize: '13px', color: selected ? 'var(--vk-pink-soft)' : 'var(--vk-text-muted)', fontWeight: 600 }}>
                        {formatSoles(a.price)}
                      </span>
                    </label>
                    {selected && (
                      <div style={{ padding: '0 12px 9px' }}>
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
              {[...new Set(PEDRERIA.map(p => p.category))].map(cat => (
                <div key={cat}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--vk-pink-soft)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '10px 4px 5px' }}>{cat}</div>
                  {PEDRERIA.filter(p => p.category === cat).map(j => {
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

      {/* =========== STEP 7: Resumen =========== */}
      {step === 7 && (
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
                {nailType && <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>{nailType}{nailLayer ? ` · ${nailLayer}` : ''}</div>}
                {nailCondition && <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>Condición: {nailCondition}</div>}
                <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>Núm {nailNumber}</div>
              </div>
            </div>

            {/* Servicios table */}
            <div style={{ border: '1px solid var(--vk-border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '22px' }}>
            <div className="table-scroll">
              {/* Header */}
              <div style={{ ...rowGridStyle, background: 'rgba(0,0,0,0.25)', padding: '11px 16px', fontSize: '10px', fontWeight: 600, color: 'var(--vk-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--vk-border)' }}>
                <span>Concepto</span>
                <span style={{ textAlign: 'center' }}>Uñas</span>
                <span style={{ textAlign: 'right' }}>Precio</span>
                <span style={{ textAlign: 'right' }}>Resumen</span>
              </div>

              {/* Sistema */}
              {(systemData || selectedRetoque) && (
                <div style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <div style={groupHeaderStyle}>Sistema</div>
                  {systemData && (
                    <div style={{ ...rowGridStyle, padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>
                        {systemData.name}
                        {systemComment && <span style={{ color: 'var(--vk-text-muted)', fontSize: '12px' }}> — {systemComment}</span>}
                      </span>
                      <span style={{ textAlign: 'center', color: 'var(--vk-text-muted)' }}>—</span>
                      <span style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(systemData.price)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(calc.systemPrice)}</span>
                    </div>
                  )}
                  {retoqueData && (
                    <div style={{ ...rowGridStyle, padding: '9px 16px', borderBottom: calc.retoqueExtra > 0 ? '1px solid var(--vk-border)' : 'none', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>{retoqueData.name}</span>
                      <span style={{ textAlign: 'center', color: 'var(--vk-text-muted)' }}>—</span>
                      <span style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(retoqueData.price)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(calc.retoquePrice)}</span>
                    </div>
                  )}
                  {calc.retoqueExtra > 0 && (
                    <div style={{ ...rowGridStyle, padding: '7px 16px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--vk-warning)', paddingLeft: '14px' }}>Cargo semanas de retoque</span>
                      <span />
                      <span style={{ textAlign: 'right', color: 'var(--vk-warning)' }}>+{formatSoles(calc.retoqueExtra)}</span>
                      <span />
                    </div>
                  )}
                  {calc.nailSizeExtra > 0 && (
                    <div style={{ ...rowGridStyle, padding: '7px 16px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--vk-warning)', paddingLeft: '14px' }}>Extra uña núm {nailNumber}</span>
                      <span />
                      <span style={{ textAlign: 'right', color: 'var(--vk-warning)' }}>+{formatSoles(calc.nailSizeExtra)}</span>
                      <span />
                    </div>
                  )}
                  {kappingExtra > 0 && (
                    <div style={{ ...rowGridStyle, padding: '7px 16px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--vk-warning)', paddingLeft: '14px' }}>Extra kapping</span>
                      <span />
                      <span style={{ textAlign: 'right', color: 'var(--vk-warning)' }}>+{formatSoles(kappingExtra)}</span>
                      <span />
                    </div>
                  )}
                </div>
              )}

              {/* Cambios */}
              {(calc.sizeChangePrice > 0 || calc.tipChangePrice > 0 || calc.prepPrice > 0) && (
                <div style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <div style={groupHeaderStyle}>Cambios</div>
                  {calc.sizeChangePrice > 0 && (
                    <div style={{ ...rowGridStyle, padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>{sizeChangeData?.label}</span>
                      <span />
                      <span style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(calc.sizeChangePrice)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(calc.sizeChangePrice)}</span>
                    </div>
                  )}
                  {calc.tipChangePrice > 0 && (
                    <div style={{ ...rowGridStyle, padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>{tipChangeData?.label}</span>
                      <span />
                      <span style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(calc.tipChangePrice)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(calc.tipChangePrice)}</span>
                    </div>
                  )}
                  {calc.prepPrice > 0 && (
                    <div style={{ ...rowGridStyle, padding: '9px 16px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>Preparación {prepData?.label}</span>
                      <span />
                      <span style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(calc.prepPrice)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(calc.prepPrice)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Adicionales */}
              {additionalItems.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <div style={groupHeaderStyle}>Adicionales</div>
                  {additionalItems.map(a => (
                    <div key={a.id} style={{ ...rowGridStyle, padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>
                        {a.name}
                        {a.comment && <span style={{ color: 'var(--vk-text-muted)', fontSize: '12px' }}> — {a.comment}</span>}
                      </span>
                      <span style={{ textAlign: 'center', color: 'var(--vk-text-muted)' }}>—</span>
                      <span style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(a.unitPrice)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(a.unitPrice)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Pedrería */}
              {jewelryItems.length > 0 && (
                <div style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <div style={groupHeaderStyle}>Pedrería</div>
                  {jewelryItems.map(j => (
                    <div key={j.id} style={{ ...rowGridStyle, padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>{j.name}</span>
                      <span style={{ textAlign: 'center', color: 'var(--vk-text-muted)' }}>×{j.qty}</span>
                      <span style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(j.unitPrice)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(j.unitPrice * j.qty)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Diseños */}
              {designItems.length > 0 && (
                <div>
                  <div style={groupHeaderStyle}>Diseño</div>
                  {designItems.map(d => (
                    <div key={d.id} style={{ ...rowGridStyle, padding: '9px 16px', borderBottom: '1px solid var(--vk-border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--vk-text)' }}>
                        {d.name}
                        {d.comment && <span style={{ color: 'var(--vk-text-muted)', fontSize: '12px' }}> — {d.comment}</span>}
                      </span>
                      <span style={{ textAlign: 'center', color: 'var(--vk-text-muted)' }}>{d.nails} uña{d.nails !== 1 ? 's' : ''}</span>
                      <span style={{ textAlign: 'right', color: 'var(--vk-text-muted)' }}>{formatSoles(d.unitPrice)}</span>
                      <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--vk-text)' }}>{formatSoles(d.unitPrice * d.nails)}</span>
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
              <div className="table-scroll">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 90px 110px', gap: '8px 0', fontSize: '13px', minWidth: '480px' }}>
                <span style={{ color: 'var(--vk-text-subtle)', fontWeight: 600 }}>Clienta</span>
                <span style={{ color: 'var(--vk-text-subtle)', fontWeight: 600, textAlign: 'center' }}>Diseño / Detalle</span>
                <span style={{ color: 'var(--vk-text-subtle)', fontWeight: 600, textAlign: 'center' }}>Tiempo</span>
                <span style={{ color: 'var(--vk-text-subtle)', fontWeight: 600, textAlign: 'right' }}>Precio + IGV</span>

                <span style={{ color: 'var(--vk-text)', fontWeight: 500, paddingTop: '8px', borderTop: '1px solid var(--vk-border)' }}>{clientName || '—'}</span>
                <span style={{ paddingTop: '8px', borderTop: '1px solid var(--vk-border)', textAlign: 'center', fontSize: '12px', color: 'var(--vk-text-muted)' }}>
                  {[systemData?.name, retoqueData?.name].filter(Boolean).join(' + ') || '—'}
                </span>
                <span style={{ color: 'var(--vk-text-muted)', paddingTop: '8px', borderTop: '1px solid var(--vk-border)', textAlign: 'center' }}>
                  {systemData?.time ?? '—'}
                </span>
                <span style={{ color: 'var(--vk-pink-soft)', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid var(--vk-border)', textAlign: 'right' }}>
                  {formatSoles(igvRate > 0 ? calc.totalWithIgv : calc.subtotal)}
                </span>
              </div>
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
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          style={{ opacity: step === 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} strokeWidth={2} />
          Anterior
        </button>
        {step < 7 && (
          <button
            className="btn-primary"
            onClick={() => setStep(s => Math.min(7, s + 1))}
          >
            Siguiente
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function NuevaCotizacion() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--vk-text-muted)' }}>Cargando...</div>}>
      <NuevaCotizacionForm />
    </Suspense>
  )
}
