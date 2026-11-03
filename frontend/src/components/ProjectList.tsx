import { Link } from 'react-router-dom'
import { projects } from '../data/projects'

export default function ProjectList() {
  return (
    <section aria-labelledby="projects-h">
      <h2 id="projects-h">Projects</h2>
      <ul className="cards">
        {projects.map((p) => (
          <li key={p.slug} className="card">
            <h3>
              <Link to={`/projects/${p.slug}`}>{p.title}</Link>
            </h3>
            <p>{p.summary}</p>
            <p className="tags">{p.tags.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
