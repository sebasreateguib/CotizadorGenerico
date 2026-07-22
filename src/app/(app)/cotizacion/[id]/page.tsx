'use client'

import { useRef, useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatSoles } from '@/lib/data/calcular'
import type { Quote } from '@/lib/types'
import Image from 'next/image'
import { ArrowLeft, CircleCheck, FileDown, Loader2, Phone, BadgeCheck, Pencil, Trash2 } from 'lucide-react'

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
      <div style={{ maxWidth: '880px', margin: '0 auto', paddingBottom: '48px' }}>
        <div ref={pdfRef} className="pdf-container quote-report">
          <div className="quote-report-inner quote-report-reveal">
            <header className="quote-report-masthead">
              <div className="quote-report-brand">
                <Image
                  src="/logocolor.png"
                  alt="Vk Studio"
                  width={72}
                  height={72}
                  className="quote-report-logo"
                  priority
                />
                <div className="quote-report-brand-copy">
                  <span className="quote-report-doc-label">Cotización de servicio</span>
                </div>
              </div>

              <div className="quote-report-meta">
                <div className="quote-report-meta-row">
                  <div className="quote-report-meta-cell">
                    <span className="quote-report-meta-label">Fecha</span>
                    <span className="quote-report-meta-value">{new Date(quote.date).toLocaleDateString('es-PE')}</span>
                  </div>
                  <div className="quote-report-meta-cell">
                    <span className="quote-report-meta-label">ID</span>
                    <span className="quote-report-meta-value">#{quote.id.split('-')[0].toUpperCase()}</span>
                  </div>
                </div>
                <span className={`badge badge-${quote.status}`}>
                  {quote.status === 'borrador' ? 'Borrador' : quote.status === 'confirmada' ? 'Confirmada' : 'Pagada'}
                </span>
              </div>
            </header>

            <section className="quote-report-hero">
              <div>
                <div className="quote-report-client-kicker">Clienta</div>
                <h2 className="quote-report-client-name">{quote.client_name}</h2>
                <div className="quote-report-client-meta">
                  {quote.client_phone && (
                    <span className="quote-report-phone">
                      <Phone size={14} strokeWidth={1.8} />
                      {quote.client_phone}
                    </span>
                  )}
                  <span className="quote-report-chip">
                    {quote.client_type === 'nueva' ? 'Nueva' : 'Frecuente'}
                  </span>
                </div>
              </div>

              <div className="quote-report-side-specs">
                <div>
                  <span className="quote-report-spec-label">Responsable</span>
                  <div className="quote-report-spec-value">{quote.responsible || 'No asignada'}</div>
                </div>
                {quote.next_maintenance_date && (
                  <div>
                    <span className="quote-report-spec-label">Próx. mantenimiento</span>
                    <div className="quote-report-spec-value">{new Date(quote.next_maintenance_date).toLocaleDateString('es-PE')}</div>
                  </div>
                )}
                {quote.nail_curvature && (
                  <div>
                    <span className="quote-report-spec-label">Curvatura</span>
                    <div className="quote-report-spec-value">{quote.nail_curvature}</div>
                  </div>
                )}
                {quote.nail_plate_status && (
                  <div>
                    <span className="quote-report-spec-label">Lámina</span>
                    <div className="quote-report-spec-value">{quote.nail_plate_status}</div>
                  </div>
                )}
                {quote.product_condition && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className="quote-report-spec-label">Estado producto</span>
                    <div className="quote-report-spec-value">{quote.product_condition}</div>
                  </div>
                )}
              </div>
            </section>

            {(quote.skin_type || quote.nail_moisture || quote.previous_product || quote.service_type || quote.nail_system_material || quote.technique_type || quote.primer_type || quote.base_type || quote.nail_shape || quote.nail_length) && (
              <section className="quote-report-section">
                <div className="quote-report-section-head">
                  <h3 className="quote-report-section-title">Ficha técnica</h3>
                  <div className="quote-report-section-rule" />
                </div>
                <div className="quote-report-ficha">
                  {quote.skin_type && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Tipo de piel</span>
                      <div className="quote-report-spec-value">{quote.skin_type}</div>
                    </div>
                  )}
                  {quote.nail_moisture && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Humedad</span>
                      <div className="quote-report-spec-value">{quote.nail_moisture}</div>
                    </div>
                  )}
                  {quote.previous_product && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Producto previo</span>
                      <div className="quote-report-spec-value">{quote.previous_product}</div>
                    </div>
                  )}
                  {quote.service_type && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Servicio</span>
                      <div className="quote-report-spec-value">{quote.service_type}</div>
                    </div>
                  )}
                  {quote.nail_system_material && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Sistema</span>
                      <div className="quote-report-spec-value">{quote.nail_system_material}</div>
                    </div>
                  )}
                  {quote.technique_type && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Técnica</span>
                      <div className="quote-report-spec-value">{quote.technique_type}</div>
                    </div>
                  )}
                  {quote.primer_type && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Primer</span>
                      <div className="quote-report-spec-value">{quote.primer_type}</div>
                    </div>
                  )}
                  {quote.base_type && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Base</span>
                      <div className="quote-report-spec-value">{quote.base_type}</div>
                    </div>
                  )}
                  {quote.nail_shape && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Forma</span>
                      <div className="quote-report-spec-value">{quote.nail_shape}</div>
                    </div>
                  )}
                  {quote.nail_length && (
                    <div className="quote-report-ficha-cell">
                      <span className="quote-report-spec-label">Largo</span>
                      <div className="quote-report-spec-value">{quote.nail_length}</div>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="quote-report-section">
              <div className="quote-report-section-head">
                <h3 className="quote-report-section-title">Desglose</h3>
                <div className="quote-report-section-rule" />
              </div>

              <div className="quote-report-ledger">
                {quote.system_name && (
                  <div className="quote-report-line">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">{quote.system_name}</div>
                      <div className="quote-report-line-sub">Sistema principal</div>
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(quote.system_price)}</div>
                  </div>
                )}

                {quote.retoque_name && (
                  <div className="quote-report-line">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">{quote.retoque_name}</div>
                      <div className="quote-report-line-sub">Retoque de sistema</div>
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(quote.retoque_price)}</div>
                  </div>
                )}

                {quote.retoque_weeks_extra > 0 && (
                  <div className="quote-report-line quote-report-line--muted">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">Cargo por semanas de retoque extra</div>
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(quote.retoque_weeks_extra)}</div>
                  </div>
                )}

                {quote.nail_size_extra > 0 && (
                  <div className="quote-report-line quote-report-line--muted">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">
                        Extra por tamaño de uña <span>(Núm. {quote.nail_number})</span>
                      </div>
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(quote.nail_size_extra)}</div>
                  </div>
                )}

                {quote.kapping_extra > 0 && (
                  <div className="quote-report-line quote-report-line--muted">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">Extra Kapping uña natural</div>
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(quote.kapping_extra)}</div>
                  </div>
                )}

                {quote.size_change_price > 0 && (
                  <div className="quote-report-line quote-report-line--muted">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">{quote.size_change_label}</div>
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(quote.size_change_price)}</div>
                  </div>
                )}

                {quote.tip_change_price > 0 && (
                  <div className="quote-report-line quote-report-line--muted">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">{quote.tip_change_label}</div>
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(quote.tip_change_price)}</div>
                  </div>
                )}

                {quote.prep_price > 0 && (
                  <div className="quote-report-line quote-report-line--muted">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">Preparación: {quote.prep_type}</div>
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(quote.prep_price)}</div>
                  </div>
                )}

                {quote.additional_items.map(a => (
                  <div key={a.id} className="quote-report-line">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">{a.name}</div>
                      {a.comment && <div className="quote-report-line-sub">{a.comment}</div>}
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(a.total)}</div>
                  </div>
                ))}

                {quote.design_items.map(d => (
                  <div key={d.id} className="quote-report-line">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">
                        {d.name} <span>(×{d.nails_count} uña/s)</span>
                      </div>
                      {d.comment && <div className="quote-report-line-sub">{d.comment}</div>}
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(d.total)}</div>
                  </div>
                ))}

                {quote.jewelry_items.map(j => (
                  <div key={j.id} className="quote-report-line">
                    <div className="quote-report-line-main">
                      <div className="quote-report-line-name">
                        {j.name} <span>(×{j.quantity})</span>
                      </div>
                    </div>
                    <div className="quote-report-line-amount">{formatSoles(j.total)}</div>
                  </div>
                ))}
              </div>
            </section>

            <div className="quote-report-totals">
              <div className="quote-report-totals-spacer" />
              <div className="quote-report-totals-panel">
                <div className="quote-report-total-row">
                  <span>Subtotal</span>
                  <strong>{formatSoles(quote.subtotal)}</strong>
                </div>
                {quote.igv_rate > 0 && (
                  <div className="quote-report-total-row">
                    <span>IGV ({(quote.igv_rate * 100).toFixed(0)}%)</span>
                    <strong>{formatSoles(quote.igv_amount)}</strong>
                  </div>
                )}
                <div className="quote-report-total-grand">
                  <span className="quote-report-total-grand-label">Total a pagar</span>
                  <span className="quote-report-total-grand-amount">
                    {formatSoles(quote.igv_rate > 0 ? quote.total_with_igv : quote.subtotal)}
                  </span>
                </div>
              </div>
            </div>

            {(quote.technical_notes || quote.notes) && (
              <div className="quote-report-notes">
                {quote.technical_notes && (
                  <div className="quote-report-note">
                    <div className="quote-report-note-label">Observaciones técnicas</div>
                    <div className="quote-report-note-body">{quote.technical_notes}</div>
                  </div>
                )}
                {quote.notes && (
                  <div className="quote-report-note quote-report-note--client">
                    <div className="quote-report-note-label">Notas para la clienta</div>
                    <div className="quote-report-note-body">{quote.notes}</div>
                  </div>
                )}
              </div>
            )}

            <footer className="quote-report-footer">
              <div className="quote-report-footer-mark">Vk Studio — Cotización oficial</div>
              <div className="quote-report-footer-stamp">
                Generado el {new Date().toLocaleDateString('es-PE')} a las {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
