resource "google_storage_bucket" "tfstate" {
  name     = coalesce(var.bucket_name, "${var.project_id}-tfstate")
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # Versioning keeps every revision of the state; cap the history so it
  # doesn't grow forever. Live (current) state is never touched by this rule.
  lifecycle_rule {
    condition {
      num_newer_versions = var.noncurrent_versions_to_keep
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # Refuse to delete a bucket that still holds state, and guard against
  # an accidental `terraform destroy`.
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}
