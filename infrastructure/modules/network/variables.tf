variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "enable_https" {
  description = "Whether to open port 443 on the ALB security groups"
  type        = bool
  default     = false
}
