import { ICON_BY_ID } from './catalog.ts'
import { CURATED_PLUGIN_ICONS, EXACT_PRESETS, inferIcon } from './presets.ts'
import type { DetectedTarget, IconEvidence, Resolution, ResolvedConfig } from './types.ts'

export function resolveIcon(
  target: DetectedTarget,
  config: ResolvedConfig,
  evidence: IconEvidence,
): Resolution {
  const manual = config.overrides[target.key]
  if (manual && ICON_BY_ID.has(manual)) {
    return { iconId: manual, source: 'manual', reason: 'reasonManual' }
  }

  const plugin = CURATED_PLUGIN_ICONS[target.key]
  if (plugin && ICON_BY_ID.has(plugin)) {
    return { iconId: plugin, source: 'plugin', reason: 'reasonPlugin' }
  }

  if (evidence.hasOriginal && (config.originalPolicy === 'prefer' || !evidence.originalIsGeneric)) {
    return { iconId: null, source: 'original', reason: 'reasonOriginal' }
  }

  const preset = EXACT_PRESETS[target.key]
  if (preset && ICON_BY_ID.has(preset)) {
    return { iconId: preset, source: 'preset', reason: 'reasonPreset' }
  }

  const inferred = inferIcon(target.id)
  if (inferred && ICON_BY_ID.has(inferred)) {
    return { iconId: inferred, source: 'inferred', reason: 'reasonInferred' }
  }

  if (evidence.hasOriginal) {
    return {
      iconId: null,
      source: evidence.originalIsGeneric ? 'fallback' : 'original',
      reason: evidence.originalIsGeneric ? 'reasonHostFallback' : 'reasonExisting',
    }
  }

  return { iconId: 'settings', source: 'fallback', reason: 'reasonSafeFallback' }
}
