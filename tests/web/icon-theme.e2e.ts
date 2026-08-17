import fs from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser } from 'playwright'

let browser: Browser

async function maskAlphaPixels(page: import('playwright').Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate(async element => {
    const raw = getComputedStyle(element).webkitMaskImage || getComputedStyle(element).maskImage
    const match = raw.match(/^url\(["']?(.*?)["']?\)$/)
    if (!match) return 0
    const image = new Image()
    image.src = match[1]!
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const context = canvas.getContext('2d')
    if (!context) return 0
    context.drawImage(image, 0, 0, 16, 16)
    const pixels = context.getImageData(0, 0, 16, 16).data
    let alphaPixels = 0
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index]! > 0) alphaPixels += 1
    }
    return alphaPixels
  })
}

beforeAll(async () => {
  const bundled = '/home/dengdeng/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (fs.existsSync(bundled) ? bundled : undefined),
    args: ['--no-sandbox'],
  })
})

afterAll(async () => { await browser?.close() })

describe('built client compatibility fixture', () => {
  it('detects both surfaces and restores original SVGs on plugin disposal', async () => {
    const page = await browser.newPage()
    await page.setContent(`
      <div role="dialog" aria-labelledby="settings-fixture-title">
        <nav>
          <div id="settings-fixture-title"><div data-slot="settings.header">Settings</div></div>
          <button aria-current="true"><svg data-original="general"></svg><span>General</span></button>
          <button><svg data-original="market"></svg><span>Market</span></button>
          <button><svg data-original="icon-theme"></svg><span>Icons</span></button>
        </nav>
      </div>
      <div data-slot="sidebar.footer.action"><button aria-label="Bookmarks"><svg data-original="bookmarks"></svg></button></div>
      <div id="plugin-ui"></div>
    `)
    await page.addScriptTag({ path: new URL('../../node_modules/react/umd/react.development.js', import.meta.url).pathname })
    await page.addScriptTag({ path: new URL('../../node_modules/react-dom/umd/react-dom.development.js', import.meta.url).pathname })
    await page.evaluate(() => {
      const settingsEntries: Array<{ options: Record<string, unknown> }> = [
        { options: { id: 'general', order: 0, label: 'General' } },
        { options: { id: 'market', order: 40, label: 'Market' } },
      ]
      const sidebarEntries = [{ options: { id: 'bookmarks', order: 20, label: 'Bookmarks' } }]
      const slotListeners = new Map<string, Set<() => void>>()
      const effects: Array<() => void> = []
      const injected: Array<() => void> = []
      let revision = 0
      const settingsValue: Record<string, unknown> = { overrides: { 'sidebar.footer.action:bookmarks': 'apps' } }
      window.fetch = async (_input, init) => {
        const payload = JSON.parse(String(init?.body ?? '{}')) as {
          action?: string
          ops?: Array<{ op: 'set' | 'unset'; path: string[]; value?: unknown }>
        }
        if (payload.action === 'mutate') {
          for (const operation of payload.ops ?? []) {
            const field = operation.path[0]
            if (!field) continue
            if (operation.op === 'set') settingsValue[field] = operation.value
            else delete settingsValue[field]
          }
          revision += 1
        }
        return new Response(JSON.stringify({ ok: true, revision, writable: true, value: settingsValue }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      const runtime = window as unknown as {
        React: { createElement: (component: unknown, props?: unknown) => unknown; Fragment: unknown }
        ReactDOM: { createRoot: (element: Element) => { render: (node: unknown) => void; unmount: () => void } }
      }
      const slots = {
        entriesOfSlot: (name: string) => name === 'settings.section' ? settingsEntries : sidebarEntries,
        subscribe: (name: string, listener: () => void) => {
          const set = slotListeners.get(name) ?? new Set()
          set.add(listener)
          slotListeners.set(name, set)
          return () => set.delete(listener)
        },
        inject: (_name: string, register: () => unknown) => {
          const dispose = register()
          if (typeof dispose === 'function') injected.push(dispose as () => void)
        },
        register: (options: Record<string, unknown>, component: (props: unknown) => unknown) => {
          if (options.name === 'settings.section') {
            const entry = { options }
            settingsEntries.push(entry)
            slotListeners.get('settings.section')?.forEach(listener => listener())
            const mount = document.querySelector('#plugin-ui')!
            const root = runtime.ReactDOM.createRoot(mount)
            root.render(runtime.React.createElement(component))
            return () => {
              root.unmount()
              const index = settingsEntries.indexOf(entry)
              if (index >= 0) settingsEntries.splice(index, 1)
            }
          }
          return () => {}
        },
      }
      const ctx = {
        effect: (callback: () => unknown) => {
          const dispose = callback()
          if (typeof dispose === 'function') effects.push(dispose as () => void)
        },
        locale: {
          register: () => () => {},
          bind: () => (key: string) => key === 'nav' ? 'Icons' : key,
          subscribe: () => () => {},
        },
        slots,
      }
      ;(window as unknown as Record<string, unknown>).__ModuleLoader__ = {
        load: ({ factory }: { factory: (require: (id: string) => unknown) => { apply: (ctx: unknown) => void } }) => {
          const plugin = factory((id: string) => {
            if (id === 'react') return runtime.React
            if (id === 'react/jsx-runtime') {
              const jsx = (component: unknown, props: Record<string, unknown>, key?: string) => runtime.React.createElement(component, key === undefined ? props : { ...props, key })
              return { jsx, jsxs: jsx, Fragment: runtime.React.Fragment }
            }
            throw new Error(`unexpected external: ${id}`)
          })
          plugin.apply(ctx)
        },
      }
      ;(window as unknown as Record<string, unknown>).__disposeIconTheme = () => {
        effects.reverse().forEach(dispose => dispose())
        injected.reverse().forEach(dispose => dispose())
      }
    })
    await page.addScriptTag({ path: new URL('../../client/client.js', import.meta.url).pathname })
    await page.waitForSelector('[data-target-key="settings.section:market"]')
    await page.locator('[data-target-key="settings.section:market"] .dit-icon-button').click()
    await expect.poll(async () => page.locator('.dit-grid-item').count()).toBe(51)
    await page.getByTitle(/ · apps$/).click()
    await expect.poll(async () => page.locator('[data-target-key="settings.section:market"] .dit-source').textContent()).toMatch(/manual/)
    await page.waitForSelector('[data-dsh-icon-theme-id="market"]')
    await page.waitForSelector('[data-dsh-icon-theme-id="bookmarks"]')
    const state = await page.evaluate(() => ({
      marketOriginal: !!document.querySelector('[data-dsh-icon-theme-id="market"] > svg[data-original="market"]'),
      marketGlyph: !!document.querySelector('[data-dsh-icon-theme-id="market"] > [data-dsh-icon-theme-glyph]'),
      sidebarIcon: document.querySelector<HTMLElement>('[data-dsh-icon-theme-id="bookmarks"]')?.dataset.dshIconThemeIcon,
    }))
    expect(state).toEqual({ marketOriginal: true, marketGlyph: true, sidebarIcon: 'apps' })
    expect(await maskAlphaPixels(page, '[data-dsh-icon-theme-id="bookmarks"] > [data-dsh-icon-theme-glyph]')).toBeGreaterThan(8)
    await page.evaluate(() => (window as unknown as { __disposeIconTheme: () => void }).__disposeIconTheme())
    expect(await page.locator('[data-dsh-icon-theme-managed]').count()).toBe(0)
    expect(await page.locator('svg[data-original="market"]').count()).toBe(1)
    expect(await page.locator('svg[data-original="bookmarks"]').count()).toBe(1)
    await page.close()
  })
})

describe.skipIf(!process.env.DSH_E2E_URL)('real DSH smoke @real-dsh', () => {
  it('shows detected targets and supports a reversible manual override', async () => {
    const page = await browser.newPage()
    await page.goto(process.env.DSH_E2E_URL!, { waitUntil: 'domcontentloaded' })
    const settings = page.getByRole('button', { name: /(设置|Settings)/ })
    await settings.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: /^(图标|Icons)$/ }).click()
    await expect.poll(async () => dialog.locator('[data-target-key]').count()).toBeGreaterThan(1)
    await expect.poll(() => maskAlphaPixels(page, '[data-dsh-icon-theme-id="dsh-mneme"] > [data-dsh-icon-theme-glyph]')).toBeGreaterThan(8)
    const sidebar = dialog.getByRole('button', { name: /^(侧边栏|Sidebar)$/ })
    await sidebar.click()
    const chatImport = dialog.locator('[data-target-key="sidebar.footer.action:chat-import"]')
    const bookmarks = dialog.locator('[data-target-key="sidebar.footer.action:bookmarks"]')
    const usageStats = dialog.locator('[data-target-key="sidebar.footer.action:usage-stats"]')
    await expect.poll(async () => chatImport.textContent()).toMatch(/导入会话|Import conversations/)
    await expect.poll(async () => bookmarks.textContent()).toMatch(/收藏中心|Bookmarks|Archive/)
    await expect.poll(async () => usageStats.textContent()).toMatch(/使用统计|Usage statistics/)
    await chatImport.getByRole('button', { name: /^(更改|Change)$/ }).click()
    await page.locator('.dit-picker').getByRole('button', { name: /^(插件|Apps)$/ }).click()
    await expect.poll(async () => page.locator('[data-dsh-icon-theme-id="chat-import"]').getAttribute('data-dsh-icon-theme-icon')).toBe('apps')
    await chatImport.getByRole('button', { name: /恢复自动|Use automatic/ }).click()
    await expect.poll(async () => page.locator('[data-slot="sidebar.footer.action"] [aria-label="导入会话"]').getAttribute('data-dsh-icon-theme-managed')).toBeNull()
    await dialog.getByRole('button', { name: /^(全部|All)$/ }).click()
    let market = dialog.locator('[data-target-key="settings.section:market"]')
    await market.getByRole('button', { name: /^(更改|Change)$/ }).click()
    const saved = page.waitForResponse(response => response.url().endsWith('/_dsh/icon-theme/settings') && response.request().method() === 'POST')
    await page.locator('.dit-picker').getByRole('button', { name: /^(插件|Apps)$/ }).click()
    await saved
    await expect.poll(async () => market.textContent()).toMatch(/手动|Manual/)

    // The Host Settings provider, not page memory, owns the choice.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /(设置|Settings)/ }).click()
    const reopened = page.getByRole('dialog')
    await reopened.getByRole('button', { name: /^(图标|Icons)$/ }).click()
    market = reopened.locator('[data-target-key="settings.section:market"]')
    await expect.poll(async () => market.textContent()).toMatch(/手动|Manual/)
    const reset = page.waitForResponse(response => response.url().endsWith('/_dsh/icon-theme/settings') && response.request().method() === 'POST')
    await market.getByRole('button', { name: /恢复自动|Use automatic/ }).click()
    await reset
    await expect.poll(async () => market.textContent()).not.toMatch(/手动|Manual/)
    await page.close()
  })
})
