// POST /api/report - a report from tomandes.eu/report becomes an issue in the app's repository.
// GITHUB_TOKEN (Vercel project settings): a fine-grained token with "Issues: Read and write" on the apps'
// repositories and on report-contacts. See README.md.
import { DEFAULT_ORIGINS, handleOptions, handleReport, type Options } from '../lib/handler.js'

function options(): Options {
  return {
    token: process.env.GITHUB_TOKEN,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? DEFAULT_ORIGINS,
  }
}

export function POST(request: Request): Promise<Response> {
  return handleReport(request, options())
}

export function OPTIONS(request: Request): Response {
  return handleOptions(request, options())
}
