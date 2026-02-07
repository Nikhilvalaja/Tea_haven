#!/bin/bash
# ============================================
# TEAHAVEN - DEPLOYMENT SCRIPT
# ============================================
# Usage: ./scripts/deploy.sh [staging|production]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment argument
ENV=${1:-staging}
if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  TEAHAVEN DEPLOYMENT - ${ENV^^}${NC}"
echo -e "${GREEN}========================================${NC}"

# Load environment variables
if [ -f ".env.${ENV}" ]; then
    export $(cat .env.${ENV} | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Loaded environment from .env.${ENV}${NC}"
else
    echo -e "${RED}✗ Error: .env.${ENV} not found${NC}"
    exit 1
fi

# Select compose file
COMPOSE_FILE="docker-compose.${ENV}.yml"

echo -e "\n${YELLOW}Step 1: Pulling latest code...${NC}"
git pull origin main

echo -e "\n${YELLOW}Step 2: Building Docker images...${NC}"
docker-compose -f $COMPOSE_FILE build --no-cache

echo -e "\n${YELLOW}Step 3: Creating database backup...${NC}"
./scripts/backup-db.sh $ENV

echo -e "\n${YELLOW}Step 4: Stopping old containers...${NC}"
docker-compose -f $COMPOSE_FILE down

echo -e "\n${YELLOW}Step 5: Starting new containers...${NC}"
docker-compose -f $COMPOSE_FILE up -d

echo -e "\n${YELLOW}Step 6: Waiting for services to be healthy...${NC}"
sleep 10

# Health check
echo -e "\n${YELLOW}Step 7: Running health checks...${NC}"
HEALTH_URL="http://localhost/health"
if [ "$ENV" == "production" ]; then
    HEALTH_URL="https://${DOMAIN}/health"
fi

MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL | grep -q "200"; then
        echo -e "${GREEN}✓ Health check passed!${NC}"
        break
    fi
    echo "Waiting for service... (attempt $((RETRY+1))/$MAX_RETRIES)"
    sleep 2
    RETRY=$((RETRY+1))
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ Health check failed. Rolling back...${NC}"
    ./scripts/rollback.sh $ENV
    exit 1
fi

echo -e "\n${YELLOW}Step 8: Cleaning up old images...${NC}"
docker image prune -f

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Environment: ${ENV}"
echo -e "Containers:"
docker-compose -f $COMPOSE_FILE ps
