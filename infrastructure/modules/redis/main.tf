# Single-node cluster (not a replication group) — no cluster mode, kept cheap.
# Nothing in the app reads/writes Redis yet; this exists so it's ready when a
# real feature needs it, without paying for more than one small node today.
resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.project}-${var.environment}-redis"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_cluster" "this" {
  cluster_id         = "${var.project}-${var.environment}"
  engine             = "redis"
  engine_version     = "7.1"
  node_type          = var.node_type
  num_cache_nodes    = 1
  port               = 6379
  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [var.redis_sg_id]
  apply_immediately  = true
}
