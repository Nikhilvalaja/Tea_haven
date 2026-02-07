# TeaHaven - Enterprise Deployment Guide

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Server Provisioning](#server-provisioning)
4. [Initial Server Setup](#initial-server-setup)
5. [Docker Installation](#docker-installation)
6. [Application Deployment](#application-deployment)
7. [SSL/HTTPS Setup](#ssl-https-setup)
8. [Database Management](#database-management)
9. [Monitoring & Logging](#monitoring--logging)
10. [CI/CD Pipeline](#ci-cd-pipeline)
11. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              INTERNET                       │
                    └─────────────────┬───────────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────────┐
                    │         NGINX (Reverse Proxy)               │
                    │    - SSL Termination (Let's Encrypt)        │
                    │    - Rate Limiting                          │
                    │    - Security Headers                       │
                    │    - Static Asset Caching                   │
                    └──────────┬─────────────────┬────────────────┘
                               │                 │
              ┌────────────────▼───┐    ┌───────▼────────────────┐
              │     FRONTEND       │    │      BACKEND API       │
              │  (React + Nginx)   │    │     (Node.js)          │
              │    Port: 80        │    │     Port: 5000         │
              └────────────────────┘    └──────────┬─────────────┘
                                                   │
                         ┌─────────────────────────┼─────────────────────────┐
                         │                         │                         │
              ┌──────────▼─────────┐    ┌─────────▼──────────┐    ┌─────────▼──────────┐
              │       MYSQL        │    │       REDIS        │    │   STRIPE API       │
              │    (Database)      │    │  (Cache/Sessions)  │    │  (Payments)        │
              │    Port: 3306      │    │    Port: 6379      │    │   External         │
              └────────────────────┘    └────────────────────┘    └────────────────────┘
```

### Directory Structure
```
/opt/teahaven/
├── docker/                 # Dockerfile configs
├── nginx/                  # Nginx configs
├── scripts/                # Deployment scripts
├── backups/                # Database backups
├── certbot/                # SSL certificates
│   ├── conf/
│   └── www/
├── .env.staging            # Staging environment
├── .env.production         # Production environment
├── docker-compose.yml
├── docker-compose.staging.yml
└── docker-compose.production.yml
```

---

## 📦 Prerequisites

### Local Machine
- Git
- SSH client
- Docker (for local testing)

### Server Requirements (DigitalOcean)
- **Droplet**: Ubuntu 22.04 LTS
- **Plan**: Basic ($12-24/month for staging, $48+ for production)
  - Staging: 2 GB RAM, 1 vCPU, 50 GB SSD
  - Production: 4 GB RAM, 2 vCPU, 80 GB SSD
- **Region**: Closest to your users
- **Additional**: Enable backups ($2/month)

---

## 🖥️ Server Provisioning (DigitalOcean)

### 1. Create Droplet
1. Go to [DigitalOcean](https://cloud.digitalocean.com)
2. Create → Droplets
3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic (as above)
   - **Datacenter**: Choose region
   - **Authentication**: SSH Keys (recommended)
   - **Hostname**: `teahaven-staging` or `teahaven-prod`

### 2. Configure DNS
Point your domain to the server IP:
```
A     @              → YOUR_SERVER_IP
A     www            → YOUR_SERVER_IP
A     staging        → YOUR_STAGING_IP (if separate)
CNAME api            → @
```

---

## 🔧 Initial Server Setup

SSH into your server:
```bash
ssh root@YOUR_SERVER_IP
```

### 1. System Updates
```bash
apt update && apt upgrade -y
apt install -y curl wget git htop unzip
```

### 2. Create Deploy User (Security)
```bash
# Create user
adduser deploy
usermod -aG sudo deploy

# Setup SSH for deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Test login (in new terminal)
ssh deploy@YOUR_SERVER_IP
```

### 3. Firewall Setup (UFW)
```bash
# Enable firewall
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT: do this before enabling!)
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
ufw status
```

### 4. SSH Hardening
```bash
sudo nano /etc/ssh/sshd_config
```
Change these settings:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
Port 22  # Consider changing to non-standard port
```
Restart SSH:
```bash
sudo systemctl restart sshd
```

### 5. Fail2Ban (Brute Force Protection)
```bash
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 🐳 Docker Installation

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add deploy user to docker group
sudo usermod -aG docker deploy

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Logout and login again to apply group changes
exit
ssh deploy@YOUR_SERVER_IP
```

---

## 🚀 Application Deployment

### 1. Clone Repository
```bash
sudo mkdir -p /opt/teahaven
sudo chown deploy:deploy /opt/teahaven
cd /opt/teahaven
git clone https://github.com/YOUR_USERNAME/teahaven.git .
```

### 2. Setup Environment
```bash
# Copy and edit environment file
cp .env.example .env.staging  # or .env.production

# Generate JWT secret
openssl rand -base64 64

# Edit with your values
nano .env.staging
```

### 3. First-Time Setup
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Create required directories
mkdir -p backups certbot/conf certbot/www

# Build and start containers
docker-compose -f docker-compose.staging.yml up -d --build

# Check status
docker-compose -f docker-compose.staging.yml ps
docker-compose -f docker-compose.staging.yml logs -f
```

### 4. Initialize Database
```bash
# Run migrations (first time)
docker exec teahaven-backend-staging node migrations/addAuthFields.js
docker exec teahaven-backend-staging node migrations/addIndexesForScaling.js

# Create super admin
docker exec -it teahaven-backend-staging node scripts/createSuperAdmin.js
```

---

## 🔒 SSL/HTTPS Setup

### Using Certbot (Let's Encrypt)
```bash
# Get certificate (staging)
./scripts/setup-ssl.sh staging teahaven.com

# For production
./scripts/setup-ssl.sh production teahaven.com

# Restart nginx
docker-compose -f docker-compose.staging.yml restart nginx
```

### Auto-Renewal
The certbot container automatically renews certificates. Verify with:
```bash
docker logs teahaven-certbot-staging
```

---

## 💾 Database Management

### Backup
```bash
# Manual backup
./scripts/backup-db.sh staging

# Check backups
ls -lh backups/
```

### Restore
```bash
# Decompress backup
gunzip backups/teahaven_staging_XXXXXX.sql.gz

# Restore
docker exec -i teahaven-mysql-staging mysql -uroot -p$DB_ROOT_PASSWORD teahaven < backups/teahaven_staging_XXXXXX.sql
```

### Automated Backups (Cron)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/teahaven/scripts/backup-db.sh production >> /var/log/teahaven-backup.log 2>&1
```

---

## 📊 Monitoring & Logging

### View Logs
```bash
# All logs
docker-compose -f docker-compose.staging.yml logs -f

# Specific service
docker-compose -f docker-compose.staging.yml logs -f backend

# Backend application logs
docker exec teahaven-backend-staging cat logs/combined.log | tail -100
```

### Resource Monitoring
```bash
# Container stats
docker stats

# System resources
htop
```

### Uptime Monitoring (External)
1. **UptimeRobot** (free): https://uptimerobot.com
2. **Better Uptime**: https://betteruptime.com

Add monitors for:
- `https://teahaven.com/health`
- `https://teahaven.com/api/health`

---

## 🔄 CI/CD Pipeline

### GitHub Secrets Required
Go to Repository → Settings → Secrets and Variables → Actions:

| Secret | Description |
|--------|-------------|
| `DOCKER_REGISTRY` | e.g., `docker.io/username` |
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password/token |
| `STAGING_HOST` | Staging server IP |
| `PRODUCTION_HOST` | Production server IP |
| `SSH_USERNAME` | `deploy` |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/id_rsa` |
| `API_URL` | `https://teahaven.com/api` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key |

### GitHub Environments
Create environments:
1. `staging` - auto-deploys from `develop` branch
2. `production` - requires approval, deploys from `main` branch

### Workflow
1. Push to `develop` → Tests → Build → Deploy to Staging
2. Merge to `main` → Tests → Build → Approval → Deploy to Production

---

## 🔍 Troubleshooting

### Container Issues
```bash
# Restart all containers
docker-compose -f docker-compose.staging.yml restart

# Rebuild and restart
docker-compose -f docker-compose.staging.yml up -d --build --force-recreate

# Check container health
docker inspect --format='{{.State.Health.Status}}' teahaven-backend-staging
```

### Database Connection Issues
```bash
# Test MySQL connection
docker exec teahaven-mysql-staging mysql -uroot -p -e "SELECT 1"

# Check MySQL logs
docker logs teahaven-mysql-staging
```

### Nginx Issues
```bash
# Test nginx config
docker exec teahaven-nginx-staging nginx -t

# Reload nginx
docker exec teahaven-nginx-staging nginx -s reload
```

### SSL Issues
```bash
# Check certificate
docker exec teahaven-nginx-staging openssl s_client -connect localhost:443

# Renew manually
docker-compose -f docker-compose.staging.yml run --rm certbot renew --force-renewal
```

### Rollback
```bash
# Rollback to previous version
./scripts/rollback.sh staging

# Rollback to specific version
./scripts/rollback.sh staging v1.2.3
```

---

## 📝 Quick Reference

### Commands
| Action | Command |
|--------|---------|
| Start services | `docker-compose -f docker-compose.staging.yml up -d` |
| Stop services | `docker-compose -f docker-compose.staging.yml down` |
| View logs | `docker-compose -f docker-compose.staging.yml logs -f` |
| Deploy | `./scripts/deploy.sh staging` |
| Backup DB | `./scripts/backup-db.sh staging` |
| Rollback | `./scripts/rollback.sh staging` |

### URLs
| Environment | URL |
|-------------|-----|
| Staging | https://staging.teahaven.com |
| Production | https://teahaven.com |
| API Health | https://teahaven.com/api/health |

---

## 🔐 Security Checklist

- [ ] SSH key authentication only
- [ ] Firewall enabled (UFW)
- [ ] Fail2ban installed
- [ ] Non-root deploy user
- [ ] SSL/TLS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Database backups automated
- [ ] Strong passwords for all services
- [ ] Environment variables secured
- [ ] Docker images from trusted sources
