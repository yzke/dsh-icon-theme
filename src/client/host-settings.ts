import type { SettingsScopeLike, SettingsScopeSnapshotLike } from './store.ts'

export const SETTINGS_API_PATH = '/_dsh/icon-theme/settings'

interface SettingsResponse {
  ok: boolean
  value?: unknown
  revision?: number
  writable?: boolean
  error?: string
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export class HostSettingsScope implements SettingsScopeLike {
  private snapshot: SettingsScopeSnapshotLike = { status: 'loading', value: {}, writable: false }
  private revision: number | undefined
  private listeners = new Set<() => void>()
  private writeTail: Promise<void> = Promise.resolve()

  constructor(private readonly fetcher: FetchLike = globalThis.fetch.bind(globalThis)) {
    void this.reload()
  }

  getSnapshot = (): SettingsScopeSnapshotLike => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  set = async (field: string, value: unknown): Promise<void> => {
    await this.enqueue([{ op: 'set', path: [field], value }])
  }

  unset = async (field: string): Promise<void> => {
    await this.enqueue([{ op: 'unset', path: [field] }])
  }

  private enqueue(ops: unknown[]): Promise<void> {
    const operation = this.writeTail.then(() => this.mutate(ops))
    this.writeTail = operation.catch(() => {})
    return operation
  }

  private async mutate(ops: unknown[]): Promise<void> {
    if (!this.snapshot.writable || this.snapshot.status !== 'ready') throw new Error('settings are not writable')
    try {
      await this.request({ action: 'mutate', ops, expectedRevision: this.revision })
    } catch (error) {
      await this.reload()
      throw error
    }
  }

  private async reload(): Promise<void> {
    try {
      await this.request({ action: 'read' })
    } catch {
      this.snapshot = { status: 'unavailable', value: this.snapshot.value, writable: false }
      this.publish()
    }
  }

  private async request(payload: unknown): Promise<void> {
    const response = await this.fetcher(SETTINGS_API_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'x-dsh-icon-theme': '1',
      },
      body: JSON.stringify(payload),
    })
    const body = await response.json() as SettingsResponse
    if (!response.ok || body.ok !== true || typeof body.revision !== 'number') {
      throw new Error(body.error ?? `settings request failed (${response.status})`)
    }
    this.revision = body.revision
    this.snapshot = {
      status: 'ready',
      value: body.value ?? {},
      writable: body.writable === true,
    }
    this.publish()
  }

  private publish(): void {
    for (const listener of this.listeners) listener()
  }
}

export function createHostSettingsScope(fetcher?: FetchLike): SettingsScopeLike {
  return new HostSettingsScope(fetcher)
}
