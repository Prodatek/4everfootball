output "bucket_name" {
  value = aws_s3_bucket.media.id
}

output "bucket_arn" {
  value = aws_s3_bucket.media.arn
}

output "bucket_region" {
  value = aws_s3_bucket.media.region
}

output "public_url_base" {
  value = "https://${aws_s3_bucket.media.id}.s3.${aws_s3_bucket.media.region}.amazonaws.com"
}

output "media_rw_policy_arn" {
  value = aws_iam_policy.media_rw.arn
}
