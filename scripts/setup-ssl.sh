#!/bin/bash
# ============================================
# TEAHAVEN - SSL SETUP SCRIPT
# ============================================
# Usage: ./scripts/setup-ssl.sh [staging|production] <domain>

set -e

ENV=${1:-staging}
DOMAIN=${2:-"teahaven.com"}

echo "Setting up SSL for ${DOMAIN} (${ENV})..."

# Create directories
mkdir -p certbot/conf certbot/www

# Initial certificate request
if [ "$ENV" == "staging" ]; then
    STAGING_FLAG="--staging"
    FULL_DOMAIN="staging.${DOMAIN}"
else
    STAGING_FLAG=""
    FULL_DOMAIN="${DOMAIN}"
fi

echo "Requesting certificate for ${FULL_DOMAIN}..."

# Stop nginx if running
docker-compose -f docker-compose.${ENV}.yml stop nginx 2>/dev/null || true

# Request certificate
docker run -it --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    $STAGING_FLAG \
    --email admin@${DOMAIN} \
    --agree-tos \
    --no-eff-email \
    -d ${FULL_DOMAIN}

# For production, also add www subdomain
if [ "$ENV" == "production" ]; then
    docker run -it --rm \
        -v $(pwd)/certbot/conf:/etc/letsencrypt \
        -v $(pwd)/certbot/www:/var/www/certbot \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        --preferred-challenges http \
        --email admin@${DOMAIN} \
        --agree-tos \
        --no-eff-email \
        -d www.${DOMAIN}
fi

echo "SSL certificate obtained successfully!"
echo "Start the services with: docker-compose -f docker-compose.${ENV}.yml up -d"
