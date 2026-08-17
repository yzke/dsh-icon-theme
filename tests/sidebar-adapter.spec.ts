// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountSidebarAdapter } from '../src/client/dom/sidebar-adapter.ts'
import { hasSidebarCompatibilityFingerprint, SIDEBAR_COMPATIBILITY } from '../src/client/sidebar-compat.ts'
import type { DetectedTarget } from '../src/client/types.ts'

function target(id: string, order: number): DetectedTarget {
  return { surface: 'sidebar.footer.action', id, key: `sidebar.footer.action:${id}`, order, label: id }
}

function button(label = ''): HTMLButtonElement {
  const value = document.createElement('button')
  value.innerHTML = '<svg data-original="true"></svg>'
  if (label) value.setAttribute('aria-label', label)
  return value
}

function slot(...children: HTMLElement[]): HTMLElement {
  const value = document.createElement('div')
  value.dataset.slot = 'sidebar.footer.action'
  value.append(...children)
  return value
}

function tick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => { document.body.innerHTML = '' })

describe('mountSidebarAdapter', () => {
  it('pins reproducible upstream evidence for every partial-DOM fingerprint', () => {
    for (const [id, record] of Object.entries(SIDEBAR_COMPATIBILITY)) {
      if (!hasSidebarCompatibilityFingerprint(id)) continue
      expect(record.audit?.repository).toMatch(/^https:\/\/github\.com\//)
      expect(record.audit?.revision).toMatch(/^[0-9a-f]{40}$/)
      expect(record.audit?.paths.length).toBeGreaterThan(0)
      expect(record.audit?.license).toBe('MIT')
    }
    expect(hasSidebarCompatibilityFingerprint('cordis-panel')).toBe(false)
  })

  it('partially matches rendered actions when a registered contribution is absent', () => {
    const balance = document.createElement('div')
    balance.className = 'cm-footer-stack'
    balance.textContent = '余额 预算'
    const usage = button('使用统计')
    usage.dataset.usageStats = 'true'
    document.body.append(slot(button('导入会话'), balance, usage))
    const reports: unknown[] = []
    const dispose = mountSidebarAdapter({
      getTargets: () => [target('chat-import', 0), target('cordis-panel', 5), target('cost-meter', 10), target('usage-stats', 20)],
      resolve: value => ({ iconId: value.id === 'chat-import' ? 'arrow_import' : 'chart_multiple', source: 'manual', reason: 'reasonManual' }),
      onReport: (_surface, report) => reports.push(report),
    })
    expect(Array.from(document.querySelectorAll('[data-dsh-icon-theme-id]')).map(node => (node as HTMLElement).dataset.dshIconThemeId))
      .toEqual(['chat-import', 'usage-stats'])
    expect(balance.hasAttribute('data-dsh-icon-theme-id')).toBe(false)
    expect(reports.at(-1)).toMatchObject({
      status: 'active',
      managed: 2,
      available: 2,
      total: 4,
      targets: {
        'sidebar.footer.action:chat-import': 'changeable',
        'sidebar.footer.action:cordis-panel': 'not-rendered',
        'sidebar.footer.action:cost-meter': 'non-icon',
        'sidebar.footer.action:usage-stats': 'changeable',
      },
      labels: {
        'sidebar.footer.action:chat-import': '导入会话',
        'sidebar.footer.action:usage-stats': '使用统计',
      },
    })
    dispose()
    expect(document.querySelector('[data-dsh-icon-theme-id]')).toBeNull()
  })

  it('preserves plugin icons when resolution chooses original', () => {
    const original = button()
    original.className = 'dshbm_footerAction'
    document.body.append(slot(original))
    const dispose = mountSidebarAdapter({
      getTargets: () => [target('bookmarks', 0)],
      resolve: () => ({ iconId: null, source: 'original', reason: 'reasonOriginal' }),
    })
    expect(original.hasAttribute('data-dsh-icon-theme-managed')).toBe(false)
    expect(original.querySelector('svg')).not.toBeNull()
    dispose()
  })

  it('fails closed when a contribution renders multiple roots', () => {
    document.body.append(slot(button(), button()))
    const reports: unknown[] = []
    const dispose = mountSidebarAdapter({
      getTargets: () => [target('fragment-plugin', 0)],
      resolve: () => ({ iconId: 'apps', source: 'preset', reason: 'reasonPreset' }),
      onReport: (_surface, report) => reports.push(report),
    })
    expect(document.querySelector('[data-dsh-icon-theme-managed]')).toBeNull()
    expect(reports.at(-1)).toMatchObject({ status: 'unsupported' })
    dispose()
  })

  it('rebuilds its glyph when the host replaces children on the same action', async () => {
    const action = button('导入会话')
    document.body.append(slot(action))
    const dispose = mountSidebarAdapter({
      getTargets: () => [target('chat-import', 0)],
      resolve: () => ({ iconId: 'arrow_import', source: 'manual', reason: 'reasonManual' }),
    })
    action.innerHTML = '<svg data-original="replacement"></svg>'
    await tick()
    expect(action.querySelector(':scope > [data-dsh-icon-theme-glyph]')).not.toBeNull()
    expect(action.querySelector(':scope > svg[data-original="replacement"]')).not.toBeNull()
    dispose()
  })

  it('clears managed state when compatibility attributes change in place', async () => {
    const action = button('导入会话')
    document.body.append(slot(action))
    const dispose = mountSidebarAdapter({
      getTargets: () => [target('chat-import', 0)],
      resolve: () => ({ iconId: 'arrow_import', source: 'manual', reason: 'reasonManual' }),
    })
    expect(action.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)
    action.setAttribute('aria-label', 'Unrelated action')
    await tick()
    expect(action.hasAttribute('data-dsh-icon-theme-managed')).toBe(false)
    dispose()
  })

  it('does not rescan the sidebar for unrelated streaming DOM mutations', async () => {
    const action = button('导入会话')
    document.body.append(slot(action))
    let targetReads = 0
    const dispose = mountSidebarAdapter({
      getTargets: () => {
        targetReads += 1
        return [target('chat-import', 0)]
      },
      resolve: () => ({ iconId: 'arrow_import', source: 'manual', reason: 'reasonManual' }),
    })
    await tick()
    const readsAfterMount = targetReads
    const stream = document.createElement('div')
    document.body.append(stream)
    stream.append(document.createTextNode('streaming'))
    stream.firstChild!.textContent = 'streaming token'
    stream.className = 'message-updated'
    await tick()
    expect(targetReads).toBe(readsAfterMount)
    dispose()
  })

  it('repairs a removed managed marker inside the observed sidebar slot', async () => {
    const action = button('导入会话')
    document.body.append(slot(action))
    const dispose = mountSidebarAdapter({
      getTargets: () => [target('chat-import', 0)],
      resolve: () => ({ iconId: 'arrow_import', source: 'manual', reason: 'reasonManual' }),
    })
    action.removeAttribute('data-dsh-icon-theme-managed')
    await tick()
    expect(action.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)
    expect(action.querySelectorAll(':scope > [data-dsh-icon-theme-glyph]')).toHaveLength(1)
    dispose()
  })
})
