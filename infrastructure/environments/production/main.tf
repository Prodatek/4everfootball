module "network" {
  source = "../../modules/network"

  project      = var.project
  environment  = var.environment
  vpc_cidr     = var.vpc_cidr
  enable_https = var.enable_https
}

module "ecr" {
  source = "../../modules/ecr"

  project = var.project
}

module "database" {
  source = "../../modules/database"

  project            = var.project
  environment        = var.environment
  instance_class     = var.db_instance_class
  private_subnet_ids = module.network.private_subnet_ids
  rds_sg_id          = module.network.rds_sg_id
}

module "redis" {
  source = "../../modules/redis"

  project            = var.project
  environment        = var.environment
  node_type          = var.redis_node_type
  private_subnet_ids = module.network.private_subnet_ids
  redis_sg_id        = module.network.redis_sg_id
}

module "alb_api" {
  source = "../../modules/alb"

  name                = "api"
  vpc_id              = module.network.vpc_id
  public_subnet_ids   = module.network.public_subnet_ids
  alb_sg_id           = module.network.alb_api_sg_id
  target_port         = 4000
  health_check_path   = "/health"
  enable_https        = var.enable_https
  acm_certificate_arn = var.acm_certificate_arn_api
}

module "alb_web" {
  source = "../../modules/alb"

  name                = "web"
  vpc_id              = module.network.vpc_id
  public_subnet_ids   = module.network.public_subnet_ids
  alb_sg_id           = module.network.alb_web_sg_id
  target_port         = 3000
  health_check_path   = "/"
  enable_https        = var.enable_https
  acm_certificate_arn = var.acm_certificate_arn_web
}

module "storage" {
  source = "../../modules/storage"

  project     = var.project
  environment = var.environment
  # No custom domain yet, so this is the plain-HTTP ALB DNS name — see
  # infrastructure/README.md for the CORS-over-HTTP note.
  web_origin = "http://${module.alb_web.alb_dns_name}"
}

module "secrets" {
  source = "../../modules/secrets"

  project     = var.project
  environment = var.environment
}

resource "aws_ecs_cluster" "this" {
  name = "${var.project}-${var.environment}"
}

data "aws_iam_policy_document" "ecs_tasks_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name               = "${var.project}-${var.environment}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# The execution role (not the task role) is what resolves a task
# definition's `secrets` block ARNs into env vars at container start.
data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      module.database.db_connection_url_secret_arn,
      module.secrets.jwt_access_secret_arn,
      module.secrets.jwt_refresh_secret_arn,
    ]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "${var.project}-${var.environment}-ecs-execution-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}

resource "aws_iam_role" "ecs_task_api" {
  name               = "${var.project}-${var.environment}-ecs-task-api"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_task_api_media" {
  role       = aws_iam_role.ecs_task_api.name
  policy_arn = module.storage.media_rw_policy_arn
}

# Distinct from the api task role even though it has zero extra policies —
# web makes no AWS API calls at runtime, but ECS still requires *a* task
# role reference, and reusing the api's role would violate least-privilege
# for no reason.
resource "aws_iam_role" "ecs_task_web" {
  name               = "${var.project}-${var.environment}-ecs-task-web"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json
}

module "ecs_service_api" {
  source = "../../modules/ecs-service"

  project        = var.project
  environment    = var.environment
  name           = "api"
  image          = "${module.ecr.api_repo_url}:${var.api_image_tag}"
  container_port = 4000
  cpu            = var.api_cpu
  memory         = var.api_memory

  environment_variables = {
    NODE_ENV            = "production"
    PORT                = "4000"
    JWT_ACCESS_TTL      = var.jwt_access_ttl
    JWT_REFRESH_TTL     = var.jwt_refresh_ttl
    WEB_APP_URL         = "http://${module.alb_web.alb_dns_name}"
    S3_ENDPOINT         = "https://s3.${var.aws_region}.amazonaws.com"
    S3_REGION           = var.aws_region
    S3_BUCKET           = module.storage.bucket_name
    S3_PUBLIC_URL       = module.storage.public_url_base
    MEILISEARCH_HOST    = var.meilisearch_host
    MEILISEARCH_API_KEY = var.meilisearch_api_key
  }

  secrets = {
    DATABASE_URL       = module.database.db_connection_url_secret_arn
    JWT_ACCESS_SECRET  = module.secrets.jwt_access_secret_arn
    JWT_REFRESH_SECRET = module.secrets.jwt_refresh_secret_arn
  }

  target_group_arn   = module.alb_api.target_group_arn
  cluster_id         = aws_ecs_cluster.this.id
  private_subnet_ids = module.network.private_subnet_ids
  security_group_id  = module.network.ecs_api_sg_id
  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task_api.arn
}

module "ecs_service_web" {
  source = "../../modules/ecs-service"

  project        = var.project
  environment    = var.environment
  name           = "web"
  image          = "${module.ecr.web_repo_url}:${var.web_image_tag}"
  container_port = 3000
  cpu            = var.web_cpu
  memory         = var.web_memory

  environment_variables = {
    NODE_ENV = "production"
  }

  secrets = {}

  target_group_arn   = module.alb_web.target_group_arn
  cluster_id         = aws_ecs_cluster.this.id
  private_subnet_ids = module.network.private_subnet_ids
  security_group_id  = module.network.ecs_web_sg_id
  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task_web.arn
}
