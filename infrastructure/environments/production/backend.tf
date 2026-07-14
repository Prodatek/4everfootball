# Filled in by hand after `terraform apply` in infrastructure/bootstrap — see
# infrastructure/README.md step 2. Terraform backend blocks can't reference
# variables, so this one manual copy-paste is expected, not automated.
terraform {
  backend "s3" {
    bucket         = "REPLACE_WITH_bootstrap_output.state_bucket_name"
    key            = "production/terraform.tfstate"
    region         = "REPLACE_WITH_bootstrap_output.aws_region"
    dynamodb_table = "REPLACE_WITH_bootstrap_output.lock_table_name"
    encrypt        = true
  }
}
