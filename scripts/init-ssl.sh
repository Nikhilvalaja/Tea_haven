#!/bin/bash
# ============================================
# TEAHAVEN - INITIAL SSL CERTIFICATE SETUP
# ============================================
# Run this ONCE on the server to get the first Let's Encrypt certificate.
# After this, the certbot container handles automatic renewal.
#
# Usage: sudo bash scripts/init-ssl.sh

set -e

DOMAIN="teahaven.duckdns.org"
EMAIL="nikhilvalaja@gmail.com"
BASE_DIR="/opt/teahaven"

echo "=== TeaHaven SSL Setup ==="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

cd "$BASE_DIR"

# Step 1: Create certbot directories
echo "[1/5] Creating certbot directories..."
mkdir -p certbot/conf certbot/www

# Step 2: Stop frontend to free port 80
echo "[2/5] Stopping frontend container to free port 80..."
docker-compose stop frontend 2>/dev/null || true

# Step 3: Get certificate using standalone mode
echo "[3/5] Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
    -v "$BASE_DIR/certbot/conf:/etc/letsencrypt" \
    -v "$BASE_DIR/certbot/www:/var/www/certbot" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# Step 4: Verify certificate was created
echo "[4/5] Verifying certificate..."
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "Certificate obtained successfully!"
else
    echo "ERROR: Certificate not found. Check the output above for errors."
    exit 1
fi

# Step 5: Update FRONTEND_URL to use HTTPS
echo "[5/5] Updating .env.production..."
if [ -f ".env.production" ]; then
    sed -i 's|FRONTEND_URL=http://|FRONTEND_URL=https://|' .env.production
    echo "Updated FRONTEND_URL to use HTTPS"
fi

echo ""
echo "=== SSL Setup Complete ==="
echo ""
echo "Now restart all services:"
echo "  cd /opt/teahaven && docker-compose --env-file .env.production up -d"
echo ""
echo "Your site will be available at: https://$DOMAIN"
echo "Certificates will auto-renew via the certbot container."
