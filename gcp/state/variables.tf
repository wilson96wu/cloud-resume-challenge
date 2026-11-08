variable "project_id" {
  description = "GCP project that owns the state bucket."
  type        = string
}

variable "region" {
  description = "Location of the state bucket (a single region, e.g. us-central1)."
  type        = string
}

variable "bucket_name" {
  description = "Override the state bucket name. Defaults to <project_id>-tfstate. Must be globally unique."
  type        = string
  default     = null
}

variable "noncurrent_versions_to_keep" {
  description = "Number of old state versions to keep per object before older ones are deleted."
  type        = number
  default     = 10
}
