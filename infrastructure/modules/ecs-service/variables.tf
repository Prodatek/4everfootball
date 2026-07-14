variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "name" {
  description = "e.g. \"api\" or \"web\""
  type        = string
}

variable "image" {
  description = "Full ECR image URI including tag"
  type        = string
}

variable "container_port" {
  type = number
}

variable "cpu" {
  type    = number
  default = 256
}

variable "memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "environment_variables" {
  description = "Plain (non-secret) container env vars"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Container env vars sourced from Secrets Manager, map of name -> secret ARN"
  type        = map(string)
  default     = {}
}

variable "target_group_arn" {
  type = string
}

variable "cluster_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "security_group_id" {
  type = string
}

variable "execution_role_arn" {
  type = string
}

variable "task_role_arn" {
  type = string
}
