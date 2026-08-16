# dsh-icon-theme

Automatic, coherent, and user-customizable icons for DeepSeek Harness Settings
and sidebar actions.

## Highlights

- Discovers live `settings.section` and `sidebar.footer.action` slot ledgers.
- Persists choices under stable ids, never localized labels or CSS hashes.
- Preserves dedicated DSH/plugin icons and replaces generic Settings gears.
- Ships 50 curated Fluent UI 16 Regular glyphs plus an audited dsh-market glyph.
- Runs fully offline with no Iconify, CDN, GitHub, or remote SVG request.
- Restores every original host SVG on unload or hot reload.
- Fails closed when the host DOM no longer matches the public slot ledger.

## Development install

```bash
npm install
npm run qa
dsh plugin --profile web add link:/absolute/path/to/dsh-icon-theme
```

Restart `dsh web`, then open **Settings → Icons**. The npm installation command
after publication will be:

```bash
dsh plugin --profile web add dsh-icon-theme
```

The first release targets DSH `>=0.1.0-rc.6 <0.2.0`. See
[README.zh.md](README.zh.md), [docs/design.md](docs/design.md), and
[TESTING.md](TESTING.md) for the complete design and compatibility contract.

## Runtime safety

Detection reads only DSH slot metadata and the current rendered surfaces. It
does not scan user files, parse other plugins' compiled bundles, or guess from
README images and favicons. An exact plugin glyph is bundled only after its
source, license, monochrome form, and 16 px optical fit have been audited.
