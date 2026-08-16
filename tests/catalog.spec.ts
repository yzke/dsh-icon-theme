import { describe, expect, it } from 'vitest'
import { ICON_CATALOG } from '../src/client/catalog.ts'

describe('icon catalog', () => {
  it('ships unique, local, monochrome 16px icons', () => {
    expect(ICON_CATALOG.length).toBeGreaterThanOrEqual(50)
    expect(new Set(ICON_CATALOG.map(icon => icon.id)).size).toBe(ICON_CATALOG.length)
    for (const icon of ICON_CATALOG) {
      expect(icon.svg).toContain('viewBox="0 0 16 16"')
      const withoutNamespace = icon.svg.replace(' xmlns="http://www.w3.org/2000/svg"', '')
      expect(withoutNamespace).not.toMatch(/<script|<image|<style|\son\w+\s*=|https?:|#[0-9a-f]{3,8}/i)
      expect(icon.source).not.toBe('')
      expect(icon.license).not.toBe('')
    }
  })
})
