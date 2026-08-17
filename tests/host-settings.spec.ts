import { Readable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import { createSettingsHandler } from '../src/settings-api.ts'

function request(body: unknown, header = '1', extraHeaders: Record<string, string> = {}) {
  const stream = Readable.from([JSON.stringify(body)]) as Readable & {
    method: string
    headers: Record<string, string>
  }
  stream.method = 'POST'
  stream.headers = header ? { 'x-dsh-icon-theme': header, 'sec-fetch-site': 'same-origin', ...extraHeaders } : extraHeaders
  return stream
}

function response() {
  const state = { status: 0, body: '', headers: {} as Record<string, string> }
  return {
    state,
    value: {
      setHeader(name: string, value: string) { state.headers[name] = value },
      writeHead(status: number, headers: Record<string, string>) { state.status = status; Object.assign(state.headers, headers) },
      end(body = '') { state.body = body },
    },
  }
}

function settings() {
  const state = {
    revision: 2,
    value: { pack: 'dsh-fluent', overrides: {}, originalPolicy: 'prefer' },
    mutations: [] as unknown[][],
  }
  return {
    state,
    value: {
      writable: true,
      describe: () => [{ ns: 'dsh-icon-theme', value: state.value, revision: state.revision }],
      mutate: async (_ns: string, ops: unknown[], revision?: number) => {
        state.mutations.push([ops, revision])
        state.revision += 1
        state.value = { ...state.value, overrides: { 'settings.section:market': 'apps' } }
      },
    },
  }
}

describe('host settings API', () => {
  it('returns only the fixed icon namespace to trusted same-origin callers', async () => {
    const provider = settings()
    const res = response()
    await createSettingsHandler(provider.value as never)(request({ action: 'read' }) as never, res.value as never)
    expect(res.state.status).toBe(200)
    expect(JSON.parse(res.state.body)).toMatchObject({ ok: true, revision: 2, writable: true })
  })

  it('rejects requests without the non-simple same-origin header', async () => {
    const provider = settings()
    const res = response()
    await createSettingsHandler(provider.value as never)(request({ action: 'read' }, '') as never, res.value as never)
    expect(res.state.status).toBe(403)
  })

  it('accepts only top-level icon setting mutations and forwards the revision', async () => {
    const provider = settings()
    const res = response()
    const ops = [{ op: 'set', path: ['overrides'], value: { 'settings.section:market': 'apps' } }]
    await createSettingsHandler(provider.value as never)(request({ action: 'mutate', ops, expectedRevision: 2 }) as never, res.value as never)
    expect(res.state.status).toBe(200)
    expect(provider.state.mutations).toEqual([[ops, 2]])
    expect(JSON.parse(res.state.body)).toMatchObject({ ok: true, revision: 3 })
  })

  it('rejects arbitrary settings paths', async () => {
    const provider = settings()
    const res = response()
    await createSettingsHandler(provider.value as never)(request({
      action: 'mutate',
      ops: [{ op: 'set', path: ['other-plugin'], value: true }],
    }) as never, res.value as never)
    expect(res.state.status).toBe(400)
    expect(provider.state.mutations).toEqual([])
  })

  it('rejects an explicit foreign Origin even when the custom header is present', async () => {
    const provider = settings()
    const res = response()
    await createSettingsHandler(provider.value as never)(request(
      { action: 'read' },
      '1',
      { origin: 'https://evil.example', host: '127.0.0.1:3080' },
    ) as never, res.value as never)
    expect(res.state.status).toBe(403)
  })

  it('accepts an explicit same-origin HTTP request and rejects a scheme mismatch', async () => {
    const provider = settings()
    const accepted = response()
    await createSettingsHandler(provider.value as never)(request(
      { action: 'read' },
      '1',
      { origin: 'http://127.0.0.1:3080', host: '127.0.0.1:3080' },
    ) as never, accepted.value as never)
    expect(accepted.state.status).toBe(200)

    const rejected = response()
    await createSettingsHandler(provider.value as never)(request(
      { action: 'read' },
      '1',
      { origin: 'https://127.0.0.1:3080', host: '127.0.0.1:3080' },
    ) as never, rejected.value as never)
    expect(rejected.state.status).toBe(403)
  })
})
