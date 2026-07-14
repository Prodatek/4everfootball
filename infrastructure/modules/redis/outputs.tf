output "redis_endpoint" {
  description = "Not wired into any ECS task's environment yet — no app code reads it today"
  value       = aws_elasticache_cluster.this.cache_nodes[0].address
}

output "redis_port" {
  value = aws_elasticache_cluster.this.cache_nodes[0].port
}
