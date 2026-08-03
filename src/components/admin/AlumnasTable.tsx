'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { formatSoles } from '@/lib/data/calcular'
import { avatarGradient } from '@/lib/avatar'
import { createClient } from '@/lib/supabase/client'
import Pagination from '@/components/ui/Pagination'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Search, SearchX, Ban, CircleCheck, Loader2 } from 'lucide-react'

export interface AlumnaRow {
  id: string
  name: string
  slug: string
  status: 'activo' | 'suspendido'
  ownerName: string
  ownerEmail: string
  quotesCount: number
  clientsCount: number
  totalFacturado: number
  lastQuoteDate: string | null
  createdAt: string
}

const STATUS_FILTERS: { key: 'todas' | AlumnaRow['status']; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'activo', label: 'Activas' },
  { key: 'suspendido', label: 'Suspendidas' },
]

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function AlumnasTable({
  alumnas, total, page, pageSize, search, status,
}: {
  alumnas: AlumnaRow[]
  total: number
  page: number
  pageSize: number
  search: string
  status: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [searchInput, setSearchInput] = useState(search)
  const [pendingToggle, setPendingToggle] = useState<AlumnaRow | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
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

  async function confirmToggle() {
    if (!pendingToggle) return
    const target = pendingToggle
    const nextStatus = target.status === 'activo' ? 'suspendido' : 'activo'
    setPendingToggle(null)
    setBusyId(target.id)

    const { error } = await supabase.rpc('superadmin_set_tenant_status', {
      p_tenant_id: target.id,
      p_status: nextStatus,
    })

    setBusyId(null)
    if (error) {
      alert('No se pudo cambiar el estado: ' + error.message)
      return
    }
    router.refresh()
  }

  const hasFilters = !!search || status !== 'todas'

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div className="search-input-wrap">
          <Search size={16} strokeWidth={2} />
          <input
            type="text"
            className="vk-input"
            placeholder="Buscar por estudio, nombre o correo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Buscar alumnas"
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

      <div className="glass-card" style={{ padding: '4px', overflow: 'hidden' }}>
        {alumnas.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <SearchX size={28} strokeWidth={1.5} color="var(--vk-text-subtle)" />
            <p style={{ color: 'var(--vk-text-muted)', fontSize: '14px', marginTop: '12px' }}>
              {hasFilters ? 'Ninguna alumna coincide con la búsqueda.' : 'Todavía no hay alumnas registradas.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
              <thead>
                <tr>
                  {['Estudio', 'Cotizaciones', 'Clientas', 'Facturado', 'Última actividad', 'Estado', ''].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i === 0 || i === 4 ? 'left' : i === 6 ? 'right' : 'center',
                      padding: '14px 16px', fontSize: '11px', fontWeight: 600,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: 'var(--vk-text-subtle)', borderBottom: '1px solid var(--vk-border)',
                      whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {alumnas.map((a) => {
                  const suspended = a.status === 'suspendido'
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--vk-border-light)', opacity: suspended ? 0.55 : 1 }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                            background: avatarGradient(a.name),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-heading)', fontWeight: 700,
                            fontSize: '13px', color: 'var(--vk-white)',
                          }}>
                            {a.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--vk-text)' }}>
                              {a.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>
                              {a.ownerEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13.5px', color: 'var(--vk-text)' }}>
                        {a.quotesCount}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13.5px', color: 'var(--vk-text)' }}>
                        {a.clientsCount}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13.5px', fontWeight: 600, color: 'var(--vk-text)' }}>
                        {formatSoles(a.totalFacturado)}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--vk-text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(a.lastQuoteDate)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span className={`badge badge-${suspended ? 'suspendida' : 'activa'}`}>
                          {suspended ? 'Suspendida' : 'Activa'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          className="btn-ghost"
                          onClick={() => setPendingToggle(a)}
                          disabled={busyId === a.id}
                          style={{
                            color: suspended ? 'var(--vk-success)' : 'var(--vk-error)',
                            borderColor: suspended ? 'rgba(62,207,142,0.3)' : 'rgba(239,68,68,0.3)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {busyId === a.id
                            ? <Loader2 size={15} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
                            : suspended ? <CircleCheck size={15} strokeWidth={1.8} /> : <Ban size={15} strokeWidth={1.8} />}
                          {suspended ? 'Reactivar' : 'Suspender'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={(p) => updateParams({ page: p <= 1 ? null : String(p) })}
          itemLabel="alumnas"
        />
      )}

      <ConfirmDialog
        open={!!pendingToggle}
        danger={pendingToggle?.status === 'activo'}
        title={pendingToggle?.status === 'activo' ? 'Suspender alumna' : 'Reactivar alumna'}
        message={
          pendingToggle?.status === 'activo'
            ? `${pendingToggle?.name} dejará de poder entrar a su cotizador. Sus datos se conservan y vuelven al reactivarla.`
            : `${pendingToggle?.name} recupera el acceso a su cotizador y a todos sus datos.`
        }
        confirmLabel={pendingToggle?.status === 'activo' ? 'Suspender' : 'Reactivar'}
        onConfirm={confirmToggle}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  )
}
