resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.project}/${var.environment}/${var.name}"
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "this" {
  family                   = "${var.project}-${var.environment}-${var.name}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name  = var.name
      image = var.image
      portMappings = [
        { containerPort = var.container_port }
      ]
      environment = [
        for k, v in var.environment_variables : { name = k, value = v }
      ]
      secrets = [
        for k, v in var.secrets : { name = k, valueFrom = v }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = var.name
        }
      }
    }
  ])
}

data "aws_region" "current" {}

resource "aws_ecs_service" "this" {
  name            = "${var.project}-${var.environment}-${var.name}"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.name
    container_port   = var.container_port
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  # No `image_pull` retry story here — first apply will churn on failed
  # tasks until real images are pushed to ECR (see the day-1 runbook). No
  # `lifecycle { ignore_changes }` either: redeploying is just "bump the
  # image tag var, terraform apply," one mental model instead of two.
}
