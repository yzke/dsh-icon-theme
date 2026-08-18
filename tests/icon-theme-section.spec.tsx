// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { IconThemeSection } from '../src/client/IconThemeSection.tsx'
import { en, zh, type Translate } from '../src/client/locales.ts'
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
    entriesOfSlot: name => name === 'settings.section'
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
const tEn: Translate = key => en[key]

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

  it('switches the original icon policy from the toolbar', async () => {
    const { scope, store } = harness()
    render(<IconThemeSection store={store} t={t} />)
    const prefer = screen.getByRole('button', { name: '优先保留插件原图标' })
    const replace = screen.getByRole('button', { name: '替换通用回退图标' })
    expect(prefer.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(replace)
    await waitFor(() => expect(scope.writes).toContainEqual(['originalPolicy', 'replace-generic']))
    expect(replace.getAttribute('aria-pressed')).toBe('true')
    store.dispose()
  })

  it('shows a gear placeholder and keep-original hint when a sidebar original is preserved', () => {
    const { scope, store } = harness([{ options: { id: 'chat-import' } }])
    render(<IconThemeSection store={store} t={t} />)
    const row = screen.getByText('导入会话').closest('[data-target-key]') as HTMLElement
    const preview = row.querySelector('.dit-preview') as HTMLElement
    expect(preview.querySelector('[data-icon-id="settings"]')).toBeTruthy()
    expect(within(preview).getByText('保留原图标')).toBeTruthy()
    expect(scope.writes).toEqual([])
    store.dispose()
  })

  it('does not show the keep-original hint for non-original resolutions', () => {
    const { store } = harness()
    render(<IconThemeSection store={store} t={t} />)
    const row = screen.getByText('插件市场').closest('[data-target-key]') as HTMLElement
    expect(row.querySelector('.dit-preview-hint')).toBeNull()
    store.dispose()
  })

  it('filters to unresolved targets without using localized labels for inference', async () => {
    const { store } = harness()
    await store.setOriginalPolicy('replace-generic')
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

  it('renders English icon labels and resolution reasons in the English locale', () => {
    const { store } = harness()
    render(<IconThemeSection store={store} t={tEn} />)
    const row = screen.getByText('插件市场').closest('[data-target-key]') as HTMLElement
    expect(row.querySelector('.dit-source')?.getAttribute('title')).toBe('Audited bundled plugin icon')
    fireEvent.click(within(row).getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('button', { name: 'Apps' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '插件' })).toBeNull()
    store.dispose()
  })
})
