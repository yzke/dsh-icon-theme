import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config.ts'
import { discoverSettings, discoverSidebar } from '../src/client/discovery.ts'
import { resolveIcon } from '../src/client/resolve.ts'

const PINNED_CONTRIBUTIONS = [
  { project: 'JUANWANG-BUAA/dsh-full-remote@88a34f7', surface: 'settings.section', id: 'reverse-proxy', order: 30, label: 'Reverse Proxy' },
  { project: 'bowenliang123/dsh-context@a4deb93', surface: 'conversation.view', id: 'context', order: 0, label: 'Context' },
  { project: 'ZSeven-W/dsh-openpencil@5cfadc5', surface: 'conversation.input.dock', id: 'openpencil-selection', order: 0, label: 'OpenPencil' },
  { project: 'timeance/dsh-approve-for-me@b22695d', surface: 'settings.plugin.item', id: 'approve-for-me', order: 0, label: 'Approve for me' },
  { project: 'tianji-qingtian/dsh-composer-polish@ce4daad', surface: 'conversation.input.right', id: 'composer-polish', order: 0, label: 'Polish' },
] as const

describe('pinned external plugin registrations', () => {
  it('discovers an unknown Settings section without adapting to the installed profile', () => {
    const entries = PINNED_CONTRIBUTIONS
      .filter(item => item.surface === 'settings.section')
      .map(item => ({ options: { id: item.id, order: item.order, label: item.label } }))
    expect(discoverSettings(entries)).toEqual([{
      surface: 'settings.section',
      id: 'reverse-proxy',
      key: 'settings.section:reverse-proxy',
      order: 30,
      label: 'Reverse Proxy',
    }])
  })

  it('does not misidentify contributions from unrelated slot surfaces', () => {
    const sidebarEntries = PINNED_CONTRIBUTIONS
      .filter(item => item.surface === 'sidebar.footer.action')
      .map(item => ({ options: { id: item.id, order: item.order, label: item.label } }))
    expect(discoverSidebar(sidebarEntries)).toEqual([])
  })

  it('uses the Settings gear for a newly discovered target with no original icon', () => {
    const target = discoverSettings([{ options: { id: 'reverse-proxy', order: 30, label: 'Reverse Proxy' } }])[0]!
    expect(resolveIcon(target, { ...DEFAULT_CONFIG, overrides: {} }, { hasOriginal: false, originalIsGeneric: false })).toMatchObject({
      iconId: 'settings',
      source: 'fallback',
    })
  })

  it('still accepts a stable-key manual override for that unknown plugin', () => {
    const target = discoverSettings([{ options: { id: 'reverse-proxy', order: 30, label: 'Reverse Proxy' } }])[0]!
    expect(resolveIcon(target, {
      ...DEFAULT_CONFIG,
      overrides: { 'settings.section:reverse-proxy': 'globe' },
    }, { hasOriginal: false, originalIsGeneric: false })).toMatchObject({ iconId: 'globe', source: 'manual' })
  })
})
