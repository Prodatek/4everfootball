variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "web_origin" {
  description = "Browser origin allowed to PUT presigned uploads (the web ALB's DNS name by default)"
  type        = string
}
