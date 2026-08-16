// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { IconThemeSection } from '../src/client/IconThemeSection.tsx'
import { zh, type Translate } from '../src/client/locales.ts'
import { createIconThemeStore, type SettingsScopeLike, type SlotLedgerLike } from '../src/client/store.ts'

afterEach(cleanup)

function harness(sidebarEntries: Array<{ options: { id: string; order?: number; label?: string } }> = []) {
  const listeners = new Set<() => void>()
  const scope: SettingsScopeLike & { writes: unknown[][]; value: unknown } = {
    value: {},
    writes: [],
    getSnapshot() { return { status: 'ready', value: this.value, writable: true } },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
    async set(field, value) {
      this.writes.push([field, value])
      this.value = { ...(this.value as object), [field]: value }
      listeners.forEach(listener => listener())
    },
    async unset(field) {
      this.writes.push(['unset', field])
      const next = { ...(this.value as Record<string, unknown>) }
      delete next[field]
      this.value = next
      listeners.forEach(listener => listener())
    },
  }
  const slots: SlotLedgerLike = {
    entries: name => name === 'settings.section'
      ? [
          { options: { id: 'market', order: 40, label: '插件市场' } },
          { options: { id: 'unknown-feature', order: 50, label: '神秘功能' } },
        ]
      : sidebarEntries,
    subscribe: () => () => {},
  }
  return { scope, store: createIconThemeStore(scope, slots) }
}

const t: Translate = key => zh[key]

describe('IconThemeSection', () => {
  it('selects and resets a manual override with a live source update', async () => {
    const { scope, store } = harness()
    render(<IconThemeSection store={store} t={t} />)
    const row = screen.getByText('插件市场').closest('[data-target-key]') as HTMLElement
    fireEvent.click(within(row).getByRole('button', { name: '更改' }))
    fireEvent.click(screen.getByRole('button', { name: '插件' }))
    await waitFor(() => expect(scope.writes).toEqual([
      ['overrides', { 'settings.section:market': 'apps' }],
    ]))
    expect(within(row).getByText('手动')).toBeTruthy()
    fireEvent.click(within(row).getByRole('button', { name: '恢复自动' }))
    await waitFor(() => expect(scope.writes.at(-1)).toEqual(['unset', 'overrides']))
    expect(within(row).getByText('插件自带')).toBeTruthy()
    store.dispose()
  })

  it('filters to unresolved targets without using localized labels for inference', () => {
    const { store } = harness()
    render(<IconThemeSection store={store} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: '未识别' }))
    expect(screen.getByText('神秘功能')).toBeTruthy()
    expect(screen.queryByText('插件市场')).toBeNull()
    store.dispose()
  })

  it('shows friendly and observed sidebar names with honest capability states', () => {
    const { store } = harness([
      { options: { id: 'chat-import' } },
      { options: { id: 'cordis-panel' } },
      { options: { id: 'cost-meter' } },
      { options: { id: 'bookmarks' } },
      { options: { id: 'usage-stats' } },
    ])
    store.setAdapterReport('sidebar.footer.action', {
      status: 'active',
      managed: 0,
      available: 3,
      total: 5,
      targets: {
        'sidebar.footer.action:chat-import': 'changeable',
        'sidebar.footer.action:cordis-panel': 'not-rendered',
        'sidebar.footer.action:cost-meter': 'non-icon',
        'sidebar.footer.action:bookmarks': 'changeable',
        'sidebar.footer.action:usage-stats': 'changeable',
      },
      labels: {
        'sidebar.footer.action:chat-import': '导入会话',
        'sidebar.footer.action:bookmarks': '收藏中心',
        'sidebar.footer.action:usage-stats': '使用统计',
      },
    })
    render(<IconThemeSection store={store} t={t} />)
    expect(screen.getByText('导入会话')).toBeTruthy()
    expect(screen.getByText('收藏中心')).toBeTruthy()
    expect(screen.getByText('使用统计')).toBeTruthy()
    expect(screen.getByText('Cordis 面板')).toBeTruthy()
    expect(screen.getByText('余额与费用')).toBeTruthy()
    expect(screen.getByText('当前未渲染 · 可预设')).toBeTruthy()
    const costRow = screen.getByText('余额与费用').closest('[data-target-key]') as HTMLElement
    expect(within(costRow).getByRole('button', { name: '更改' }).hasAttribute('disabled')).toBe(true)
    store.dispose()
  })
})
