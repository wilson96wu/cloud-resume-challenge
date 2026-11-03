import { Helmet } from 'react-helmet-async'
import { profile } from '../data/profile'

interface SeoProps {
  title?: string
  description?: string
  noindex?: boolean
}

const defaultDescription = `${profile.name}: ${profile.title}. Resume, projects and blog.`

export default function Seo({ title, description = defaultDescription, noindex }: SeoProps) {
  const fullTitle = title ? `${title} | ${profile.name}` : `${profile.name} | Resume`
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  )
}
