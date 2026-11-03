import { describe, expect, it } from 'vitest'
import { posts } from './blog'

describe('blog posts', () => {
  it('loads Markdown posts with parsed frontmatter', () => {
    const post = posts.find((p) => p.slug === 'hello-world')
    expect(post).toMatchObject({ title: 'Hello, world', date: '2026-01-01' })
    expect(post?.summary).not.toBe('')
    expect(post?.body).not.toContain('---')
  })

  it('sorts posts newest first', () => {
    const dates = posts.map((p) => p.date)
    expect(dates).toEqual([...dates].sort().reverse())
  })
})
