import { useMemo, useState, useSyncExternalStore } from 'react'
import type { IconThemeStore } from './store.ts'
import type { Translate } from './locales.ts'
import type { DetectedTarget, ResolutionSource, TargetKey } from './types.ts'
import { IconGlyph } from './icon-ui.tsx'
import { IconPicker } from './IconPicker.tsx'
import type { AdapterReport, TargetAdapterStatus } from './dom/adapter-types.ts'
import { SIDEBAR_COMPATIBILITY } from './sidebar-compat.ts'

type Filter = 'all' | 'settings' | 'sidebar' | 'unrecognized' | 'customized'

export interface IconThemeSectionProps {
  store: IconThemeStore
  t: Translate
}

function sourceLabel(source: ResolutionSource, t: Translate): string {
  if (source === 'original') return t('original')
  return t(source)
}

function previewIcon(iconId: string | null): string {
  return iconId ?? 'settings'
}

function displayLabel(target: DetectedTarget, report: AdapterReport | undefined, t: Translate): string {
  const observed = report?.labels?.[target.key]
  if (observed) return observed
  if (target.label) return target.label
  if (target.surface === 'sidebar.footer.action') {
    const record = SIDEBAR_COMPATIBILITY[target.id]
    if (record) return t(record.labelKey)
  }
  return target.id.replace(/[-_]+/g, ' ')
}

function statusLabel(status: TargetAdapterStatus | undefined, source: ResolutionSource, t: Translate): string {
  if (status === 'non-icon') return t('nonIcon')
  if (status === 'not-rendered') return t('notRendered')
  if (status === 'waiting') return t('waiting')
  if (status === 'changeable') return `${t('changeable')} · ${sourceLabel(source, t)}`
  return sourceLabel(source, t)
}

export function IconThemeSection({ store, t }: IconThemeSectionProps) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [picker, setPicker] = useState<TargetKey | null>(null)
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return snapshot.targets.filter(target => {
      const resolution = store.resolve(target)
      const label = displayLabel(target, snapshot.reports[target.surface], t)
      if (filter === 'settings' && target.surface !== 'settings.section') return false
      if (filter === 'sidebar' && target.surface !== 'sidebar.footer.action') return false
      if (filter === 'unrecognized' && resolution.source !== 'fallback') return false
      if (filter === 'customized' && !(target.key in snapshot.config.overrides)) return false
      return !needle || `${label} ${target.id} ${resolution.iconId ?? ''}`.toLowerCase().includes(needle)
    })
  }, [filter, query, snapshot, store])
  const pickerTarget = picker === null ? undefined : snapshot.targets.find(target => target.key === picker)

  return (
    <section className="dit-root">
      <div className="dit-head">
        <div>
          <h2 className="dit-title">{t('title')}</h2>
          <p className="dit-sub">{t('subtitle')}</p>
        </div>
        <button type="button" className="dit-button" disabled={!snapshot.writable || Object.keys(snapshot.config.overrides).length === 0} onClick={() => void store.resetAll()}>
          {t('resetAll')}
        </button>
      </div>

      <div className="dit-summary">
        <span className="dit-report">{t('pack')}</span>
        <span className="dit-report">{t('detected')} · {snapshot.targets.length}</span>
        {(['settings.section', 'sidebar.footer.action'] as const).map(surface => {
          const report = snapshot.reports[surface]
          if (!report) return null
          return <span className="dit-report" key={surface}>{surface === 'settings.section' ? t('settings') : t('sidebar')} · {t(report.status)} · {t('changeable')} {report.available ?? report.managed}/{report.total}</span>
        })}
      </div>

      {snapshot.status !== 'ready' && <p className="dit-sub">{t('readOnly')}</p>}
      {snapshot.error && <p className="dit-sub" role="status">{snapshot.error}</p>}

      <div className="dit-toolbar">
        <input className="dit-input" aria-label={t('search')} placeholder={t('search')} value={query} onChange={event => setQuery(event.target.value)} />
        {(['all', 'settings', 'sidebar', 'unrecognized', 'customized'] as const).map(value => (
          <button type="button" className="dit-chip" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{t(value)}</button>
        ))}
      </div>

      <div className="dit-list">
        {rows.map(target => {
          const resolution = store.resolve(target)
          const customized = target.key in snapshot.config.overrides
          const report = snapshot.reports[target.surface]
          const targetStatus = report?.targets?.[target.key]
          const label = displayLabel(target, report, t)
          const nonIcon = targetStatus === 'non-icon'
          return (
            <div className="dit-row" key={target.key} data-target-key={target.key}>
              <div className="dit-preview">
                <IconGlyph iconId={previewIcon(resolution.iconId)} />
                {resolution.source === 'original' && <span className="dit-preview-hint">{t('originalPreviewHint')}</span>}
              </div>
              <div className="dit-name">
                <div className="dit-label">{label}</div>
                <div className="dit-id">{target.key}</div>
              </div>
              <div className="dit-source" title={t(resolution.reason)}>{statusLabel(targetStatus, resolution.source, t)}</div>
              <div className="dit-actions">
                {customized && <button type="button" className="dit-icon-button" disabled={!snapshot.writable} onClick={() => void store.resetTarget(target.key)}>{t('reset')}</button>}
                <button type="button" className="dit-icon-button" disabled={!snapshot.writable || nonIcon} onClick={() => setPicker(target.key)}>{t('choose')}</button>
              </div>
            </div>
          )
        })}
        {rows.length === 0 && <div className="dit-empty">{t('empty')}</div>}
      </div>

      {pickerTarget && (
        <IconPicker
          current={snapshot.config.overrides[pickerTarget.key] ?? store.resolve(pickerTarget).iconId}
          t={t}
          onClose={() => setPicker(null)}
          onChoose={iconId => {
            void store.setOverride(pickerTarget.key, iconId)
            setPicker(null)
          }}
        />
      )}
    </section>
  )
}
