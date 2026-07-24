'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert } from 'lucide-react'

export default function ConfirmDialog({
  open,
  title,
  message,
  danger = false,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  danger?: boolean
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return createPortal(
    <div className="confirm-overlay" role="presentation" onClick={onCancel}>
      <div
        className="glass-card confirm-box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
            background: danger ? 'rgba(240, 68, 106, 0.12)' : 'var(--vk-surface-2)',
            border: `1px solid ${danger ? 'rgba(240, 68, 106, 0.3)' : 'var(--vk-border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TriangleAlert size={16} strokeWidth={1.8} color={danger ? 'var(--vk-error)' : 'var(--vk-warning)'} />
          </div>
          <div>
            <h2 id="confirm-dialog-title" style={{
              fontFamily: 'var(--font-heading)', fontSize: '15.5px', fontWeight: 700,
              color: 'var(--vk-text)', marginBottom: '4px',
            }}>
              {title}
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--vk-text-muted)', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" onClick={onCancel} className="confirm-btn-cancel">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={danger ? 'confirm-btn-danger' : 'confirm-btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
