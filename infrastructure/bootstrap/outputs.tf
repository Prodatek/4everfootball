output "state_bucket_name" {
  description = "Copy this into environments/production/backend.tf as `bucket`"
  value       = aws_s3_bucket.tf_state.id
}

output "lock_table_name" {
  description = "Copy this into environments/production/backend.tf as `dynamodb_table`"
  value       = aws_dynamodb_table.tf_lock.name
}

output "aws_region" {
  description = "Copy this into environments/production/backend.tf as `region`"
  value       = var.aws_region
}
