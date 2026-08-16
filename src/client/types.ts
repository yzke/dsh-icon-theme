import type { IconThemeConfig } from '../config.ts'

export type Surface = 'settings.section' | 'sidebar.footer.action'
export type TargetKey = `${Surface}:${string}`

export interface DetectedTarget {
  surface: Surface
  id: string
  key: TargetKey
  order: number
  label: string
}

export type ResolutionSource = 'manual' | 'plugin' | 'preset' | 'inferred' | 'original' | 'fallback'

export interface Resolution {
  iconId: string | null
  source: ResolutionSource
  reason: string
}

export interface IconEvidence {
  hasOriginal: boolean
  originalIsGeneric: boolean
}

export interface SlotEntryLike {
  options: {
    id?: string
    order?: number
    label?: unknown
  }
}

export type ResolvedConfig = IconThemeConfig
