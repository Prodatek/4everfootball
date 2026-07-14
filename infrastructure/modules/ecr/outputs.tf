output "api_repo_url" {
  value = aws_ecr_repository.api.repository_url
}

output "web_repo_url" {
  value = aws_ecr_repository.web.repository_url
}

output "api_repo_name" {
  value = aws_ecr_repository.api.name
}

output "web_repo_name" {
  value = aws_ecr_repository.web.name
}
