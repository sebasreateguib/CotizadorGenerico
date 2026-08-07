'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatSoles } from '@/lib/data/calcular'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { KIND_LABELS, type CatalogEntry, type CatalogKind, type TenantCatalog } from '@/lib/data/catalogo-shared'
import { Plus, Trash2, Check, X, Pencil, Loader2, PackageOpen } from 'lucide-react'

/** Orden en que se muestran las secciones: primero lo que hace falta para cotizar. */
const KIND_ORDER: CatalogKind[] = [
  'sistema', 'retoque', 'diseno', 'adicional', 'pedreria',
  'retoque_semana', 'cambio_tamanio', 'cambio_punta', 'kapping', 'prep',
]

interface DraftItem {
  name: string
  category: string
  price: string
  pricePerNail: string
  perNail: boolean
}

const EMPTY_DRAFT: DraftItem = { name: '', category: '', price: '', pricePerNail: '', perNail: false }

function toDraft(entry: CatalogEntry): DraftItem {
  return {
    name: entry.name,
    category: entry.category ?? '',
    price: String(entry.price),
    pricePerNail: String(entry.pricePerNail),
    perNail: entry.perNail,
  }
}

export default function CatalogEditor({ catalog }: { catalog: TenantCatalog }) {
  const router = useRouter()
  const supabase = createClient()

  const [activeKind, setActiveKind] = useState<CatalogKind>('sistema')
  const [draft, setDraft] = useState<DraftItem>(EMPTY_DRAFT)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<DraftItem>(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<CatalogEntry | null>(null)

  const meta = KIND_LABELS[activeKind]
  const entries = catalog[activeKind]

  // Categorías que ya usó en esta sección, para sugerirlas con un datalist.
  const knownCategories = useMemo(
    () => [...new Set(entries.map(e => e.category).filter((c): c is string => !!c))],
    [entries],
  )

  function parsePrice(value: string): number {
    const n = parseFloat(value.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : 0
  }

  function isValid(d: DraftItem) {
    return d.name.trim().length > 0
  }

  async function addItem() {
    if (!isValid(draft) || busy) return
    setBusy(true)
    // tenant_id lo pone la base sola (DEFAULT auth_tenant_id()).
    const { error } = await supabase.from('catalog_items').insert({
      kind: activeKind,
      name: draft.name.trim(),
      category: draft.category.trim() || null,
      price: parsePrice(draft.price),
      price_per_nail: meta.hasPerNail ? parsePrice(draft.pricePerNail) : 0,
      per_nail: meta.hasPerNail ? draft.perNail : false,
      sort_order: entries.length + 1,
    })
    setBusy(false)

    if (error) {
      alert(
        error.code === '23505'
          ? `Ya tienes un "${draft.name.trim()}" en ${meta.title}.`
          : 'No se pudo guardar: ' + error.message,
      )
      return
    }
    setDraft(EMPTY_DRAFT)
    setAdding(false)
    router.refresh()
  }

  async function saveEdit(id: string) {
    if (!isValid(editDraft) || busy) return
    setBusy(true)
    const { error } = await supabase.from('catalog_items').update({
      name: editDraft.name.trim(),
      category: editDraft.category.trim() || null,
      price: parsePrice(editDraft.price),
      price_per_nail: meta.hasPerNail ? parsePrice(editDraft.pricePerNail) : 0,
      per_nail: meta.hasPerNail ? editDraft.perNail : false,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setBusy(false)

    if (error) {
      alert('No se pudo guardar: ' + error.message)
      return
    }
    setEditingId(null)
    router.refresh()
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const id = pendingDelete.id
    setPendingDelete(null)
    setBusy(true)
    const { error } = await supabase.from('catalog_items').delete().eq('id', id)
    setBusy(false)
    if (error) {
      alert('No se pudo eliminar: ' + error.message)
      return
    }
    router.refresh()
  }

  function renderFields(d: DraftItem, set: (d: DraftItem) => void, onSubmit: () => void) {
    return (
      <>
        <input
          className="vk-input"
          placeholder={activeKind === 'diseno' ? 'Nombre del diseño' : 'Nombre del servicio'}
          value={d.name}
          autoFocus
          onChange={e => set({ ...d, name: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          style={{ flex: '2 1 200px', minWidth: '160px' }}
        />
        <input
          className="vk-input"
          placeholder="Categoría (opcional)"
          list={`cats-${activeKind}`}
          value={d.category}
          onChange={e => set({ ...d, category: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          style={{ flex: '1 1 130px', minWidth: '110px' }}
        />
        <input
          className="vk-input"
          type="number" min="0" step="0.5" inputMode="decimal"
          placeholder={meta.hasPerNail ? 'Precio set' : 'Precio'}
          value={d.price}
          onChange={e => set({ ...d, price: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          style={{ flex: '0 1 110px', minWidth: '90px' }}
        />
        {meta.hasPerNail && (
          <input
            className="vk-input"
            type="number" min="0" step="0.5" inputMode="decimal"
            placeholder="Por uña"
            value={d.pricePerNail}
            onChange={e => set({ ...d, pricePerNail: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
            style={{ flex: '0 1 100px', minWidth: '85px' }}
          />
        )}
        {meta.hasPerNail && (
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px',
            color: 'var(--vk-text-muted)', whiteSpace: 'nowrap', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={d.perNail}
              onChange={e => set({ ...d, perNail: e.target.checked })}
              style={{ accentColor: 'var(--vk-pink)' }}
            />
            Se cobra por uña
          </label>
        )}
      </>
    )
  }

  return (
    <div>
      {/* Secciones */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {KIND_ORDER.map(kind => {
          const count = catalog[kind].length
          return (
            <button
              key={kind}
              type="button"
              className={`filter-chip ${activeKind === kind ? 'active' : ''}`}
              onClick={() => { setActiveKind(kind); setAdding(false); setEditingId(null) }}
              aria-pressed={activeKind === kind}
            >
              {KIND_LABELS[kind].title}
              <span style={{ opacity: 0.6, marginLeft: '6px' }}>{count}</span>
            </button>
          )
        })}
      </div>

      <datalist id={`cats-${activeKind}`}>
        {knownCategories.map(c => <option key={c} value={c} />)}
      </datalist>

      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 700,
            color: 'var(--vk-text)', letterSpacing: '-0.02em', marginBottom: '4px',
          }}>
            {meta.title}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--vk-text-muted)' }}>{meta.help}</p>
        </div>

        {/* Lista */}
        {entries.length === 0 && !adding ? (
          <div style={{ padding: '36px 16px', textAlign: 'center' }}>
            <PackageOpen size={26} strokeWidth={1.5} color="var(--vk-text-subtle)" />
            <p style={{ color: 'var(--vk-text-muted)', fontSize: '13.5px', marginTop: '10px' }}>
              Todavía no has cargado nada en {meta.title.toLowerCase()}.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {entries.map(entry => (
              editingId === entry.id ? (
                <div key={entry.id} style={{
                  display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
                  padding: '12px', borderRadius: '12px',
                  background: 'var(--vk-pink-muted)', border: '1px solid rgba(243,50,131,0.3)',
                }}>
                  {renderFields(editDraft, setEditDraft, () => saveEdit(entry.id))}
                  <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                    <button
                      className="btn-primary"
                      onClick={() => saveEdit(entry.id)}
                      disabled={busy || !isValid(editDraft)}
                    >
                      {busy ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={15} strokeWidth={2} />}
                      Guardar
                    </button>
                    <button className="btn-ghost" onClick={() => setEditingId(null)} disabled={busy}>
                      <X size={15} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ) : (
                <div key={entry.id} style={{
                  display: 'flex', gap: '12px', alignItems: 'center',
                  padding: '12px 14px', borderRadius: '12px',
                  background: 'var(--vk-surface)', border: '1px solid var(--vk-border)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', color: 'var(--vk-text)', fontWeight: 500 }}>
                      {entry.name}
                      {entry.perNail && (
                        <span style={{ fontSize: '11px', color: 'var(--vk-text-subtle)', marginLeft: '8px' }}>
                          por uña
                        </span>
                      )}
                    </div>
                    {entry.category && (
                      <div style={{ fontSize: '12px', color: 'var(--vk-text-muted)', marginTop: '2px' }}>
                        {entry.category}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--vk-text)' }}>
                      {formatSoles(entry.price)}
                    </div>
                    {meta.hasPerNail && entry.pricePerNail > 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--vk-pink-soft)' }}>
                        {formatSoles(entry.pricePerNail)}/uña
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn-ghost"
                      title="Editar"
                      aria-label={`Editar ${entry.name}`}
                      onClick={() => { setEditingId(entry.id); setEditDraft(toDraft(entry)); setAdding(false) }}
                    >
                      <Pencil size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      className="btn-ghost"
                      title="Eliminar"
                      aria-label={`Eliminar ${entry.name}`}
                      onClick={() => setPendingDelete(entry)}
                      style={{ color: 'var(--vk-error)', borderColor: 'rgba(239,68,68,0.3)' }}
                    >
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Alta */}
        {adding ? (
          <div style={{
            display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
            padding: '12px', borderRadius: '12px',
            background: 'var(--vk-surface-2)', border: '1px dashed var(--vk-border)',
          }}>
            {renderFields(draft, setDraft, addItem)}
            <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
              <button className="btn-primary" onClick={addItem} disabled={busy || !isValid(draft)}>
                {busy ? <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Check size={15} strokeWidth={2} />}
                Agregar
              </button>
              <button className="btn-ghost" onClick={() => { setAdding(false); setDraft(EMPTY_DRAFT) }} disabled={busy}>
                <X size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-ghost" onClick={() => { setAdding(true); setEditingId(null) }}>
            <Plus size={16} strokeWidth={2} />
            Agregar a {meta.title.toLowerCase()}
          </button>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        danger
        title="Eliminar del catálogo"
        message={`¿Eliminar "${pendingDelete?.name}"? Las cotizaciones que ya lo usaron conservan su precio, no se tocan.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
