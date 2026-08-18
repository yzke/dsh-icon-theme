# Third-party notices

## Fluent UI System Icons

The `dsh-fluent` pack contains a curated, build-time-generated subset of
[Microsoft Fluent UI System Icons](https://github.com/microsoft/fluentui-system-icons),
specifically the 16 px Regular SVG variants.

Copyright (c) Microsoft Corporation. Licensed under the MIT License.

The source package is used as a development dependency. Only 50 normalized,
monochrome SVG definitions are included in the runtime bundle; the complete
icon package and any runtime network client are not shipped.

## dsh-market glyph

The `plugin.market` glyph is adapted from the monochrome logo in
[dsh-market/dsh-market](https://github.com/dsh-market/dsh-market), licensed
under the MIT License. It is included as an audited exact-plugin adapter.

## Official DeepSeek Harness primitives icons

This contribution bundles the official icon set from
[@deepseek-ai/dsh-client-ui-primitives](https://www.npmjs.com/package/@deepseek-ai/dsh-client-ui-primitives)
(the "dsh.*" entries in the icon picker). Icons are extracted at build time
and embedded as static SVG strings; no runtime dependency is required.

Copyright (c) 2026 DeepSeek. Licensed under the MIT License (the full license
text is reproduced in the PR description / this file).
