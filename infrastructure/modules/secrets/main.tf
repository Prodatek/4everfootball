# Only Terraform-generated secrets live here. The Meilisearch API key is a
# pass-through, externally-issued credential (Meilisearch Cloud) supplied as
# a sensitive input variable directly to the ECS task's plain environment map
# in the root module — there's no generation lifecycle for Terraform to own,
# so putting it in Secrets Manager would add a resource + IAM grant for no
# benefit over marking the variable `sensitive = true`.

resource "random_password" "jwt_access" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "jwt_access" {
  name = "${var.project}/${var.environment}/jwt/access"
}

resource "aws_secretsmanager_secret_version" "jwt_access" {
  secret_id     = aws_secretsmanager_secret.jwt_access.id
  secret_string = random_password.jwt_access.result
}

resource "aws_secretsmanager_secret" "jwt_refresh" {
  name = "${var.project}/${var.environment}/jwt/refresh"
}

resource "aws_secretsmanager_secret_version" "jwt_refresh" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh.id
  secret_string = random_password.jwt_refresh.result
}
