'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { avatarGradient } from '@/lib/avatar'
import Pagination from '@/components/ui/Pagination'
import { Users, Search, ArrowUpRight, UserPlus, Repeat, Wallet, SearchX } from 'lucide-react'

export interface ClientStat {
  name: string
  phone: string | null
  type: string | null
  lastVisit: string | null
  totalSpent: number
  visits: number
}

export interface ClientsSummary {
  total: number
  nuevas: number
  frecuentes: number
  totalGastado: number
}

const TYPE_FILTERS: { key: 'todas' | 'nueva' | 'frecuente'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'nueva', label: 'Nuevas' },
  { key: 'frecuente', label: 'Frecuentes' },
]

export default function ClientsExplorer({
  clients, total, page, pageSize, search, type, summary,
}: {
  clients: ClientStat[]
  total: number
  page: number
  pageSize: number
  search: string
  type: string
  summary: ClientsSummary
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
    router.push(`${pathname}?${params.toString()}`)
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

  const stats = [
    { label: 'Total clientas', value: String(summary.total), Icon: Users, accent: 'var(--vk-pink)' },
    { label: 'Nuevas', value: String(summary.nuevas), Icon: UserPlus, accent: 'var(--vk-pink-soft)' },
    { label: 'Frecuentes', value: String(summary.frecuentes), Icon: Repeat, accent: 'var(--vk-pink-pastel)' },
    { label: 'Ingreso acumulado', value: `S/ ${summary.totalGastado.toFixed(2)}`, Icon: Wallet, accent: 'var(--vk-success)' },
  ]

  const hasFilters = !!search || type !== 'todas'

  return (
    <div>
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

      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div className="search-input-wrap">
          <Search size={16} strokeWidth={2} />
          <input
            type="text"
            className="vk-input"
            placeholder="Buscar por nombre o teléfono..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Buscar clientas"
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`filter-chip ${type === key ? 'active' : ''}`}
              onClick={() => updateParams({ type: key === 'todas' ? null : key, page: null })}
              aria-pressed={type === key}
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
              <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--vk-text-subtle)' }}>Prueba con otro término o quita el filtro</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '72px 24px', color: 'var(--vk-text-muted)' }}>
              <Users size={40} strokeWidth={1.2} style={{ marginBottom: '14px', opacity: 0.4 }} />
              <p style={{ fontSize: '15px' }}>Aún no hay clientes registrados</p>
            </div>
          )
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                  {['Nombre', 'Teléfono', 'Tipo', 'Visitas', 'Total Gastado', 'Última Visita', ''].map((h) => (
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
                {clients.map((c, i) => (
                  <tr key={i} className="table-row-hover" style={{ borderBottom: '1px solid var(--vk-border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                          background: avatarGradient(c.name),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700, color: 'var(--vk-white)',
                          fontFamily: 'var(--font-heading)',
                        }}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--vk-text)' }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--vk-text-muted)' }}>
                      {c.phone || '—'}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge badge-${c.type === 'nueva' ? 'nueva' : 'frecuente'}`}>
                        {c.type === 'nueva' ? 'Nueva' : 'Frecuente'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--vk-text)' }}>
                      {c.visits}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--vk-text)' }}>
                      S/ {c.totalSpent.toFixed(2)}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--vk-text-muted)' }}>
                      {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('es-PE') : '-'}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <Link href={`/clientes/${encodeURIComponent(c.name)}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '13px', color: 'var(--vk-pink-soft)',
                        textDecoration: 'none', fontWeight: 500,
                      }}>
                        Ver historial
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
        itemLabel="clientas"
      />
    </div>
  )
}
