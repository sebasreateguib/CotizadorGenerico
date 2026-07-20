import { createClient } from '@/lib/supabase/server'
import ClientsExplorer, { type ClientStat, type ClientsSummary } from '@/components/clientes/ClientsExplorer'

const PAGE_SIZE = 15

interface DirectoryRow {
  name: string
  phone: string | null
  type: string | null
  last_visit: string | null
  total_spent: number
  visits: number
  total_count: number
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; type?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)
  const search = (sp.q ?? '').trim()
  const safeSearch = search.replace(/[%,()]/g, '')
  const type = sp.type ?? 'todas'
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  const [{ data: rows }, { data: summaryRows }] = await Promise.all([
    supabase.rpc('clientes_directory', {
      p_search: safeSearch, p_type: type, p_limit: PAGE_SIZE, p_offset: offset,
    }),
    supabase.rpc('clientes_summary'),
  ])

  const directory = (rows ?? []) as DirectoryRow[]
  const total = directory[0]?.total_count ?? 0

  const clients: ClientStat[] = directory.map(r => ({
    name: r.name,
    phone: r.phone,
    type: r.type,
    lastVisit: r.last_visit,
    totalSpent: Number(r.total_spent) || 0,
    visits: r.visits,
  }))

  const s = summaryRows?.[0] ?? { total: 0, nuevas: 0, frecuentes: 0, total_gastado: 0 }
  const summary: ClientsSummary = {
    total: s.total,
    nuevas: s.nuevas,
    frecuentes: s.frecuentes,
    totalGastado: Number(s.total_gastado) || 0,
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '28px' }}>
        <p style={{
          color: 'var(--vk-pink-soft)', fontSize: '12px', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '8px',
        }}>
          Directorio
        </p>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: '32px', fontWeight: 700,
          color: 'var(--vk-text)', letterSpacing: '-0.03em',
        }}>
          Clientes
        </h1>
      </div>

      <ClientsExplorer
        clients={clients}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        search={search}
        type={type}
        summary={summary}
      />
    </div>
  )
}
