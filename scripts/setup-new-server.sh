#!/bin/bash
# ============================================
# TEAHAVEN - NEW SERVER SETUP (CLOUDFLARE)
# ============================================
# Run on the new server:
#   sudo bash scripts/setup-new-server.sh
#
# Prerequisites:
#   - Ubuntu 22.04+ with at least 4GB RAM
#   - DNS A record pointing to this server's IP
#   - Cloudflare proxy enabled (orange cloud)
#   - Cloudflare SSL mode set to "Flexible"

set -e

NEW_DOMAIN="teahaven.learning.interchainlabs.com"

echo "============================================"
echo "  TeaHaven - New Server Setup"
echo "  Domain: $NEW_DOMAIN"
echo "============================================"
echo ""

# ---- Step 1: Install Docker ----
echo "=== [1/7] Installing Docker ==="
if command -v docker &> /dev/null; then
    echo "  Docker already installed: $(docker --version)"
else
    apt-get update
    apt-get install -y ca-certificates curl gnupg

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    echo "  Docker installed: $(docker --version)"
fi

# Add current sudo user to docker group
SUDO_USER_NAME="${SUDO_USER:-$USER}"
if [ "$SUDO_USER_NAME" != "root" ]; then
    usermod -aG docker "$SUDO_USER_NAME"
    echo "  Added $SUDO_USER_NAME to docker group"
fi

# ---- Step 2: Clone repository ----
echo ""
echo "=== [2/7] Setting up repository ==="
if [ -d /opt/teahaven/.git ]; then
    echo "  Repository already exists. Pulling latest..."
    cd /opt/teahaven
    git pull origin main
else
    echo "  Cloning repository..."
    mkdir -p /opt/teahaven
    git clone https://github.com/Nikhilvalaja/Tea_haven.git /opt/teahaven
    cd /opt/teahaven
fi

# Fix line endings (Windows → Linux)
find /opt/teahaven/scripts -name "*.sh" -exec sed -i 's/\r$//' {} +
echo "  Fixed script line endings"

# Make scripts executable
chmod +x /opt/teahaven/scripts/*.sh

# ---- Step 3: Create .env.production ----
echo ""
echo "=== [3/7] Environment configuration ==="
if [ -f /opt/teahaven/.env.production ]; then
    echo "  .env.production already exists. Skipping."
else
    cat > /opt/teahaven/.env.production << 'ENVEOF'
# ============================================
# TEAHAVEN - PRODUCTION ENVIRONMENT
# ============================================
# IMPORTANT: Change all CHANGE_ME values!

# --- Database ---
DB_ROOT_PASSWORD=CHANGE_ME_ROOT_PASSWORD
DB_NAME=teahaven
DB_USER=teahaven
DB_PASSWORD=CHANGE_ME_DB_PASSWORD

# --- Application ---
JWT_SECRET=CHANGE_ME_JWT_SECRET
FRONTEND_URL=https://teahaven.learning.interchainlabs.com

# --- Stripe (leave empty if not using) ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# --- Email (leave empty if not using) ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=

# --- Google Maps (leave empty if not using) ---
GOOGLE_MAPS_API_KEY=

# --- Grafana Cloud (leave empty if not using) ---
GRAFANA_API_TOKEN=
ENVEOF

    echo "  Created .env.production"
    echo ""
    echo "  *** IMPORTANT: Edit .env.production before continuing! ***"
    echo "  Run: nano /opt/teahaven/.env.production"
    echo "  Change all CHANGE_ME values to real passwords."
    echo ""
    read -p "  Press Enter after editing .env.production (or Ctrl+C to stop)..."
fi

# ---- Step 4: Database migration ----
echo ""
echo "=== [4/7] Database setup ==="
if [ -f /tmp/teahaven-backup.sql ]; then
    echo "  Database dump found at /tmp/teahaven-backup.sql"
    echo "  Will import after containers start."
    DB_IMPORT=true
else
    echo "  No database dump found."
    echo ""
    echo "  To migrate data from OLD server, run THESE on the OLD server:"
    echo "    docker exec teahaven-mysql mysqldump -u root -p teahaven > /tmp/teahaven-backup.sql"
    echo "    scp /tmp/teahaven-backup.sql nikhil@163.245.212.46:/tmp/"
    echo ""
    echo "  Then re-run this script, or import manually later:"
    echo "    docker exec -i teahaven-mysql mysql -u root -p teahaven < /tmp/teahaven-backup.sql"
    echo ""
    DB_IMPORT=false
fi

# ---- Step 5: Build and start ----
echo ""
echo "=== [5/7] Building and starting TeaHaven ==="
cd /opt/teahaven
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d

echo "  Waiting for services to be healthy..."
sleep 30

# Check health
HEALTHY=false
for i in $(seq 1 10); do
    if curl -sf --max-time 10 http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
        HEALTHY=true
        echo "  Backend is healthy!"
        break
    fi
    echo "  Waiting... attempt $i/10"
    sleep 10
done

if [ "$HEALTHY" = false ]; then
    echo "  WARNING: Backend health check failed. Check logs:"
    echo "    docker compose --env-file .env.production logs backend"
fi

# Import database if dump exists
if [ "$DB_IMPORT" = true ]; then
    echo ""
    echo "  Importing database..."
    source /opt/teahaven/.env.production
    docker exec -i teahaven-mysql mysql -u root -p"$DB_ROOT_PASSWORD" teahaven < /tmp/teahaven-backup.sql
    echo "  Database imported successfully!"
fi

# ---- Step 6: Setup systemd ----
echo ""
echo "=== [6/7] Setting up systemd (auto-start + watchdog) ==="
bash /opt/teahaven/scripts/setup-systemd.sh

# ---- Step 7: Verify ----
echo ""
echo "=== [7/7] Verification ==="
echo ""
docker compose --env-file .env.production ps
echo ""

# Check if site responds
if curl -sf --max-time 10 http://127.0.0.1/health > /dev/null 2>&1; then
    echo "  Frontend: OK"
else
    echo "  Frontend: waiting (may need a minute)"
fi

if curl -sf --max-time 10 http://127.0.0.1:5000/api/health > /dev/null 2>&1; then
    echo "  Backend API: OK"
else
    echo "  Backend API: waiting"
fi

echo ""
echo "============================================"
echo "  SETUP COMPLETE!"
echo "============================================"
echo ""
echo "  Your site: https://$NEW_DOMAIN"
echo ""
echo "  Make sure:"
echo "  1. Cloudflare DNS has A record: teahaven → $(curl -s ifconfig.me 2>/dev/null || echo '<server-ip>')"
echo "  2. Cloudflare proxy is ON (orange cloud)"
echo "  3. Cloudflare SSL mode is 'Flexible'"
echo ""
echo "  Useful commands:"
echo "    docker compose --env-file .env.production ps      # Container status"
echo "    docker compose --env-file .env.production logs -f  # Live logs"
echo "    sudo systemctl status teahaven-watchdog.timer      # Watchdog status"
echo ""
