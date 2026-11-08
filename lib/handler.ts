import { APPS, CONTACTS_REPO } from './apps.js'
import { buildContactIssue, buildIssue } from './issue.js'
import { createIssue } from './github.js'
import { validate } from './validate.js'

export interface Options {
  token: string | undefined
  // Pages that may send reports (CORS).
  allowedOrigins: string[]
  fetchImpl?: typeof fetch
  now?: number
  log?: (message: string) => void
}

export const DEFAULT_ORIGINS = ['https://tomandes.eu', 'https://www.tomandes.eu']

function cors(origin: string | null, allowed: string[]): Record<string, string> {
  // localhost for trying the form out on one's own computer.
  const ok = origin !== null && (allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
  return ok
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        Vary: 'Origin',
      }
    : { Vary: 'Origin' }
}

function json(status: number, data: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } })
}

export function handleOptions(request: Request, options: Options): Response {
  return new Response(null, { status: 204, headers: cors(request.headers.get('Origin'), options.allowedOrigins) })
}

export async function handleReport(request: Request, options: Options): Promise<Response> {
  const headers = cors(request.headers.get('Origin'), options.allowedOrigins)
  const log = options.log ?? console.error
  if (!options.token) {
    log('GITHUB_TOKEN is not set')
    return json(500, { error: 'Hlášení teď nejde odeslat. Zkus to prosím později.' }, headers)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Neplatný požadavek.' }, headers)
  }
  const result = validate(body, options.now)
  if ('error' in result) return json(400, { error: result.error }, headers)
  const report = result.report

  try {
    const issue = await createIssue(APPS[report.app].repo, buildIssue(report), options.token, options.fetchImpl)
    if (report.contact) {
      // Best-effort: the report itself already went through.
      try {
        await createIssue(CONTACTS_REPO, buildContactIssue(report, issue.url), options.token, options.fetchImpl)
      } catch (err) {
        log(`contact for ${issue.url} not saved: ${(err as Error).message}`)
      }
    }
    return json(200, { ok: true, number: issue.number, url: issue.url }, headers)
  } catch (err) {
    log(`report not filed: ${(err as Error).message}`)
    return json(502, { error: 'Hlášení se nepodařilo uložit. Zkus to prosím za chvíli znovu.' }, headers)
  }
}
