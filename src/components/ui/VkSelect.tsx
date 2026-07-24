'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type VkSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type VkSelectGroup = {
  label: string
  options: VkSelectOption[]
}

type VkSelectProps = {
  value: string
  onChange: (value: string) => void
  options?: VkSelectOption[]
  groups?: VkSelectGroup[]
  /** Texto cuando no hay selección */
  placeholder?: string
  /** Si true, permite elegir valor vacío (muestra el placeholder como opción) */
  allowEmpty?: boolean
  disabled?: boolean
  'aria-label'?: string
  id?: string
}

function flattenOptions(options: VkSelectOption[] | undefined, groups: VkSelectGroup[] | undefined): VkSelectOption[] {
  if (groups?.length) return groups.flatMap(g => g.options)
  return options ?? []
}

export default function VkSelect({
  value,
  onChange,
  options,
  groups,
  placeholder = '— Seleccionar —',
  allowEmpty = false,
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: VkSelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const allOptions = flattenOptions(options, groups)
  const selected = allOptions.find(o => o.value === value)
  const displayLabel = selected?.label ?? placeholder

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    const active = listRef.current.querySelector<HTMLElement>('[data-selected="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [open, value])

  function choose(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`vk-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <button
        type="button"
        id={selectId}
        className="vk-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen(v => !v)}
      >
        <span className={`vk-select-value${!selected ? ' is-placeholder' : ''}`}>
          {displayLabel}
        </span>
        <ChevronDown size={16} strokeWidth={2} className="vk-select-chevron" />
      </button>

      {open && (
        <div ref={listRef} className="vk-select-menu" role="listbox" aria-labelledby={selectId}>
          {allowEmpty && (
            <button
              type="button"
              role="option"
              aria-selected={value === ''}
              data-selected={value === '' ? 'true' : undefined}
              className={`vk-select-option is-placeholder${value === '' ? ' is-active' : ''}`}
              onClick={() => choose('')}
            >
              <span>{placeholder}</span>
              {value === '' && <Check size={14} strokeWidth={2.2} />}
            </button>
          )}

          {groups?.map(group => (
            <div key={group.label} className="vk-select-group" role="group" aria-label={group.label}>
              <div className="vk-select-group-label">{group.label}</div>
              {group.options.map(option => (
                <OptionButton
                  key={option.value}
                  option={option}
                  active={option.value === value}
                  onChoose={choose}
                />
              ))}
            </div>
          ))}

          {!groups && options?.map(option => (
            <OptionButton
              key={option.value}
              option={option}
              active={option.value === value}
              onChoose={choose}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OptionButton({
  option,
  active,
  onChoose,
}: {
  option: VkSelectOption
  active: boolean
  onChoose: (value: string) => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      data-selected={active ? 'true' : undefined}
      disabled={option.disabled}
      className={`vk-select-option${active ? ' is-active' : ''}`}
      onClick={() => onChoose(option.value)}
    >
      <span>{option.label}</span>
      {active && <Check size={14} strokeWidth={2.2} />}
    </button>
  )
}
