# Testing

The release gate is:

```bash
npm run qa
npm run test:web
npm pack --dry-run
```

## Layers

1. **Config and catalog** — Schemastery rejects malformed overrides; every SVG
   is unique, local, monochrome, safe, 16 px, and attributed.
2. **Resolution** — table-driven tests lock manual, plugin, original, preset,
   inference, and fallback priority. Localized labels are explicitly excluded.
3. **DOM contracts** — jsdom covers delayed mount, host rerender, ledger/DOM
   mismatch, iconless rows, multi-root contributions, and complete disposal.
4. **Store and UI** — stable-key writes, user-layer clearing, both surfaces,
   icon picking, live source changes, filtering, and reset behavior.
5. **Lifecycle and build** — fake DSH context verifies registrations,
   subscriptions, observers, styles, and markers are owned and released.
6. **Settings wire** — Host and browser tests enforce the fixed namespace,
   same-origin non-simple header, top-level path allowlist, revision forwarding,
   unavailable state, and DSH Settings persistence.
7. **Ecosystem fixtures** — registrations pinned from five open-source plugins
   prove generic discovery of an unknown Settings section, safe gear fallback,
   manual override, and non-interference with unrelated slot surfaces.
8. **Browser fixture** — real Chromium executes the produced
   `window.__ModuleLoader__` artifact against representative Settings/sidebar
   DOM, confirms non-empty mask pixels, and restores original SVGs.
9. **Real DSH smoke** — after local installation, run:

   ```bash
   DSH_E2E_URL=http://127.0.0.1:3080 npm run test:web -- -t @real-dsh
   ```

   The test opens Settings → Icons, verifies live discovery and friendly sidebar
   names, changes the rendered Import Conversations icon, changes the Market
   icon, verifies both real DOM updates, and restores automatic selection before
   exiting.

## Regression requirements

Any new supported surface needs a fail-closed mismatch test and a disposal
test. Any new icon needs catalog generation, license metadata, semantic aliases,
and the invariant suite. Any new exact plugin adapter needs a repository/license
reference and evidence that the asset is a navigation icon rather than a logo,
banner, screenshot, or favicon.
