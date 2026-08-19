# Official DSH icons

This package embeds the official icon set from
`@deepseek-ai/dsh-client-ui-primitives` (MIT, © 2026 DeepSeek) into the icon
picker, so users can choose those glyphs without any extra install.

## What was added

- 70 official icons, exposed in the picker under the `dsh.*` ids
  (search `dsh`, `official`, or `官方` to filter them).
- Icons are static inline SVG strings generated from the primitives package;
  no runtime dependency on the package is needed.

## How to regenerate / maintain

1. Run the extraction against a copy of
   `@deepseek-ai/dsh-client-ui-primitives/lib/index.js` (see the generator
   notes in this repo's build tooling).
2. Rebuild the client bundle (`npm run build:client`).
3. Keep the license attribution above intact when redistributing.

## Icon ids

All 70 component exports from the primitives package are included, e.g.:

- `dsh.light-outline16` — line-art sun
- `dsh.dark-outline16` — moon
- `dsh.cordis-plugin-outline14` — plugin piece
- `dsh.data-outline16` — data
- `dsh.archive-outline20` — archive
- `dsh.panel-left-outline16` — left panel
- `dsh.settings-outline16` — gear

The full list is the `OFFICIAL_DSH_ICONS` constant in the built client
bundle.

## Known fix: strip clip-path / mask references for mask data URIs

Chromium cannot resolve `clip-path="url(#...)"` / `mask="url(#...)"`
fragment references inside an SVG that is used as a CSS **mask-image** data URI
(see [issues.chromium.org/40667695](https://issues.chromium.org/issues/40667695)).
The affected official icons (Settings 14/16, Cordis plugin, Agent preset) used
to render blank.

The generator's `sanitizeSvg()` therefore strips those references and their
`<defs>` blocks entirely:

- The official `clipPath` defs are no-op full-viewBox rects, so dropping them
  changes nothing.
- The agent-preset `<mask>` only punches holes that are re-drawn by the icon's
  own circle paths, so dropping the mask keeps the visible shape identical.

Keep `iconMaskUrl` as the original plain `encodeURIComponent(icon.svg)`
(no unescaping): the sanitized SVGs contain no `#`, so nothing is truncated.
