output "vpc_id" {
  value = aws_vpc.this.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "alb_api_sg_id" {
  value = aws_security_group.alb_api.id
}

output "alb_web_sg_id" {
  value = aws_security_group.alb_web.id
}

output "ecs_api_sg_id" {
  value = aws_security_group.ecs_api.id
}

output "ecs_web_sg_id" {
  value = aws_security_group.ecs_web.id
}

output "rds_sg_id" {
  value = aws_security_group.rds.id
}

output "redis_sg_id" {
  value = aws_security_group.redis.id
}
