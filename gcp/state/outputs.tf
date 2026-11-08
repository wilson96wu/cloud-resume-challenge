output "bucket_name" {
  description = "Use this as `bucket` in the backend block of every other stack."
  value       = google_storage_bucket.tfstate.name
}
