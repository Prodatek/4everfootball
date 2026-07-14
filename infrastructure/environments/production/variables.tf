variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "project" {
  type    = string
  default = "4everfootball"
}

variable "environment" {
  type    = string
  default = "production"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "api_cpu" {
  type    = number
  default = 256
}

variable "api_memory" {
  type    = number
  default = 512
}

variable "web_cpu" {
  type    = number
  default = 256
}

variable "web_memory" {
  type    = number
  default = 512
}

variable "api_image_tag" {
  description = "Set to a real tag once pushed to ECR — see infrastructure/README.md"
  type        = string
}

variable "web_image_tag" {
  description = "Set to a real tag once pushed to ECR — see infrastructure/README.md"
  type        = string
}

variable "meilisearch_host" {
  description = "Meilisearch Cloud instance URL"
  type        = string
}

variable "meilisearch_api_key" {
  description = "Meilisearch Cloud API key — externally issued, passed through as-is"
  type        = string
  sensitive   = true
}

variable "jwt_access_ttl" {
  type    = string
  default = "15m"
}

variable "jwt_refresh_ttl" {
  type    = string
  default = "30d"
}

variable "enable_https" {
  description = "Off by default — no custom domain/ACM cert exists yet"
  type        = bool
  default     = false
}

variable "acm_certificate_arn_api" {
  type    = string
  default = null
}

variable "acm_certificate_arn_web" {
  type    = string
  default = null
}
