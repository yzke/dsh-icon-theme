import type { CSSProperties } from 'react'
import { ICON_BY_ID } from './catalog.ts'
import { iconMaskUrl } from './icon-spec.ts'

export function IconGlyph({ iconId, size = 16 }: { iconId: string; size?: number }) {
  const icon = ICON_BY_ID.get(iconId)
  if (!icon) return <span aria-hidden style={{ width: size, height: size }} />
  const style = {
    width: size,
    height: size,
    display: 'inline-block',
    flex: `0 0 ${size}px`,
    background: 'currentColor',
    WebkitMask: `${iconMaskUrl(icon)} center / contain no-repeat`,
    mask: `${iconMaskUrl(icon)} center / contain no-repeat`,
  } satisfies CSSProperties
  return <span aria-hidden data-icon-id={iconId} style={style} />
}
