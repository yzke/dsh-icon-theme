#!/usr/bin/env node
/**
 * Generate src/client/generated/official-dsh-icons.ts from a local copy of
 * @deepseek-ai/dsh-client-ui-primitives (MIT, (c) 2026 DeepSeek).
 *
 * Usage: node scripts/generate-official-icons.mjs [path-to-primitives-lib-index.js]
 *
 * The emitted catalog is embedded into the client bundle so the published
 * package has zero runtime dependency on the primitives package.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const defaultPrimitives = join(root, '..', 'node_modules', '@deepseek-ai', 'dsh-client-ui-primitives', 'lib', 'index.js')
const primitivesPath = process.argv[2] ?? defaultPrimitives

const ICON_EXPORTS = [
  "IconAgentPresetOutline16","IconApiOutline14","IconArchiveOutline20","IconBranchOutline16","IconBrowseOutline16","IconCheckOutline14","IconCheckOutline16","IconChecklistOutline14","IconChevronDownOutline14","IconChevronLeftOutline14","IconChevronRightOutline14","IconChevronUpOutline14","IconCloseFill14","IconCloseOutline16","IconCodeOutline16","IconCopyOutline16","IconCordisPluginOutline14","IconDarkOutline16","IconDataOutline16","IconDislikeFill16","IconDislikeOutline16","IconDownloadOutline16","IconEditOutline16","IconEllipsisOutline16","IconEnhanceOutline16","IconFolderClose16","IconFolderOpen16","IconFolderOpenOutline16","IconFollowsystemOutline16","IconFullscreenOutline16","IconGlobeOutline14","IconGoalOutline16","IconInspectOutline12","IconLightOutline16","IconLikeFill16","IconLikeOutline16","IconLinkOutline14","IconLinkOutline16","IconListPenOutline16","IconLoadingOutline16","IconNewChatOutline16","IconPanelLeftOutline16","IconPaperclipOutline16","IconPauseOutline16","IconPersonalizationOutline16","IconPlayOutline16","IconPlusOutline16","IconProjectAddOutline16","IconQuestionOutline14","IconQueueOutline14","IconRefreshOutline14","IconRefreshOutline16","IconRightUpOutline14","IconRightUpOutline16","IconSearchOutline16","IconSendOutline14","IconSendOutline16","IconSettingsOutline14","IconSettingsOutline16","IconShareOutline16","IconSkillOutline16","IconSparkle16","IconStopFill16","IconThinkOutline14","IconThinkOutline16","IconTrashOutline16","IconTreeCorner8x10","IconTriangleRightFill14","IconUserOutline16","IconWarningOutline16",
]

const ZH_LABELS = {
  IconAgentPresetOutline16: '智能体预设',
  IconApiOutline14: 'API',
  IconArchiveOutline20: '归档',
  IconBranchOutline16: '分支',
  IconBrowseOutline16: '浏览',
  IconCheckOutline14: '对勾',
  IconCheckOutline16: '对勾',
  IconChecklistOutline14: '清单',
  IconChevronDownOutline14: '向下',
  IconChevronLeftOutline14: '向左',
  IconChevronRightOutline14: '向右',
  IconChevronUpOutline14: '向上',
  IconCloseFill14: '关闭',
  IconCloseOutline16: '关闭',
  IconCodeOutline16: '代码',
  IconCopyOutline16: '复制',
  IconCordisPluginOutline14: '插件',
  IconDarkOutline16: '月亮',
  IconDataOutline16: '数据',
  IconDislikeFill16: '不喜欢',
  IconDislikeOutline16: '不喜欢',
  IconDownloadOutline16: '下载',
  IconEditOutline16: '编辑',
  IconEllipsisOutline16: '更多',
  IconEnhanceOutline16: '增强',
  IconFolderClose16: '文件夹（关闭）',
  IconFolderOpen16: '文件夹（打开）',
  IconFolderOpenOutline16: '文件夹（打开·描线）',
  IconFollowsystemOutline16: '跟随系统',
  IconFullscreenOutline16: '全屏',
  IconGlobeOutline14: '地球',
  IconGoalOutline16: '目标',
  IconInspectOutline12: '检查',
  IconLightOutline16: '太阳',
  IconLikeFill16: '喜欢',
  IconLikeOutline16: '喜欢',
  IconLinkOutline14: '链接',
  IconLinkOutline16: '链接',
  IconListPenOutline16: '列表编辑',
  IconLoadingOutline16: '加载中',
  IconNewChatOutline16: '新建对话',
  IconPanelLeftOutline16: '左侧栏',
  IconPaperclipOutline16: '附件',
  IconPauseOutline16: '暂停',
  IconPersonalizationOutline16: '个性化',
  IconPlayOutline16: '播放',
  IconPlusOutline16: '添加',
  IconProjectAddOutline16: '添加项目',
  IconQuestionOutline14: '帮助',
  IconQueueOutline14: '队列',
  IconRefreshOutline14: '刷新',
  IconRefreshOutline16: '刷新',
  IconRightUpOutline14: '右上',
  IconRightUpOutline16: '右上',
  IconSearchOutline16: '搜索',
  IconSendOutline14: '发送',
  IconSendOutline16: '发送',
  IconSettingsOutline14: '设置',
  IconSettingsOutline16: '设置',
  IconShareOutline16: '分享',
  IconSkillOutline16: '技能',
  IconSparkle16: '闪光',
  IconStopFill16: '停止',
  IconThinkOutline14: '思考',
  IconThinkOutline16: '思考',
  IconTrashOutline16: '删除',
  IconTreeCorner8x10: '树形角',
  IconTriangleRightFill14: '右三角',
  IconUserOutline16: '用户',
  IconWarningOutline16: '警告',
}

const SIZE_SUFFIX = { '12': '（特小）', '14': '（小）', '16': '（大）', '20': '（特大）', '8x10': '（特小）' }

function extractExpr(src, name) {
  const start = src.indexOf(`const ${name} = `)
  if (start < 0) return null
  const arrow = src.indexOf('=>', start)
  let i = arrow + 2
  while (i < src.length && /\s/.test(src[i])) i++
  const begin = i
  let depth = 0, inStr = null, esc = false, end = -1
  for (; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === inStr) inStr = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue }
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    else if (c === ';' && depth === 0) { end = i; break }
  }
  return end < 0 ? null : src.slice(begin, end)
}

function el(tag, props) { return { tag, props } }
function evalIcon(src, name) {
  const expr = extractExpr(src, name)
  if (expr === null) throw new Error(`extract failed: ${name}`)
  const fn = Function('jsx', 'jsxs', 'Fragment', 'size', 'className',
    'return (' + expr + ')')
  return fn(el, el, Symbol('Fragment'), 16, undefined)
}

function esc(v) {
  return String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function serialize(node) {
  if (!node || typeof node !== 'object') return ''
  if (node.tag === Symbol('Fragment')) {
    const kids = Array.isArray(node.props?.children) ? node.props.children : (node.props?.children ? [node.props.children] : [])
    return kids.map(serialize).join('')
  }
  const { tag, props } = node
  const attrMap = { className: null, fillRule: 'fill-rule', clipRule: 'clip-rule', strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', clipPath: 'clip-path' }
  let attrs = ''
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'children' || v === undefined || v === null) continue
    const name = attrMap[k] ?? k
    if (name === null) continue
    attrs += ` ${name}="${esc(v)}"`
  }
  const kids = Array.isArray(props?.children) ? props.children : (props?.children ? [props.children] : [])
  // Always carry the SVG namespace: browsers refuse to parse an SVG data URI
  // without xmlns, which renders the mask blank (several official DSH icons
  // omit it in the source bundle).
  if (tag === 'svg' && !attrs.includes('xmlns=')) attrs += ' xmlns="http://www.w3.org/2000/svg"'
  return `<${tag}${attrs}>${kids.map(serialize).join('')}</${tag}>`
}

function sanitizeSvg(svg) {
  // Chromium cannot resolve clip-path/mask fragment references inside an SVG
  // used as a CSS mask data URI (issues.chromium.org/40667695). The official
  // DSH clipPath defs are no-op full-viewBox rects, and the agent-preset mask
  // only cuts holes that are re-drawn by their own circle paths — so we strip
  // the references and defs entirely, keeping the visible shape identical.
  return svg
    .replace(/\s+clip-path="url\(#[^"]+\)"/g, '')
    .replace(/\s+mask="url\(#[^"]+\)"/g, '')
    .replace(/<mask[^>]*>[\s\S]*?<\/mask>/g, '')
    .replace(/<clipPath[^>]*>[\s\S]*?<\/clipPath>/g, '')
    .replace(/<defs>[\s\S]*?<\/defs>/g, '')
    .replace(/<g>\s*<\/g>/g, '')
}

function camelToWords(s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') }
function kebab(s) { return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2').toLowerCase() }

const src = readFileSync(primitivesPath, 'utf8')
// Count how many sizes each base icon name has (e.g. RefreshOutline has 14/16),
// so duplicated entries get a （大/小/特大） suffix.
const sizeCounts = new Map()
for (const name of ICON_EXPORTS) {
  const base = name.slice(4).replace(/(\d+(?:x\d+)?)$/, '')
  sizeCounts.set(base, (sizeCounts.get(base) ?? 0) + 1)
}
const entries = ICON_EXPORTS.map((name) => {
  const svg = sanitizeSvg(serialize(evalIcon(src, name)))
  const base = name.slice(4)
  const size = /(\d+(?:x\d+)?)$/.exec(base)?.[1] ?? ''
  const baseNoSize = base.slice(0, base.length - size.length)
  const k = kebab(base)
  const words = camelToWords(base)
  const zh = ZH_LABELS[name] ?? words
  const suffix = sizeCounts.get(baseNoSize) > 1 ? (SIZE_SUFFIX[size] ?? '') : ''
  const label = zh + suffix
  return {
    id: 'dsh.' + k,
    label,
    labelEn: words,
    category: 'core',
    aliases: [name, k, 'official', 'dsh', '官方', zh, label],
    svg,
    source: '@deepseek-ai/dsh-client-ui-primitives',
    license: 'MIT',
  }
})

const J = JSON.stringify
const body = entries.map((e) => `  {
    id: ${J(e.id)},
    label: ${J(e.label)},
    labelEn: ${J(e.labelEn)},
    category: ${J(e.category)},
    aliases: ${J(e.aliases)},
    svg: ${J(e.svg)},
    source: ${J(e.source)},
    license: ${J(e.license)},
  },`).join('\n')

const out = `/**
 * Generated by scripts/generate-official-icons.mjs — do not edit by hand.
 *
 * Official icon catalog extracted from @deepseek-ai/dsh-client-ui-primitives
 * (MIT, Copyright (c) 2026 DeepSeek). Keep the attribution in
 * THIRD_PARTY_NOTICES.md when redistributing.
 */
export interface OfficialDshIcon {
  id: string
  label: string
  labelEn: string
  category: 'core'
  aliases: readonly string[]
  svg: string
  source: string
  license: string
}

export const OFFICIAL_DSH_ICONS: OfficialDshIcon[] = [
${body}
]
`

const outFile = join(root, '..', 'src', 'client', 'generated', 'official-dsh-icons.ts')
mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, out, 'utf8')
console.log(`wrote ${outFile} (${entries.length} icons)`)
