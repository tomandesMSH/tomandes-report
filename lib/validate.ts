import { APPS } from './apps.js'

export type Kind = 'bug' | 'idea' | 'question'

export interface Report {
  app: string
  kind: Kind
  title: string
  description: string
  steps: string
  version: string
  zus: boolean
  contact: string
}

export const LIMITS = { title: 120, description: 5000, steps: 3000, version: 40, contact: 200 } as const

// A human needs a few seconds to fill the form in; a bot posts at once.
export const MIN_FILL_MS = 3000

const KINDS: Kind[] = ['bug', 'idea', 'question']

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : ''
}

// The report, or what's wrong with it (in Czech - shown in the form).
export function validate(body: unknown, now = Date.now()): { report: Report } | { error: string; spam?: true } {
  if (!body || typeof body !== 'object') return { error: 'Neplatný požadavek.' }
  const b = body as Record<string, unknown>

  // The honeypot field is hidden from people; only bots fill it.
  if (text(b.website) !== '') return { error: 'Hlášení se nepodařilo odeslat.', spam: true }
  const startedAt = typeof b.startedAt === 'number' ? b.startedAt : NaN
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_MS) {
    return { error: 'Hlášení se nepodařilo odeslat, zkus to prosím znovu.', spam: true }
  }

  const app = text(b.app)
  if (!(app in APPS)) return { error: 'Vyber aplikaci.' }
  const kind = text(b.kind) as Kind
  if (!KINDS.includes(kind)) return { error: 'Vyber, o co jde.' }

  const report: Report = {
    app,
    kind,
    title: text(b.title).replace(/\s+/g, ' '),
    description: text(b.description),
    steps: text(b.steps),
    version: text(b.version).replace(/\s+/g, ' '),
    // Only the school's apps offer it.
    zus: b.zus === true && APPS[app].zus,
    contact: text(b.contact).replace(/\s+/g, ' '),
  }

  if (!report.title) return { error: 'Napiš krátký název.' }
  if (!report.description) return { error: 'Napiš, co se stalo.' }
  for (const field of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    if (report[field].length > LIMITS[field]) return { error: `Text je moc dlouhý (pole ${field}, nejvýš ${LIMITS[field]} znaků).` }
  }
  return { report }
}
