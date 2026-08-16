import { describe, expect, it } from 'vitest'
import { normalizeSvg } from '../scripts/generate-icons.mjs'

describe('icon generator', () => {
  it('normalizes a 16px icon to currentColor', () => {
    expect(normalizeSvg('<svg width="16" height="16" viewBox="0 0 16 16"><path d="M0 0h1v1z"/></svg>', 'x'))
      .toBe('<svg fill="currentColor" viewBox="0 0 16 16"><path d="M0 0h1v1z"/></svg>')
  })

  it('preserves the trusted SVG namespace required by CSS mask images', () => {
    expect(normalizeSvg('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M0 0h1v1z"/></svg>', 'x'))
      .toContain('xmlns="http://www.w3.org/2000/svg"')
  })

  it('rejects remote or executable SVG content', () => {
    expect(() => normalizeSvg('<svg viewBox="0 0 16 16"><script/></svg>', 'x')).toThrow()
    expect(() => normalizeSvg('<svg viewBox="0 0 16 16"><image href="https://example.com/x"/></svg>', 'x')).toThrow()
  })
})
