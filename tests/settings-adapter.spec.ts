// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountSettingsAdapter } from '../src/client/dom/settings-adapter.ts'
import type { DetectedTarget, Resolution } from '../src/client/types.ts'

function target(id: string, order: number): DetectedTarget {
  return { surface: 'settings.section', id, key: `settings.section:${id}`, order, label: id }
}

let nextDialog = 1

function settingsDialog(ids: string[], auditedIdentity = true): HTMLElement {
  const dialog = document.createElement('div')
  dialog.setAttribute('role', 'dialog')
  if (auditedIdentity) {
    const title = document.createElement('div')
    title.id = `settings-title-${nextDialog++}`
    title.innerHTML = '<div data-slot="settings.header">Settings</div>'
    dialog.setAttribute('aria-labelledby', title.id)
    dialog.appendChild(title)
  }
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
      ? { iconId: 'plugin.market', source: 'plugin', reason: 'reasonPlugin' }
      : { iconId: null, source: 'original', reason: 'reasonOriginal' }
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
      resolve: () => ({ iconId: 'settings', source: 'preset', reason: 'reasonPreset' }),
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
      resolve: () => ({ iconId: 'plugin.market', source: 'plugin', reason: 'reasonPlugin' }),
    })
    const first = document.querySelector('nav button')!
    expect(first.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)
    document.body.replaceChildren(settingsDialog(['market']))
    await tick()
    expect(document.querySelector('nav button')?.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)
    dispose()
  })

  it('rebuilds its glyph when the host replaces children on the same button', async () => {
    const targets = [target('market', 0)]
    document.body.append(settingsDialog(['market']))
    const dispose = mountSettingsAdapter({
      getTargets: () => targets,
      resolve: () => ({ iconId: 'plugin.market', source: 'plugin', reason: 'reasonPlugin' }),
    })
    const button = document.querySelector('nav button')!
    button.innerHTML = '<svg data-original="replacement"></svg><span>market</span>'
    await tick()
    expect(button.querySelector(':scope > [data-dsh-icon-theme-glyph]')).not.toBeNull()
    expect(button.querySelector(':scope > svg[data-original="replacement"]')).not.toBeNull()
    dispose()
  })

  it('clears managed state after the labelled title ID changes in place', async () => {
    document.body.append(settingsDialog(['market']))
    const dispose = mountSettingsAdapter({
      getTargets: () => [target('market', 0)],
      resolve: () => ({ iconId: 'plugin.market', source: 'plugin', reason: 'reasonPlugin' }),
    })
    const button = document.querySelector('nav button')!
    expect(button.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)
    document.querySelector('[data-slot="settings.header"]')!.parentElement!.id = 'changed-title-id'
    await tick()
    expect(button.hasAttribute('data-dsh-icon-theme-managed')).toBe(false)
    dispose()
  })

  it('repairs a removed managed marker on the next identity mutation', async () => {
    document.body.append(settingsDialog(['market']))
    const dispose = mountSettingsAdapter({
      getTargets: () => [target('market', 0)],
      resolve: () => ({ iconId: 'plugin.market', source: 'plugin', reason: 'reasonPlugin' }),
    })
    const button = document.querySelector('nav button')!
    button.removeAttribute('data-dsh-icon-theme-managed')
    await tick()
    expect(button.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)
    expect(button.querySelectorAll(':scope > [data-dsh-icon-theme-glyph]')).toHaveLength(1)
    dispose()
  })

  it('re-syncs when a trusted third-party icon marker appears or disappears', async () => {
    document.body.append(settingsDialog(['better-sidebar']))
    const button = document.querySelector('nav button') as HTMLButtonElement
    const dispose = mountSettingsAdapter({
      getTargets: () => [target('better-sidebar', 10)],
      resolve: (_target, evidence) => evidence.originalIsGeneric
        ? { iconId: 'panel_right_gallery', source: 'preset', reason: 'reasonPreset' }
        : { iconId: null, source: 'original', reason: 'reasonOriginal' },
    })
    expect(button.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)

    button.setAttribute('data-dsh-better-sidebar-settings-nav', '')
    await tick()
    expect(button.hasAttribute('data-dsh-icon-theme-managed')).toBe(false)

    button.removeAttribute('data-dsh-better-sidebar-settings-nav')
    await tick()
    expect(button.hasAttribute('data-dsh-icon-theme-managed')).toBe(true)
    dispose()
  })

  it('ignores a shape-similar unrelated dialog and ambiguous duplicate settings dialogs', () => {
    const targets = [target('market', 0)]
    document.body.append(settingsDialog(['market'], false))
    let dispose = mountSettingsAdapter({
      getTargets: () => targets,
      resolve: () => ({ iconId: 'plugin.market', source: 'plugin', reason: 'reasonPlugin' }),
    })
    expect(document.querySelector('[data-dsh-icon-theme-managed]')).toBeNull()
    dispose()

    document.body.replaceChildren(settingsDialog(['market']), settingsDialog(['market']))
    dispose = mountSettingsAdapter({
      getTargets: () => targets,
      resolve: () => ({ iconId: 'plugin.market', source: 'plugin', reason: 'reasonPlugin' }),
    })
    expect(document.querySelector('[data-dsh-icon-theme-managed]')).toBeNull()
    dispose()
  })
})
