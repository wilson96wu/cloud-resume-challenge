export interface Project {
  slug: string
  title: string
  summary: string
  tags: string[]
  description: string
}

export const projects: Project[] = [
  {
    slug: 'cloud-resume-challenge',
    title: 'Cloud Resume Challenge',
    summary: 'This site, deployed to GCP, AWS and Azure with Terraform.',
    tags: ['React', 'Terraform', 'GCP', 'AWS', 'Azure'],
    description:
      'Placeholder: describe the architecture, what you learned and what you would do differently.',
  },
  {
    slug: 'sample-project',
    title: 'Sample Project',
    summary: 'Placeholder project to show how cards render.',
    tags: ['Python'],
    description: 'Placeholder: add a longer write-up here.',
  },
]
