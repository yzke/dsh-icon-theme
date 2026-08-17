export type IconCategory =
  | 'core'
  | 'content'
  | 'intelligence'
  | 'operations'
  | 'layout'
  | 'plugin'

export interface IconDef {
  id: string
  /** Chinese display label. */
  label: string
  /** English display label. */
  labelEn: string
  category: IconCategory
  aliases: readonly string[]
  svg: string
  source: string
  license: string
}

export function iconMaskUrl(icon: Pick<IconDef, 'svg'>): string {
  return `url("data:image/svg+xml,${encodeURIComponent(icon.svg)}")`
}
