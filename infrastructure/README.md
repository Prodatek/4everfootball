# Infrastructure (AWS via Terraform)

Single `production` environment for now (see `environments/production/`); every
module under `modules/` is generic enough that a second environment later is
just a new folder reusing the same modules with its own `terraform.tfvars` and
state key.

Meilisearch runs on Meilisearch Cloud (SaaS) — no AWS compute for search, just
config passed through. ElastiCache Redis is provisioned even though no app
code reads/writes it yet (forward-looking). No custom domain yet, so `api` and
`web` each get their own ALB with an AWS-issued DNS name rather than
host-based routing.

## Day-1 apply

1. **Bootstrap the remote state backend (once, local state):**
   ```bash
   cd infrastructure/bootstrap
   terraform init
   terraform apply
   ```
   Copy the 3 outputs (`state_bucket_name`, `lock_table_name`, `aws_region`).

2. **Wire the backend:** paste those 3 values into
   `environments/production/backend.tf` (Terraform backend blocks can't take
   variables, so this one manual copy-paste is expected).

3. **Configure variables:**
   ```bash
   cd ../environments/production
   cp terraform.tfvars.example terraform.tfvars
   ```
   Fill in `meilisearch_host` / `meilisearch_api_key` (from your Meilisearch
   Cloud project). Leave `api_image_tag`/`web_image_tag` as the placeholder
   for now — see step 5.

4. **First apply:**
   ```bash
   terraform init
   terraform apply
   ```
   This creates everything — VPC, RDS, ElastiCache, S3, ECR, both ALBs, IAM,
   Secrets Manager, the ECS cluster, and the ECS services themselves. The
   services **will fail to start tasks** since no image exists in ECR yet —
   expected, not a bug. The ALB target groups show unhealthy until step 6.
   (Terraform has no primitive for "wait until an image exists in ECR," so
   this is a documented manual step between two applies rather than a
   `depends_on` trick.)

5. **Build and push real images:**
   ```bash
   aws ecr get-login-password --region <region> | \
     docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com

   docker build -f apps/api/Dockerfile --target runtime -t <ecr_api_repo_url>:v1 .
   docker push <ecr_api_repo_url>:v1

   API_URL="http://$(terraform output -raw alb_api_dns_name)"
   docker build -f apps/web/Dockerfile --target runtime \
     --build-arg NEXT_PUBLIC_API_URL="$API_URL" \
     -t <ecr_web_repo_url>:v1 .
   docker push <ecr_web_repo_url>:v1
   ```
   (`<ecr_api_repo_url>`/`<ecr_web_repo_url>` are `terraform output ecr_api_repo_url` / `ecr_web_repo_url`.)

6. **Redeploy with real tags:** set `api_image_tag`/`web_image_tag = "v1"` in
   `terraform.tfvars`, then `terraform apply` again. Redeploying later is
   always this same "bump the tag, apply" step.

7. **Run migrations once**, against the live RDS instance, via a one-off ECS
   `RunTask` using the `build`-stage image (it still has the `prisma` CLI —
   the `runtime` image doesn't). Don't open `rds_sg` to the public internet,
   even temporarily.

8. **Render convenience `.env` files** (for local testing against the live
   cloud resources, or as an audit artifact — not what the deployed
   containers read; those get their config directly from Terraform resource
   references):
   ```bash
   cd ../../scripts
   pnpm install   # one-time, this is a standalone package, not part of the pnpm workspace
   MEILISEARCH_API_KEY=... node render-env.mjs
   ```
   Writes `infrastructure/generated/apps-api.env` and `apps-web.env`
   (gitignored).

9. **Smoke test:**
   ```bash
   curl "http://$(terraform output -raw alb_api_dns_name)/health"
   ```
   and open the web ALB's DNS name in a browser.

## Notes / known trade-offs

- Single NAT gateway: both private subnets route through it, so an outage in
  that AZ takes down private-subnet egress in both AZs, not just one. Fine
  for MVP cost; revisit if uptime requirements tighten.
- RDS: `skip_final_snapshot = true`, `deletion_protection = false`,
  single-AZ. Flip all three before this instance holds real user data.
- CORS for presigned S3 uploads allows the web ALB's plain-HTTP origin (no
  domain/cert yet) — this works (CORS matches on the Origin header, not
  transport), but is worth a smoke test on day 1 since it's untested at this
  scale.
- The Meilisearch API key sits in `terraform.tfstate` in plaintext (it's a
  pass-through external credential, not Terraform-generated, so it isn't a
  Secrets Manager candidate) — mitigated by the state bucket's encryption and
  access controls from the bootstrap module.
