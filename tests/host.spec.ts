import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config.ts'
import { apply, inject, name } from '../src/index.ts'

describe('host settings owner', () => {
  it('registers the schema-backed namespace with the composition config as base', () => {
    const calls: unknown[][] = []
    let route: unknown
    const settings = {
      register: (...args: unknown[]) => { calls.push(args); return {} },
    }
    const ctx = {
      webServer: {
        register: (value: unknown) => { route = value; return () => {} },
      },
      inject: (_deps: string[], callback: (scope: unknown) => void) => callback({
        settings,
        effect: (effect: () => unknown) => effect(),
      }),
    }
    apply(ctx as never, { ...DEFAULT_CONFIG, overrides: { 'settings.section:market': 'apps' } })
    expect(name).toBe('dsh-icon-theme')
    expect(inject).toEqual(['webServer'])
    expect(calls).toHaveLength(1)
    expect(calls[0]?.[0]).toBe('dsh-icon-theme')
    expect(calls[0]?.[2]).toEqual({
      base: { ...DEFAULT_CONFIG, overrides: { 'settings.section:market': 'apps' } },
      applies: 'live',
    })
    expect(route).toMatchObject({ kind: 'exact', path: '/_dsh/icon-theme/settings' })
  })
})
