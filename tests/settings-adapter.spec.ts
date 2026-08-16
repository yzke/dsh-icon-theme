// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountSettingsAdapter } from '../src/client/dom/settings-adapter.ts'
import type { DetectedTarget, Resolution } from '../src/client/types.ts'

function target(id: string, order: number): DetectedTarget {
  return { surface: 'settings.section', id, key: `settings.section:${id}`, order, label: id }
}

function settingsDialog(ids: string[]): HTMLElement {
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  const nav = document.createElement('nav')
  ids.forEach((id, index) => {
    const button = document.createElement('button')
    if (index === 0) button.setAttribute('aria-current', 'true')
    button.innerHTML = `<svg data-original="${id}"></svg><span>${id}</span>`
    nav.appendChild(button)
  })
  dialog.appendChild(nav)
  return dialog
}

function tick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => { document.body.innerHTML = '' })

describe('mountSettingsAdapter', () => {
  it('supports delayed dialog mount and restores original SVGs on disposal', async () => {
    const targets = [target('general', 0), target('market', 40)]
    const resolve = (value: DetectedTarget): Resolution => value.id === 'market'
      ? { iconId: 'plugin.market', source: 'plugin', reason: 'test' }
      : { iconId: null, source: 'original', reason: 'test' }
    const dispose = mountSettingsAdapter({ getTargets: () => targets, resolve })
    document.body.append(settingsDialog(['general', 'market']))
    await tick()
    const market = document.querySelectorAll('nav button')[1] as HTMLButtonElement
    expect(market.dataset.dshIconThemeId).toBe('market')
    expect(market.querySelector(':scope > svg[data-original="market"]')).not.toBeNull()
    expect(market.querySelector(':scope > [data-dsh-icon-theme-glyph]')).not.toBeNull()
    dispose()
    expect(market.dataset.dshIconThemeId).toBeUndefined()
    expect(market.querySelector(':scope > [data-dsh-icon-theme-glyph]')).toBeNull()
    expect(market.querySelector(':scope > svg[data-original="market"]')).not.toBeNull()
  })

  it('fails closed without partially changing rows when ledger and DOM differ', () => {
    document.body.append(settingsDialog(['general']))
    const reports: unknown[] = []
    const dispose = mountSettingsAdapter({
      getTargets: () => [target('general', 0), target('market', 40)],
      resolve: () => ({ iconId: 'settings', source: 'preset', reason: 'test' }),
      onReport: (_surface, report) => reports.push(report),
    })
    expect(document.querySelector('[data-dsh-icon-theme-managed]')).toBeNull()
    expect(reports.at(-1)).toMatchObject({ status: 'unsupported', managed: 0, total: 2 })
    dispose()
  })

  it('re-correlates after a host rerender', async () => {
    const targets = [target('market', 0)]
    document.body.append(settingsDialog(['market']))
    const dispose = mountSettingsAdapter({
      getTargets: () => targets,
      resolve: () => ({ iconId: 'plugin.market', source: 'plugin', reason: 'test' }),
    })
    const first = document.querySelector('nav button')!
    expect(first.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)
    document.body.replaceChildren(settingsDialog(['market']))
    await tick()
    expect(document.querySelector('nav button')?.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)
    dispose()
  })
})
