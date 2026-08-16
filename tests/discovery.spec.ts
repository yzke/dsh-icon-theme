import { describe, expect, it } from 'vitest'
import { discoverSettings } from '../src/client/discovery.ts'

describe('discoverSettings', () => {
  it('uses stable ids, evaluates current labels, and sorts deterministically', () => {
    const entries = [
      { options: { id: 'market', order: 40, label: () => '插件市场' } },
      { options: { id: 'general', order: 0, label: '通用设置' } },
    ]
    expect(discoverSettings(entries)).toEqual([
      { surface: 'settings.section', id: 'general', key: 'settings.section:general', order: 0, label: '通用设置' },
      { surface: 'settings.section', id: 'market', key: 'settings.section:market', order: 40, label: '插件市场' },
    ])
  })

  it('drops entries without a stable id', () => {
    expect(discoverSettings([{ options: { label: 'unsafe' } }])).toEqual([])
  })

  it('preserves ledger order when contributions share the same order', () => {
    const result = discoverSettings([
      { options: { id: 'usage-stats' } },
      { options: { id: 'bookmarks' } },
    ])
    expect(result.map(target => target.id)).toEqual(['usage-stats', 'bookmarks'])
  })
})
