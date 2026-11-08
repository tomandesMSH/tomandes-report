// Local try-out: `npm run dev` serves /api/report on http://localhost:8787 (and the report form from
// ../tomandesMSH/report on http://localhost:8788). Without GITHUB_TOKEN it uses a pretend GitHub that only logs.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { DEFAULT_ORIGINS, handleOptions, handleReport, type Options } from '../lib/handler.js'

const token = process.env.GITHUB_TOKEN
let fakeNumber = 100
const fakeGitHub = (async (url: string | URL | Request, init?: RequestInit) => {
  console.log(`[fake GitHub] ${init?.method ?? 'GET'} ${String(url)}`)
  if (init?.body) console.log(String(init.body))
  if (!init?.method) return new Response('{}', { status: 200 })
  fakeNumber++
  return new Response(JSON.stringify({ number: fakeNumber, html_url: `https://github.com/tomandesMSH/fake/issues/${fakeNumber}` }), { status: 201 })
}) as typeof fetch

const options: Options = {
  token: token ?? 'fake',
  allowedOrigins: DEFAULT_ORIGINS,
  fetchImpl: token ? fetch : fakeGitHub,
}

createServer(async (req, res) => {
  const url = `http://localhost:8787${req.url}`
  if (!req.url?.startsWith('/api/report')) {
    res.writeHead(404).end()
    return
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const request = new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
  })
  const response = req.method === 'OPTIONS' ? handleOptions(request, options) : await handleReport(request, options)
  res.writeHead(response.status, Object.fromEntries(response.headers))
  res.end(Buffer.from(await response.arrayBuffer()))
}).listen(8787, () => console.log(`api: http://localhost:8787/api/report (${token ? 'REAL GitHub' : 'pretend GitHub'})`))

// The form, from the website's repository next door.
const site = normalize(join(import.meta.dirname, '..', '..', 'tomandesMSH'))
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }
createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  if (path.endsWith('/')) path += 'index.html'
  const file = normalize(join(site, path))
  if (!file.startsWith(site)) {
    res.writeHead(403).end()
    return
  }
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(data)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(8788, () => console.log('form: http://localhost:8788/report/'))
