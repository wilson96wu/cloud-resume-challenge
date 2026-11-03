import { profile } from '../data/profile'

export default function About() {
  return (
    <section aria-labelledby="about-h">
      <h2 id="about-h">About</h2>
      <p>{profile.summary}</p>
    </section>
  )
}
