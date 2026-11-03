import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// Moves focus to <main> and scrolls to the top on client-side navigation so
// keyboard and screen-reader users land at the start of the new page.
export default function RouteAnnouncer() {
  const { pathname } = useLocation()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo(0, 0)
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])

  return null
}
