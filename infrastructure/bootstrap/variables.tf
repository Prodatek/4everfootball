variable "project" {
  description = "Short project name used to prefix resource names"
  type        = string
  default     = "4everfootball"
}

variable "aws_region" {
  description = "AWS region to create the state bucket/lock table in"
  type        = string
  default     = "eu-west-1"
}
