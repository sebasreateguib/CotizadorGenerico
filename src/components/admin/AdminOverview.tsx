'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatSoles } from '@/lib/data/calcular'
import { avatarGradient } from '@/lib/avatar'
import Pagination from '@/components/ui/Pagination'
import {
  Search, ArrowUpRight, SearchX, FileText,
  Crown, ShieldCheck, X,
} from 'lucide-react'
import CommissionRateEditor from '@/components/admin/CommissionRateEditor'

export interface AdminQuoteRow {
  id: string
  client_name: string
  system_name: string | null
  subtotal: number
  totalWithIgv: number
  status: 'borrador' | 'confirmada' | 'pagada'
  date: string
  technicianId: string
  technicianName: string
  commissionRate: number
  commissionAmount: number
}

export interface TechnicianStat {
  id: string
  name: string
  email: string
  role: 'admin' | 'tecnico'
  quotesCount: number
  totalRevenue: number
  pagadas: number
  commissionRate: number
  commissionTotal: number
}

const STATUS_FILTERS: { key: 'todas' | AdminQuoteRow['status']; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'borrador', label: 'Borrador' },
  { key: 'confirmada', label: 'Confirmada' },
  { key: 'pagada', label: 'Pagada' },
]

export default function AdminOverview({
  quotes, technicians, total, page, pageSize, search, status, tech,
}: {
  quotes: AdminQuoteRow[]
  technicians: TechnicianStat[]
  total: number
  page: number
  pageSize: number
  search: string
  status: string
  tech: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(search)
  const isFirst = useRef(true)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function updateParams(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') params.delete(key)
      else params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

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

  const selectedTechnician = tech ? technicians.find(t => t.id === tech) || null : null
  const hasFilters = !!search || status !== 'todas' || !!tech

  return (
    <div>
      {/* Leaderboard de técnicos */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 600, color: 'var(--vk-text)' }}>
            Equipo
          </h2>
          {selectedTechnician && (
            <button
              type="button"
              onClick={() => updateParams({ tech: null, page: null })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '12.5px', color: 'var(--vk-pink-soft)', background: 'transparent',
                border: 'none', cursor: 'pointer', fontWeight: 500,
              }}
            >
              <X size={13} strokeWidth={2} />
              Quitar filtro de técnico
            </button>
          )}
        </div>

        {technicians.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--vk-text-muted)' }}>
            <p style={{ fontSize: '14px' }}>Aún no hay técnicos registrados en el equipo.</p>
          </div>
        ) : (
          <div className="stagger admin-team-grid">
            {technicians.map((t, i) => {
              const isActive = tech === t.id
              const isTopSeller = i === 0 && t.totalRevenue > 0
              return (
                <div
                  key={t.id}
                  className="glass-card"
                  style={{
                    padding: '16px', textAlign: 'left',
                    border: isActive ? '1px solid var(--vk-pink-glow)' : '1px solid var(--vk-border)',
                    background: isActive ? 'var(--vk-pink-muted)' : undefined,
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                <button
                  type="button"
                  onClick={() => updateParams({ tech: isActive ? null : t.id, page: null })}
                  className="card-hover"
                  style={{
                    width: '100%', padding: 0, textAlign: 'left', cursor: 'pointer',
                    background: 'transparent', border: 'none', color: 'inherit',
                  }}
                >
                  {isTopSeller && (
                    <div style={{
                      position: 'absolute', top: '10px', right: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: 'var(--vk-warning)', opacity: 0.9,
                    }}>
                      <Crown size={12} strokeWidth={2} color="var(--vk-black)" />
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: avatarGradient(t.name || '?'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700, color: 'var(--vk-white)',
                      fontFamily: 'var(--font-heading)',
                    }}>
                      {(t.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontSize: '13.5px', fontWeight: 600, color: 'var(--vk-text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {t.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {t.role === 'admin' && <ShieldCheck size={11} strokeWidth={2} color="var(--vk-pink-soft)" />}
                        <span style={{ fontSize: '11.5px', color: 'var(--vk-text-subtle)' }}>
                          {t.role === 'admin' ? 'Admin' : 'Técnico'}
                        </span>
                        {t.commissionRate > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--vk-text-subtle)' }}>
                            · {(t.commissionRate * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--vk-pink-soft)', letterSpacing: '-0.02em' }}>
                        {formatSoles(t.totalRevenue)}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--vk-text-subtle)' }}>facturado</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700, color: 'var(--vk-text)' }}>
                        {t.quotesCount}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--vk-text-subtle)' }}>cotizaciones</div>
                    </div>
                  </div>
                  {t.commissionRate > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--vk-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--vk-text-subtle)' }}>Comisión a pagar</span>
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 700, color: 'var(--vk-success)' }}>
                        {formatSoles(t.commissionTotal)}
                      </span>
                    </div>
                  )}
                </button>
                {t.role === 'tecnico' && (
                  <CommissionRateEditor technicianId={t.id} initialRate={t.commissionRate} />
                )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Búsqueda y filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div className="search-input-wrap">
          <Search size={16} strokeWidth={2} />
          <input
            type="text"
            className="vk-input"
            placeholder="Buscar por clienta, sistema o técnico..."
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
              <p style={{ fontSize: '15px' }}>No se encontraron resultados</p>
              <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--vk-text-subtle)' }}>Prueba con otro término o quita los filtros</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '72px 24px', color: 'var(--vk-text-muted)' }}>
              <FileText size={40} strokeWidth={1.2} style={{ marginBottom: '14px', opacity: 0.4 }} />
              <p style={{ fontSize: '15px' }}>Aún no hay cotizaciones en el equipo</p>
            </div>
          )
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                  {['Cliente', 'Técnico', 'Sistema', 'Subtotal', 'Comisión', 'Estado', 'Fecha', ''].map((h) => (
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
                      {q.technicianName}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--vk-text-muted)' }}>
                      {q.system_name || '—'}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--vk-pink-soft)' }}>
                      {formatSoles(q.subtotal || 0)}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: q.status === 'pagada' ? 'var(--vk-success)' : 'var(--vk-text-subtle)' }}>
                      {q.status === 'pagada' ? formatSoles(q.commissionAmount) : '—'}
                      {q.commissionRate > 0 && q.status === 'pagada' && (
                        <span style={{ fontSize: '11px', color: 'var(--vk-text-subtle)', fontWeight: 500 }}> ({(q.commissionRate * 100).toFixed(0)}%)</span>
                      )}
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
                      <Link href={`/cotizacion/${q.id}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '13px', color: 'var(--vk-pink-soft)',
                        textDecoration: 'none', fontWeight: 500,
                      }}>
                        Ver detalle
                        <ArrowUpRight size={14} strokeWidth={2} />
                      </Link>
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
    </div>
  )
}
