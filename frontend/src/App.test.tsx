import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from './test/renderApp'

describe('routing', () => {
  it('renders the home page with its sections', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    for (const name of ['About', 'Projects', 'Learning', 'Contact']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
  })

  it('renders a project detail page from a deep link', () => {
    renderAt('/projects/cloud-resume-challenge')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Cloud Resume Challenge' }),
    ).toBeInTheDocument()
  })

  it('renders a blog post from a deep link', () => {
    renderAt('/blog/hello-world')
    expect(screen.getByRole('heading', { level: 1, name: 'Hello, world' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /all posts/i })).toBeInTheDocument()
  })

  it.each(['/nope', '/projects/does-not-exist', '/blog/does-not-exist'])(
    'shows the 404 page for %s',
    (path) => {
      renderAt(path)
      expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument()
    },
  )

  it('navigates with the main nav', async () => {
    renderAt('/')
    await userEvent.click(screen.getByRole('link', { name: 'Resume' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Resume' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download pdf/i })).toHaveAttribute(
      'href',
      '/resume.pdf',
    )
  })
})
