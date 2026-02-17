#!/bin/bash
# ============================================
# TEAHAVEN - SYSTEMD + DUCKDNS SETUP
# ============================================
# Run once on server: sudo bash scripts/setup-systemd.sh
# This makes TeaHaven survive reboots and keeps DNS alive.

set -e

echo "=== TeaHaven Systemd Setup ==="

# Step 1: Create systemd service
echo "[1/4] Creating systemd service..."
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

# Step 2: Enable services
echo "[2/4] Enabling systemd services..."
systemctl daemon-reload
systemctl enable docker.service
systemctl enable teahaven.service
echo "TeaHaven will now start automatically on boot."

# Step 3: Setup DuckDNS auto-update (keeps DNS alive)
echo "[3/4] Setting up DuckDNS auto-update..."
DUCKDNS_TOKEN="${DUCKDNS_TOKEN:-}"
if [ -z "$DUCKDNS_TOKEN" ]; then
    echo "  Skipping DuckDNS - no token provided."
    echo "  To set up later, run:"
    echo "    DUCKDNS_TOKEN=your-token sudo bash scripts/setup-systemd.sh"
else
    # Create DuckDNS update script
    cat > /opt/teahaven/scripts/duckdns-update.sh << DEOF
#!/bin/bash
curl -s "https://www.duckdns.org/update?domains=teahaven&token=${DUCKDNS_TOKEN}&ip=" > /dev/null
DEOF
    chmod +x /opt/teahaven/scripts/duckdns-update.sh

    # Add cron job (every 5 minutes)
    (crontab -l 2>/dev/null | grep -v duckdns; echo "*/5 * * * * /opt/teahaven/scripts/duckdns-update.sh") | crontab -
    echo "  DuckDNS will update every 5 minutes."
fi

# Step 4: Verify
echo "[4/4] Verifying..."
systemctl status teahaven.service --no-pager || true
echo ""
echo "=== Setup Complete ==="
echo "  - TeaHaven starts on boot via systemd"
echo "  - To check status: sudo systemctl status teahaven"
echo "  - To restart: sudo systemctl restart teahaven"
echo "  - To view logs: sudo journalctl -u teahaven -f"
