# Mahoot on Hostinger KVM VPS

KVM 2 (~2 vCPU / 8 GB RAM from [Hostinger VPS](https://www.hostinger.com/vps-hosting)) is enough for **Next.js + Strapi** in production if you use **SQLite or Postgres** and optionally **Typesense** in Docker. This doc assumes **Ubuntu 22.04** (or 24.04) on the VPS.

## 1. Provision the VPS

1. In hPanel, order **KVM 2** and choose **Ubuntu** as the OS.
2. Note the server **public IPv4**.
3. **Firewall / security group**: allow **SSH (22)**, **HTTP (80)**, **HTTPS (443)**. Close everything else unless you know you need it.

## 2. DNS

Point your domains (examples):

| Record | Name | Value |
|--------|------|--------|
| A | `app` | your VPS IPv4 |
| A | `api` | same IPv4 |

You can also use a single hostname and proxy Strapi under a path with more Caddy rules; the two-subdomain layout below is the simplest mental model.

## 3. SSH access and key-based login

### First login (password)

```bash
ssh root@YOUR_VPS_IP
# or: ssh root@srvXXXXXXX.hstgr.cloud
```

### Key-based auth (recommended)

**On your Mac (or whatever machine you use to SSH):**

1. Create a key if you do not have one:

```bash
ssh-keygen -t ed25519 -C "you@example.com" -f ~/.ssh/id_ed25519
# Enter a passphrase when prompted, or empty for convenience (weaker).
```

2. **Install the public key on the server** (pick one):

**Option A — one-liner** (you will be prompted for the root password once):

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@YOUR_VPS_IP
```

**Option B — manual** (from an existing root session):

```bash
# On the server:
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys   # paste your single-line id_ed25519.pub, save
chmod 600 ~/.ssh/authorized_keys
```

**Option C — Hostinger hPanel / API:** register the **public** key under VPS → SSH keys, attach it to the VM. That keeps keys in sync with Hostinger’s inventory.

3. **Verify** (new terminal):

```bash
ssh -i ~/.ssh/id_ed25519 root@YOUR_VPS_IP
```

If your default key is `~/.ssh/id_ed25519`, plain `ssh root@...` will use it automatically.

4. **Optional hardening** (only after key login works; keeps another session open while testing):

```bash
# On the server:
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload ssh
```

If you lock yourself out, use Hostinger **browser/KVM console** or recovery to fix `sshd_config` or re-enable passwords.

### Deploy user (optional)

Create a non-root user, add your key to `~/.ssh/authorized_keys` for that user, grant `sudo`, and use it for day-to-day installs instead of root.

## 4. System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git build-essential python3
```

Install **Node.js 22 LTS** (Strapi 5 + Next 16 are fine on current LTS):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v22.x
```

Install **PM2** globally:

```bash
sudo npm i -g pm2
```

## 5. Get the repo onto the server

```bash
sudo mkdir -p /opt/mahoot
sudo chown $USER:$USER /opt/mahoot
git clone YOUR_GIT_URL /opt/mahoot
cd /opt/mahoot
```

Use a deploy key or HTTPS with a read-only token.

## 6. Strapi (`backend`)

```bash
cd /opt/mahoot/backend
cp .env.example .env
nano .env   # fill secrets — see below
npm ci
npm run build
```

**Production `.env` essentials** (generate long random strings for secrets; `openssl rand -base64 32`):

- `HOST=0.0.0.0`, `PORT=1337`
- `NODE_ENV=production`
- `PUBLIC_URL=https://api.your-domain.com` — **must** match the HTTPS URL the browser uses (OAuth and admin URLs depend on it).
- `APP_KEYS` — comma-separated list (Strapi docs)
- `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`
- **Database**: default example uses SQLite (`DATABASE_CLIENT=sqlite`). For production durability, switch to Postgres and set Strapi `database` config + env vars (see [Strapi DB config](https://docs.strapi.io/)).

**API token for Next**: In Strapi Admin → Settings → API Tokens, create a token with read (and whatever your API routes need). Put the same value in the frontend as `STRAPI_API_TOKEN`.

If **Typesense** runs on the same machine (optional Docker — see §9), set `TYPESENSE_*` to match that service. If you skip Typesense, search can fall back to Strapi (as in local dev).

## 7. Next.js (`frontend`)

```bash
cd /opt/mahoot/frontend
nano .env.production.local
npm ci
npm run build
```

**Minimum `.env.production.local`:**

| Variable | Purpose |
|----------|---------|
| `STRAPI_URL` | Server-side only: `http://127.0.0.1:1337` (Next on the same VM → loopback) |
| `NEXT_PUBLIC_STRAPI_URL` | Browser: `https://api.your-domain.com` — **required for Google/LINE sign-in** |
| `NEXT_PUBLIC_APP_URL` | Public app URL: `https://app.your-domain.com` — used for OAuth callback redirects |
| `STRAPI_API_TOKEN` | Same token as Strapi admin |
| `NODE_ENV=production` | Usually set automatically by `next start`; you can omit |

Copy `frontend/.env.production.example` → `frontend/.env.production.local` and fill in your domains **before** `npm run build`. `NEXT_PUBLIC_*` values are embedded at build time; if OAuth sends users to `127.0.0.1`, you forgot this step or need to rebuild.

**CORS:** Ensure Strapi allows your app origin (`https://app.your-domain.com`) if the browser calls Strapi directly (uploads, etc.). If everything is proxied through Next route handlers only, requirements are looser.

## 8. HTTPS reverse proxy (Caddy)

Caddy obtains **Let’s Encrypt** certificates automatically.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Copy `deploy/Caddyfile.example` to `/etc/caddy/Caddyfile`, replace domains, then:

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Strapi’s `PUBLIC_URL` and `NEXT_PUBLIC_STRAPI_URL` must use the **same hostnames** you put in Caddy.

## 9. PM2 (Strapi + Next)

From `/opt/mahoot`:

```bash
cd /opt/mahoot/deploy
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER   # follow the printed command
```

After git pulls, redeploy:

```bash
cd /opt/mahoot/backend && npm ci && npm run build
cd /opt/mahoot/frontend && npm ci && npm run build
pm2 restart all
```

## 9. Auto-deploy leaderboards data (cron)

The GitHub Action `.github/workflows/leaderboards-data.yml` pushes JSON to `main` on **Mon 17:00 UTC** and **Tue 13:00 UTC**. The Next app bundles that JSON at build time, so the VPS must pull and rebuild after those commits land.

Script: `deploy/refresh-leaderboards.sh` (pull + `npm run build` in frontend + `pm2 restart next`). Logs: `deploy/logs/refresh-leaderboards.log`.

**One-time setup on the VPS** (as root):

```bash
chmod +x /opt/mahoot/deploy/refresh-leaderboards.sh
mkdir -p /opt/mahoot/deploy/logs

# Edit root crontab — times are UTC, 30 min after the GH Action
crontab -e
```

Add:

```cron
# Mahoot: deploy leaderboards JSON after weekly GitHub Action refresh
30 17 * * 1  /opt/mahoot/deploy/refresh-leaderboards.sh
30 13 * * 2  /opt/mahoot/deploy/refresh-leaderboards.sh
```

Manual test:

```bash
/opt/mahoot/deploy/refresh-leaderboards.sh
tail -20 /opt/mahoot/deploy/logs/refresh-leaderboards.log
```

## 10. Optional: Typesense in Docker

```bash
sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # re-login
```

Example (adjust API key and data dir):

```bash
docker run -d --name typesense --restart unless-stopped \
  -p 127.0.0.1:8108:8108 \
  -v /opt/typesense-data:/data \
  typesense/typesense:26.0 \
  --data-dir /data --api-key=YOUR_TYPESENSE_KEY --enable-cors
```

Point `backend/.env` `TYPESENSE_*` at `127.0.0.1:8108`. Re-run `npm run reindex:typesense` from `backend` when the index is empty.

## 11. Smoke test

- `https://api.your-domain.com/admin` — Strapi admin loads.
- `https://app.your-domain.com` — site loads.
- Create a Strapi API token and confirm search/listing flows if you use Typesense or Strapi fallback.

## Files in this folder

- `Caddyfile.example` — HTTPS reverse proxy for `app` + `api`.
- `ecosystem.config.cjs` — PM2 for `strapi start` and `next start`.
