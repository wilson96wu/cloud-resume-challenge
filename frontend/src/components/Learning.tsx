import { learning } from '../data/learning'

export default function Learning() {
  return (
    <section aria-labelledby="learning-h">
      <h2 id="learning-h">Learning</h2>
      <ul>
        {learning.map((l) => (
          <li key={l.topic}>
            <strong>{l.topic}</strong>: {l.note}
          </li>
        ))}
      </ul>
    </section>
  )
}
