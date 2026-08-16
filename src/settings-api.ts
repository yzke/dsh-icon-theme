import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace, type SettingsPathOp, type SettingsProvider } from '@deepseek-ai/dsh-settings'
import { Config, normalizeConfig, type IconThemeConfig } from './config.ts'

export const SETTINGS_API_PATH = '/_dsh/icon-theme/settings'
const SETTINGS_API_HEADER = 'x-dsh-icon-theme'
const MAX_BODY_BYTES = 64 * 1024
const MUTABLE_FIELDS = new Set(['pack', 'overrides', 'originalPolicy'])

interface WebServerLike {
  register(options: {
    kind: 'exact'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>
  }): () => void
}

type HostContext = Context & { webServer: WebServerLike }

interface SettingsRequest {
  action: 'read' | 'mutate'
  expectedRevision?: number
  ops?: SettingsPathOp[]
}

function writeJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(value))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.byteLength
    if (size > MAX_BODY_BYTES) throw new Error('request body too large')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validateRequest(value: unknown): SettingsRequest {
  if (!isRecord(value) || (value.action !== 'read' && value.action !== 'mutate')) {
    throw new Error('invalid action')
  }
  if (value.action === 'read') return { action: 'read' }
  if (!Array.isArray(value.ops) || value.ops.length === 0 || value.ops.length > 3) {
    throw new Error('invalid operations')
  }
  const ops = value.ops.map((candidate): SettingsPathOp => {
    if (!isRecord(candidate) || (candidate.op !== 'set' && candidate.op !== 'unset')) {
      throw new Error('invalid operation')
    }
    if (!Array.isArray(candidate.path) || candidate.path.length !== 1 || typeof candidate.path[0] !== 'string' || !MUTABLE_FIELDS.has(candidate.path[0])) {
      throw new Error('invalid settings path')
    }
    return candidate.op === 'set'
      ? { op: 'set', path: [candidate.path[0]], value: candidate.value }
      : { op: 'unset', path: [candidate.path[0]] }
  })
  if (value.expectedRevision !== undefined && (!Number.isInteger(value.expectedRevision) || Number(value.expectedRevision) < 0)) {
    throw new Error('invalid revision')
  }
  return { action: 'mutate', ops, expectedRevision: value.expectedRevision as number | undefined }
}

function view(settings: SettingsProvider): { value: unknown; revision: number; writable: boolean } {
  const ns = settingsNamespace('dsh-icon-theme')
  const descriptor = settings.describe({ redactSecrets: true }).find(candidate => candidate.ns === ns)
  if (descriptor === undefined) throw new Error('settings namespace unavailable')
  return { value: descriptor.value, revision: descriptor.revision, writable: settings.writable }
}

/** A fixed-namespace, same-origin settings seam for non-provider UI plugins. */
export function createSettingsHandler(settings: SettingsProvider) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const fetchSite = String(req.headers['sec-fetch-site'] ?? '')
    if (req.headers[SETTINGS_API_HEADER] !== '1' || (fetchSite !== '' && fetchSite !== 'same-origin' && fetchSite !== 'none')) {
      writeJson(res, 403, { ok: false, error: 'forbidden' })
      return
    }
    if (req.method !== 'POST') {
      res.setHeader('allow', 'POST')
      writeJson(res, 405, { ok: false, error: 'method not allowed' })
      return
    }
    try {
      const payload = validateRequest(await readJson(req))
      if (payload.action === 'mutate') {
        await settings.mutate(settingsNamespace('dsh-icon-theme'), payload.ops ?? [], payload.expectedRevision)
      }
      writeJson(res, 200, { ok: true, ...view(settings) })
    } catch (error) {
      const conflict = isRecord(error) && error.code === 'SETTINGS_CONFLICT'
      writeJson(res, conflict ? 409 : 400, {
        ok: false,
        error: conflict ? 'settings changed; retry' : error instanceof Error ? error.message : 'settings request failed',
      })
    }
  }
}

/** Install the durable settings owner and its deliberately narrow browser API. */
export function installSettingsApi(ctx: HostContext, config?: IconThemeConfig): void {
  const base = normalizeConfig(config)
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace('dsh-icon-theme'), Config, { base, applies: 'live' })
    settingsCtx.effect(
      () => ctx.webServer.register({ kind: 'exact', path: SETTINGS_API_PATH, handler: createSettingsHandler(settingsCtx.settings) }),
      'dsh-icon-theme: settings API',
    )
  })
}
