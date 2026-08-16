# DSH Icon Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `dsh-icon-theme`, a profile-persisted DSH plugin that discovers current Settings sections and sidebar footer actions, assigns coherent 16 px monochrome icons automatically, and lets users override every supported target.

**Architecture:** The client reads stable slot-ledger ids as the source of identity, resolves an icon through a deterministic priority chain, and applies it through one version-gated DOM compatibility adapter because DSH 0.1.x does not expose an icon field. The adapter preserves the host SVG, adds only owned attributes/styles, fails closed on structural mismatches, and restores the original UI on disposal. The host plugin owns a small Schemastery settings section; the client uses `settingsScope` so only user choices are persisted in the profile.

**Tech Stack:** TypeScript, React 18, DSH 0.1.0-rc.6 client slots/settings/runtime APIs, Schemastery, Fluent UI System Icons 16 Regular (build-time source only), tsdown, Vitest + jsdom, Playwright.

## Global Constraints

- Package/repository name is `dsh-icon-theme`; user-facing section name is `图标` / `Icons`.
- Target DSH is `>=0.1.0-rc.6 <0.2.0`; unknown host structures must be reported as unsupported and left untouched.
- Stable identity is `settings.section:<id>` or `sidebar.footer.action:<id>`; localized labels and CSS-module class hashes are never persistence keys.
- Resolution priority is manual override, curated plugin icon, exact stable-id preset, semantic inference, preserved original icon, then gear fallback.
- Runtime never downloads icons, calls Iconify, scrapes GitHub, parses installed bundles, or executes third-party SVG.
- Every bundled SVG is 16 x 16, monochrome, mask-compatible, and carries source/license metadata.
- DSH-owned native icons already rendered by the shell remain untouched unless the user explicitly overrides them.
- DOM changes are reversible, scoped to icon-bearing nodes, MutationObserver-driven only while needed, and HMR/disposal safe.
- Persist only `pack`, `overrides`, and `originalPolicy`; derived detection results are never written.
- Unit, DOM contract, persistence, build, package, and real-browser tests must pass before release.

---

### Task 1: Package scaffold and host settings contract

**Files:**
- Create: `package.json`
- Create: `cordis.patch.yml`
- Create: `src/index.ts`
- Create: `src/config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.client.json`
- Create: `tsdown.config.ts`
- Test: `tests/config.spec.ts`

**Interfaces:**
- Produces: `IconThemeConfig`, `DEFAULT_CONFIG`, `Config`, and an inert host `apply()`.
- Produces: profile fields `pack: string`, `overrides: Record<string, string>`, and `originalPolicy: 'prefer' | 'replace-generic'`.

- [ ] **Step 1: Write the failing config test**

```ts
import { describe, expect, it } from 'vitest'
import { Config, DEFAULT_CONFIG } from '../src/config.ts'

describe('Config', () => {
  it('resolves safe defaults and rejects non-string override values', () => {
    expect(Config({})).toEqual(DEFAULT_CONFIG)
    expect(() => Config({ overrides: { market: 3 } })).toThrow()
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run tests/config.spec.ts`

Expected: FAIL because `src/config.ts` does not exist.

- [ ] **Step 3: Implement the typed Schemastery config and package entry**

```ts
import { Schema } from '@deepseek-ai/schemastery'

export interface IconThemeConfig {
  pack: string
  overrides: Record<string, string>
  originalPolicy: 'prefer' | 'replace-generic'
}

export const DEFAULT_CONFIG: IconThemeConfig = Object.freeze({
  pack: 'dsh-fluent', overrides: {}, originalPolicy: 'prefer',
})

export const Config: Schema<IconThemeConfig> = Schema.object({
  pack: Schema.string().default(DEFAULT_CONFIG.pack),
  overrides: Schema.dict(Schema.string()).default({}),
  originalPolicy: Schema.union(['prefer', 'replace-generic']).default(DEFAULT_CONFIG.originalPolicy),
})
```

`src/index.ts` exports `name = 'dsh-icon-theme'`, `Config`, and `apply(): void {}`. `cordis.patch.yml` inserts the package under id `dsh-icon-theme`. The package manifest exposes `.`, `./client`, `./cordis.patch.yml`, and `./package.json`, and injects runtime, slots, settings, locale, theme, and primitives client packages.

- [ ] **Step 4: Run the focused test and typecheck**

Run: `npm test -- --run tests/config.spec.ts && npm run typecheck`

Expected: PASS.

### Task 2: Curated icon catalog and build-time generator

**Files:**
- Create: `scripts/generate-icons.mjs`
- Create: `src/client/icon-spec.ts`
- Create: `src/client/generated/fluent-icons.ts`
- Create: `src/client/catalog.ts`
- Create: `THIRD_PARTY_NOTICES.md`
- Test: `tests/catalog.spec.ts`
- Test: `tests/icon-generator.spec.ts`

**Interfaces:**
- Produces: `IconId`, `IconCategory`, `IconDef`, `ICON_CATALOG`, `ICON_BY_ID`, and `iconMaskUrl(icon)`.
- `IconDef` is `{ id, label, category, aliases, svg, source, license }` and every `svg` has `viewBox="0 0 16 16"` with no script, image, style, event handler, external URL, or hard-coded color.

- [ ] **Step 1: Write catalog invariant tests**

```ts
it('ships unique, local, monochrome 16px icons', () => {
  expect(new Set(ICON_CATALOG.map(icon => icon.id)).size).toBe(ICON_CATALOG.length)
  for (const icon of ICON_CATALOG) {
    expect(icon.svg).toContain('viewBox="0 0 16 16"')
    expect(icon.svg).not.toMatch(/<script|<image|on\w+=|https?:|#[0-9a-f]{3,8}/i)
  }
})
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- --run tests/catalog.spec.ts tests/icon-generator.spec.ts`

Expected: FAIL because the catalog does not exist.

- [ ] **Step 3: Generate and curate the first pack**

The generator reads only named files under `@fluentui/svg-icons/icons`, verifies the SVG allowlist, removes width/height, injects `fill="currentColor"`, and emits deterministic TypeScript. The initial ids are:

```ts
const FLUENT_ICONS = [
  'settings', 'brain', 'database', 'apps', 'store_microsoft', 'alert',
  'wallet', 'money', 'receipt_money', 'document_pdf', 'document_text',
  'document_mention', 'folder', 'folder_open', 'archive', 'bookmark',
  'arrow_import', 'arrow_export', 'arrow_download', 'arrow_upload',
  'shield', 'shield_lock', 'key', 'lock_closed', 'eye', 'image',
  'search', 'globe', 'code', 'plug_connected', 'toolbox', 'wrench',
  'sparkle', 'paint_brush', 'color', 'grid', 'panel_left', 'panel_right',
  'panel_right_gallery', 'chart_multiple', 'history', 'calendar', 'chat',
  'people', 'person', 'home', 'info', 'warning', 'cloud', 'window_apps',
] as const
```

Add the MIT `dsh-market` block-grid glyph as `plugin.market` with repository attribution. Do not copy arbitrary README artwork or logos.

- [ ] **Step 4: Run generator, invariant tests, and a clean-tree determinism check**

Run: `npm run icons:generate && npm test -- --run tests/catalog.spec.ts tests/icon-generator.spec.ts && git diff --exit-code src/client/generated/fluent-icons.ts`

Expected: PASS and no generated diff.

### Task 3: Discovery and deterministic resolution engine

**Files:**
- Create: `src/client/types.ts`
- Create: `src/client/presets.ts`
- Create: `src/client/discovery.ts`
- Create: `src/client/resolve.ts`
- Test: `tests/discovery.spec.ts`
- Test: `tests/resolve.spec.ts`

**Interfaces:**
- Produces: `TargetKey = `${Surface}:${string}``, `DetectedTarget`, `Resolution`, `discoverSettings(entries)`, `discoverSidebar(entries)`, and `resolveIcon(target, config, evidence)`.
- `Resolution.source` is one of `manual | plugin | preset | inferred | original | fallback` and includes a human-readable reason.

- [ ] **Step 1: Write table-driven failing tests**

```ts
it.each([
  ['settings.section:market', 'plugin.market', 'plugin'],
  ['settings.section:notification', 'alert', 'preset'],
  ['settings.section:unfamiliar-folder-tool', 'folder', 'inferred'],
])('%s resolves to %s', (key, iconId, source) => {
  expect(resolveIcon(target(key), DEFAULT_CONFIG, { hasOriginal: false, originalIsGeneric: true }))
    .toMatchObject({ iconId, source })
})
```

Add cases proving a manual override wins, localized labels do not change keys, ambiguous labels do not auto-apply, and an unknown target preserves a non-generic original.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- --run tests/discovery.spec.ts tests/resolve.spec.ts`

Expected: FAIL because the engine does not exist.

- [ ] **Step 3: Implement stable-id presets and conservative inference**

Exact presets cover `general`, `models`, `agent-presets`, `plugins`, `dsh-mneme`, `cost-meter`, `market`, `dsh-mineru`, `at-file`, `notification`, `better-sidebar`, `icon-theme`, `chat-import`, `usage-stats`, and `bookmarks`. Inference tokenizes only stable ids/package names and requires one unambiguous category match; labels are returned as low-confidence suggestions but never auto-applied.

- [ ] **Step 4: Run engine tests**

Run: `npm test -- --run tests/discovery.spec.ts tests/resolve.spec.ts`

Expected: PASS.

### Task 4: Reversible Settings navigation adapter

**Files:**
- Create: `src/client/dom/owned-icon.ts`
- Create: `src/client/dom/settings-adapter.ts`
- Create: `src/client/dom/compatibility.ts`
- Test: `tests/settings-adapter.spec.ts`

**Interfaces:**
- Produces: `applyOwnedIcon(element, resolution): () => void`.
- Produces: `mountSettingsAdapter({ getTargets, resolve, onReport }): () => void`.
- Adapter reports `{ status: 'active' | 'waiting' | 'unsupported', managed, total, reason? }`.

- [ ] **Step 1: Write jsdom tests for delayed mount, reorder, mismatch, and disposal**

```ts
it('restores the shell SVG on disposal', async () => {
  document.body.append(settingsDialog(['General', 'Market']))
  const dispose = mountSettingsAdapter(harness(['general', 'market']))
  await mutationTick()
  const market = navButtons()[1]!
  expect(market.dataset.dshIconThemeId).toBe('market')
  expect(market.querySelector(':scope > svg')).not.toBeNull()
  dispose()
  expect(market.dataset.dshIconThemeId).toBeUndefined()
  expect(market.style.getPropertyValue('--dsh-icon-theme-mask')).toBe('')
})
```

Mismatch tests assert zero partially managed rows when ledger and DOM lengths differ.

- [ ] **Step 2: Run tests and verify they fail**

Run: `npm test -- --run tests/settings-adapter.spec.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the compatibility adapter**

Find a modal dialog with a nav whose direct buttons match the sorted settings ledger. Correlate by ledger order, write `data-dsh-icon-theme-surface` and `data-dsh-icon-theme-id`, set a local mask variable, and never remove or rewrite the original SVG. One stylesheet hides `:scope > svg:first-of-type` only on managed targets and restores it automatically when owned attributes are removed.

- [ ] **Step 4: Run adapter tests**

Run: `npm test -- --run tests/settings-adapter.spec.ts`

Expected: PASS.

### Task 5: Reversible sidebar footer adapter

**Files:**
- Create: `src/client/dom/sidebar-adapter.ts`
- Test: `tests/sidebar-adapter.spec.ts`

**Interfaces:**
- Produces: `mountSidebarAdapter({ getTargets, resolve, onReport }): () => void`.
- A sidebar entry is managed only when its slot contribution has exactly one direct root and that root or its single action button has a direct SVG.

- [ ] **Step 1: Write jsdom tests for list order, non-icon rows, rail/wide rerenders, and fragments**

```ts
it('skips a balance card without disturbing neighboring icon actions', async () => {
  document.body.append(sidebarSlot([buttonWithSvg(), balanceCard(), buttonWithSvg()]))
  const dispose = mountSidebarAdapter(harness(['chat-import', 'cost-meter', 'usage-stats']))
  await mutationTick()
  expect(managedIds()).toEqual(['chat-import', 'usage-stats'])
  expect(balanceCardElement().attributes).not.toContain('data-dsh-icon-theme-id')
  dispose()
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- --run tests/sidebar-adapter.spec.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement direct-root ledger correlation with fail-closed behavior**

Read `[data-slot="sidebar.footer.action"]`, align its direct roots to the ordered ledger only when counts match, and target a root/direct action button only when it owns a direct SVG. Preserve original plugin icons for `originalPolicy: 'prefer'` unless a manual or curated override exists.

- [ ] **Step 4: Run sidebar tests**

Run: `npm test -- --run tests/sidebar-adapter.spec.ts`

Expected: PASS.

### Task 6: Settings UI, persistence, and diagnostics

**Files:**
- Create: `src/client/IconThemeSection.tsx`
- Create: `src/client/IconPicker.tsx`
- Create: `src/client/store.ts`
- Create: `src/client/locales.ts`
- Create: `src/client/styles.css`
- Test: `tests/store.spec.ts`
- Test: `tests/icon-theme-section.spec.tsx`

**Interfaces:**
- Produces: `createIconThemeStore(scope, ledgers)` exposing `getSnapshot`, `subscribe`, `setOverride`, `resetTarget`, and `resetAll`.
- UI shows detection counts, filters (`all`, `settings`, `sidebar`, `unrecognized`, `customized`), target rows, source badges, picker, reset, and compatibility diagnostics.

- [ ] **Step 1: Write persistence and interaction tests**

```ts
it('persists only manual overrides under stable target keys', async () => {
  const scope = fakeScope(DEFAULT_CONFIG)
  const store = createIconThemeStore(scope, ledgers())
  await store.setOverride('settings.section:market', 'apps')
  expect(scope.writes).toEqual([['overrides', { 'settings.section:market': 'apps' }]])
})
```

The UI test changes Market to Apps, observes a live preview update, resets it, filters unrecognized rows, and checks Chinese and English copy.

- [ ] **Step 2: Run focused tests and verify they fail**

Run: `npm test -- --run tests/store.spec.ts tests/icon-theme-section.spec.tsx`

Expected: FAIL because the store and UI do not exist.

- [ ] **Step 3: Implement the reactive store and DSH-styled section**

Use `useSyncExternalStore`, DSH semantic `--dsw-*` variables, 16 px icon previews, keyboard-accessible buttons, visible focus, and no theme-specific hard-coded colors. Display why each target resolved and whether it is active, preserved, unsupported, or awaiting mount.

- [ ] **Step 4: Run UI tests and accessibility smoke checks**

Run: `npm test -- --run tests/store.spec.ts tests/icon-theme-section.spec.tsx`

Expected: PASS with no React act warnings.

### Task 7: Client lifecycle integration and clean build

**Files:**
- Create: `src/client/index.tsx`
- Modify: `src/client/styles.css`
- Test: `tests/client-apply.spec.tsx`
- Test: `tests/lifecycle.spec.ts`

**Interfaces:**
- Produces DSH client exports `name`, `inject`, and `apply(ctx)`.
- `apply` binds namespace `dsh-icon-theme`, registers locale dictionaries, injects `settings.section` id `icon-theme`, subscribes both ledgers, mounts both adapters, and returns all ownership to `ctx.effect` disposers.

- [ ] **Step 1: Write a fake-context lifecycle test**

```ts
it('registers one section and disposes subscriptions, observers, and markers', () => {
  const ctx = fakeContext()
  apply(ctx)
  expect(ctx.registrations).toContainEqual(expect.objectContaining({ name: 'settings.section', id: 'icon-theme' }))
  ctx.dispose()
  expect(document.querySelectorAll('[data-dsh-icon-theme-id]')).toHaveLength(0)
  expect(ctx.activeSubscriptions()).toBe(0)
})
```

- [ ] **Step 2: Run the lifecycle test and verify it fails**

Run: `npm test -- --run tests/client-apply.spec.tsx tests/lifecycle.spec.ts`

Expected: FAIL because `apply` does not exist.

- [ ] **Step 3: Implement client composition with no cross-plugin value imports**

Import runtime values only from documented `/client` entry points. Cache ledger snapshots by version, subscribe to both slot ledgers, and refresh the store/adapters on ledger, locale, and settings-scope changes.

- [ ] **Step 4: Build and inspect artifacts**

Run: `npm run typecheck && npm run build && node scripts/preflight.mjs`

Expected: PASS; `client/client.js` begins with `window.__ModuleLoader__.load`, has no external icon requests, and package files contain no full Fluent dependency.

### Task 8: Browser E2E, package QA, and documentation

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/web/icon-theme.e2e.ts`
- Create: `tests/web/scaffold.ts`
- Create: `scripts/preflight.mjs`
- Create: `README.md`
- Create: `README.zh.md`
- Create: `docs/design.md`
- Create: `TESTING.md`

**Interfaces:**
- Browser tests exercise the built bundle against a representative DSH shell fixture and, when `DSH_E2E_URL` is set, the real local DSH instance.

- [ ] **Step 1: Write failing end-to-end scenarios**

Scenarios: initial auto-detection, Market custom icon, manual override, locale switch with stable mapping, newly mounted section, sidebar rail/wide mode, plugin removal, unsupported DOM mismatch, reset-all, and plugin disposal restoring every original SVG.

- [ ] **Step 2: Run E2E and verify the new spec fails**

Run: `npm run test:web`

Expected: FAIL because the fixture/build integration is not complete.

- [ ] **Step 3: Implement fixture and durable documentation**

Document the DSH 0.1.x compatibility boundary, resolution priority, supported surfaces, bundled categories, privacy/offline behavior, plugin-icon evidence rules, license attribution, manual override workflow, diagnostic meanings, and upstream recommendation for an eventual declarative `settings.section.icon` resolver.

- [ ] **Step 4: Run the complete release gate**

Run: `npm run qa && npm pack --dry-run`

Expected: all unit/DOM/UI/E2E tests pass, build succeeds, generated catalog is deterministic, package preflight passes, and the tarball includes only runtime/build artifacts, docs, notices, license, manifest, and patch.

- [ ] **Step 5: Run a real DSH smoke test**

Run: `DSH_E2E_URL=http://127.0.0.1:3080 npm run test:web -- -t @real-dsh`

Expected: installed current sections and sidebar actions are detected; changing an icon updates live; closing/reopening settings, switching locale, and rail/wide mode preserve mappings; uninstall/disposal returns original icons.

## Self-review

- Spec coverage: Settings, sidebar, auto-detection, curated plugin icons, manual override, DSH styling, icon-library choice, persistence, lifecycle, upgrade safety, offline behavior, and full testing each have a task.
- Placeholder scan: the plan contains no deferred implementation markers; each task names exact files, interfaces, commands, and pass/fail criteria.
- Type consistency: target keys, resolution sources, settings fields, store methods, adapter reports, and lifecycle disposers use the same names across all tasks.
