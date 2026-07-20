import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  let quotesQuery = supabase
    .from('quotes')
    .select('subtotal, date')

  if (profile?.role !== 'admin') {
    quotesQuery = quotesQuery.eq('user_id', user.id)
  }

  const { data: allQuotes } = await quotesQuery
  
  // Calcular total del mes
  const monthStr = new Date().toISOString().slice(0, 7)
  const totalMes = (allQuotes || [])
    .filter(q => (q.date || '').startsWith(monthStr))
    .reduce((s, q) => s + (q.subtotal || 0), 0)
  
  // Calcular últimos 7 días
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    
    return (allQuotes || [])
      .filter(q => q.date === dateStr)
      .reduce((sum, q) => sum + (q.subtotal || 0), 0)
  })
  
  const metrics = { totalMes, dailyData }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar user={user} profile={profile} metrics={metrics} />
      <main className="main-content" style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width, 260px)',
        transition: 'margin-left 0.3s ease',
        padding: '36px 40px',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
