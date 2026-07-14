output "jwt_access_secret_arn" {
  value = aws_secretsmanager_secret.jwt_access.arn
}

output "jwt_refresh_secret_arn" {
  value = aws_secretsmanager_secret.jwt_refresh.arn
}
