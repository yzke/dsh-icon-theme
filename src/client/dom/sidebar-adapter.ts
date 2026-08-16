import type { DetectedTarget } from '../types.ts'
import type { AdapterOptions, TargetAdapterStatus } from './adapter-types.ts'
import { reportOnce } from './adapter-types.ts'
import { applyOwnedIcon } from './owned-icon.ts'

function directSvg(element: Element): SVGElement | undefined {
  return Array.from(element.children).find(child => child.tagName.toLowerCase() === 'svg') as SVGElement | undefined
}

function iconAction(root: HTMLElement): HTMLElement | null {
  if (root instanceof HTMLButtonElement && directSvg(root)) return root
  const directButtons = Array.from(root.children).filter(child => child instanceof HTMLButtonElement) as HTMLButtonElement[]
  if (directButtons.length === 1 && directSvg(directButtons[0]!)) return directButtons[0]!
  return null
}

type SidebarFingerprint = (root: HTMLElement) => boolean

function accessibleName(root: HTMLElement): string {
  const action = iconAction(root) ?? root
  const value = action.getAttribute('aria-label') || action.getAttribute('title') || action.textContent || ''
  return value.trim().replace(/\s+/g, ' ')
}

const SIDEBAR_FINGERPRINTS: Readonly<Record<string, SidebarFingerprint>> = Object.freeze({
  'chat-import': root => root instanceof HTMLButtonElement
    && /(?:导入会话|import(?:\s+|.*)(?:chat|conversation))/i.test(accessibleName(root)),
  'cordis-panel': root => root.matches('[data-cordis-panel], .cordis-panel')
    || /cordis/i.test(`${root.className} ${accessibleName(root)}`),
  'cost-meter': root => root.matches('.cm-footer-stack')
    || /(?:余额.*预算|balance.*budget)/i.test(accessibleName(root)),
  bookmarks: root => root.matches('.dshbm_footerAction')
    || /(?:收藏中心|归档|bookmark|favorite|archive)/i.test(accessibleName(root)),
  'usage-stats': root => root.matches('[data-usage-stats], .us-nav')
    || /(?:使用统计|usage\s+stat)/i.test(accessibleName(root)),
})

export function matchSidebarRoots(
  targets: readonly DetectedTarget[],
  roots: readonly HTMLElement[],
): Map<DetectedTarget, HTMLElement> {
  if (roots.length === targets.length) {
    const exactOrderIsSafe = targets.every((target, index) => {
      const fingerprint = SIDEBAR_FINGERPRINTS[target.id]
      return !fingerprint || fingerprint(roots[index]!)
    })
    if (exactOrderIsSafe) return new Map(targets.map((target, index) => [target, roots[index]!]))
  }

  const matches = new Map<DetectedTarget, HTMLElement>()
  const claimed = new Set<HTMLElement>()
  for (const target of targets) {
    const fingerprint = SIDEBAR_FINGERPRINTS[target.id]
    if (!fingerprint) continue
    const candidates = roots.filter(root => !claimed.has(root) && fingerprint(root))
    if (candidates.length !== 1) continue
    matches.set(target, candidates[0]!)
    claimed.add(candidates[0]!)
  }
  return matches
}

export function mountSidebarAdapter(options: AdapterOptions): () => void {
  const disposers = new Map<HTMLElement, () => void>()
  const emit = reportOnce('sidebar.footer.action', options.onReport)
  let disposed = false
  let scheduled = false

  const clearAll = (): void => {
    for (const dispose of disposers.values()) dispose()
    disposers.clear()
  }

  const sync = (): void => {
    scheduled = false
    if (disposed) return
    const targets = options.getTargets().filter(target => target.surface === 'sidebar.footer.action')
    const slot = document.querySelector<HTMLElement>('[data-slot="sidebar.footer.action"]')
    if (!slot) {
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

    const desired = new Set<HTMLElement>()
    let managed = 0
    let available = 0
    const targetStatuses: Partial<Record<DetectedTarget['key'], TargetAdapterStatus>> = {}
    const labels: Partial<Record<DetectedTarget['key'], string>> = {}
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
      if (resolution.iconId === null) {
        disposers.get(action)?.()
        disposers.delete(action)
        continue
      }
      desired.add(action)
      managed += 1
      if (action.dataset.dshIconThemeIcon === resolution.iconId && action.dataset.dshIconThemeId === target.id) continue
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
