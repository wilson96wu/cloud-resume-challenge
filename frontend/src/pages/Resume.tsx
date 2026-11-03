import Seo from '../components/Seo'
import { education, experience } from '../data/resume'

export default function Resume() {
  return (
    <>
      <Seo title="Resume" description="Work experience and education." />
      <h1>Resume</h1>
      <p>
        <a href="/resume.pdf" download>
          Download PDF
        </a>
      </p>
      <section aria-labelledby="exp-h">
        <h2 id="exp-h">Experience</h2>
        {experience.map((job) => (
          <article key={`${job.company}-${job.period}`}>
            <h3>
              {job.role}, {job.company}
            </h3>
            <p className="tags">{job.period}</p>
            <ul>
              {job.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
      <section aria-labelledby="edu-h">
        <h2 id="edu-h">Education</h2>
        <ul>
          {education.map((e) => (
            <li key={e.school}>
              {e.school}: {e.detail}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
