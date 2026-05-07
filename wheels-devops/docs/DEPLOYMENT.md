# wheels.com.pk — Deployment Guide

## VPS Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPUs | 4 vCPUs |
| RAM | 4 GB | 8 GB |
| Disk | 50 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Location | Singapore / Frankfurt | Singapore (lowest latency from PK) |

**Recommended providers:** DigitalOcean, Hetzner, Hostinger VPS, Vultr

---

## Step 1 — Server Initial Setup

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Create deploy user
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Switch to deploy user for rest of setup
su - deploy

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version && docker compose version
```

## Step 2 — Clone Repository

```bash
# Create app directory
sudo mkdir -p /opt/wheels
sudo chown deploy:deploy /opt/wheels
cd /opt/wheels

# Clone (use your actual repo URL)
git clone https://github.com/YOUR_ORG/wheels.com.pk.git .
```

## Step 3 — Configure Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env.production
nano backend/.env.production
# Fill in all required values (DB, Redis, JWT, SMS, OpenAI, R2, payments)

# Admin
cp admin/.env.example admin/.env.production
nano admin/.env.production
# NEXT_PUBLIC_API_URL=https://api.wheels.com.pk/api/v1
```

## Step 4 — SSL Certificate

```bash
# Get SSL cert BEFORE starting Nginx (webroot method)
docker compose -f docker/docker-compose.prod.yml run --rm certbot

# Verify certificate
ls /var/lib/docker/volumes/wheels_certbot_certs/_data/live/wheels.com.pk/
```

## Step 5 — Start the Stack

```bash
cd /opt/wheels

# Pull and start all services
docker compose -f docker/docker-compose.prod.yml up -d

# Check all containers are healthy
docker compose -f docker/docker-compose.prod.yml ps

# Expected output:
# wheels_postgres  running (healthy)
# wheels_redis     running (healthy)
# wheels_backend   running (healthy)
# wheels_admin     running
# wheels_nginx     running
```

## Step 6 — Run Database Migrations & Seed

```bash
# Run migrations
docker compose -f docker/docker-compose.prod.yml exec backend \
  node dist/database/run-migrations.js

# Optional: load seed data (dev/staging only)
docker compose -f docker/docker-compose.prod.yml exec postgres \
  psql -U $DB_USER -d $DB_NAME -f /docker-entrypoint-initdb.d/002_seed_data.sql
```

## Step 7 — Verify Everything Works

```bash
# API health
curl https://api.wheels.com.pk/api/v1/health

# Expected: {"status":"ok","timestamp":"...","db":"connected","redis":"connected"}

# Check logs
docker compose -f docker/docker-compose.prod.yml logs backend --tail=50
```

## Step 8 — Configure Auto-Renew SSL

```bash
# Add cron for SSL renewal (runs twice daily)
(crontab -l 2>/dev/null; echo "0 */12 * * * cd /opt/wheels && docker compose -f docker/docker-compose.prod.yml run --rm certbot renew --quiet && docker compose -f docker/docker-compose.prod.yml exec nginx nginx -s reload") | crontab -
```

## Step 9 — Set Up GitHub Actions Secrets

In your GitHub repo → Settings → Secrets → Actions, add:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | Private SSH key (generate with `ssh-keygen`) |
| `VPS_PORT` | `22` |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook for deploy notifications |
| `EXPO_TOKEN` | From expo.dev account settings |

## Useful Commands

```bash
# View real-time logs
docker compose -f docker/docker-compose.prod.yml logs -f backend

# Restart a service
docker compose -f docker/docker-compose.prod.yml restart backend

# Scale backend (if needed)
docker compose -f docker/docker-compose.prod.yml up -d --scale backend=2

# Database backup
docker compose -f docker/docker-compose.prod.yml exec postgres \
  pg_dump -U $DB_USER $DB_NAME | gzip > backup_$(date +%Y%m%d).sql.gz

# Connect to database
docker compose -f docker/docker-compose.prod.yml exec postgres \
  psql -U $DB_USER -d $DB_NAME

# Connect to Redis
docker compose -f docker/docker-compose.prod.yml exec redis \
  redis-cli -a $REDIS_PASSWORD

# Clear Redis cache
docker compose -f docker/docker-compose.prod.yml exec redis \
  redis-cli -a $REDIS_PASSWORD FLUSHDB
```

## Monitoring

```bash
# Container resource usage
docker stats

# Disk usage
df -h && du -sh /var/lib/docker/

# System load
htop
```

## Rollback Procedure

```bash
cd /opt/wheels

# Pull previous image tag
docker compose -f docker/docker-compose.prod.yml pull backend:PREVIOUS_SHA

# Update image reference and restart
docker compose -f docker/docker-compose.prod.yml up -d --no-deps backend
```
