'use client'

import { useMemo, useState } from 'react'
import { formatSoles } from '@/lib/data/calcular'
import { CalendarRange } from 'lucide-react'
import VkSelect from '@/components/ui/VkSelect'

export interface CommissionMonthRow {
  technicianId: string
  technicianName: string
  month: string // 'YYYY-MM-DD', primer día del mes
  quotesCount: number
  commissionTotal: number
}

const MONTH_LABEL = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' })

function formatMonth(month: string): string {
  const [year, m] = month.split('-').map(Number)
  const label = MONTH_LABEL.format(new Date(year, m - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function CommissionsByMonth({ rows }: { rows: CommissionMonthRow[] }) {
  const technicians = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) map.set(r.technicianId, r.technicianName)
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [rows])

  const [selected, setSelected] = useState<string>('todos')

  const filteredRows = selected === 'todos' ? rows : rows.filter(r => r.technicianId === selected)

  if (rows.length === 0) {
    return null
  }

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '7px', fontFamily: 'var(--font-heading)', fontSize: '16px', fontWeight: 600, color: 'var(--vk-text)' }}>
          <CalendarRange size={16} strokeWidth={2} color="var(--vk-pink-soft)" />
          Comisiones por mes
        </h2>

        <div style={{ minWidth: '200px' }}>
          <VkSelect
            value={selected}
            onChange={setSelected}
            aria-label="Filtrar por técnico"
            options={[
              { value: 'todos', label: 'Todos los técnicos' },
              ...technicians.map(t => ({ value: t.id, label: t.name })),
            ]}
          />
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                {['Técnico', 'Mes', 'Cotizaciones pagadas', 'Comisión'].map((h) => (
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
              {filteredRows.map((r) => (
                <tr key={`${r.technicianId}-${r.month}`} className="table-row-hover" style={{ borderBottom: '1px solid var(--vk-border)' }}>
                  <td style={{ padding: '14px 20px', fontSize: '13.5px', fontWeight: 500, color: 'var(--vk-text)' }}>
                    {r.technicianName}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--vk-text-muted)', textTransform: 'capitalize' }}>
                    {formatMonth(r.month)}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: 'var(--vk-text-muted)' }}>
                    {r.quotesCount}
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '14px', fontWeight: 600, color: 'var(--vk-success)' }}>
                    {formatSoles(r.commissionTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
