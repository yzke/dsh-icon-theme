import { GENERATED_FLUENT_ICONS, type FluentIconName } from './generated/fluent-icons.ts'
import type { IconCategory, IconDef } from './icon-spec.ts'

const labels: Partial<Record<FluentIconName, string>> = {
  settings: '设置', brain: '记忆', database: '数据', apps: '插件', store_microsoft: '市场',
  alert: '通知', wallet: '钱包', money: '费用', receipt_money: '账单', document_pdf: 'PDF',
  document_text: '文档', document_mention: '文件提及', folder: '文件夹', folder_open: '打开文件夹',
  archive: '归档', bookmark: '收藏', arrow_import: '导入', arrow_export: '导出',
  arrow_download: '下载', arrow_upload: '上传', shield: '安全', shield_lock: '安全锁',
  key: '密钥', lock_closed: '锁定', eye: '视觉', image: '图像', search: '搜索',
  globe: '网络', code: '代码', plug_connected: '连接器', toolbox: '工具箱', wrench: '工具',
  sparkle: '增强', paint_brush: '外观', color: '颜色', grid: '网格', panel_left: '左侧栏',
  panel_right: '右侧栏', panel_right_gallery: '侧边卡片', chart_multiple: '统计',
  history: '历史', calendar: '日程', chat: '会话', people: '团队', person: '用户',
  home: '主页', info: '信息', warning: '警告', cloud: '云端', window_apps: '应用窗口',
}

const labelsEn: Partial<Record<FluentIconName, string>> = {
  settings: 'Settings', brain: 'Memory', database: 'Data', apps: 'Apps', store_microsoft: 'Marketplace',
  alert: 'Notifications', wallet: 'Wallet', money: 'Costs', receipt_money: 'Bill', document_pdf: 'PDF',
  document_text: 'Document', document_mention: 'File mention', folder: 'Folder', folder_open: 'Open folder',
  archive: 'Archive', bookmark: 'Bookmark', arrow_import: 'Import', arrow_export: 'Export',
  arrow_download: 'Download', arrow_upload: 'Upload', shield: 'Security', shield_lock: 'Security lock',
  key: 'Key', lock_closed: 'Locked', eye: 'Vision', image: 'Image', search: 'Search',
  globe: 'Network', code: 'Code', plug_connected: 'Connector', toolbox: 'Toolbox', wrench: 'Tools',
  sparkle: 'Enhance', paint_brush: 'Appearance', color: 'Color', grid: 'Grid', panel_left: 'Left sidebar',
  panel_right: 'Right sidebar', panel_right_gallery: 'Sidebar card', chart_multiple: 'Statistics',
  history: 'History', calendar: 'Calendar', chat: 'Conversation', people: 'Team', person: 'User',
  home: 'Home', info: 'Information', warning: 'Warning', cloud: 'Cloud', window_apps: 'App window',
}

function englishFallback(id: string): string {
  const value = id.replaceAll('_', ' ')
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const categories: Partial<Record<FluentIconName, IconCategory>> = {
  settings: 'core', apps: 'core', store_microsoft: 'core', person: 'core', people: 'core', home: 'core',
  document_pdf: 'content', document_text: 'content', document_mention: 'content', folder: 'content',
  folder_open: 'content', archive: 'content', bookmark: 'content', arrow_import: 'content',
  arrow_export: 'content', arrow_download: 'content', arrow_upload: 'content', image: 'content',
  brain: 'intelligence', database: 'intelligence', eye: 'intelligence', code: 'intelligence',
  plug_connected: 'intelligence', toolbox: 'intelligence', wrench: 'intelligence', sparkle: 'intelligence',
  alert: 'operations', wallet: 'operations', money: 'operations', receipt_money: 'operations',
  shield: 'operations', shield_lock: 'operations', key: 'operations', lock_closed: 'operations',
  search: 'operations', globe: 'operations', chart_multiple: 'operations', history: 'operations',
  calendar: 'operations', info: 'operations', warning: 'operations', cloud: 'operations',
  paint_brush: 'layout', color: 'layout', grid: 'layout', panel_left: 'layout', panel_right: 'layout',
  panel_right_gallery: 'layout', chat: 'layout', window_apps: 'layout',
}

const aliases: Partial<Record<FluentIconName, readonly string[]>> = {
  store_microsoft: ['market', 'store', 'marketplace', '市场', '商店'],
  alert: ['notification', 'bell', 'notify', '通知', '提醒'],
  brain: ['memory', 'mneme', 'remember', '记忆', '脑'],
  document_mention: ['at-file', 'mention', 'attachment', '文件提及'],
  chart_multiple: ['usage', 'stats', 'analytics', '统计', '用量'],
  panel_right_gallery: ['sidebar', 'side-card', 'better-sidebar', '侧边栏', '侧边卡片'],
  wallet: ['cost', 'billing', 'budget', '费用', '余额'],
  document_pdf: ['mineru', 'pdf', 'ocr', '解析'],
  apps: ['plugin', 'extension', '插件'],
  shield_lock: ['security', 'aegis', 'guard', '安全'],
  eye: ['vision', 'image', '视觉'],
  bookmark: ['bookmark', 'favorite', '收藏'],
  arrow_import: ['import', '导入'],
}

const fluentCatalog: IconDef[] = Object.entries(GENERATED_FLUENT_ICONS).map(([id, svg]) => {
  const name = id as FluentIconName
  return {
    id,
    label: labels[name] ?? id.replaceAll('_', ' '),
    labelEn: labelsEn[name] ?? englishFallback(id),
    category: categories[name] ?? 'core',
    aliases: aliases[name] ?? [],
    svg,
    source: '@fluentui/svg-icons 16 Regular',
    license: 'MIT',
  }
})

const marketSvg = '<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M2.35 1.75h2.6a.6.6 0 0 1 .6.6v2.6a.6.6 0 0 1-.6.6h-2.6a.6.6 0 0 1-.6-.6v-2.6a.6.6 0 0 1 .6-.6Zm4.35 0h2.6a.6.6 0 0 1 .6.6v2.6a.6.6 0 0 1-.6.6H6.7a.6.6 0 0 1-.6-.6v-2.6a.6.6 0 0 1 .6-.6Zm-4.35 4.35h2.6a.6.6 0 0 1 .6.6v2.6a.6.6 0 0 1-.6.6h-2.6a.6.6 0 0 1-.6-.6V6.7a.6.6 0 0 1 .6-.6Zm4.35 0h2.6a.6.6 0 0 1 .6.6v2.6a.6.6 0 0 1-.6.6H6.7a.6.6 0 0 1-.6-.6V6.7a.6.6 0 0 1 .6-.6Zm4.35 0h2.6a.6.6 0 0 1 .6.6v2.6a.6.6 0 0 1-.6.6h-2.6a.6.6 0 0 1-.6-.6V6.7a.6.6 0 0 1 .6-.6Zm-8.7 4.35h2.6a.6.6 0 0 1 .6.6v2.6a.6.6 0 0 1-.6.6h-2.6a.6.6 0 0 1-.6-.6v-2.6a.6.6 0 0 1 .6-.6Zm4.35 0h2.6a.6.6 0 0 1 .6.6v2.6a.6.6 0 0 1-.6.6H6.7a.6.6 0 0 1-.6-.6v-2.6a.6.6 0 0 1 .6-.6Zm4.35 0h2.6a.6.6 0 0 1 .6.6v2.6a.6.6 0 0 1-.6.6h-2.6a.6.6 0 0 1-.6-.6v-2.6a.6.6 0 0 1 .6-.6Z"/><path d="M11.05 1.75h2.6a.6.6 0 0 1 .6.6v2.6a.6.6 0 0 1-.6.6h-2.6a.6.6 0 0 1-.6-.6v-2.6a.6.6 0 0 1 .6-.6Z" transform="rotate(9 12.35 3.65)"/></svg>'

export const ICON_CATALOG: readonly IconDef[] = Object.freeze([
  {
    id: 'plugin.market',
    label: 'dsh-market',
    labelEn: 'dsh-market',
    category: 'plugin',
    aliases: ['market', 'marketplace', 'dshmarket', '插件市场'],
    svg: marketSvg,
    source: 'dsh-market/dsh-market assets/logo-mono.svg',
    license: 'MIT',
  },
  ...fluentCatalog,
])

export const ICON_BY_ID: ReadonlyMap<string, IconDef> = new Map(ICON_CATALOG.map(icon => [icon.id, icon]))
