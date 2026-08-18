import Schema from '@deepseek-ai/schemastery'

export interface IconThemeConfig {
  overrides: Record<string, string>
  originalPolicy: 'prefer' | 'replace-generic'
}

export const DEFAULT_CONFIG: Readonly<IconThemeConfig> = Object.freeze({
  overrides: Object.freeze({}),
  originalPolicy: 'prefer',
})

export const Config = Schema.object({
  overrides: Schema.dict(Schema.string()).default({}),
  originalPolicy: Schema.union(['prefer', 'replace-generic']).default(DEFAULT_CONFIG.originalPolicy),
})

export function normalizeConfig(value: unknown): IconThemeConfig {
  return Config(value ?? {})
}
