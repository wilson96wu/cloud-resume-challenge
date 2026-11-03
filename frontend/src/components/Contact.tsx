import { profile } from '../data/profile'

export default function Contact() {
  return (
    <section aria-labelledby="contact-h">
      <h2 id="contact-h">Contact</h2>
      <ul>
        <li>
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </li>
        {profile.links.map((l) => (
          <li key={l.href}>
            <a href={l.href} rel="noreferrer">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
