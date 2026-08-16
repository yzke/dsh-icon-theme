// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { HostSettingsScope } from '../src/client/host-settings.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('HostSettingsScope', () => {
  it('loads and mutates through the fixed same-origin endpoint', async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = []
    let revision = 4
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input: String(input), init })
      revision += calls.length > 1 ? 1 : 0
      return jsonResponse({
        ok: true,
        value: { pack: 'dsh-fluent', overrides: {}, originalPolicy: 'prefer' },
        revision,
        writable: true,
      })
    }
    const scope = new HostSettingsScope(fetcher)
    await expect.poll(() => scope.getSnapshot().status).toBe('ready')
    await scope.set('overrides', { 'settings.section:market': 'apps' })
    expect(calls).toHaveLength(2)
    expect(calls[0]?.input).toBe('/_dsh/icon-theme/settings')
    expect(calls[0]?.init?.headers).toMatchObject({ 'x-dsh-icon-theme': '1' })
    expect(JSON.parse(String(calls[1]?.init?.body))).toMatchObject({ action: 'mutate', expectedRevision: 4 })
  })

  it('becomes unavailable when the Host endpoint is absent', async () => {
    const scope = new HostSettingsScope(async () => jsonResponse({ ok: false, error: 'missing' }, 404))
    await expect.poll(() => scope.getSnapshot().status).toBe('unavailable')
    expect(scope.getSnapshot().writable).toBe(false)
  })
})
