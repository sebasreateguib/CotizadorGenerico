'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatSoles } from '@/lib/data/calcular'
import { avatarGradient } from '@/lib/avatar'
import { createClient } from '@/lib/supabase/client'
import Pagination from '@/components/ui/Pagination'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { FileText, Search, ArrowUpRight, Wallet, CircleCheck, Receipt, SearchX, Trash2, Loader2 } from 'lucide-react'

export interface QuoteRow {
  id: string
  client_name: string
  system_name: string | null
  subtotal: number
  status: 'borrador' | 'confirmada' | 'pagada'
  date: string
}

export interface QuotesSummary {
  total: number
  monto: number
  pagadas: number
  promedio: number
}

const STATUS_FILTERS: { key: 'todas' | QuoteRow['status']; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'borrador', label: 'Borrador' },
  { key: 'confirmada', label: 'Confirmada' },
  { key: 'pagada', label: 'Pagada' },
]

export default function QuotesExplorer({
  quotes, total, page, pageSize, search, status, summary,
}: {
  quotes: QuoteRow[]
  total: number
  page: number
  pageSize: number
  search: string
  status: string
  summary: QuotesSummary
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [searchInput, setSearchInput] = useState(search)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<QuoteRow | null>(null)
  const isFirst = useRef(true)

  async function confirmDeleteDraft() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    setDeletingId(id)
    const { error } = await supabase.from('quotes').delete().eq('id', id)
    setDeletingId(null)
    if (error) {
      alert('No se pudo eliminar la cotización')
      return
    }
    router.refresh()
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function updateParams(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Debounce de búsqueda → sincroniza a la URL
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    const t = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ q: searchInput || null, page: null })
      }
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = [
    { label: 'Total cotizaciones', value: String(summary.total), Icon: FileText, accent: 'var(--vk-pink)' },
    { label: 'Monto acumulado', value: formatSoles(summary.monto), Icon: Wallet, accent: 'var(--vk-pink-soft)' },
    { label: 'Pagadas', value: String(summary.pagadas), Icon: CircleCheck, accent: 'var(--vk-success)' },
    { label: 'Ticket promedio', value: formatSoles(summary.promedio), Icon: Receipt, accent: 'var(--vk-warning)' },
  ]

  const hasFilters = !!search || status !== 'todas'

  return (
    <div>
      {/* Stats */}
      <div className="stagger responsive-grid-4" style={{ marginBottom: '20px' }}>
        {stats.map(({ label, value, Icon, accent }, i) => (
          <div key={i} className="glass-card card-hover" style={{ padding: '18px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px',
              background: 'var(--vk-surface-2)', border: '1px solid var(--vk-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
            }}>
              <Icon size={16} strokeWidth={1.8} color={accent} />
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '21px', fontWeight: 700, color: 'var(--vk-text)', letterSpacing: '-0.02em', marginBottom: '2px' }}>
              {value}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--vk-text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Búsqueda y filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div className="search-input-wrap">
          <Search size={16} strokeWidth={2} />
          <input
            type="text"
            className="vk-input"
            placeholder="Buscar por clienta o sistema..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Buscar cotizaciones"
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`filter-chip ${status === key ? 'active' : ''}`}
              onClick={() => updateParams({ status: key === 'todas' ? null : key, page: null })}
              aria-pressed={status === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {total === 0 ? (
          hasFilters ? (
            <div style={{ textAlign: 'center', padding: '72px 24px', color: 'var(--vk-text-muted)' }}>
              <SearchX size={36} strokeWidth={1.2} style={{ marginBottom: '14px', opacity: 0.4 }} />
              <p style={{ fontSize: '15px' }}>No se encontraron resultados{search && <> para &ldquo;{search}&rdquo;</>}</p>
              <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--vk-text-subtle)' }}>Prueba con otro término o quita el filtro de estado</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '72px 24px', color: 'var(--vk-text-muted)' }}>
              <FileText size={40} strokeWidth={1.2} style={{ marginBottom: '14px', opacity: 0.4 }} />
              <p style={{ fontSize: '15px' }}>Aún no hay cotizaciones</p>
              <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--vk-text-subtle)' }}>Crea la primera desde el botón de arriba</p>
            </div>
          )
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                  {['Cliente', 'Sistema', 'Subtotal', 'Estado', 'Fecha', ''].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '15px 20px',
                      fontSize: '11px', fontWeight: 600,
                      color: 'var(--vk-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: '1px solid var(--vk-border)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--vk-border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                          background: avatarGradient(q.client_name || '?'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 700, color: 'var(--vk-white)',
                          fontFamily: 'var(--font-heading)',
                        }}>
                          {(q.client_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--vk-text)' }}>
                          {q.client_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--vk-text-muted)' }}>
                      {q.system_name || '—'}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--vk-pink-soft)' }}>
                      {formatSoles(q.subtotal || 0)}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge badge-${q.status}`}>
                        {q.status === 'borrador' ? 'Borrador' : q.status === 'confirmada' ? 'Confirmada' : 'Pagada'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--vk-text-muted)' }}>
                      {new Date(q.date).toLocaleDateString('es-PE')}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
                        {q.status === 'borrador' && (
                          <button
                            onClick={() => setPendingDelete(q)}
                            disabled={deletingId === q.id}
                            title="Eliminar borrador"
                            aria-label="Eliminar borrador"
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: 'var(--vk-error)', padding: '2px', opacity: deletingId === q.id ? 0.5 : 0.7,
                              transition: 'opacity 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = deletingId === q.id ? '0.5' : '0.7'}
                          >
                            {deletingId === q.id
                              ? <Loader2 size={15} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
                              : <Trash2 size={15} strokeWidth={1.8} />}
                          </button>
                        )}
                        <Link href={`/cotizacion/${q.id}`} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '13px', color: 'var(--vk-pink-soft)',
                          textDecoration: 'none', fontWeight: 500,
                        }}>
                          Ver detalle
                          <ArrowUpRight size={14} strokeWidth={2} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: p === 1 ? null : String(p) })}
        itemLabel="cotizaciones"
      />

      <ConfirmDialog
        open={!!pendingDelete}
        danger
        title="Eliminar borrador"
        message={`¿Eliminar el borrador de ${pendingDelete?.client_name || 'esta clienta'}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDeleteDraft}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
