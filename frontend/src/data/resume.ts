export interface Job {
  company: string
  role: string
  period: string
  highlights: string[]
}

export const experience: Job[] = [
  {
    company: 'Example Co',
    role: 'Software Engineer',
    period: '2022 - present',
    highlights: ['Placeholder: what you built and the impact it had.'],
  },
]

export const education = [{ school: 'Example University', detail: 'BSc Computer Science' }]
