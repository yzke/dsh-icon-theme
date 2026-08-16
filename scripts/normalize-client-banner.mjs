#!/usr/bin/env node
import fs from 'node:fs'

const file = 'client/client.js'
const name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name
const required = `window.__ModuleLoader__.load({ id: ${JSON.stringify(name)}, factory: (require) => {`
let code = fs.readFileSync(file, 'utf8')

if (!code.startsWith(required)) {
  const lines = code.split('\n')
  const expected = [
    'window.__ModuleLoader__.load({',
    `\tid: ${JSON.stringify(name)},`,
    '\tfactory: (require) => {',
  ]
  if (!expected.every((line, index) => lines[index] === line)) {
    throw new Error(`unexpected client banner: ${lines.slice(0, 3).join(' | ')}`)
  }
  lines[0] = required
  lines[1] = ''
  lines[2] = ''
  code = lines.join('\n')
}

const root = process.cwd().replaceAll('\\', '/')
if (code.includes(root)) throw new Error('client bundle contains the local checkout path')
fs.writeFileSync(file, code)
console.log(`normalized ${file}`)
