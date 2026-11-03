import Seo from '../components/Seo'
import { Link } from 'react-router-dom'
import { posts } from '../data/blog'

export default function Blog() {
  return (
    <>
      <Seo title="Blog" description="Posts about cloud, infrastructure and software." />
      <h1>Blog</h1>
      <ul className="cards">
        {posts.map((p) => (
          <li key={p.slug} className="card">
            <h3>
              <Link to={`/blog/${p.slug}`}>{p.title}</Link>
            </h3>
            <p className="tags">{p.date}</p>
            <p>{p.summary}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
