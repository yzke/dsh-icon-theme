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
      <div role="dialog">
        <nav>
          <button aria-current="true"><svg data-original="general"></svg><span>General</span></button>
          <button><svg data-original="market"></svg><span>Market</span></button>
          <button><svg data-original="icon-theme"></svg><span>Icons</span></button>
        </nav>
      </div>
      <div data-slot="sidebar.footer.action"><button aria-label="Bookmarks"><svg data-original="bookmarks"></svg></button></div>
    `)
    await page.evaluate(() => {
      const settingsEntries: Array<{ options: Record<string, unknown> }> = [
        { options: { id: 'general', order: 0, label: 'General' } },
        { options: { id: 'market', order: 40, label: 'Market' } },
      ]
      const sidebarEntries = [{ options: { id: 'bookmarks', order: 20, label: 'Bookmarks' } }]
      const slotListeners = new Map<string, Set<() => void>>()
      const effects: Array<() => void> = []
      const injected: Array<() => void> = []
      const scopeListeners = new Set<() => void>()
      const scope = {
        getSnapshot: () => ({
          status: 'ready',
          writable: true,
          value: { overrides: { 'sidebar.footer.action:bookmarks': 'apps' } },
        }),
        subscribe: (listener: () => void) => { scopeListeners.add(listener); return () => scopeListeners.delete(listener) },
        set: async () => {},
        unset: async () => {},
      }
      const slots = {
        entries: (name: string) => name === 'settings.section' ? settingsEntries : sidebarEntries,
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
        register: (options: Record<string, unknown>) => {
          if (options.name === 'settings.section') {
            const entry = { options }
            settingsEntries.push(entry)
            slotListeners.get('settings.section')?.forEach(listener => listener())
            return () => {
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
        iconThemeSettings: scope,
      }
      ;(window as unknown as Record<string, unknown>).__ModuleLoader__ = {
        load: ({ factory }: { factory: (require: (id: string) => unknown) => { apply: (ctx: unknown) => void } }) => {
          const plugin = factory((id: string) => {
            if (id === 'react') return { createElement: () => null, useMemo: () => null, useState: () => [null, () => {}], useSyncExternalStore: () => null }
            if (id === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null, Fragment: Symbol('Fragment') }
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
    const settings = page.getByRole('button', { name: /^(设置|Settings)$/ })
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
    const market = dialog.locator('[data-target-key="settings.section:market"]')
    await market.getByRole('button', { name: /^(更改|Change)$/ }).click()
    await page.locator('.dit-picker').getByRole('button', { name: /^(插件|Apps)$/ }).click()
    await expect.poll(async () => market.textContent()).toMatch(/手动|Manual/)
    await market.getByRole('button', { name: /恢复自动|Use automatic/ }).click()
    await expect.poll(async () => market.textContent()).not.toMatch(/手动|Manual/)
    await page.close()
  })
})
