variable "project" {
  type = string
}

variable "environment" {
  type = string
}

variable "db_username" {
  type    = string
  default = "fourever"
}

variable "db_name" {
  type    = string
  default = "fourever"
}

variable "instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "rds_sg_id" {
  type = string
}
