const STYLE_ID = 'dsh-icon-theme/runtime'

export const STYLE_TEXT = `
[data-dsh-icon-theme-managed] > svg:first-of-type { display: none !important; }
[data-dsh-icon-theme-managed][data-dsh-better-sidebar-settings-nav]::before { display: none !important; }
[data-dsh-icon-theme-glyph] {
  width: 16px; height: 16px; flex: 0 0 16px; display: inline-block;
  background: currentColor;
  -webkit-mask: var(--dsh-icon-theme-mask) center / contain no-repeat;
  mask: var(--dsh-icon-theme-mask) center / contain no-repeat;
}
.dit-root { color: var(--dsw-alias-label-primary); padding: 0 0 24px; min-width: 0; }
.dit-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.dit-title { margin: 0; font-size: 20px; line-height: 28px; font-weight: 600; }
.dit-sub { margin: 4px 0 0; color: var(--dsw-alias-label-secondary); font-size: 13px; line-height: 20px; }
.dit-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
.dit-input { min-width: 180px; flex: 1 1 220px; height: 34px; box-sizing: border-box; border: 1px solid var(--dsw-alias-line-border); border-radius: 9px; padding: 0 10px; background: var(--dsw-alias-bg-base); color: inherit; }
.dit-button, .dit-chip, .dit-icon-button { border: 1px solid var(--dsw-alias-line-border); background: var(--dsw-alias-bg-base); color: inherit; border-radius: 9px; cursor: pointer; }
.dit-button { min-height: 34px; padding: 6px 11px; }
.dit-chip { min-height: 30px; padding: 4px 9px; font-size: 12px; }
.dit-chip[aria-pressed="true"] { background: var(--dsw-alias-interactive-bg-hover); }
.dit-button:hover, .dit-chip:hover, .dit-icon-button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dit-button:focus-visible, .dit-chip:focus-visible, .dit-icon-button:focus-visible, .dit-input:focus-visible { outline: 2px solid var(--dsw-alias-line-focus); outline-offset: 1px; }
.dit-summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dit-report { border: 1px solid var(--dsw-alias-line-border); border-radius: 9px; padding: 6px 9px; }
.dit-list { display: grid; gap: 8px; }
.dit-row { display: grid; grid-template-columns: 32px minmax(120px, 1fr) minmax(100px, .8fr) auto; gap: 10px; align-items: center; border: 1px solid var(--dsw-alias-line-border); border-radius: 12px; padding: 10px 12px; background: var(--dsw-alias-bg-base); }
.dit-preview { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: var(--dsw-alias-interactive-bg-hover); }
.dit-name { min-width: 0; }
.dit-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.dit-id { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-secondary); font: 11px/16px ui-monospace, monospace; }
.dit-source { color: var(--dsw-alias-label-secondary); font-size: 12px; }
.dit-actions { display: flex; gap: 6px; }
.dit-icon-button { min-height: 30px; padding: 4px 8px; font-size: 12px; }
.dit-empty { padding: 28px 12px; text-align: center; color: var(--dsw-alias-label-secondary); }
.dit-picker-mask { position: fixed; inset: 0; z-index: 10020; display: grid; place-items: center; background: var(--dsw-alias-mask-bg); }
.dit-picker { width: min(620px, calc(100vw - 32px)); max-height: min(620px, calc(100vh - 32px)); overflow: auto; border: 1px solid var(--dsw-alias-line-border); border-radius: 14px; padding: 16px; background: var(--dsw-alias-bg-base); box-shadow: var(--dsw-shadow-elevated); }
.dit-picker-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.dit-picker-title { font-size: 16px; font-weight: 600; }
.dit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(82px, 1fr)); gap: 7px; margin-top: 10px; }
.dit-grid-item { min-height: 64px; display: grid; place-items: center; gap: 4px; padding: 7px; border: 1px solid var(--dsw-alias-line-border); border-radius: 10px; background: transparent; color: inherit; cursor: pointer; font-size: 11px; }
.dit-grid-item:hover, .dit-grid-item[aria-current="true"] { background: var(--dsw-alias-interactive-bg-hover); }
@media (max-width: 720px) { .dit-row { grid-template-columns: 32px minmax(0, 1fr) auto; } .dit-source { display: none; } }
@media (prefers-reduced-motion: reduce) { .dit-root * { scroll-behavior: auto !important; } }
`

export function installStyles(): () => void {
  let tag = document.querySelector<HTMLStyleElement>(`style[data-plugin-css="${STYLE_ID}"]`)
  if (!tag) {
    tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-icon-theme'
    tag.dataset.pluginCss = STYLE_ID
    tag.textContent = STYLE_TEXT
    document.head.appendChild(tag)
  }
  const users = Number.parseInt(tag.dataset.pluginCssUsers ?? '0', 10)
  tag.dataset.pluginCssUsers = String(Number.isFinite(users) ? users + 1 : 1)
  let active = true
  return () => {
    if (!active) return
    active = false
    const remaining = Math.max(0, Number.parseInt(tag.dataset.pluginCssUsers ?? '1', 10) - 1)
    if (remaining === 0) tag.remove()
    else tag.dataset.pluginCssUsers = String(remaining)
  }
}
