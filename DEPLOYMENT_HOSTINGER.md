# 🚀 Qwalify Production Deployment Guide (Hostinger VPS)

This guide walks you through deploying **Qwalify** to your Hostinger VPS on domain **`qwalify.online`** with automatic Let's Encrypt SSL via Traefik.

---

## Architecture Overview

```
Internet (HTTPS)
   │
   ├──► Traefik Reverse Proxy (:80 / :443) ──► Automatic Let's Encrypt SSL
   │         │
   │         ├──► qwalify.online     ──► Frontend Container (React + Vite + NGINX)
   │         └──► wa.qwalify.online  ──► Evolution API (WhatsApp Gateway)
   │                                          └──► Redis Container (Sessions)
   │
   └──► Supabase Cloud / Self-Hosted
         ├── Postgres Database + Auth + RLS (12 tables + pg_cron)
         └── Edge Functions:
               ├── /whatsapp-webhook
               ├── /telegram-webhook
               ├── /qualify-lead
               └── /process-followups
```

---

## Step 1: DNS Records Configuration

Log in to your domain registrar (or Hostinger DNS Management) for **`qwalify.online`** and add the following **A Records** pointing to your VPS IP:

| Type | Name / Host | Points to | TTL |
|---|---|---|---|
| **A** | `@` (or `qwalify.online`) | `YOUR_VPS_IP` | 3600 |
| **A** | `www` | `YOUR_VPS_IP` | 3600 |
| **A** | `wa` (for WhatsApp API) | `YOUR_VPS_IP` | 3600 |

---

## Step 2: VPS Initial Setup (Ubuntu)

SSH into your Hostinger VPS:

```bash
ssh root@YOUR_VPS_IP
```

Install Docker & Docker Compose:

```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin git ufw

# Open necessary firewall ports
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## Step 3: Run Database Migrations in Supabase

Go to your **Supabase Dashboard → SQL Editor**, and run the migration files in this order:

1. `supabase/migrations/001_schema.sql` (Core tables)
2. `supabase/migrations/002_rls.sql` (RLS security policies & auth triggers)
3. `supabase/migrations/003_seed.sql` (Demo data for Acme Corp)
4. `supabase/migrations/004_ai_providers.sql` (BYO-API AI engine configs)
5. `supabase/migrations/005_followup_engine.sql` (Automated follow-up scheduler & state tracking)
6. `supabase/migrations/006_booking_engine.sql` (Appointment booking engine & settings)
7. `supabase/migrations/007_teams_and_onboarding.sql` (Team invites & onboarding wizard status)

Deploy your Edge Functions using Supabase CLI:

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy qualify-lead --no-verify-jwt
supabase functions deploy process-followups --no-verify-jwt
```

---

## Step 4: Clone & Configure on VPS

```bash
# Create directory
mkdir -p /opt/qwalify && cd /opt/qwalify

# Clone or copy your code here
git clone <YOUR_REPO_URL> .

# Create the Let's Encrypt directory and secure permissions
mkdir -p letsencrypt
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json

# Create production .env
cp .env.production.example .env
nano .env
```

Fill in your variables in `.env`:

```env
DOMAIN=qwalify.online
WA_DOMAIN=wa.qwalify.online
ACME_EMAIL=your-email@gmail.com

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

EVOLUTION_API_KEY=your_secret_evolution_key_here
```

---

## Step 5: Start the Containers

```bash
docker compose up -d --build
```

Verify everything is running:

```bash
docker compose ps
docker compose logs -f traefik
```

---

## Step 6: Connect WhatsApp & Telegram in App

1. Visit **`https://qwalify.online`** in your browser. SSL will be issued automatically within ~30 seconds.
2. Sign up or log in.
3. Open **Settings → Channels**:
   - **WhatsApp**: Click "Configure", set Server URL to `https://wa.qwalify.online` and paste your `EVOLUTION_API_KEY`.
   - **Telegram**: Click "Configure", paste your `@BotFather` Bot Token, and click **"Register Webhook"**.
4. Open **Settings → AI Providers**:
   - Choose your provider (Gemini, Groq, OpenAI, Claude, OpenRouter, etc.), paste your key, and verify models load dynamically.
5. You are live! Test sending a message from WhatsApp or Telegram to watch the AI qualify leads automatically.
