import type { DetectedTarget, SlotEntryLike, Surface } from './types.ts'

function labelOf(value: unknown): string {
  try {
    if (typeof value === 'function') return String((value as () => unknown)() ?? '')
    return typeof value === 'string' ? value : ''
  } catch {
    return ''
  }
}

export function discover(entries: readonly SlotEntryLike[], surface: Surface): DetectedTarget[] {
  return entries.flatMap((entry, ledgerIndex): Array<DetectedTarget & { ledgerIndex: number }> => {
    const id = entry.options.id?.trim()
    if (!id) return []
    return [{
      surface,
      id,
      key: `${surface}:${id}`,
      order: entry.options.order ?? 0,
      label: labelOf(entry.options.label),
      ledgerIndex,
    }]
  }).sort((a, b) => a.order - b.order || a.ledgerIndex - b.ledgerIndex)
    .map(({ ledgerIndex: _ledgerIndex, ...target }) => target)
}

export const discoverSettings = (entries: readonly SlotEntryLike[]): DetectedTarget[] => discover(entries, 'settings.section')
export const discoverSidebar = (entries: readonly SlotEntryLike[]): DetectedTarget[] => discover(entries, 'sidebar.footer.action')
