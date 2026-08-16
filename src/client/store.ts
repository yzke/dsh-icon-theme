import type { IconThemeConfig } from '../config.ts'
import { discoverSettings, discoverSidebar } from './discovery.ts'
import { NATIVE_SETTINGS_IDS } from './presets.ts'
import { resolveIcon } from './resolve.ts'
import type { AdapterReport } from './dom/adapter-types.ts'
import type { DetectedTarget, Resolution, SlotEntryLike, Surface, TargetKey } from './types.ts'

export interface SettingsScopeSnapshotLike {
  status: 'loading' | 'ready' | 'unavailable'
  value: unknown
  writable: boolean
}

export interface SettingsScopeLike {
  getSnapshot: () => SettingsScopeSnapshotLike
  subscribe: (listener: () => void) => () => void
  set: (field: string, value: unknown) => Promise<void>
  unset: (field: string) => Promise<void>
}

export interface SlotLedgerLike {
  entries: (name: string) => readonly SlotEntryLike[]
  subscribe: (name: string, listener: () => void) => () => void
}

export interface IconThemeSnapshot {
  config: IconThemeConfig
  targets: readonly DetectedTarget[]
  reports: Readonly<Partial<Record<Surface, AdapterReport>>>
  status: SettingsScopeSnapshotLike['status']
  writable: boolean
  error: string | null
}

const CLIENT_DEFAULT_CONFIG: IconThemeConfig = {
  pack: 'dsh-fluent',
  overrides: {},
  originalPolicy: 'prefer',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeClientConfig(value: unknown): IconThemeConfig {
  if (!isRecord(value)) return { ...CLIENT_DEFAULT_CONFIG, overrides: {} }
  const overrides = isRecord(value.overrides)
    ? Object.fromEntries(Object.entries(value.overrides).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : {}
  return {
    pack: typeof value.pack === 'string' ? value.pack : CLIENT_DEFAULT_CONFIG.pack,
    overrides,
    originalPolicy: value.originalPolicy === 'replace-generic' ? 'replace-generic' : 'prefer',
  }
}

export class IconThemeStore {
  private listeners = new Set<() => void>()
  private reports: Partial<Record<Surface, AdapterReport>> = {}
  private config: IconThemeConfig
  private snapshot: IconThemeSnapshot
  private error: string | null = null
  private disposers: Array<() => void> = []

  constructor(
    private readonly scope: SettingsScopeLike,
    private readonly slots: SlotLedgerLike,
  ) {
    this.config = normalizeClientConfig(scope.getSnapshot().value)
    this.snapshot = this.buildSnapshot()
    this.disposers = [
      scope.subscribe(() => this.refreshFromScope()),
      slots.subscribe('settings.section', () => this.publish()),
      slots.subscribe('sidebar.footer.action', () => this.publish()),
    ]
  }

  getSnapshot = (): IconThemeSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  refresh = (): void => this.publish()

  resolve = (target: DetectedTarget): Resolution => resolveIcon(target, this.config, {
    hasOriginal: true,
    originalIsGeneric: target.surface === 'settings.section' && !NATIVE_SETTINGS_IDS.has(target.id),
  })

  setAdapterReport = (surface: Surface, report: AdapterReport): void => {
    if (JSON.stringify(this.reports[surface]) === JSON.stringify(report)) return
    this.reports = { ...this.reports, [surface]: report }
    this.publish()
  }

  setOverride = async (key: TargetKey, iconId: string): Promise<void> => {
    const overrides = { ...this.config.overrides, [key]: iconId }
    await this.writeOverrides(overrides)
  }

  resetTarget = async (key: TargetKey): Promise<void> => {
    if (!(key in this.config.overrides)) return
    const overrides = { ...this.config.overrides }
    delete overrides[key]
    await this.writeOverrides(overrides)
  }

  resetAll = async (): Promise<void> => {
    this.config = { ...this.config, overrides: {} }
    this.error = null
    this.publish()
    try {
      await this.scope.unset('overrides')
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error)
      this.refreshFromScope()
    }
  }

  setOriginalPolicy = async (policy: IconThemeConfig['originalPolicy']): Promise<void> => {
    this.config = { ...this.config, originalPolicy: policy }
    this.error = null
    this.publish()
    try {
      await this.scope.set('originalPolicy', policy)
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error)
      this.refreshFromScope()
    }
  }

  dispose = (): void => {
    this.disposers.splice(0).forEach(dispose => dispose())
    this.listeners.clear()
  }

  private async writeOverrides(overrides: Record<string, string>): Promise<void> {
    this.config = { ...this.config, overrides }
    this.error = null
    this.publish()
    try {
      if (Object.keys(overrides).length === 0) await this.scope.unset('overrides')
      else await this.scope.set('overrides', overrides)
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error)
      this.refreshFromScope()
    }
  }

  private refreshFromScope(): void {
    this.config = normalizeClientConfig(this.scope.getSnapshot().value)
    this.publish()
  }

  private buildSnapshot(): IconThemeSnapshot {
    const scope = this.scope.getSnapshot()
    let settings: DetectedTarget[] = []
    let sidebar: DetectedTarget[] = []
    try { settings = discoverSettings(this.slots.entries('settings.section')) } catch {}
    try { sidebar = discoverSidebar(this.slots.entries('sidebar.footer.action')) } catch {}
    return {
      config: this.config,
      targets: [...settings, ...sidebar],
      reports: this.reports,
      status: scope.status,
      writable: scope.writable,
      error: this.error,
    }
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot()
    for (const listener of this.listeners) listener()
  }
}

export function createIconThemeStore(scope: SettingsScopeLike, slots: SlotLedgerLike): IconThemeStore {
  return new IconThemeStore(scope, slots)
}
