import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import QuotesExplorer, { type QuotesSummary } from '@/components/cotizaciones/QuotesExplorer'

const PAGE_SIZE = 15

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)
  const search = (sp.q ?? '').trim()
  const safeSearch = search.replace(/[%,()]/g, '')
  const status = sp.status ?? 'todas'
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()

  // Sin filtro por usuario: RLS ya acota al tenant de la sesión.
  let query = supabase
    .from('quotes')
    .select('id, client_name, system_name, subtotal, status, date', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (safeSearch) query = query.or(`client_name.ilike.%${safeSearch}%,system_name.ilike.%${safeSearch}%`)
  if (status !== 'todas') query = query.eq('status', status)

  const [{ data: quotes, count }, { data: summaryRows }] = await Promise.all([
    query,
    supabase.rpc('cotizaciones_summary', { p_search: safeSearch, p_status: status }),
  ])

  const summary: QuotesSummary = summaryRows?.[0] ?? { total: 0, monto: 0, pagadas: 0, promedio: 0 }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{
            color: 'var(--vk-pink-soft)', fontSize: '12px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '8px',
          }}>
            Historial completo
          </p>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: '32px', fontWeight: 700,
            color: 'var(--vk-text)', letterSpacing: '-0.03em',
          }}>
            Cotizaciones
          </h1>
        </div>
        <Link href="/cotizacion/nueva" className="btn-primary">
          <Sparkles size={16} strokeWidth={2} />
          Nueva Cotización
        </Link>
      </div>

      <QuotesExplorer
        quotes={quotes ?? []}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        search={search}
        status={status}
        summary={summary}
      />
    </div>
  )
}
