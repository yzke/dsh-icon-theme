import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config.ts'
import { resolveIcon } from '../src/client/resolve.ts'
import type { DetectedTarget, TargetKey } from '../src/client/types.ts'

function target(key: TargetKey): DetectedTarget {
  const split = key.lastIndexOf(':')
  const surface = key.slice(0, split) as DetectedTarget['surface']
  const id = key.slice(split + 1)
  return { surface, id, key, order: 0, label: id }
}

describe('resolveIcon', () => {
  it.each([
    ['settings.section:market', 'plugin.market', 'plugin'],
    ['settings.section:notification', 'alert', 'preset'],
    ['settings.section:unfamiliar-folder-tool', 'folder', 'inferred'],
  ] as const)('%s resolves to %s', (key, iconId, source) => {
    expect(resolveIcon(target(key), { ...DEFAULT_CONFIG, overrides: {} }, { hasOriginal: false, originalIsGeneric: true }))
      .toMatchObject({ iconId, source })
  })

  it('manual overrides win over curated plugin icons', () => {
    const key = 'settings.section:market' as const
    expect(resolveIcon(target(key), { ...DEFAULT_CONFIG, overrides: { [key]: 'apps' } }, { hasOriginal: true, originalIsGeneric: true }))
      .toMatchObject({ iconId: 'apps', source: 'manual' })
  })

  it('preserves a non-generic original before semantic presets', () => {
    const key = 'sidebar.footer.action:usage-stats' as const
    expect(resolveIcon(target(key), { ...DEFAULT_CONFIG, overrides: {} }, { hasOriginal: true, originalIsGeneric: false }))
      .toMatchObject({ iconId: null, source: 'original' })
  })

  it('does not infer from localized labels', () => {
    const unknown = { ...target('settings.section:unknown'), label: '通知' }
    expect(resolveIcon(unknown, { ...DEFAULT_CONFIG, overrides: {} }, { hasOriginal: true, originalIsGeneric: true }))
      .toMatchObject({ iconId: null, source: 'fallback' })
  })

  it('uses the settings gear when an icon target has no original or trusted match', () => {
    expect(resolveIcon(target('settings.section:unknown'), { ...DEFAULT_CONFIG, overrides: {} }, { hasOriginal: false, originalIsGeneric: true }))
      .toMatchObject({ iconId: 'settings', source: 'fallback' })
  })
})
