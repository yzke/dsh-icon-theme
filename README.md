# dsh-icon-theme

English | [简体中文](README.zh.md)

Automatic, coherent, and user-customizable icons for DeepSeek Harness Settings and sidebar actions.

![Settings overview](docs/images/settings-overview.png)

_Screenshots use the Chinese locale; the plugin ships equivalent English labels._

## Why this plugin

DSH 0.1.x settings contributions expose stable IDs and labels, but not an icon field. As a result, many third-party pages fall back to the same gear. `dsh-icon-theme` discovers the live slot ledger, preserves trustworthy original icons, fills recognizable gaps with a small Fluent-style pack, and lets the user override every supported target.

- Discovers live winning `settings.section` and `sidebar.footer.action` contributions generically. Audited per-plugin records are used only when a sidebar is partially rendered and cannot be correlated by order.
- Stores choices by stable key, such as `settings.section:market`, never by translated labels or DOM position.
- Ships 50 curated Fluent UI 16 Regular glyphs plus the audited monochrome dsh-market glyph.
- Uses no icon CDN, webfont, Iconify API, GitHub request, or package scanning at runtime.
- Restores every host SVG and owned DOM marker on unload or hot reload.
- Reports non-rendered contributions and non-icon cards instead of pretending they were changed.
- Falls back to the Settings gear when a target has neither a trustworthy match nor an original icon.

## Install

```bash
dsh plugin --profile web add dsh-icon-theme
```

Restart `dsh web`, then open **Settings → Icons**.

To install from a source checkout instead:

```bash
git clone https://github.com/yzke/dsh-icon-theme.git
cd dsh-icon-theme
npm ci
npm run build
dsh plugin --profile web add link:"$PWD"
```

Supported DSH range: `>=0.1.0-rc.6 <0.2.0`. Node.js 22 or newer is required for source builds.

## Use

The page lists every discovered target, its stable key, its compatibility state, and the source of the current icon. Search by feature name, ID, or icon; filter Settings/sidebar/unrecognized/customized entries; choose a glyph; or restore one/all targets to automatic behavior.

![Icon picker](docs/images/icon-picker.png)

Resolution is deterministic:

1. User override.
2. Audited, bundled plugin glyph.
3. Trustworthy DSH/plugin original.
4. Exact stable-ID preset.
5. Unambiguous stable-ID inference.
6. Existing host fallback, or Settings gear when no original exists.

Localized labels are display and search text only. They never decide a persisted mapping.

## Sidebar behavior

| State | Behavior |
| --- | --- |
| Rendered icon action | Changeable; the original is preserved by default. |
| Registered but not rendered | Listed as “can preset”; the override applies when it appears. |
| Non-icon card | Reported but deliberately left unchanged. |
| Unknown or changed DOM | Left untouched unless a unique audited compatibility record exists. |

The compatibility layer is intentionally narrow and reversible because DSH 0.1.x does not yet expose a public icon resolver. See [the design note](docs/design.md) for the contract and upstream direction.

When `dsh-better-sidebar` is installed, its own Settings row icon is treated as a trusted original and preserved by default. It is replaced only when the user chooses `replace-generic` (or a manual override).

## Ecosystem checks

Compatibility fixtures are pinned to real open-source registration excerpts, including `dsh-full-remote`, `dsh-context`, `dsh-openpencil`, `dsh-approve-for-me`, and `dsh-composer-polish`. They prove that an unknown Settings section is discovered generically, while contributions to unrelated surfaces are not misidentified. Details and pinned commits are in [ecosystem compatibility](docs/ecosystem-compatibility.md).

## Development and release gate

```bash
npm ci
npm run qa
npm run test:web
npm pack --dry-run
```

For the optional live-host smoke test:

```bash
DSH_E2E_URL=http://127.0.0.1:3080 npm run test:web -- -t @real-dsh
```

The full testing contract is documented in [TESTING.md](TESTING.md). Icon sources and licenses are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Privacy and security

Detection reads only DSH slot metadata and the two rendered UI surfaces. The plugin does not inspect user files or other plugins' bundles. Settings use a fixed-namespace, same-origin Host endpoint that accepts only `overrides` and `originalPolicy`; it cannot read or mutate another plugin's namespace.

MIT licensed.
