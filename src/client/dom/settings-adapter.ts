import { NATIVE_SETTINGS_IDS } from '../presets.ts'
import type { DetectedTarget, Resolution } from '../types.ts'
import type { AdapterOptions, AdapterReport } from './adapter-types.ts'
import { reportOnce } from './adapter-types.ts'
import { applyOwnedIcon, clearOwnedIcon, ownedIconMatches } from './owned-icon.ts'

interface SettingsMatch {
  buttons: HTMLButtonElement[]
  targets: readonly DetectedTarget[]
}

/** Third-party markers that indicate a settings row already has a custom icon. */
const TRUSTED_THIRD_PARTY_SETTINGS_MARKERS = ['data-dsh-better-sidebar-settings-nav'] as const

function directSvg(element: Element): SVGElement | undefined {
  return Array.from(element.children).find(child => child.tagName.toLowerCase() === 'svg') as SVGElement | undefined
}

export function findSettingsMatch(targets: readonly DetectedTarget[]): SettingsMatch | null {
  if (targets.length === 0) return null
  const matches: SettingsMatch[] = []
  for (const dialog of settingsDialogs()) {
    for (const nav of dialog.querySelectorAll<HTMLElement>('nav')) {
      const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>('button'))
        .filter(button => button.closest('nav') === nav)
      if (buttons.length !== targets.length) continue
      if (!buttons.some(button => button.hasAttribute('aria-current'))) continue
      if (!buttons.every(button => directSvg(button) !== undefined)) continue
      matches.push({ buttons, targets })
    }
  }
  return matches.length === 1 ? matches[0]! : null
}

function settingsDialogs(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]')).filter(dialog => {
    const labelledBy = dialog.getAttribute('aria-labelledby')
    if (!labelledBy) return false
    const label = document.getElementById(labelledBy)
    const header = dialog.querySelector<HTMLElement>('[data-slot="settings.header"]')
    return label !== null && header !== null && dialog.contains(label)
      && (label === header || label.contains(header))
  })
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
      const hasDialog = settingsDialogs().length > 0
      report({
        status: hasDialog ? 'unsupported' : 'waiting',
        managed: 0,
        total: targets.length,
        reason: hasDialog ? '设置导航结构与插槽账本不一致' : undefined,
      })
      return
    }

    const desired = new Set<HTMLElement>()
    const targetResolutions: Partial<Record<DetectedTarget['key'], Resolution>> = {}
    let managed = 0
    for (let index = 0; index < match.targets.length; index += 1) {
      const target = match.targets[index]!
      const button = match.buttons[index]!
      const hasTrustedThirdPartyIcon = TRUSTED_THIRD_PARTY_SETTINGS_MARKERS.some(marker => button.hasAttribute(marker))
      const resolution = options.resolve(target, {
        hasOriginal: true,
        originalIsGeneric: !NATIVE_SETTINGS_IDS.has(target.id) && !hasTrustedThirdPartyIcon,
      })
      targetResolutions[target.key] = resolution
      if (resolution.iconId === null) {
        disposers.get(button)?.()
        disposers.delete(button)
        continue
      }
      desired.add(button)
      managed += 1
      if (ownedIconMatches(button, target, resolution.iconId)) continue
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
      resolutions: targetResolutions,
    })
  }

  const schedule = (): void => {
    if (disposed || scheduled) return
    scheduled = true
    queueMicrotask(sync)
  }

  sync()
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['role', 'id', 'aria-labelledby', 'aria-current', 'data-slot', 'data-dsh-icon-theme-managed', 'data-dsh-better-sidebar-settings-nav'],
  })
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
