export interface LearningItem {
  topic: string
  note: string
}

export const learning: LearningItem[] = [
  { topic: 'Terraform', note: 'Multi-cloud infrastructure as code.' },
  { topic: 'GitHub Actions', note: 'CI/CD with OIDC instead of long-lived keys.' },
  { topic: 'Serverless', note: 'Cloud Functions, Lambda and Azure Functions.' },
]
