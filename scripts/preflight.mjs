#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const clientFile = path.resolve('client/client.js')
const generatedFile = path.resolve('src/client/generated/fluent-icons.ts')
const required = `window.__ModuleLoader__.load({ id: ${JSON.stringify(manifest.name)}, factory: (require) => {`

if (!fs.existsSync('lib/index.js') || !fs.existsSync(clientFile)) throw new Error('build artifacts are missing')
const client = fs.readFileSync(clientFile, 'utf8')
if (!client.startsWith(required)) throw new Error('client loader banner is invalid')
if (/api\.iconify|cdn\.jsdelivr|unpkg\.com|raw\.githubusercontent|fetch\([^)]*(icon|svg)/i.test(client)) {
  throw new Error('client bundle contains a runtime icon download path')
}
if (client.includes(process.cwd().replaceAll('\\', '/'))) throw new Error('client bundle leaks the checkout path')
if (Buffer.byteLength(client) > 500_000) throw new Error(`client bundle is unexpectedly large: ${Buffer.byteLength(client)} bytes`)

const generated = fs.readFileSync(generatedFile, 'utf8')
const generatedCount = (generated.match(/^  "[^"]+":/gm) ?? []).length
if (generatedCount !== 50) throw new Error(`expected 50 generated Fluent icons, found ${generatedCount}`)

for (const requiredFile of ['cordis.patch.yml', 'dsh.plugin.json', 'README.md', 'README.zh.md', 'THIRD_PARTY_NOTICES.md', 'LICENSE']) {
  if (!fs.existsSync(requiredFile)) throw new Error(`missing package file: ${requiredFile}`)
}

console.log(`preflight ok: ${generatedCount + 1} icons, ${Buffer.byteLength(client)} byte client bundle`)
