export interface BlogPost {
  slug: string
  title: string
  date: string
  summary: string
  body: string
}

const files = import.meta.glob('../content/blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// Minimal frontmatter parser: `key: value` lines between two `---` fences.
function parse(slug: string, raw: string): BlogPost {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  const meta: Record<string, string> = {}
  for (const line of (match?.[1] ?? '').split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return {
    slug,
    title: meta.title ?? slug,
    date: meta.date ?? '',
    summary: meta.summary ?? '',
    body: match?.[2] ?? raw,
  }
}

export const posts: BlogPost[] = Object.entries(files)
  .map(([path, raw]) => parse(path.split('/').pop()!.replace(/\.md$/, ''), raw))
  .sort((a, b) => b.date.localeCompare(a.date))
