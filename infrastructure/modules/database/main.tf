resource "random_password" "db_master" {
  length  = 32
  special = false # avoids DATABASE_URL escaping issues (@, /, :, # etc.)
}

resource "aws_secretsmanager_secret" "db_master" {
  name = "${var.project}/${var.environment}/db/master"
}

resource "aws_secretsmanager_secret_version" "db_master" {
  secret_id = aws_secretsmanager_secret.db_master.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_master.result
  })
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-${var.environment}-db"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "this" {
  identifier     = "${var.project}-${var.environment}"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.instance_class

  allocated_storage = 20
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_master.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.rds_sg_id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 7
  # MVP iteration-speed defaults — revisit both before this holds real user data.
  skip_final_snapshot = true
  deletion_protection = false
  apply_immediately   = true
}

# ECS `secrets` blocks inject one whole value per env var — they can't
# concatenate a secret + literal text — but the app needs DATABASE_URL as a
# single connection-string env var. So the fully composed URL is its own
# secret, built from the RDS instance's real address (known only after
# creation) plus the generated password.
resource "aws_secretsmanager_secret" "db_connection_url" {
  name = "${var.project}/${var.environment}/db/connection-url"
}

resource "aws_secretsmanager_secret_version" "db_connection_url" {
  secret_id     = aws_secretsmanager_secret.db_connection_url.id
  secret_string = "postgresql://${var.db_username}:${random_password.db_master.result}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${var.db_name}?schema=public"
}
