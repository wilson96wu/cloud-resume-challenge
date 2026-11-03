import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ThemeToggle from './ThemeToggle'

describe('ThemeToggle', () => {
  it('toggles the theme and persists it', async () => {
    localStorage.setItem('theme', 'light')
    render(<ThemeToggle />)
    expect(document.documentElement.dataset.theme).toBe('light')

    await userEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(screen.getByRole('button', { name: /switch to light theme/i })).toBeInTheDocument()
  })
})
