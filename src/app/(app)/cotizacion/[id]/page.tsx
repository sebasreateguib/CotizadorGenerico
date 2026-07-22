'use client'

import { useRef, useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatSoles } from '@/lib/data/calcular'
import type { Quote } from '@/lib/types'
import { ArrowLeft, CircleCheck, FileDown, Loader2, Phone, BadgeCheck, Pencil, Trash2 } from 'lucide-react'
import VkLogo from '@/components/layout/VkLogo'

export default function CotizacionDetalle({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createClient()
  const router = useRouter()
  const { id } = use(params)

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const pdfRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('quotes').select('*').eq('id', id).single().then(({ data }) => {
      setQuote(data)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setIsAdmin(profile?.role === 'admin')
    })
  }, [])

  async function updateStatus(newStatus: 'borrador' | 'confirmada' | 'pagada') {
    if (!quote) return
    const { error } = await supabase.from('quotes').update({ status: newStatus }).eq('id', quote.id)
    if (!error) {
      setQuote({ ...quote, status: newStatus })
    } else {
      alert('No se pudo actualizar el estado: ' + error.message)
    }
  }

  async function deleteQuote() {
    if (!quote) return
    const confirmed = window.confirm(`¿Eliminar el borrador de ${quote.client_name || 'esta clienta'}? Esta acción no se puede deshacer.`)
    if (!confirmed) return
    setDeleting(true)
    const { error } = await supabase.from('quotes').delete().eq('id', quote.id)
    if (error) {
      alert('No se pudo eliminar la cotización')
      setDeleting(false)
      return
    }
    router.push('/cotizaciones')
  }

  async function exportPDF() {
    if (!pdfRef.current || !quote) return
    setExporting(true)

    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        backgroundColor: '#131318',
        windowWidth: 800,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Cotizacion_VK_${quote.client_name.replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('Error exportando PDF', err)
      alert('Hubo un error al generar el PDF')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--vk-text-muted)' }}>Cargando cotización...</div>
  if (!quote) return <div style={{ color: 'var(--vk-error)' }}>Cotización no encontrada</div>

  return (
    <div className="fade-in">
      {/* Header actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <Link href="/cotizaciones" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'var(--vk-text-muted)', textDecoration: 'none', fontSize: '14px',
        }}>
          <ArrowLeft size={15} strokeWidth={2} />
          Volver a cotizaciones
        </Link>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {quote.status === 'borrador' && (
            <Link href={`/cotizacion/nueva?id=${quote.id}`} className="btn-ghost">
              <Pencil size={16} strokeWidth={1.8} />
              Editar borrador
            </Link>
          )}
          {quote.status === 'borrador' && (
            <button className="btn-ghost" onClick={() => updateStatus('confirmada')} style={{ color: 'var(--vk-pink-soft)', borderColor: 'var(--vk-pink-glow)' }}>
              <BadgeCheck size={16} strokeWidth={1.8} />
              Confirmar cotización
            </button>
          )}
          {quote.status === 'borrador' && (
            <button className="btn-ghost" onClick={deleteQuote} disabled={deleting} style={{ color: 'var(--vk-error)', borderColor: 'rgba(239,68,68,0.3)' }}>
              {deleting ? <Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash2 size={16} strokeWidth={1.8} />}
              {deleting ? 'Eliminando...' : 'Eliminar borrador'}
            </button>
          )}
          {quote.status === 'confirmada' && isAdmin && (
            <button className="btn-ghost" onClick={() => updateStatus('pagada')} style={{ color: 'var(--vk-success)', borderColor: 'rgba(62,207,142,0.3)' }}>
              <CircleCheck size={16} strokeWidth={1.8} />
              Marcar como pagada
            </button>
          )}
          {quote.status === 'confirmada' && !isAdmin && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--vk-text-subtle)', padding: '0 4px' }}>
              Solo un Admin puede confirmar el pago
            </span>
          )}
          <button className="btn-primary" onClick={exportPDF} disabled={exporting}>
            {exporting ? <Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} /> : <FileDown size={16} strokeWidth={1.8} />}
            {exporting ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div
          ref={pdfRef}
          className="pdf-container"
          style={{
            background: 'var(--vk-surface)',
            borderRadius: '18px',
            border: '1px solid var(--vk-border)',
          }}
        >
          {/* Header VK */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px', borderBottom: '1px solid var(--vk-border)', paddingBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <VkLogo size={58} />
              <div>
                <h1 style={{
                  fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 700,
                  color: 'var(--vk-text)', marginBottom: '4px', letterSpacing: '-0.02em',
                }}>
                  Vk Studio
                </h1>
                <div style={{ color: 'var(--vk-pink-soft)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em' }}>
                  Cotización de Servicio
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)', marginBottom: '4px' }}>Fecha: {new Date(quote.date).toLocaleDateString('es-PE')}</div>
              <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>ID: {quote.id.split('-')[0].toUpperCase()}</div>
              <div style={{ marginTop: '12px' }}>
                <span className={`badge badge-${quote.status}`}>
                  {quote.status === 'borrador' ? 'Borrador' : quote.status === 'confirmada' ? 'Confirmada' : 'Pagada'}
                </span>
              </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="form-grid-2" style={{ gap: '24px', marginBottom: '40px' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--vk-text-subtle)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px' }}>Clienta</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--vk-text)', marginBottom: '4px' }}>{quote.client_name}</div>
              {quote.client_phone && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', color: 'var(--vk-text-muted)' }}>
                  <Phone size={12} strokeWidth={2} />
                  {quote.client_phone}
                </div>
              )}
              <div style={{ fontSize: '13px', color: 'var(--vk-pink-soft)', marginTop: '4px' }}>{quote.client_type === 'nueva' ? 'Clienta Nueva' : 'Clienta Frecuente'}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--vk-text-subtle)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '8px' }}>Detalles técnicos</div>
              <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)', marginBottom: '4px' }}>Responsable: {quote.responsible || 'No asignada'}</div>
              {quote.nail_curvature && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)', marginBottom: '4px' }}>Tipo de uña: {quote.nail_curvature}</div>}
              {quote.nail_plate_status && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)', marginBottom: '4px' }}>Estado de la lámina: {quote.nail_plate_status}</div>}
              {quote.product_condition && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)', marginBottom: '4px' }}>Estado del producto: {quote.product_condition}</div>}
              {quote.next_maintenance_date && (
                <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Próximo mantenimiento: {new Date(quote.next_maintenance_date).toLocaleDateString('es-PE')}</div>
              )}
            </div>
          </div>

          {/* Ficha de diagnóstico y servicio técnico */}
          {(quote.skin_type || quote.nail_moisture || quote.previous_product || quote.service_type || quote.nail_system_material || quote.technique_type || quote.primer_type || quote.base_type || quote.nail_shape || quote.nail_length) && (
            <div style={{ marginBottom: '40px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--vk-text-subtle)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '16px', borderBottom: '1px solid var(--vk-border)', paddingBottom: '8px' }}>
                Ficha técnica
              </div>
              <div className="form-grid-2" style={{ gap: '10px 24px' }}>
                {quote.skin_type && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Tipo de piel: <span style={{ color: 'var(--vk-text)' }}>{quote.skin_type}</span></div>}
                {quote.nail_moisture && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Humedad de la uña: <span style={{ color: 'var(--vk-text)' }}>{quote.nail_moisture}</span></div>}
                {quote.previous_product && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Producto previo: <span style={{ color: 'var(--vk-text)' }}>{quote.previous_product}</span></div>}
                {quote.service_type && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Servicio realizado: <span style={{ color: 'var(--vk-text)' }}>{quote.service_type}</span></div>}
                {quote.nail_system_material && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Sistema seleccionado: <span style={{ color: 'var(--vk-text)' }}>{quote.nail_system_material}</span></div>}
                {quote.technique_type && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Técnica seleccionada: <span style={{ color: 'var(--vk-text)' }}>{quote.technique_type}</span></div>}
                {quote.primer_type && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Primer: <span style={{ color: 'var(--vk-text)' }}>{quote.primer_type}</span></div>}
                {quote.base_type && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Base: <span style={{ color: 'var(--vk-text)' }}>{quote.base_type}</span></div>}
                {quote.nail_shape && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Forma: <span style={{ color: 'var(--vk-text)' }}>{quote.nail_shape}</span></div>}
                {quote.nail_length && <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>Largo: <span style={{ color: 'var(--vk-text)' }}>{quote.nail_length}</span></div>}
              </div>
            </div>
          )}

          {/* Lines */}
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--vk-text-subtle)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '16px', borderBottom: '1px solid var(--vk-border)', paddingBottom: '8px' }}>
              Detalle de servicios
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {quote.system_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>Sistema: {quote.system_name}</div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(quote.system_price)}</div>
                </div>
              )}

              {quote.retoque_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{quote.retoque_name}</div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(quote.retoque_price)}</div>
                </div>
              )}
              {quote.retoque_weeks_extra > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)', paddingLeft: '14px' }}>Cargo por semanas de retoque</div>
                  <div style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>{formatSoles(quote.retoque_weeks_extra)}</div>
                </div>
              )}

              {quote.nail_size_extra > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>Extra por tamaño de uña (Núm. {quote.nail_number})</div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(quote.nail_size_extra)}</div>
                </div>
              )}

              {quote.kapping_extra > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>Extra Kapping uña natural</div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(quote.kapping_extra)}</div>
                </div>
              )}

              {quote.size_change_price > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{quote.size_change_label}</div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(quote.size_change_price)}</div>
                </div>
              )}
              {quote.tip_change_price > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{quote.tip_change_label}</div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(quote.tip_change_price)}</div>
                </div>
              )}

              {quote.prep_price > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>Preparación: {quote.prep_type}</div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(quote.prep_price)}</div>
                </div>
              )}

              {quote.additional_items.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>
                    {a.name}
                    {a.comment && <span style={{ color: 'var(--vk-text-muted)', fontSize: '13px' }}> — {a.comment}</span>}
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(a.total)}</div>
                </div>
              ))}

              {quote.design_items.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>
                    {d.name} <span style={{ color: 'var(--vk-text-muted)' }}>(×{d.nails_count} uña/s)</span>
                    {d.comment && <span style={{ color: 'var(--vk-text-muted)', fontSize: '13px' }}> — {d.comment}</span>}
                  </div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(d.total)}</div>
                </div>
              ))}

              {quote.jewelry_items.map(j => (
                <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{j.name} <span style={{ color: 'var(--vk-text-muted)' }}>(×{j.quantity})</span></div>
                  <div style={{ fontSize: '15px', color: 'var(--vk-text)' }}>{formatSoles(j.total)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Box */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
            <div style={{ width: '100%', maxWidth: '300px', background: 'rgba(243,50,131,0.04)', borderRadius: '14px', padding: '20px', border: '1px solid rgba(243,50,131,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--vk-text)' }}>Subtotal</span>
                <span style={{ fontSize: '14px', color: 'var(--vk-text)', fontWeight: 600 }}>{formatSoles(quote.subtotal)}</span>
              </div>
              {quote.igv_rate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>IGV ({(quote.igv_rate * 100).toFixed(0)}%)</span>
                  <span style={{ fontSize: '14px', color: 'var(--vk-text-muted)' }}>{formatSoles(quote.igv_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '12px', borderTop: '1px solid rgba(243,50,131,0.2)' }}>
                <span style={{ fontSize: '16px', color: 'var(--vk-text)', fontWeight: 700 }}>Total a pagar</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: 'var(--vk-pink-soft)', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {formatSoles(quote.igv_rate > 0 ? quote.total_with_igv : quote.subtotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          {quote.technical_notes && (
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', fontSize: '13px', color: 'var(--vk-text-muted)', marginBottom: quote.notes ? '12px' : 0 }}>
              <strong style={{ color: 'var(--vk-text)' }}>Observaciones técnicas:</strong> {quote.technical_notes}
            </div>
          )}
          {quote.notes && (
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', fontSize: '13px', color: 'var(--vk-text-muted)' }}>
              <strong style={{ color: 'var(--vk-text)' }}>Notas:</strong> {quote.notes}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '11px', color: 'var(--vk-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Vk Studio — Cotización generada internamente
          </div>
        </div>
      </div>
    </div>
  )
}
