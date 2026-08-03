import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatSoles } from '@/lib/data/calcular'
import { avatarGradient } from '@/lib/avatar'
import UrlPagination from '@/components/ui/UrlPagination'
import { ArrowLeft, Phone, ArrowUpRight, CalendarDays, Receipt, TrendingUp, UserX } from 'lucide-react'

const PAGE_SIZE = 10

export default async function ClienteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const supabase = await createClient()
  const { id } = await params
  const sp = await searchParams
  const clientName = decodeURIComponent(id)
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Sin filtro por usuario: RLS ya acota al tenant de la sesión.
  const historyQuery = supabase
    .from('quotes')
    .select('id, date, system_name, subtotal, total_with_igv, status', { count: 'exact' })
    .eq('client_name', clientName)
    .order('date', { ascending: false })
    .range(from, to)

  const [{ data: quotes, count }, { data: statsRows }] = await Promise.all([
    historyQuery,
    supabase.rpc('cliente_detalle_stats', { p_name: clientName }),
  ])

  const total = count ?? 0
  const stats = statsRows?.[0]

  if (total === 0 || !stats) {
    return (
      <div className="fade-in">
        <div style={{ marginBottom: '24px' }}>
          <Link href="/clientes" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: 'var(--vk-text-muted)', textDecoration: 'none', fontSize: '14px',
          }}>
            <ArrowLeft size={15} strokeWidth={2} />
            Volver a clientes
          </Link>
        </div>
        <div className="glass-card" style={{ textAlign: 'center', padding: '72px 24px', color: 'var(--vk-text-muted)' }}>
          <UserX size={40} strokeWidth={1.2} style={{ marginBottom: '14px', opacity: 0.4 }} />
          <p style={{ fontSize: '15px' }}>Clienta no encontrada o sin historial</p>
        </div>
      </div>
    )
  }

  const totalGastado = Number(stats.total_spent) || 0
  const visits = stats.visits ?? 0
  const clientPhone = stats.phone
  const clientType = stats.type
  const ticketPromedio = Number(stats.ticket_promedio) || 0
  const ultimaVisita = stats.last_visit
  const favoriteSystem = stats.favorite_system ?? '—'
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '24px' }}>
        <Link href="/clientes" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'var(--vk-text-muted)', textDecoration: 'none', fontSize: '14px',
        }}>
          <ArrowLeft size={15} strokeWidth={2} />
          Volver a clientes
        </Link>
      </div>

      <div className="glass-card" style={{ padding: '32px', marginBottom: '28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(243,50,131,0.10) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
            <div style={{
              width: '58px', height: '58px', borderRadius: '50%', flexShrink: 0,
              background: avatarGradient(clientName),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 700, color: 'var(--vk-white)',
              fontFamily: 'var(--font-heading)',
              boxShadow: '0 8px 24px rgba(243,50,131,0.35)',
            }}>
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-heading)', fontSize: '30px', fontWeight: 700,
                color: 'var(--vk-text)', marginBottom: '8px', letterSpacing: '-0.03em',
              }}>
                {clientName}
              </h1>
              <div style={{ display: 'flex', gap: '14px', fontSize: '14px', color: 'var(--vk-text-muted)', alignItems: 'center' }}>
                {clientPhone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Phone size={13} strokeWidth={2} />
                    {clientPhone}
                  </span>
                )}
                <span className={`badge badge-${clientType === 'nueva' ? 'nueva' : 'frecuente'}`}>
                  {clientType === 'nueva' ? 'Clienta Nueva' : 'Clienta Frecuente'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--vk-text-subtle)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '6px' }}>
              Total gastado histórico
            </div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '28px', fontWeight: 700, color: 'var(--vk-pink-soft)', letterSpacing: '-0.02em',
            }}>
              {formatSoles(totalGastado)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--vk-text-muted)', marginTop: '4px' }}>
              En {visits} visita{visits !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Mini stats */}
      <div className="responsive-grid-3" style={{ marginBottom: '28px' }}>
        {[
          { label: 'Ticket promedio', value: formatSoles(ticketPromedio), Icon: Receipt, accent: 'var(--vk-pink-soft)' },
          { label: 'Sistema favorito', value: favoriteSystem, Icon: TrendingUp, accent: 'var(--vk-pink)' },
          { label: 'Última visita', value: ultimaVisita ? new Date(ultimaVisita).toLocaleDateString('es-PE') : '—', Icon: CalendarDays, accent: 'var(--vk-success)' },
        ].map(({ label, value, Icon, accent }, i) => (
          <div key={i} className="glass-card card-hover" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
              background: 'var(--vk-surface-2)', border: '1px solid var(--vk-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={17} strokeWidth={1.8} color={accent} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: '15px', fontWeight: 600, color: 'var(--vk-text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {value}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{
        fontFamily: 'var(--font-heading)', fontSize: '19px', fontWeight: 700,
        color: 'var(--vk-text)', marginBottom: '16px', letterSpacing: '-0.02em',
      }}>
        Historial de Cotizaciones
      </h2>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
              {['Fecha', 'Sistema', 'Total', 'Estado', ''].map((h) => (
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
            {(quotes ?? []).map((q) => (
              <tr key={q.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--vk-border)' }}>
                <td style={{ padding: '16px 20px', fontSize: '14px', color: 'var(--vk-text)' }}>
                  {new Date(q.date).toLocaleDateString('es-PE')}
                </td>
                <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--vk-text-muted)' }}>
                  {q.system_name || '—'}
                </td>
                <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--vk-pink-soft)' }}>
                  {formatSoles(q.total_with_igv > 0 ? q.total_with_igv : q.subtotal)}
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <span className={`badge badge-${q.status}`}>
                    {q.status === 'borrador' ? 'Borrador' : q.status === 'confirmada' ? 'Confirmada' : 'Pagada'}
                  </span>
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
      </div>

      <UrlPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        itemLabel="cotizaciones"
      />
    </div>
  )
}
