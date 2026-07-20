import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatSoles } from '@/lib/data/calcular'
import { avatarGradient } from '@/lib/avatar'
import {
  FileText, Wallet, CircleCheck, Sparkles, ArrowRight, ArrowUpRight,
  TrendingUp, TrendingDown, Minus, Receipt, UserPlus, Repeat,
} from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const isAdmin = profile?.role === 'admin'

  let quotesQuery = supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    quotesQuery = quotesQuery.eq('user_id', user!.id)
  }

  const { data: allQuotes } = await quotesQuery
  const quotes = allQuotes ?? []

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const monthStr = todayStr.slice(0, 7)
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthStr = prevMonthDate.toISOString().slice(0, 7)

  const todayQuotes = quotes.filter(q => q.date === todayStr)
  const totalHoy = todayQuotes.reduce((s, q) => s + (q.subtotal || 0), 0)

  const monthQuotes = quotes.filter(q => (q.date || '').startsWith(monthStr))
  const totalMes = monthQuotes.reduce((s, q) => s + (q.subtotal || 0), 0)
  const totalMesPrev = quotes
    .filter(q => (q.date || '').startsWith(prevMonthStr))
    .reduce((s, q) => s + (q.subtotal || 0), 0)

  const hasPrevData = totalMesPrev > 0
  const deltaPct = hasPrevData
    ? ((totalMes - totalMesPrev) / totalMesPrev) * 100
    : (totalMes > 0 ? 100 : 0)

  const pagadas = quotes.filter(q => q.status === 'pagada').length
  const pagadasMes = monthQuotes.filter(q => q.status === 'pagada').length
  const conversionRate = monthQuotes.length ? (pagadasMes / monthQuotes.length) * 100 : 0
  const ticketPromedio = monthQuotes.length ? totalMes / monthQuotes.length : 0

  const nuevasMes = monthQuotes.filter(q => q.client_type === 'nueva').length
  const frecuentesMes = monthQuotes.filter(q => q.client_type === 'frecuente').length
  const totalClientesMes = nuevasMes + frecuentesMes
  const pctNuevas = totalClientesMes ? (nuevasMes / totalClientesMes) * 100 : 0

  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().split('T')[0]
    const total = quotes.filter(q => q.date === key).reduce((s, q) => s + (q.subtotal || 0), 0)
    return {
      key,
      total,
      label: d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''),
      isToday: i === 6,
    }
  })
  const maxLast7 = Math.max(...last7.map(d => d.total), 1)

  const recentQuotes = quotes.slice(0, 6)
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  const [heroSymbol, heroNumber] = formatSoles(totalMes).split(' ')

  const secondaryStats = [
    { label: 'Cotizaciones hoy', value: String(todayQuotes.length), sub: formatSoles(totalHoy), Icon: FileText, accent: 'var(--vk-pink)' },
    { label: 'Ticket promedio', value: formatSoles(ticketPromedio), sub: 'este mes', Icon: Receipt, accent: 'var(--vk-pink-soft)' },
    { label: 'Tasa de pago', value: `${conversionRate.toFixed(0)}%`, sub: `${pagadasMes} pagadas / ${monthQuotes.length} cotiz.`, Icon: CircleCheck, accent: 'var(--vk-success)' },
    { label: 'Pagadas (histórico)', value: String(pagadas), sub: 'desde siempre', Icon: Wallet, accent: 'var(--vk-warning)' },
  ]

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{
            color: 'var(--vk-pink-soft)', fontSize: '12px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '10px',
          }}>
            {now.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '34px', fontWeight: 700,
            color: 'var(--vk-text)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: '6px',
          }}>
            {greeting}, {displayName.split(' ')[0]}
          </h1>
          <p style={{ color: 'var(--vk-text-muted)', fontSize: '14px' }}>
            Este es el resumen de tu estudio.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/cotizaciones" className="btn-ghost" style={{ fontSize: '14px' }}>
            Ver cotizaciones
          </Link>
          <Link href="/cotizacion/nueva" className="btn-primary" style={{ fontSize: '15px', padding: '13px 26px' }}>
            <Sparkles size={17} strokeWidth={2} />
            Nueva Cotización
          </Link>
        </div>
      </div>

      {/* Hero bento: ingresos + mezcla de clientes */}
      <div className="stagger hero-bento" style={{ marginBottom: '18px' }}>
        {/* Ingresos del mes */}
        <div className="glass-card card-hover" style={{ padding: '28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '-60px', right: '-40px',
            width: '220px', height: '220px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(243,50,131,0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--vk-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                Ingresos del mes
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '17px', fontWeight: 600, color: 'var(--vk-text-muted)' }}>{heroSymbol}</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '42px', fontWeight: 700, color: 'var(--vk-text)', letterSpacing: '-0.03em' }}>
                  {heroNumber}
                </span>
              </div>
            </div>
            {hasPrevData || totalMes > 0 ? (
              <span className={`trend-pill ${deltaPct > 0.5 ? 'trend-up' : deltaPct < -0.5 ? 'trend-down' : 'trend-flat'}`}>
                {deltaPct > 0.5 ? <TrendingUp size={13} strokeWidth={2.4} /> : deltaPct < -0.5 ? <TrendingDown size={13} strokeWidth={2.4} /> : <Minus size={13} strokeWidth={2.4} />}
                {hasPrevData ? `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(0)}%` : 'nuevo'}
              </span>
            ) : (
              <span className="trend-pill trend-flat">Sin datos previos</span>
            )}
          </div>

          {/* Sparkline 7 días */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '64px', marginBottom: '8px' }}>
            {last7.map((d) => {
              const pct = Math.max((d.total / maxLast7) * 100, 4)
              return (
                <div
                  key={d.key}
                  className="sparkline-bar"
                  title={`${d.label}: ${formatSoles(d.total)}`}
                  style={{
                    flex: 1,
                    height: `${pct}%`,
                    borderRadius: '5px 5px 2px 2px',
                    background: d.isToday
                      ? 'linear-gradient(180deg, var(--vk-pink), var(--vk-pink-dark))'
                      : 'rgba(243, 50, 131, 0.16)',
                    boxShadow: d.isToday ? '0 0 16px rgba(243,50,131,0.35)' : 'none',
                  }}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {last7.map((d) => (
              <span key={d.key} style={{
                flex: 1, textAlign: 'center', fontSize: '11px',
                color: d.isToday ? 'var(--vk-pink-soft)' : 'var(--vk-text-subtle)',
                fontWeight: d.isToday ? 600 : 400, textTransform: 'capitalize',
              }}>
                {d.isToday ? 'Hoy' : d.label}
              </span>
            ))}
          </div>
        </div>

        {/* Mezcla de clientes */}
        <div className="glass-card card-hover" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--vk-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '20px' }}>
            Clientes del mes
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <div style={{ position: 'relative', width: '124px', height: '124px' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: totalClientesMes
                  ? `conic-gradient(var(--vk-pink) 0deg ${(pctNuevas / 100) * 360}deg, var(--vk-pink-pastel) ${(pctNuevas / 100) * 360}deg 360deg)`
                  : 'var(--vk-surface-2)',
              }} />
              <div style={{
                position: 'absolute', inset: '13px', borderRadius: '50%',
                background: 'var(--vk-surface)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700, color: 'var(--vk-text)', letterSpacing: '-0.02em' }}>
                  {totalClientesMes ? `${pctNuevas.toFixed(0)}%` : '—'}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--vk-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>nuevas</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <UserPlus size={14} strokeWidth={2} color="var(--vk-pink)" />
              <span style={{ fontSize: '13px', color: 'var(--vk-text-muted)', flex: 1 }}>Nuevas</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vk-text)' }}>{nuevasMes}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <Repeat size={14} strokeWidth={2} color="var(--vk-pink-pastel)" />
              <span style={{ fontSize: '13px', color: 'var(--vk-text-muted)', flex: 1 }}>Frecuentes</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--vk-text)' }}>{frecuentesMes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats secundarios */}
      <div className="stagger responsive-grid-4" style={{ marginBottom: '20px' }}>
        {secondaryStats.map(({ label, value, sub, Icon, accent }, i) => (
          <div key={i} className="glass-card card-hover" style={{ padding: '20px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: '-30px', right: '-30px',
              width: '100px', height: '100px', borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}14 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
            <div style={{
              width: '36px', height: '36px', borderRadius: '11px',
              background: 'var(--vk-surface-2)', border: '1px solid var(--vk-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '14px',
            }}>
              <Icon size={17} strokeWidth={1.8} color={accent} />
            </div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '23px', fontWeight: 700, color: 'var(--vk-text)',
              letterSpacing: '-0.02em', marginBottom: '4px',
            }}>
              {value}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--vk-text-muted)', marginBottom: '2px' }}>
              {label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--vk-text-subtle)' }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Actividad reciente */}
      <div className="glass-card" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '19px', fontWeight: 700, color: 'var(--vk-text)',
            letterSpacing: '-0.02em',
          }}>
            Actividad reciente
          </h2>
          <Link href="/cotizaciones" style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '13px', color: 'var(--vk-pink-soft)',
            textDecoration: 'none', fontWeight: 500,
          }}>
            Ver todas
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>

        {recentQuotes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--vk-text-muted)' }}>
            <FileText size={40} strokeWidth={1.2} style={{ marginBottom: '14px', opacity: 0.4 }} />
            <p style={{ fontSize: '15px' }}>Aún no hay cotizaciones</p>
            <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--vk-text-subtle)' }}>Crea tu primera cotización arriba</p>
          </div>
        ) : (
          <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
            <thead>
              <tr>
                {['Cliente', 'Sistema', 'Subtotal', 'Estado', 'Fecha', ''].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 12px',
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
              {recentQuotes.map((q) => (
                <tr key={q.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <td style={{ padding: '12px' }}>
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
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--vk-text-muted)', maxWidth: '200px' }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.system_name || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', fontWeight: 600, color: 'var(--vk-pink-soft)' }}>
                    {formatSoles(q.subtotal || 0)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge badge-${q.status}`}>
                      {q.status === 'borrador' ? 'Borrador' : q.status === 'confirmada' ? 'Confirmada' : 'Pagada'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px', color: 'var(--vk-text-muted)' }}>
                    {new Date(q.date).toLocaleDateString('es-PE')}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <Link href={`/cotizacion/${q.id}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '13px', color: 'var(--vk-pink-soft)',
                      textDecoration: 'none', fontWeight: 500,
                    }}>
                      Ver
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
    </div>
  )
}
