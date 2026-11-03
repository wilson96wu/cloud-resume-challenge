import Markdown from 'react-markdown'
import { Link, useParams } from 'react-router-dom'
import { posts } from '../data/blog'
import Seo from '../components/Seo'
import NotFound from './NotFound'

export default function BlogPost() {
  const { slug } = useParams()
  const post = posts.find((p) => p.slug === slug)
  if (!post) return <NotFound />
  return (
    <article>
      <Seo title={post.title} description={post.summary} />
      <h1>{post.title}</h1>
      <p className="tags">{post.date}</p>
      <Markdown>{post.body}</Markdown>
      <p>
        <Link to="/blog">← All posts</Link>
      </p>
    </article>
  )
}
