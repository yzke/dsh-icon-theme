import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config.ts'
import { resolveIcon } from '../src/client/resolve.ts'
import { createIconThemeStore, type SettingsScopeLike, type SlotLedgerLike } from '../src/client/store.ts'
import { PINNED_REGISTRATIONS } from './fixtures/ecosystem-registrations.ts'

function scope(): SettingsScopeLike {
  return {
    getSnapshot: () => ({ status: 'ready', value: {}, writable: true }),
    subscribe: () => () => {},
    set: async () => {},
    unset: async () => {},
  }
}

function ecosystemLedger(): SlotLedgerLike {
  return {
    entriesOfSlot: name => PINNED_REGISTRATIONS
      .filter(item => item.surface === name)
      .map(item => ({ options: { id: item.id, order: item.order, label: item.label } })),
    subscribe: () => () => {},
  }
}

describe('pinned external plugin registrations', () => {
  it('keeps machine-checkable provenance for every transcribed registration', () => {
    for (const fixture of PINNED_REGISTRATIONS) {
      expect(fixture.sourceUrl).toContain(`/${fixture.commit}/${fixture.sourcePath}`)
      expect(fixture.sourceBlobSha).toMatch(/^[0-9a-f]{40}$/)
      expect(fixture.sourceExcerpt).toContain(`name: '${fixture.surface}'`)
      expect(fixture.sourceExcerpt).toContain(`id: '${fixture.id}'`)
    }
  })

  it('discovers only supported rendered surfaces from a mixed external ecosystem', () => {
    const store = createIconThemeStore(scope(), ecosystemLedger())
    expect(store.getSnapshot().targets).toEqual([{
      surface: 'settings.section',
      id: 'reverse-proxy',
      key: 'settings.section:reverse-proxy',
      order: 30,
      label: 'Reverse Proxy',
    }])
    store.dispose()
  })

  it('uses the Settings gear for a newly discovered target with no original icon', () => {
    const store = createIconThemeStore(scope(), ecosystemLedger())
    const target = store.getSnapshot().targets[0]!
    expect(resolveIcon(target, { ...DEFAULT_CONFIG, overrides: {} }, { hasOriginal: false, originalIsGeneric: false })).toMatchObject({
      iconId: 'settings',
      source: 'fallback',
    })
    store.dispose()
  })

  it('still accepts a stable-key manual override for that unknown plugin', () => {
    const store = createIconThemeStore(scope(), ecosystemLedger())
    const target = store.getSnapshot().targets[0]!
    expect(resolveIcon(target, {
      ...DEFAULT_CONFIG,
      overrides: { 'settings.section:reverse-proxy': 'globe' },
    }, { hasOriginal: false, originalIsGeneric: false })).toMatchObject({ iconId: 'globe', source: 'manual' })
    store.dispose()
  })
})
