import { describe, expect, it, vi } from 'vitest'
import { buildContactIssue, buildIssue, neutralize } from '../lib/issue.js'
import { validate, type Report } from '../lib/validate.js'
import { handleOptions, handleReport } from '../lib/handler.js'

const NOW = 1_000_000

const form = (extra: Record<string, unknown> = {}) => ({
  app: 'keyboard-utils',
  kind: 'bug',
  title: 'Metronom nehraje',
  description: 'Zapnu metronom a nic.',
  steps: '',
  version: '1.0.2',
  zus: false,
  contact: '',
  website: '',
  startedAt: NOW - 10_000,
  ...extra,
})

const report = (extra: Record<string, unknown> = {}): Report => {
  const result = validate(form(extra), NOW)
  if (!('report' in result)) throw new Error(result.error)
  return result.report
}

describe('validate', () => {
  it('accepts a filled form', () => {
    expect(report().title).toBe('Metronom nehraje')
  })

  it('catches bots: the hidden field filled, or sent at once', () => {
    expect(validate(form({ website: 'http://spam' }), NOW)).toMatchObject({ spam: true })
    expect(validate(form({ startedAt: NOW - 500 }), NOW)).toMatchObject({ spam: true })
    expect(validate(form({ startedAt: undefined }), NOW)).toMatchObject({ spam: true })
  })

  it('only knows its own apps and kinds', () => {
    expect(validate(form({ app: 'some-other-repo' }), NOW)).toHaveProperty('error')
    expect(validate(form({ kind: 'spam' }), NOW)).toHaveProperty('error')
  })

  it('needs a title and a description, within limits', () => {
    expect(validate(form({ title: '  ' }), NOW)).toHaveProperty('error')
    expect(validate(form({ description: '' }), NOW)).toHaveProperty('error')
    expect(validate(form({ title: 'x'.repeat(121) }), NOW)).toHaveProperty('error')
  })

  it('offers the school only for the school\'s apps', () => {
    expect(report({ zus: true }).zus).toBe(true)
    expect(report({ app: 'kaspar', zus: true }).zus).toBe(false)
  })
})

describe('buildIssue', () => {
  it('titles by kind and labels it', () => {
    const issue = buildIssue(report())
    expect(issue.title).toBe('[Chyba] Metronom nehraje')
    expect(issue.labels).toEqual(['nahlášeno z webu', 'bug'])
    expect(issue.body).toContain('**Aplikace:** Keyboard Utils')
    expect(issue.body).toContain('**Verze:** 1.0.2')
    expect(issue.body).toContain('> Zapnu metronom a nic.')
  })

  it('marks pupils and maps ideas and questions', () => {
    expect(buildIssue(report({ zus: true })).labels).toContain('žák ZUŠ MK')
    expect(buildIssue(report({ kind: 'idea' })).labels).toContain('enhancement')
    expect(buildIssue(report({ kind: 'question' })).title).toMatch(/^\[Otázka\]/)
  })

  it('never puts the contact into the public issue', () => {
    const issue = buildIssue(report({ contact: 'jan@example.com' }))
    expect(JSON.stringify(issue)).not.toContain('jan@example.com')
  })

  it('keeps user text from pinging people, linking issues or breaking out of its quote', () => {
    expect(neutralize('@octocat #12 <script>')).toBe('@​octocat #​12 &lt;script&gt;')
    expect(neutralize('ahoj (@octocat)')).toBe('ahoj (@​octocat)')
    expect(neutralize('jan.novak@example.com')).toBe('jan.novak@example.com')
    const body = buildIssue(report({ description: 'řádek 1\n### Nadpis\n@someone' })).body
    expect(body).toContain('> ### Nadpis')
    expect(body).not.toMatch(/@someone/)
  })

  it('puts the contact in the private issue with a link to the public one', () => {
    const contact = buildContactIssue(report({ contact: 'jan@example.com' }), 'https://github.com/x/y/issues/7')
    expect(contact.body).toContain('jan@example.com')
    expect(contact.body).toContain('https://github.com/x/y/issues/7')
  })
})

describe('handleReport', () => {
  function gitHub() {
    const calls: { url: string; method: string; body?: unknown }[] = []
    let next = 40
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      calls.push({ url: String(url), method, body: init?.body ? JSON.parse(String(init.body)) : undefined })
      if (method === 'GET') return new Response('{}', { status: 200 }) // labels exist
      next++
      return new Response(JSON.stringify({ number: next, html_url: `https://github.com/tomandesMSH/repo/issues/${next}` }), { status: 201 })
    }) as unknown as typeof fetch
    return { calls, fetchImpl }
  }

  const post = (data: unknown, origin = 'https://tomandes.eu') =>
    new Request('https://report.test/api/report', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

  it('files the issue in the app\'s repository and answers with its link', async () => {
    const { calls, fetchImpl } = gitHub()
    const response = await handleReport(post(form()), { token: 't', allowedOrigins: ['https://tomandes.eu'], fetchImpl, now: NOW })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, number: 41 })
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://tomandes.eu')
    const created = calls.filter((c) => c.method === 'POST')
    expect(created).toHaveLength(1)
    expect(created[0].url).toBe('https://api.github.com/repos/tomandesMSH/Keyboard-Utils/issues')
  })

  it('sends the contact to the private repository only', async () => {
    const { calls, fetchImpl } = gitHub()
    await handleReport(post(form({ contact: 'jan@example.com' })), { token: 't', allowedOrigins: [], fetchImpl, now: NOW })
    const created = calls.filter((c) => c.method === 'POST')
    expect(created.map((c) => c.url)).toEqual([
      'https://api.github.com/repos/tomandesMSH/Keyboard-Utils/issues',
      'https://api.github.com/repos/tomandesMSH/report-contacts/issues',
    ])
    expect(JSON.stringify(created[0].body)).not.toContain('jan@example.com')
    expect(JSON.stringify(created[1].body)).toContain('jan@example.com')
  })

  it('gives pupils a plain thank-you, without the GitHub link', async () => {
    const { fetchImpl } = gitHub()
    const response = await handleReport(post(form({ zus: true })), { token: 't', allowedOrigins: [], fetchImpl, now: NOW })
    expect(await response.json()).toEqual({ ok: true })
  })

  it('creates missing labels first', async () => {
    const calls: string[] = []
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${String(url)}`)
      if (!init?.method) return new Response('{}', { status: 404 })
      return new Response(JSON.stringify({ number: 1, html_url: 'u' }), { status: 201 })
    }) as unknown as typeof fetch
    await handleReport(post(form()), { token: 't', allowedOrigins: [], fetchImpl, now: NOW })
    expect(calls.filter((c) => c.startsWith('POST') && c.endsWith('/labels'))).toHaveLength(2)
  })

  it('refuses bots and bad input without touching GitHub', async () => {
    const { calls, fetchImpl } = gitHub()
    const response = await handleReport(post(form({ website: 'x' })), { token: 't', allowedOrigins: [], fetchImpl, now: NOW })
    expect(response.status).toBe(400)
    expect(calls).toHaveLength(0)
  })

  it('hides GitHub errors from the reader', async () => {
    const fetchImpl = (async () => new Response('Bad credentials', { status: 401 })) as unknown as typeof fetch
    const log = vi.fn()
    const response = await handleReport(post(form()), { token: 't', allowedOrigins: [], fetchImpl, now: NOW, log })
    expect(response.status).toBe(502)
    expect(JSON.stringify(await response.json())).not.toContain('credentials')
    expect(log).toHaveBeenCalled()
  })

  it('refuses without a token', async () => {
    const response = await handleReport(post(form()), { token: undefined, allowedOrigins: [], log: () => {} })
    expect(response.status).toBe(500)
  })

  it('answers CORS only for its own pages (and localhost)', () => {
    const allowed = { token: 't', allowedOrigins: ['https://tomandes.eu'] }
    const preflight = (origin: string) =>
      handleOptions(new Request('https://x/api/report', { method: 'OPTIONS', headers: { Origin: origin } }), allowed)
    expect(preflight('https://tomandes.eu').headers.get('Access-Control-Allow-Origin')).toBe('https://tomandes.eu')
    expect(preflight('http://localhost:5500').headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5500')
    expect(preflight('https://evil.example').headers.get('Access-Control-Allow-Origin')).toBeNull()
  })
})
