import { APPS } from './apps.js'
import type { Kind, Report } from './validate.js'

export interface IssueDraft {
  title: string
  body: string
  labels: string[]
}

export const LABELS: Record<string, { color: string; description: string }> = {
  'nahlášeno z webu': { color: '0e8a16', description: 'Nahlášeno přes formulář na tomandes.eu/report' },
  'žák ZUŠ MK': { color: 'e14432', description: 'Nahlásil(a) žák ZUŠ Moravský Krumlov' },
  bug: { color: 'd73a4a', description: "Something isn't working" },
  enhancement: { color: 'a2eeef', description: 'New feature or request' },
  question: { color: 'd876e3', description: 'Further information is requested' },
}

const KIND_TITLE: Record<Kind, string> = { bug: 'Chyba', idea: 'Nápad', question: 'Otázka' }
const KIND_LABEL: Record<Kind, string> = { bug: 'bug', idea: 'enhancement', question: 'question' }

// Text from the form, made harmless in an issue: no @mentions (they'd notify
// people), no #123 links to other issues, no HTML or raw links that GitHub
// would turn into something else than plain text.
export function neutralize(text: string): string {
  return text
    // Only an @ starting a word mentions someone; the @ inside an e-mail address doesn't.
    .replace(/(^|[^\w.+-])@(?=[A-Za-z0-9-])/g, '$1@​')
    .replace(/#(?=\d)/g, '#​')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// User text as a quote block: it can't break out into headings or the sections around it.
function quote(text: string): string {
  return neutralize(text)
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n')
}

export function buildIssue(report: Report): IssueDraft {
  const app = APPS[report.app]
  const sections = [`**Aplikace:** ${app.name}`]
  if (report.version) sections.push(`**Verze:** ${neutralize(report.version)}`)
  if (report.zus) sections.push('**Nahlásil(a):** žák ZUŠ Moravský Krumlov')
  sections.push('', '### Popis', quote(report.description))
  if (report.steps) sections.push('', '### Jak to zopakovat', quote(report.steps))
  sections.push('', '---', '_Nahlášeno přes [tomandes.eu/report](https://tomandes.eu/report/)._')

  const labels = ['nahlášeno z webu', KIND_LABEL[report.kind]]
  if (report.zus) labels.push('žák ZUŠ MK')
  return {
    title: `[${KIND_TITLE[report.kind]}] ${neutralize(report.title)}`,
    body: sections.join('\n'),
    labels,
  }
}

// For the private contacts repository: who to answer, and about which public issue.
export function buildContactIssue(report: Report, publicUrl: string): IssueDraft {
  return {
    title: `Kontakt k: ${neutralize(report.title)}`,
    body: [
      `**Hlášení:** ${publicUrl}`,
      `**Aplikace:** ${APPS[report.app].name}`,
      `**Kontakt:** ${neutralize(report.contact)}`,
      report.zus ? '**Žák ZUŠ Moravský Krumlov**' : '',
    ]
      .filter(Boolean)
      .join('\n'),
    labels: [],
  }
}
