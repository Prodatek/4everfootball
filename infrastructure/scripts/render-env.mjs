#!/usr/bin/env node
// Renders convenience `.env`-shaped files from `terraform output` + Secrets
// Manager, for local testing against the live cloud resources or as an audit
// artifact. NOT what the deployed containers read — the ECS task definitions
// get their config directly from Terraform resource references (see
// infrastructure/environments/production/main.tf). Written to
// infrastructure/generated/, which is gitignored.
//
// Usage: MEILISEARCH_API_KEY=... node render-env.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const productionDir = join(__dirname, "..", "environments", "production");
const generatedDir = join(__dirname, "..", "generated");

function fail(message) {
  console.error(`render-env: ${message}`);
  process.exit(1);
}

function terraformOutputs() {
  let raw;
  try {
    raw = execFileSync(
      "terraform",
      ["-chdir=" + productionDir, "output", "-json"],
      { encoding: "utf8" },
    );
  } catch (err) {
    fail(`\`terraform output -json\` failed: ${err.message}`);
  }
  const parsed = JSON.parse(raw);
  const outputs = {};
  for (const [key, { value }] of Object.entries(parsed)) {
    outputs[key] = value;
  }
  return outputs;
}

async function fetchSecret(client, arn) {
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: arn }),
  );
  return result.SecretString;
}

// Self-check: fail loudly rather than silently drift from what
// env.validation.ts actually requires.
function envExampleKeys(path) {
  const content = readFileSync(path, "utf8");
  return content
    .split("\n")
    .map((line) => line.match(/^([A-Z0-9_]+)=/))
    .filter(Boolean)
    .map((match) => match[1]);
}

async function main() {
  const meilisearchApiKey = process.env.MEILISEARCH_API_KEY;
  if (!meilisearchApiKey) {
    fail(
      "MEILISEARCH_API_KEY env var is required (it's a sensitive Terraform " +
        "variable, not queryable via `terraform output`) — set it to the " +
        "same value as in terraform.tfvars and re-run.",
    );
  }

  const outputs = terraformOutputs();
  const secretsClient = new SecretsManagerClient({});

  const [databaseUrl, jwtAccessSecret, jwtRefreshSecret] = await Promise.all([
    fetchSecret(secretsClient, outputs.db_connection_url_secret_arn),
    fetchSecret(secretsClient, outputs.jwt_access_secret_arn),
    fetchSecret(secretsClient, outputs.jwt_refresh_secret_arn),
  ]);

  const apiEnv = {
    NODE_ENV: "production",
    PORT: "4000",
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_ACCESS_TTL: "15m",
    JWT_REFRESH_TTL: "30d",
    WEB_APP_URL: `http://${outputs.alb_web_dns_name}`,
    S3_ENDPOINT: `https://s3.${outputs.s3_bucket_region}.amazonaws.com`,
    S3_REGION: outputs.s3_bucket_region,
    S3_BUCKET: outputs.s3_bucket_name,
    S3_PUBLIC_URL: outputs.s3_public_url_base,
    MEILISEARCH_HOST: outputs.meilisearch_host,
    MEILISEARCH_API_KEY: meilisearchApiKey,
  };

  const webEnv = {
    NEXT_PUBLIC_API_URL: `http://${outputs.alb_api_dns_name}`,
  };

  // S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are intentionally absent — real
  // AWS S3 uses the ECS task role, not static keys (see env.validation.ts).
  const expectedApiKeys = envExampleKeys(
    join(repoRoot, "apps", "api", ".env.example"),
  ).filter((key) => key !== "S3_ACCESS_KEY_ID" && key !== "S3_SECRET_ACCESS_KEY");
  const missing = expectedApiKeys.filter((key) => !(key in apiEnv));
  if (missing.length > 0) {
    fail(
      `apps/api/.env.example requires ${missing.join(", ")} but this script ` +
        "doesn't render them — update render-env.mjs to keep it in sync.",
    );
  }

  mkdirSync(generatedDir, { recursive: true });

  const toEnvFile = (vars) =>
    Object.entries(vars)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n";

  writeFileSync(join(generatedDir, "apps-api.env"), toEnvFile(apiEnv));
  writeFileSync(join(generatedDir, "apps-web.env"), toEnvFile(webEnv));

  console.log(`Wrote ${join(generatedDir, "apps-api.env")}`);
  console.log(`Wrote ${join(generatedDir, "apps-web.env")}`);
}

main();
