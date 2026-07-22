import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatSoles } from '@/lib/data/calcular'
import { ShieldCheck, Users, Wallet, FileText, CircleCheck, HandCoins } from 'lucide-react'
import AdminOverview, { type AdminQuoteRow, type TechnicianStat } from '@/components/admin/AdminOverview'

const PAGE_SIZE = 15

interface TeamRow {
  id: string
  name: string
  email: string
  role: 'admin' | 'tecnico'
  quotes_count: number
  total_revenue: number
  pagadas: number
  commission_rate: number
  commission_total: number
}

interface AdminQuoteRPCRow {
  id: string
  client_name: string
  system_name: string | null
  subtotal: number
  total_with_igv: number
  status: 'borrador' | 'confirmada' | 'pagada'
  date: string
  technician_id: string
  technician_name: string
  commission_rate: number
  commission_amount: number
  total_count: number
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; tech?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)
  const search = (sp.q ?? '').trim()
  const safeSearch = search.replace(/[%,()]/g, '')
  const status = sp.status ?? 'todas'
  const tech = sp.tech ?? null
  const offset = (page - 1) * PAGE_SIZE

  const [{ data: globalRows }, { data: teamRows }, { data: quoteRows }] = await Promise.all([
    supabase.rpc('admin_global_stats'),
    supabase.rpc('admin_team_stats'),
    supabase.rpc('admin_quotes', {
      p_search: safeSearch, p_status: status, p_tech: tech, p_limit: PAGE_SIZE, p_offset: offset,
    }),
  ])

  const g = globalRows?.[0] ?? { tecnicos: 0, total_cotizaciones: 0, total_facturado: 0, pagadas: 0, total_comisiones: 0 }

  const technicianStats: TechnicianStat[] = ((teamRows ?? []) as TeamRow[]).map(t => ({
    id: t.id,
    name: t.name,
    email: t.email,
    role: t.role,
    quotesCount: t.quotes_count,
    totalRevenue: Number(t.total_revenue) || 0,
    pagadas: t.pagadas,
    commissionRate: Number(t.commission_rate) || 0,
    commissionTotal: Number(t.commission_total) || 0,
  }))

  const rows = (quoteRows ?? []) as AdminQuoteRPCRow[]
  const total = rows[0]?.total_count ?? 0
  const quoteList: AdminQuoteRow[] = rows.map(q => ({
    id: q.id,
    client_name: q.client_name,
    system_name: q.system_name,
    subtotal: Number(q.subtotal) || 0,
    totalWithIgv: Number(q.total_with_igv) || 0,
    status: q.status,
    date: q.date,
    technicianId: q.technician_id,
    technicianName: q.technician_name,
    commissionRate: Number(q.commission_rate) || 0,
    commissionAmount: Number(q.commission_amount) || 0,
  }))

  const stats = [
    { label: 'Técnicos activos', value: String(g.tecnicos), Icon: Users, accent: 'var(--vk-pink)' },
    { label: 'Cotizaciones del equipo', value: String(g.total_cotizaciones), Icon: FileText, accent: 'var(--vk-pink-soft)' },
    { label: 'Facturado en total', value: formatSoles(Number(g.total_facturado) || 0), Icon: Wallet, accent: 'var(--vk-warning)' },
    { label: 'Pagadas', value: String(g.pagadas), Icon: CircleCheck, accent: 'var(--vk-success)' },
    { label: 'Comisiones a pagar', value: formatSoles(Number(g.total_comisiones) || 0), Icon: HandCoins, accent: 'var(--vk-error)' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <p style={{
            color: 'var(--vk-pink-soft)', fontSize: '12px', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '6px',
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '10px',
          }}>
            <ShieldCheck size={14} strokeWidth={2} />
            Vista de administrador
          </p>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '34px', fontWeight: 700,
            color: 'var(--vk-text)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: '6px',
          }}>
            Todo el equipo
          </h1>
          <p style={{ color: 'var(--vk-text-muted)', fontSize: '14px' }}>
            Cotizaciones de todas las cuentas de técnicos, en un solo lugar.
          </p>
        </div>
      </div>

      <div className="stagger responsive-grid-5" style={{ marginBottom: '28px' }}>
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

      <AdminOverview
        quotes={quoteList}
        technicians={technicianStats}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        search={search}
        status={status}
        tech={tech}
      />
    </div>
  )
}
