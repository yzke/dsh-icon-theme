import { ICON_BY_ID } from '../catalog.ts'
import { iconMaskUrl } from '../icon-spec.ts'
import type { DetectedTarget, Resolution } from '../types.ts'

let nextToken = 1

export const MANAGED_ATTR = 'data-dsh-icon-theme-managed'
export const GLYPH_ATTR = 'data-dsh-icon-theme-glyph'

export function ownedIconMatches(element: HTMLElement, target: DetectedTarget, iconId: string): boolean {
  const icon = ICON_BY_ID.get(iconId)
  if (!icon
    || !element.hasAttribute(MANAGED_ATTR)
    || element.dataset.dshIconThemeSurface !== target.surface
    || element.dataset.dshIconThemeId !== target.id
    || element.dataset.dshIconThemeIcon !== iconId) return false
  const glyphs = Array.from(element.children)
    .filter(child => child instanceof HTMLElement && child.hasAttribute(GLYPH_ATTR)) as HTMLElement[]
  return glyphs.length === 1
    && glyphs[0]!.style.getPropertyValue('--dsh-icon-theme-mask') === iconMaskUrl(icon)
}

export function clearOwnedIcon(element: HTMLElement): void {
  element.querySelectorAll<HTMLElement>(`:scope > [${GLYPH_ATTR}]`).forEach(node => node.remove())
  element.removeAttribute(MANAGED_ATTR)
  element.removeAttribute('data-dsh-icon-theme-surface')
  element.removeAttribute('data-dsh-icon-theme-id')
  element.removeAttribute('data-dsh-icon-theme-icon')
  element.removeAttribute('data-dsh-icon-theme-token')
}

export function applyOwnedIcon(
  element: HTMLElement,
  target: DetectedTarget,
  resolution: Resolution,
): () => void {
  clearOwnedIcon(element)
  if (resolution.iconId === null) return () => {}
  const icon = ICON_BY_ID.get(resolution.iconId)
  if (!icon) return () => {}

  const token = String(nextToken++)
  const glyph = document.createElement('span')
  glyph.setAttribute(GLYPH_ATTR, '')
  glyph.setAttribute('aria-hidden', 'true')
  glyph.style.setProperty('--dsh-icon-theme-mask', iconMaskUrl(icon))

  const original = Array.from(element.children).find(child => child.tagName.toLowerCase() === 'svg')
  if (original) element.insertBefore(glyph, original)
  else element.prepend(glyph)

  element.setAttribute(MANAGED_ATTR, '')
  element.dataset.dshIconThemeSurface = target.surface
  element.dataset.dshIconThemeId = target.id
  element.dataset.dshIconThemeIcon = resolution.iconId
  element.dataset.dshIconThemeToken = token

  return () => {
    if (element.dataset.dshIconThemeToken === token) clearOwnedIcon(element)
  }
}
