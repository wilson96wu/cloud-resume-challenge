import { Link, useParams } from 'react-router-dom'
import { projects } from '../data/projects'
import Seo from '../components/Seo'
import NotFound from './NotFound'

export default function ProjectDetail() {
  const { slug } = useParams()
  const project = projects.find((p) => p.slug === slug)
  if (!project) return <NotFound />
  return (
    <>
      <Seo title={project.title} description={project.summary} />
      <h1>{project.title}</h1>
      <p className="tags">{project.tags.join(' · ')}</p>
      <p>{project.description}</p>
      <p>
        <Link to="/projects">← All projects</Link>
      </p>
    </>
  )
}
