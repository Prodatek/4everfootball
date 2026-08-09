# Quick-deploy reverse proxy (public testing only)

This is a stopgap so testers can hit a real HTTPS URL while the Terraform/ECS
deploy in `infrastructure/` (see its own README) is still being built out. It
runs `nginx` + `certbot` alongside the existing `docker-compose.yml` stack on
whatever single box you're already running `docker compose up -d --build` on
— no AWS involved. Delete `infrastructure/nginx/` and the `nginx`/`certbot`
services in `docker-compose.yml` once the real deploy replaces this.

Maps three subdomains to the existing containers:

| URL                              | Container   | Why it needs to be public                          |
|-----------------------------------|-------------|-----------------------------------------------------|
| `https://4ever.buildspecs.io`     | `web:3000`  | the app itself                                       |
| `https://api.4ever.buildspecs.io` | `api:4000`  | browser calls this directly (`NEXT_PUBLIC_API_URL`) and connects the live-scores websocket to it |
| `https://media.4ever.buildspecs.io` | `minio:9000` | browsers PUT uploads directly here via presigned URLs |

## 1. DNS

Point all three at the box's public IP (A records, or CNAMEs if it's behind
something that gives you a hostname):

```
4ever.buildspecs.io        A     <server-ip>
api.4ever.buildspecs.io    A     <server-ip>
media.4ever.buildspecs.io  A     <server-ip>
```

Wait for propagation (`dig 4ever.buildspecs.io`) before continuing — the
cert step below fails otherwise.

## 2. Get the certificate (one-time)

`nginx`'s config already references certs that don't exist yet, so it won't
start successfully until they do — get them first, before bringing `nginx`
up, using certbot's own standalone server on port 80 (make sure nothing else
is bound to 80 on the host when you run this):

```bash
docker compose up -d postgres redis meilisearch minio minio-init api web
docker run --rm -p 80:80 \
  -v 4everfootball_certbot_certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d 4ever.buildspecs.io -d api.4ever.buildspecs.io -d media.4ever.buildspecs.io \
  --email you@example.com --agree-tos --no-eff-email
```

(Swap the volume name prefix if your compose project name differs from the
directory name — check with `docker volume ls | grep certbot_certs`.) This
requests one certificate covering all three names (stored under
`live/4ever.buildspecs.io/`, which is why every server block in
`conf.d/4everfootball.conf` points at that same path regardless of which
subdomain it serves).

## 3. Start nginx + the renewal loop

```bash
docker compose up -d --build
```

Now that the cert exists in the shared `certbot_certs` volume, `nginx` starts
cleanly. The `certbot` service just loops `certbot renew` every 12h against
the same webroot volume — Let's Encrypt certs are 90 days, so this keeps them
current automatically.

**Known gap:** renewal doesn't reload `nginx` (a stopgap doesn't need
production-grade automation). Nginx caches the cert in memory, so a renewed
cert on disk won't actually take effect until nginx restarts. Reload it
manually every couple of months, or whenever you notice the cert nearing
expiry:

```bash
docker compose exec nginx nginx -s reload
```

## Known limitation

`api`'s own server-to-MinIO calls (delete on record removal, etc.) now round
-trip through the public `media.4ever.buildspecs.io` hostname instead of the
in-network `minio:9000` address, because `S3_ENDPOINT` has to be the public
host for presigned upload URLs to resolve in the browser (see the comment in
`docker-compose.yml`'s `api` service). Fine for testing traffic levels; the
real deploy should split "public presign host" from "internal SDK endpoint"
if that extra hop ever matters.
