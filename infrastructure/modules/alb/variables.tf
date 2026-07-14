variable "name" {
  description = "e.g. \"api\" or \"web\" — used to name the ALB and its target group"
  type        = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "alb_sg_id" {
  type = string
}

variable "target_port" {
  type = number
}

variable "health_check_path" {
  type    = string
  default = "/"
}

variable "enable_https" {
  type    = bool
  default = false
}

variable "acm_certificate_arn" {
  type    = string
  default = null
}
