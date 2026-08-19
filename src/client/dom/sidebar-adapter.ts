import type { DetectedTarget, Resolution } from '../types.ts'
import { hasSidebarCompatibilityFingerprint, matchesSidebarCompatibility } from '../sidebar-compat.ts'
import type { AdapterOptions, TargetAdapterStatus } from './adapter-types.ts'
import { reportOnce } from './adapter-types.ts'
import { applyOwnedIcon, ownedIconMatches } from './owned-icon.ts'
import { createMismatchHold } from './mismatch-hold.ts'

function directSvg(element: Element): SVGElement | undefined {
  return Array.from(element.children).find(child => child.tagName.toLowerCase() === 'svg') as SVGElement | undefined
}

function iconAction(root: HTMLElement): HTMLElement | null {
  if (root instanceof HTMLButtonElement && directSvg(root)) return root
  const directButtons = Array.from(root.children).filter(child => child instanceof HTMLButtonElement) as HTMLButtonElement[]
  if (directButtons.length === 1 && directSvg(directButtons[0]!)) return directButtons[0]!
  return null
}

function accessibleName(root: HTMLElement): string {
  const action = iconAction(root) ?? root
  const value = action.getAttribute('aria-label') || action.getAttribute('title') || action.textContent || ''
  return value.trim().replace(/\s+/g, ' ')
}

export function matchSidebarRoots(
  targets: readonly DetectedTarget[],
  roots: readonly HTMLElement[],
): Map<DetectedTarget, HTMLElement> {
  if (roots.length === targets.length) {
    const exactOrderIsSafe = targets.every((target, index) => {
      return !hasSidebarCompatibilityFingerprint(target.id)
        || matchesSidebarCompatibility(target.id, roots[index]!, accessibleName(roots[index]!))
    })
    if (exactOrderIsSafe) return new Map(targets.map((target, index) => [target, roots[index]!]))
  }

  const matches = new Map<DetectedTarget, HTMLElement>()
  const claimed = new Set<HTMLElement>()
  for (const target of targets) {
    if (!hasSidebarCompatibilityFingerprint(target.id)) continue
    const candidates = roots.filter(root => !claimed.has(root)
      && matchesSidebarCompatibility(target.id, root, accessibleName(root)))
    if (candidates.length !== 1) continue
    matches.set(target, candidates[0]!)
    claimed.add(candidates[0]!)
  }
  return matches
}

export function mountSidebarAdapter(options: AdapterOptions): () => void {
  const slotSelector = '[data-slot="sidebar.footer.action"]'
  const disposers = new Map<HTMLElement, () => void>()
  const emit = reportOnce('sidebar.footer.action', options.onReport)
  let disposed = false
  let scheduled = false
  let observedSlot: HTMLElement | null = null

  const clearAll = (): void => {
    for (const dispose of disposers.values()) dispose()
    disposers.clear()
  }

  const hold = createMismatchHold(() => schedule())

  const sync = (): void => {
    scheduled = false
    if (disposed) return
    const targets = options.getTargets().filter(target => target.surface === 'sidebar.footer.action')
    const slot = document.querySelector<HTMLElement>(slotSelector)
    if (slot !== observedSlot) {
      slotObserver.disconnect()
      observedSlot = slot
      if (slot) {
        slotObserver.observe(slot, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['data-slot', 'data-cordis-panel', 'data-usage-stats', 'class', 'aria-label', 'title', 'data-dsh-icon-theme-managed'],
        })
      }
    }
    if (!slot) {
      if (hold.hold(disposers.size > 0)) return
      clearAll()
      emit({
        status: 'waiting',
        managed: 0,
        available: 0,
        total: targets.length,
        targets: Object.fromEntries(targets.map(target => [target.key, 'waiting'] as const)),
      })
      return
    }
    const roots = Array.from(slot.children) as HTMLElement[]
    const matches = matchSidebarRoots(targets, roots)
    if (matches.size === 0 && targets.length > 0 && hold.hold(disposers.size > 0)) return
    hold.reset()

    const desired = new Set<HTMLElement>()
    let managed = 0
    let available = 0
    const targetStatuses: Partial<Record<DetectedTarget['key'], TargetAdapterStatus>> = {}
    const labels: Partial<Record<DetectedTarget['key'], string>> = {}
    const targetResolutions: Partial<Record<DetectedTarget['key'], Resolution>> = {}
    for (const target of targets) {
      const root = matches.get(target)
      if (!root) {
        targetStatuses[target.key] = 'not-rendered'
        continue
      }
      const action = iconAction(root)
      if (!action) {
        targetStatuses[target.key] = 'non-icon'
        continue
      }
      available += 1
      targetStatuses[target.key] = 'changeable'
      const label = accessibleName(root)
      if (label && label.length <= 48) labels[target.key] = label
      const resolution = options.resolve(target, { hasOriginal: true, originalIsGeneric: false })
      targetResolutions[target.key] = resolution
      if (resolution.iconId === null) {
        disposers.get(action)?.()
        disposers.delete(action)
        continue
      }
      desired.add(action)
      managed += 1
      if (ownedIconMatches(action, target, resolution.iconId)) continue
      disposers.get(action)?.()
      disposers.set(action, applyOwnedIcon(action, target, resolution))
    }

    for (const [element, dispose] of disposers) {
      if (desired.has(element) && element.isConnected) continue
      dispose()
      disposers.delete(element)
    }
    const unmatched = targets.length - matches.size
    emit({
      status: matches.size > 0 || targets.length === 0 ? 'active' : 'unsupported',
      managed,
      available,
      total: targets.length,
      reason: unmatched > 0 ? `${unmatched} 个已登记贡献当前未渲染或无法安全对应` : undefined,
      targets: targetStatuses,
      labels,
      resolutions: targetResolutions,
    })
  }

  const schedule = (): void => {
    if (disposed || scheduled) return
    scheduled = true
    queueMicrotask(sync)
  }

  const slotObserver = new MutationObserver(schedule)
  const containsSlot = (node: Node): boolean => node instanceof Element
    && (node.matches(slotSelector) || node.querySelector(slotSelector) !== null)
  const bodyObserver = new MutationObserver(records => {
    const relevant = records.some(record => {
      if (record.type === 'attributes') {
        return record.target === observedSlot
          || (record.target instanceof Element && record.target.matches(slotSelector))
      }
      return Array.from(record.addedNodes).some(containsSlot)
        || Array.from(record.removedNodes).some(node => node === observedSlot
          || (node instanceof Element && observedSlot !== null && node.contains(observedSlot)))
    })
    if (relevant) schedule()
  })

  sync()
  bodyObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-slot'],
  })
  const unsubscribe = options.subscribe?.(schedule) ?? (() => {})
  return () => {
    disposed = true
    hold.dispose()
    bodyObserver.disconnect()
    slotObserver.disconnect()
    unsubscribe()
    clearAll()
  }
}
