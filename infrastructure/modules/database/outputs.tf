output "db_address" {
  value = aws_db_instance.this.address
}

output "db_port" {
  value = aws_db_instance.this.port
}

output "db_name" {
  value = aws_db_instance.this.db_name
}

output "db_secret_arn" {
  description = "Secrets Manager ARN holding {username, password} JSON — never the password itself"
  value       = aws_secretsmanager_secret.db_master.arn
}

output "db_connection_url_secret_arn" {
  description = "Secrets Manager ARN holding the full postgresql:// DATABASE_URL — what the ECS task's `secrets` block should reference"
  value       = aws_secretsmanager_secret.db_connection_url.arn
}
