import { describe, expect, it } from 'vitest'
import { createIconThemeStore, type SettingsScopeLike, type SlotLedgerLike } from '../src/client/store.ts'

function fakeScope(value: unknown = {}): SettingsScopeLike & { writes: unknown[][] } {
  const listeners = new Set<() => void>()
  const scope = {
    value,
    writes: [] as unknown[][],
    getSnapshot: () => ({ status: 'ready' as const, value: scope.value, writable: true }),
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) },
    set: async (field: string, next: unknown) => { scope.writes.push([field, next]); scope.value = { ...(scope.value as object), [field]: next } },
    unset: async (field: string) => { scope.writes.push(['unset', field]); const next = { ...(scope.value as Record<string, unknown>) }; delete next[field]; scope.value = next },
  }
  return scope
}

function fakeSlots(): SlotLedgerLike {
  return {
    entriesOfSlot: name => name === 'settings.section'
      ? [{ options: { id: 'market', order: 40, label: 'Market' } }]
      : [{ options: { id: 'bookmarks', order: 20, label: 'Bookmarks' } }],
    subscribe: () => () => {},
  }
}

describe('IconThemeStore', () => {
  it('persists only manual overrides under stable target keys', async () => {
    const scope = fakeScope()
    const store = createIconThemeStore(scope, fakeSlots())
    await store.setOverride('settings.section:market', 'apps')
    expect(scope.writes).toEqual([['overrides', { 'settings.section:market': 'apps' }]])
    expect(store.getSnapshot().config.overrides).toEqual({ 'settings.section:market': 'apps' })
    store.dispose()
  })

  it('clears the user layer when the last override is reset', async () => {
    const scope = fakeScope({ overrides: { 'settings.section:market': 'apps' } })
    const store = createIconThemeStore(scope, fakeSlots())
    await store.resetTarget('settings.section:market')
    expect(scope.writes).toEqual([['unset', 'overrides']])
    store.dispose()
  })

  it('discovers both supported surfaces', () => {
    const store = createIconThemeStore(fakeScope(), fakeSlots())
    expect(store.getSnapshot().targets.map(target => target.key)).toEqual([
      'settings.section:market',
      'sidebar.footer.action:bookmarks',
    ])
    store.dispose()
  })

  it('discovers rendered winners rather than shadowed raw registrations', () => {
    const slots: SlotLedgerLike & { entries: (name: string) => readonly { options: { id: string; priority: number } }[] } = {
      entries: () => [
        { options: { id: 'market', priority: 0 } },
        { options: { id: 'market', priority: 10 } },
      ],
      entriesOfSlot: name => name === 'settings.section'
        ? [{ options: { id: 'market', order: 40, label: 'Market winner' } }]
        : [],
      subscribe: () => () => {},
    }
    const store = createIconThemeStore(fakeScope(), slots)
    expect(store.getSnapshot().targets).toHaveLength(1)
    expect(store.getSnapshot().targets[0]).toMatchObject({ id: 'market', label: 'Market winner' })
    store.dispose()
  })
})
