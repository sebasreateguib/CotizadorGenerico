'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2 } from 'lucide-react'

export default function CommissionRateEditor({
  technicianId,
  initialRate,
}: {
  technicianId: string
  initialRate: number
}) {
  const router = useRouter()
  const [pct, setPct] = useState(String(Math.round(initialRate * 100)))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currentPct = Math.round(initialRate * 100)
  const parsed = parseInt(pct, 10)
  const isValid = !Number.isNaN(parsed) && parsed >= 0 && parsed <= 100
  const hasChanges = isValid && parsed !== currentPct

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (!hasChanges || saving) return

    setSaving(true)
    setSaved(false)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ commission_rate: parsed / 100 })
      .eq('id', technicianId)

    setSaving(false)

    if (error) {
      alert('No se pudo guardar la comisión: ' + error.message)
      return
    }

    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div
      className="commission-rate-editor"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <label htmlFor={`commission-${technicianId}`} className="commission-rate-label">
        Comisión
      </label>

      <div className="commission-rate-controls">
        <div className={`commission-rate-field${hasChanges ? ' is-dirty' : ''}${!isValid && pct !== '' ? ' is-invalid' : ''}`}>
          <input
            id={`commission-${technicianId}`}
            type="number"
            min={0}
            max={100}
            step={1}
            value={pct}
            onChange={(e) => {
              setPct(e.target.value)
              setSaved(false)
            }}
            aria-label="Porcentaje de comisión"
          />
          <span className="commission-rate-suffix" aria-hidden="true">%</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="commission-rate-save"
        >
          {saving ? (
            <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
          ) : saved ? (
            <>
              <Check size={14} strokeWidth={2.2} />
              Listo
            </>
          ) : (
            'Guardar'
          )}
        </button>
      </div>
    </div>
  )
}
