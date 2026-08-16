// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { applyWithSettings, inject } from '../src/client/index.tsx'
import type { SettingsScopeLike } from '../src/client/store.ts'

afterEach(() => { document.body.innerHTML = ''; document.head.querySelectorAll('[data-plugin="dsh-icon-theme"]').forEach(node => node.remove()) })

function tick(): Promise<void> { return new Promise(resolve => setTimeout(resolve, 0)) }

describe('client lifecycle', () => {
  it('depends only on the two UI services it directly uses', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers one section and removes observers, styles, and markers on disposal', async () => {
    const effects: Array<() => void> = []
    const injected: Array<() => void> = []
    const subscriptions = new Set<() => void>()
    const settingsEntries: Array<{ options: Record<string, unknown> }> = [
      { options: { id: 'general', order: 0, label: 'General' } },
      { options: { id: 'market', order: 40, label: 'Market' } },
    ]
    const sidebarEntries: Array<{ options: Record<string, unknown> }> = []
    const scope: SettingsScopeLike = {
      getSnapshot: () => ({ status: 'ready', value: {}, writable: true }),
      subscribe: listener => { subscriptions.add(listener); return () => subscriptions.delete(listener) },
      set: async () => {},
      unset: async () => {},
    }
    const slotListeners = new Map<string, Set<() => void>>()
    const slots = {
      entries: (name: string) => name === 'settings.section' ? settingsEntries : sidebarEntries,
      subscribe: (name: string, listener: () => void) => {
        const set = slotListeners.get(name) ?? new Set()
        set.add(listener)
        slotListeners.set(name, set)
        subscriptions.add(listener)
        return () => { set.delete(listener); subscriptions.delete(listener) }
      },
      inject: (_name: string, register: () => unknown) => {
        const result = register()
        if (typeof result === 'function') injected.push(result as () => void)
      },
      register: (options: Record<string, unknown>) => {
        if (options.name === 'settings.section') {
          const entry = { options }
          settingsEntries.push(entry)
          slotListeners.get('settings.section')?.forEach(listener => listener())
          return () => {
            const index = settingsEntries.indexOf(entry)
            if (index >= 0) settingsEntries.splice(index, 1)
          }
        }
        return () => {}
      },
    }
    const ctx = {
      effect(callback: () => unknown) {
        const result = callback()
        if (typeof result === 'function') effects.push(result as () => void)
      },
      locale: {
        register: () => () => {},
        bind: () => (key: string) => key === 'nav' ? 'Icons' : key,
        subscribe: (listener: () => void) => { subscriptions.add(listener); return () => subscriptions.delete(listener) },
      },
      slots,
    }

    applyWithSettings(ctx, scope)
    expect(settingsEntries.some(entry => entry.options.id === 'icon-theme')).toBe(true)
    expect(document.head.querySelector('[data-plugin="dsh-icon-theme"]')).not.toBeNull()

    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const nav = document.createElement('nav')
    for (const id of ['general', 'market', 'icon-theme']) {
      const button = document.createElement('button')
      if (id === 'general') button.setAttribute('aria-current', 'true')
      button.innerHTML = `<svg></svg><span>${id}</span>`
      nav.appendChild(button)
    }
    dialog.appendChild(nav)
    document.body.appendChild(dialog)
    await tick()
    expect(document.querySelector('[data-dsh-icon-theme-id="market"]')).not.toBeNull()

    effects.reverse().forEach(dispose => dispose())
    injected.reverse().forEach(dispose => dispose())
    expect(document.querySelector('[data-dsh-icon-theme-managed]')).toBeNull()
    expect(document.head.querySelector('[data-plugin="dsh-icon-theme"]')).toBeNull()
    expect(subscriptions.size).toBe(0)
  })
})
