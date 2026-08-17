export type SidebarLabelKey =
  | 'sidebarChatImport'
  | 'sidebarCordisPanel'
  | 'sidebarCostMeter'
  | 'sidebarBookmarks'
  | 'sidebarUsageStats'

export interface SidebarCompatibilityRecord {
  labelKey: SidebarLabelKey
  selectors: readonly string[]
  namePattern?: RegExp
  buttonOnly?: boolean
  /** Immutable upstream evidence for a rendered semantic fingerprint. */
  audit?: {
    repository: string
    revision: string
    paths: readonly string[]
    license: string
  }
}

/**
 * Generic equal-count correlation needs no plugin adapter. These records are
 * only the audited fallback for a partially rendered footer.
 */
export const SIDEBAR_COMPATIBILITY: Readonly<Record<string, SidebarCompatibilityRecord>> = Object.freeze({
  'chat-import': {
    labelKey: 'sidebarChatImport',
    selectors: [],
    namePattern: /(?:导入会话|import(?:\s+|.*)(?:chat|conversation))/i,
    buttonOnly: true,
    audit: {
      repository: 'https://github.com/Nwflower/dsh-chat-import',
      revision: 'db251caf9d78203ed82ebf8f5ae491a6fa0ce340',
      paths: ['lib/client.js'],
      license: 'MIT',
    },
  },
  'cordis-panel': {
    labelKey: 'sidebarCordisPanel',
    // Label only: no audited partial-DOM fingerprint is currently available.
    selectors: [],
  },
  'cost-meter': {
    labelKey: 'sidebarCostMeter',
    selectors: ['.cm-footer-stack'],
    namePattern: /(?:余额.*预算|balance.*budget)/i,
    audit: {
      repository: 'https://github.com/Han-1413141/dsh-cost-meter',
      revision: 'e585aa9700fc9bf96bdcacce1228e650c111fd98',
      paths: ['lib/client.js'],
      license: 'MIT',
    },
  },
  bookmarks: {
    labelKey: 'sidebarBookmarks',
    selectors: ['.dshbm_footerAction'],
    namePattern: /(?:收藏中心|归档|bookmark|favorite|archive)/i,
    audit: {
      repository: 'https://github.com/penguin-oo/dsh-bookmarks',
      revision: 'ebc716372d70f3e0cd73814632a5eb7e678f5f3b',
      paths: ['lib/client.js'],
      license: 'MIT',
    },
  },
  'usage-stats': {
    labelKey: 'sidebarUsageStats',
    selectors: ['[data-usage-stats]', '.us-nav'],
    namePattern: /(?:使用统计|usage\s+stat)/i,
    audit: {
      repository: 'https://github.com/lanlandeli/dsh-usage-stats',
      revision: '40e3216263d53f8b6ea125cf0d0b17c3086f76c4',
      paths: ['src/client/index.tsx', 'src/client/styles.ts'],
      license: 'MIT',
    },
  },
})

export function hasSidebarCompatibilityFingerprint(id: string): boolean {
  const record = SIDEBAR_COMPATIBILITY[id]
  return record !== undefined && (record.selectors.length > 0 || record.namePattern !== undefined)
}

export function matchesSidebarCompatibility(id: string, root: HTMLElement, accessibleName: string): boolean {
  const record = SIDEBAR_COMPATIBILITY[id]
  if (!record || !hasSidebarCompatibilityFingerprint(id)
    || (record.buttonOnly && !(root instanceof HTMLButtonElement))) return false
  return record.selectors.some(selector => root.matches(selector))
    || record.namePattern?.test(accessibleName) === true
}
