import { NavLink, Outlet } from 'react-router-dom'
import { profile } from '../data/profile'
import RouteAnnouncer from './RouteAnnouncer'
import ThemeToggle from './ThemeToggle'
import VisitorCounter from './VisitorCounter'

const year = new Date().getFullYear()

export default function Layout() {
  return (
    <div className="shell">
      <RouteAnnouncer />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <NavLink to="/" className="brand">
          {profile.name}
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/resume">Resume</NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/blog">Blog</NavLink>
        </nav>
        <ThemeToggle />
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <VisitorCounter />
        <p>
          © {year} {profile.name}
        </p>
      </footer>
    </div>
  )
}
