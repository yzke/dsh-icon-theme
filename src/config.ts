import Schema from '@deepseek-ai/schemastery'

export interface IconThemeConfig {
  pack: string
  overrides: Record<string, string>
  originalPolicy: 'prefer' | 'replace-generic'
}

export const DEFAULT_CONFIG: Readonly<IconThemeConfig> = Object.freeze({
  pack: 'dsh-fluent',
  overrides: Object.freeze({}),
  originalPolicy: 'prefer',
})

export const Config = Schema.object({
  pack: Schema.string().default(DEFAULT_CONFIG.pack),
  overrides: Schema.dict(Schema.string()).default({}),
  originalPolicy: Schema.union(['prefer', 'replace-generic']).default(DEFAULT_CONFIG.originalPolicy),
})

export function normalizeConfig(value: unknown): IconThemeConfig {
  return Config(value ?? {})
}
