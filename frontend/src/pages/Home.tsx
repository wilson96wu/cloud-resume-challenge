import Seo from '../components/Seo'
import About from '../components/About'
import Contact from '../components/Contact'
import Learning from '../components/Learning'
import ProjectList from '../components/ProjectList'
import { profile } from '../data/profile'

export default function Home() {
  return (
    <>
      <Seo />
      <h1>{profile.name}</h1>
      <p className="lede">{profile.title}</p>
      <About />
      <ProjectList />
      <Learning />
      <Contact />
    </>
  )
}
