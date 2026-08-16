import { NATIVE_SETTINGS_IDS } from '../presets.ts'
import type { DetectedTarget } from '../types.ts'
import type { AdapterOptions, AdapterReport } from './adapter-types.ts'
import { reportOnce } from './adapter-types.ts'
import { applyOwnedIcon, clearOwnedIcon } from './owned-icon.ts'

interface SettingsMatch {
  buttons: HTMLButtonElement[]
  targets: readonly DetectedTarget[]
}

function directSvg(element: Element): SVGElement | undefined {
  return Array.from(element.children).find(child => child.tagName.toLowerCase() === 'svg') as SVGElement | undefined
}

export function findSettingsMatch(targets: readonly DetectedTarget[]): SettingsMatch | null {
  if (targets.length === 0) return null
  for (const dialog of document.querySelectorAll<HTMLElement>('[role="dialog"]')) {
    for (const nav of dialog.querySelectorAll<HTMLElement>('nav')) {
      const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>('button'))
        .filter(button => button.closest('nav') === nav)
      if (buttons.length !== targets.length) continue
      if (!buttons.some(button => button.hasAttribute('aria-current'))) continue
      if (!buttons.every(button => directSvg(button) !== undefined)) continue
      return { buttons, targets }
    }
  }
  return null
}

export function mountSettingsAdapter(options: AdapterOptions): () => void {
  const disposers = new Map<HTMLElement, () => void>()
  const emit = reportOnce('settings.section', options.onReport)
  let disposed = false
  let scheduled = false

  const clearAll = (): void => {
    for (const dispose of disposers.values()) dispose()
    disposers.clear()
  }

  const report = (value: AdapterReport): void => emit(value)

  const sync = (): void => {
    scheduled = false
    if (disposed) return
    const targets = options.getTargets().filter(target => target.surface === 'settings.section')
    const match = findSettingsMatch(targets)
    if (!match) {
      clearAll()
      const hasDialog = document.querySelector('[role="dialog"]') !== null
      report({
        status: hasDialog ? 'unsupported' : 'waiting',
        managed: 0,
        total: targets.length,
        reason: hasDialog ? '设置导航结构与插槽账本不一致' : undefined,
      })
      return
    }

    const desired = new Set<HTMLElement>()
    let managed = 0
    for (let index = 0; index < match.targets.length; index += 1) {
      const target = match.targets[index]!
      const button = match.buttons[index]!
      const resolution = options.resolve(target, {
        hasOriginal: true,
        originalIsGeneric: !NATIVE_SETTINGS_IDS.has(target.id),
      })
      if (resolution.iconId === null) {
        disposers.get(button)?.()
        disposers.delete(button)
        continue
      }
      desired.add(button)
      managed += 1
      if (button.dataset.dshIconThemeIcon === resolution.iconId && button.dataset.dshIconThemeId === target.id) continue
      disposers.get(button)?.()
      disposers.set(button, applyOwnedIcon(button, target, resolution))
    }

    for (const [element, dispose] of disposers) {
      if (desired.has(element) && element.isConnected) continue
      dispose()
      disposers.delete(element)
    }
    report({
      status: 'active',
      managed,
      available: targets.length,
      total: targets.length,
      targets: Object.fromEntries(targets.map(target => [target.key, 'changeable'] as const)),
    })
  }

  const schedule = (): void => {
    if (disposed || scheduled) return
    scheduled = true
    queueMicrotask(sync)
  }

  sync()
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  const unsubscribe = options.subscribe?.(schedule) ?? (() => {})

  return () => {
    disposed = true
    observer.disconnect()
    unsubscribe()
    clearAll()
  }
}

export function clearSettingsMarkers(): void {
  document.querySelectorAll<HTMLElement>('[data-dsh-icon-theme-surface="settings.section"]')
    .forEach(clearOwnedIcon)
}
