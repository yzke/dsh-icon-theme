import { useMemo, useState } from 'react'
import { ICON_CATALOG } from './catalog.ts'
import { IconGlyph } from './icon-ui.tsx'
import type { Translate } from './locales.ts'

export interface IconPickerProps {
  current: string | null
  t: Translate
  onChoose: (iconId: string) => void
  onClose: () => void
}

export function IconPicker({ current, t, onChoose, onClose }: IconPickerProps) {
  const [query, setQuery] = useState('')
  const isEnglish = t('localeCode') === 'en'
  const icons = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return ICON_CATALOG
    return ICON_CATALOG.filter(icon => [icon.id, icon.label, icon.labelEn, ...icon.aliases].some(value => value.toLowerCase().includes(needle)))
  }, [query])

  return (
    <div className="dit-picker-mask" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="dit-picker" role="dialog" aria-modal="true" aria-label={t('pickerTitle')}>
        <div className="dit-picker-head">
          <div className="dit-picker-title">{t('pickerTitle')}</div>
          <button type="button" className="dit-icon-button" onClick={onClose}>{t('close')}</button>
        </div>
        <input
          autoFocus
          className="dit-input"
          aria-label={t('search')}
          placeholder={t('search')}
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <div className="dit-grid">
          {icons.map(icon => {
            const label = isEnglish ? icon.labelEn : icon.label
            return (
            <button
              type="button"
              className="dit-grid-item"
              key={icon.id}
              aria-current={current === icon.id ? 'true' : undefined}
              title={`${label} · ${icon.id}`}
              onClick={() => onChoose(icon.id)}
            >
              <IconGlyph iconId={icon.id} />
              <span>{label}</span>
            </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
