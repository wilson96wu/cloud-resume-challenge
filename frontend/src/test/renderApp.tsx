import { render } from '@testing-library/react'
import App from '../App'

// App owns its BrowserRouter, so navigate by setting the URL before rendering.
export function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}
