import Seo from '../components/Seo'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" noindex />
      <h1>404: Page not found</h1>
      <p>
        <Link to="/">Back to home</Link>
      </p>
    </>
  )
}
