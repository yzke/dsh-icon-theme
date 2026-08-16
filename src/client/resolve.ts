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
    return { iconId: manual, source: 'manual', reason: '用户手动选择' }
  }

  const plugin = CURATED_PLUGIN_ICONS[target.key]
  if (plugin && ICON_BY_ID.has(plugin)) {
    return { iconId: plugin, source: 'plugin', reason: '已审核的插件自带图标' }
  }

  if (config.originalPolicy === 'prefer' && evidence.hasOriginal && !evidence.originalIsGeneric) {
    return { iconId: null, source: 'original', reason: '保留插件或 DSH 的原生图标' }
  }

  const preset = EXACT_PRESETS[target.key]
  if (preset && ICON_BY_ID.has(preset)) {
    return { iconId: preset, source: 'preset', reason: '稳定 ID 预设' }
  }

  const inferred = inferIcon(target.id)
  if (inferred && ICON_BY_ID.has(inferred)) {
    return { iconId: inferred, source: 'inferred', reason: '由稳定 ID 的唯一语义推断' }
  }

  if (evidence.hasOriginal) {
    return {
      iconId: null,
      source: evidence.originalIsGeneric ? 'fallback' : 'original',
      reason: evidence.originalIsGeneric ? '没有可信匹配，保留宿主回退图标' : '保留现有图标',
    }
  }

  return { iconId: 'settings', source: 'fallback', reason: '目标没有原图标，使用安全回退' }
}
