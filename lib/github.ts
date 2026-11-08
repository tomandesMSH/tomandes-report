import { LABELS, type IssueDraft } from './issue.js'
import { OWNER } from './apps.js'

type Fetch = typeof fetch

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tomandes-report',
    'Content-Type': 'application/json',
  }
}

// Makes sure the issue's labels exist in the repository (with our colours) -
// a report must not fail just because a label hasn't been made yet.
async function ensureLabels(repo: string, labels: string[], token: string, fetchImpl: Fetch): Promise<void> {
  for (const name of labels) {
    const get = await fetchImpl(`https://api.github.com/repos/${OWNER}/${repo}/labels/${encodeURIComponent(name)}`, {
      headers: headers(token),
    })
    if (get.ok) continue
    if (get.status !== 404) throw new GitHubError(`label ${name}: ${get.status}`, get.status)
    const style = LABELS[name] ?? { color: 'ededed', description: '' }
    const create = await fetchImpl(`https://api.github.com/repos/${OWNER}/${repo}/labels`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ name, ...style }),
    })
    // 422 = someone made it in the meantime.
    if (!create.ok && create.status !== 422) throw new GitHubError(`create label ${name}: ${create.status}`, create.status)
  }
}

export async function createIssue(
  repo: string,
  issue: IssueDraft,
  token: string,
  fetchImpl: Fetch = fetch,
): Promise<{ number: number; url: string }> {
  if (issue.labels.length > 0) await ensureLabels(repo, issue.labels, token, fetchImpl)
  const response = await fetchImpl(`https://api.github.com/repos/${OWNER}/${repo}/issues`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(issue),
  })
  if (!response.ok) throw new GitHubError(`create issue in ${repo}: ${response.status} ${await response.text()}`, response.status)
  const data = (await response.json()) as { number: number; html_url: string }
  return { number: data.number, url: data.html_url }
}
