output "rds_address" {
  value = module.database.db_address
}

output "rds_port" {
  value = module.database.db_port
}

output "db_name" {
  value = module.database.db_name
}

output "db_secret_arn" {
  value = module.database.db_secret_arn
}

output "db_connection_url_secret_arn" {
  description = "Secrets Manager ARN holding the full DATABASE_URL — what render-env.mjs fetches directly"
  value       = module.database.db_connection_url_secret_arn
}

output "redis_endpoint" {
  value = module.redis.redis_endpoint
}

output "redis_port" {
  value = module.redis.redis_port
}

output "s3_bucket_name" {
  value = module.storage.bucket_name
}

output "s3_bucket_region" {
  value = module.storage.bucket_region
}

output "s3_public_url_base" {
  value = module.storage.public_url_base
}

output "alb_api_dns_name" {
  value = module.alb_api.alb_dns_name
}

output "alb_web_dns_name" {
  value = module.alb_web.alb_dns_name
}

output "ecr_api_repo_url" {
  value = module.ecr.api_repo_url
}

output "ecr_web_repo_url" {
  value = module.ecr.web_repo_url
}

output "jwt_access_secret_arn" {
  value = module.secrets.jwt_access_secret_arn
}

output "jwt_refresh_secret_arn" {
  value = module.secrets.jwt_refresh_secret_arn
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "meilisearch_host" {
  description = "Echoes the input variable — not sensitive, so retrievable like any other output"
  value       = var.meilisearch_host
}
