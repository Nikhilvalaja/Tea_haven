#!/bin/bash
# ============================================
# TEAHAVEN - SYSTEMD + WATCHDOG SETUP
# ============================================
# Run once on server: sudo bash scripts/setup-systemd.sh
# This makes TeaHaven survive reboots, crashes, and OOM kills.

set -e

echo "=== TeaHaven Systemd Setup ==="

# Step 1: Create systemd service (starts on boot)
echo "[1/5] Creating systemd service..."
cat > /etc/systemd/system/teahaven.service << 'EOF'
[Unit]
Description=TeaHaven Docker Compose Application
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/teahaven
ExecStart=/usr/bin/docker compose --env-file .env.production up -d
ExecStop=/usr/bin/docker compose --env-file .env.production down
ExecReload=/usr/bin/docker compose --env-file .env.production up -d
TimeoutStartSec=300
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
EOF

# Step 2: Create health watchdog service
echo "[2/5] Creating health watchdog service..."
cat > /etc/systemd/system/teahaven-watchdog.service << 'EOF'
[Unit]
Description=TeaHaven Health Watchdog
After=teahaven.service docker.service

[Service]
Type=oneshot
ExecStart=/bin/bash /opt/teahaven/scripts/health-watchdog.sh
EOF

# Step 3: Create watchdog timer (runs every 2 minutes)
echo "[3/5] Creating watchdog timer..."
cat > /etc/systemd/system/teahaven-watchdog.timer << 'EOF'
[Unit]
Description=TeaHaven Health Watchdog Timer

[Timer]
OnBootSec=60
OnUnitActiveSec=120
AccuracySec=30

[Install]
WantedBy=timers.target
EOF

# Step 4: Enable all services
echo "[4/5] Enabling systemd services..."
systemctl daemon-reload
systemctl enable docker.service
systemctl enable teahaven.service
systemctl enable teahaven-watchdog.timer
systemctl start teahaven-watchdog.timer
echo "  - TeaHaven starts on boot"
echo "  - Watchdog checks health every 2 minutes"

# Step 5: Setup log rotation for watchdog
echo "[5/5] Setting up log rotation..."
cat > /etc/logrotate.d/teahaven-watchdog << 'EOF'
/var/log/teahaven-watchdog.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    size 1M
}
EOF

# Verify
echo ""
echo "=== Verifying ==="
systemctl status teahaven.service --no-pager || true
echo ""
systemctl status teahaven-watchdog.timer --no-pager || true
echo ""
echo "=== Setup Complete ==="
echo "  - TeaHaven starts on boot via systemd"
echo "  - Health watchdog runs every 2 minutes"
echo "  - Auto-restart on crash/OOM"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status teahaven          # Check service status"
echo "  sudo systemctl restart teahaven          # Restart all containers"
echo "  sudo systemctl status teahaven-watchdog.timer  # Check watchdog"
echo "  sudo cat /var/log/teahaven-watchdog.log  # View watchdog log"
echo "  sudo journalctl -u teahaven -f           # View service logs"
