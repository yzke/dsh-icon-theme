import { describe, expect, it } from 'vitest'
import { Config, DEFAULT_CONFIG } from '../src/config.ts'

describe('Config', () => {
  it('resolves safe defaults', () => {
    expect(Config({})).toEqual(DEFAULT_CONFIG)
  })

  it('rejects non-string override values', () => {
    expect(() => Config({ overrides: { market: 3 } })).toThrow()
  })
})
