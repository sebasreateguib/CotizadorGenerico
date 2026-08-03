import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatSoles } from '@/lib/data/calcular'
import { ShieldCheck, Users, Wallet, FileText, UserCheck, Activity } from 'lucide-react'
import AlumnasTable, { type AlumnaRow } from '@/components/admin/AlumnasTable'

const PAGE_SIZE = 15

interface TenantRPCRow {
  id: string
  name: string
  slug: string
  status: 'activo' | 'suspendido'
  owner_name: string
  owner_email: string
  quotes_count: number
  clients_count: number
  total_facturado: number
  last_quote_date: string | null
  created_at: string
  total_count: number
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  if (profile?.role !== 'superadmin') {
    redirect('/dashboard')
  }

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1') || 1)
  const search = (sp.q ?? '').trim()
  const safeSearch = search.replace(/[%,()]/g, '')
  const status = sp.status ?? 'todas'
  const offset = (page - 1) * PAGE_SIZE

  const [{ data: statsRows }, { data: tenantRows }] = await Promise.all([
    supabase.rpc('superadmin_stats'),
    supabase.rpc('superadmin_tenants', {
      p_search: safeSearch, p_status: status, p_limit: PAGE_SIZE, p_offset: offset,
    }),
  ])

  const g = statsRows?.[0] ?? {
    alumnas: 0, activas: 0, suspendidas: 0,
    cotizaciones: 0, clientas: 0, facturado: 0, activas_30d: 0,
  }

  const rows = (tenantRows ?? []) as TenantRPCRow[]
  const total = rows[0]?.total_count ?? 0
  const alumnas: AlumnaRow[] = rows.map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    status: t.status,
    ownerName: t.owner_name,
    ownerEmail: t.owner_email,
    quotesCount: t.quotes_count,
    clientsCount: t.clients_count,
    totalFacturado: Number(t.total_facturado) || 0,
    lastQuoteDate: t.last_quote_date,
    createdAt: t.created_at,
  }))

  const stats = [
    { label: 'Alumnas registradas', value: String(g.alumnas), Icon: Users, accent: 'var(--vk-pink)' },
    { label: 'Cuentas activas', value: String(g.activas), Icon: UserCheck, accent: 'var(--vk-success)' },
    { label: 'Activas últimos 30 días', value: String(g.activas_30d), Icon: Activity, accent: 'var(--vk-pink-soft)' },
    { label: 'Cotizaciones en total', value: String(g.cotizaciones), Icon: FileText, accent: 'var(--vk-warning)' },
    { label: 'Facturado por todas', value: formatSoles(Number(g.facturado) || 0), Icon: Wallet, accent: 'var(--vk-text-muted)' },
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
            Vista de super admin
          </p>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '34px', fontWeight: 700,
            color: 'var(--vk-text)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: '6px',
          }}>
            Alumnas
          </h1>
          <p style={{ color: 'var(--vk-text-muted)', fontSize: '14px', maxWidth: '560px' }}>
            Cada alumna tiene su propio cotizador, con sus precios y sus clientas.
            Acá ves cuánta actividad tiene cada una — el detalle de sus cotizaciones es privado.
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

      <AlumnasTable
        alumnas={alumnas}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        search={search}
        status={status}
      />
    </div>
  )
}
