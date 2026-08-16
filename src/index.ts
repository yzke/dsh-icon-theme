import type { Context } from '@deepseek-ai/cordis'
import { Config, normalizeConfig } from './config.ts'
import type { IconThemeConfig } from './config.ts'
import { installSettingsApi } from './settings-api.ts'

export { Config, DEFAULT_CONFIG, normalizeConfig } from './config.ts'
export type { IconThemeConfig } from './config.ts'

export const name = 'dsh-icon-theme'
export const inject = ['webServer']

/** Register the durable user layer and fixed-namespace browser seam. */
export function apply(ctx: Context, config?: IconThemeConfig): void {
  installSettingsApi(ctx as Parameters<typeof installSettingsApi>[0], config)
}
