import type { DetectedTarget, IconEvidence, Resolution, Surface, TargetKey } from '../types.ts'

export type TargetAdapterStatus = 'changeable' | 'non-icon' | 'not-rendered' | 'waiting'

export interface AdapterReport {
  status: 'active' | 'waiting' | 'unsupported'
  managed: number
  available?: number
  total: number
  reason?: string
  targets?: Partial<Record<TargetKey, TargetAdapterStatus>>
  labels?: Partial<Record<TargetKey, string>>
}

export interface AdapterOptions {
  getTargets: () => readonly DetectedTarget[]
  resolve: (target: DetectedTarget, evidence: IconEvidence) => Resolution
  subscribe?: (listener: () => void) => () => void
  onReport?: (surface: Surface, report: AdapterReport) => void
}

export function reportOnce(
  surface: Surface,
  emit: AdapterOptions['onReport'],
): (report: AdapterReport) => void {
  let signature = ''
  return report => {
    const next = JSON.stringify(report)
    if (next === signature) return
    signature = next
    emit?.(surface, report)
  }
}
